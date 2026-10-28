/**
 * Election Campaign OS — War Room counter-maintenance Cloud Functions
 * IC-ECOS-BUILD-2026-V2 §7.4, §8.1: "Must read pre-aggregated counter
 * documents only — never a live listener on a full collection." These
 * three Firestore triggers are what keeps `tenants/{tenantId}/counters/warRoom`
 * accurate so the client-side read in
 * src/dal/adapters/firestore/warRoomCountersRepository.ts never has to
 * scan the voters/incidents/diaryEntries collections itself.
 *
 * Every delta is expressed as a flat `{ dotted.field.path: signedAmount }`
 * map and applied via `FieldValue.increment()` — no read-modify-write, and
 * therefore no lost-update race between two concurrent writes to different
 * voters/incidents/entries (each increment commits independently;
 * Firestore serialises increments to the same field on the same document
 * server-side).
 *
 * WHY EACH EVENT IS APPLIED EXACTLY ONCE, AND WHY THAT NEEDED FIXING
 *
 * Firestore triggers are *at-least-once*. The same event can be delivered
 * twice, and `FieldValue.increment` is not idempotent, so the second
 * delivery silently adds the delta again. Nothing in this product ever
 * recomputes these counters from the collections, so the drift is
 * permanent and invisible: the War Room shows a voter total that is simply
 * wrong, with no error anywhere and no way to tell by looking.
 *
 * So each event now writes a marker document alongside the increment, and
 * both happen inside one transaction. On a redelivery the marker is
 * already there and the whole thing is a no-op.
 *
 * The transaction is cheap *because of what it reads*. Its read set is the
 * marker alone, and a marker id is unique to one event, so two concurrent
 * events never read the same document and never contend. The counter
 * document appears only in the write set, still as commutative increments.
 * That keeps the property the original design was protecting — this is an
 * addition to it, not a reversal of it.
 *
 * Markers are plumbing, not tenant data, and they expire: each carries an
 * `expireAt` for a Firestore TTL policy on
 * `tenants/{tenantId}/counterEvents`. **That policy has to be configured on
 * the project** — it is not expressible in `firebase.json` and nothing here
 * can check it. Without it the collection grows forever; it never goes
 * wrong, it just costs. See docs/asset-control-sheet.md §33.
 *
 * (`firestore.rules` denies clients the collection outright — the
 * `/tenants/{tid}/{document=**}` default-deny already covered it, and an
 * explicit rule was added so a reviewer does not have to work that out.)
 *
 * NOTE: not yet deployed/wired to a live Firebase project this session —
 * see BUILD-STATUS.md blocker #2. The pure delta functions are unit
 * tested (warRoomCounters.test.ts); the trigger wiring itself needs the
 * Firestore emulator to verify end-to-end, which this sandbox doesn't have.
 *
 * Types here are trimmed, standalone copies of the app-side DAL port
 * shapes (src/dal/ports/{voters,incidents,diary}.ts) — same rationale as
 * resolveCapabilities.ts: the two packages don't share a workspace yet.
 * Keep them in sync by hand until they do.
 *
 * @deployable yes
 *
 * Pre-aggregates the War Room counters so no page ever opens a live
 * listener on voters or incidents. Covered by warRoomCounters.test.ts.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { createHash } from 'node:crypto';
import { REGION } from './region';

if (!getApps().length) initializeApp();

export type Delta = Record<string, number>;

/**
 * How long a marker outlives its event. Firestore keeps retrying a failed
 * trigger for up to seven days, so anything shorter than that could expire
 * a marker while a redelivery of its own event is still possible. Thirty
 * days is that window with room to spare.
 */
export const COUNTER_EVENT_TTL_DAYS = 30;

function mergeDeltas(...deltas: Delta[]): Delta {
  const merged: Delta = {};
  for (const delta of deltas) {
    for (const [path, amount] of Object.entries(delta)) {
      merged[path] = (merged[path] ?? 0) + amount;
    }
  }
  return merged;
}

/**
 * A Firestore document id for an event id. Exported for testing.
 *
 * A CloudEvent id is a string, not a document id: it may legally contain
 * `/`, which Firestore forbids, or be long enough to exceed the 1 500-byte
 * limit, or be `__proto__`-shaped, which Firestore reserves. In practice
 * the ids are UUID-ish — but "in practice" is exactly the assumption that
 * fails once, in production, with nothing to point at.
 *
 * Sanitising alone is not enough, because it maps distinct ids onto the
 * same string, and a collision here does not double-count — it does the
 * other thing, and silently *drops* a real event. So the readable part is
 * a convenience for whoever is reading the console, and a hash of the
 * untouched id is what actually distinguishes two markers.
 */
export function counterEventDocId(eventId: string): string {
  const fingerprint = createHash('sha256').update(eventId, 'utf8').digest('hex').slice(0, 24);
  const readable = eventId.replace(/[^A-Za-z0-9-]/g, '_').slice(0, 100);
  return `${readable}~${fingerprint}`;
}

/** Exported for testing: the marker document path for one event. */
export function counterEventPath(tenantId: string, eventId: string): string {
  return `tenants/${tenantId}/counterEvents/${counterEventDocId(eventId)}`;
}

/** Exported for testing: the increments a delta turns into, zeroes dropped. */
export function counterUpdateFor(delta: Delta): Record<string, number> {
  return Object.fromEntries(Object.entries(delta).filter(([, amount]) => amount !== 0));
}

/**
 * The three things the exactly-once rule needs a transaction to do.
 *
 * It is an interface rather than the Firestore transaction itself for one
 * reason: this sandbox has no emulator, so without a seam the rule that
 * matters most in this file would be the one part of it with no test.
 * `warRoomCounters.test.ts` drives it with a fake that redelivers an event,
 * which is the case the production code exists for and the case a live
 * run almost never produces on demand.
 */
export interface CounterTransaction {
  markerExists(path: string): Promise<boolean>;
  writeMarker(path: string, expireAtMillis: number): void;
  incrementCounter(path: string, amounts: Record<string, number>): void;
}

/**
 * Applies a delta once, however many times its event is delivered.
 *
 * An empty delta writes nothing at all — not even a marker. Replaying an
 * event that changes no counter is already harmless, and a marker for it
 * would be storage bought for nothing.
 */
export async function applyCounterEvent(
  tx: CounterTransaction,
  tenantId: string,
  eventId: string,
  delta: Delta,
  nowMillis: number,
): Promise<void> {
  const amounts = counterUpdateFor(delta);
  if (Object.keys(amounts).length === 0) return;

  const markerPath = counterEventPath(tenantId, eventId);
  // The only read, and it is unique to this event — see the file header
  // for why that is what makes the transaction cheap.
  if (await tx.markerExists(markerPath)) return;

  tx.writeMarker(markerPath, nowMillis + COUNTER_EVENT_TTL_DAYS * 24 * 60 * 60 * 1000);
  tx.incrementCounter(`tenants/${tenantId}/counters/warRoom`, amounts);
}

async function applyDeltaOnce(tenantId: string, eventId: string, delta: Delta): Promise<void> {
  if (Object.keys(counterUpdateFor(delta)).length === 0) return; // don't open a transaction for nothing

  const db = getFirestore();
  await db.runTransaction(async (transaction) => {
    const tx: CounterTransaction = {
      markerExists: async (path) => (await transaction.get(db.doc(path))).exists,
      writeMarker: (path, expireAtMillis) =>
        void transaction.set(db.doc(path), {
          appliedAt: FieldValue.serverTimestamp(),
          expireAt: Timestamp.fromMillis(expireAtMillis),
        }),
      incrementCounter: (path, amounts) => {
        const update: Record<string, FirebaseFirestore.FieldValue> = {};
        for (const [field, amount] of Object.entries(amounts)) {
          update[field] = FieldValue.increment(amount);
        }
        update.updatedAt = FieldValue.serverTimestamp();
        transaction.set(db.doc(path), update, { merge: true });
      },
    };
    await applyCounterEvent(tx, tenantId, eventId, delta, Date.now());
  });
}

/**
 * Every trigger goes through this, so none of them can forget the event id.
 *
 * Without an id there is no way to tell a redelivery from a new event, and
 * both available guesses are wrong: apply it and the counter drifts up,
 * skip it and the counter drifts down. So it throws instead — which lands
 * in the function's logs as an error somebody can see, rather than as a
 * number nobody can check. CloudEvents guarantees the id, so this is a
 * path that should never run; it exists so that if it ever does, it says so.
 */
async function handle(eventId: string | undefined, tenantId: string, delta: Delta): Promise<void> {
  if (!eventId) {
    throw new Error(
      `Counter event for tenant ${tenantId} arrived without an event id; refusing to apply a delta that cannot be deduplicated.`,
    );
  }
  await applyDeltaOnce(tenantId, eventId, delta);
}

// ---- voters ---------------------------------------------------------------

type Sentiment = 'STRONG_SUPPORT' | 'LEAN_SUPPORT' | 'UNDECIDED' | 'LEAN_OPPOSITION' | 'STRONG_OPPOSITION';
interface VoterSnapshot {
  sentiment: Sentiment;
  deletedAt: string | null;
}

/**
 * Exported for testing. Handles: create, sentiment change, soft delete
 * (deletedAt newly set), and a defensive hard-delete case (after is
 * undefined) even though firestore.rules disallows real deletes — a
 * console/admin-SDK delete can still fire this trigger.
 */
export function voterCounterDelta(before: VoterSnapshot | undefined, after: VoterSnapshot | undefined): Delta {
  if (!after) {
    // Hard delete: undo whatever `before` contributed, if anything.
    if (!before || before.deletedAt) return {};
    return { totalVoters: -1, [`sentimentBreakdown.${before.sentiment}`]: -1 };
  }

  if (!before) {
    // Create.
    if (after.deletedAt) return {}; // created already-deleted — shouldn't happen, but contributes nothing either way
    return { totalVoters: 1, [`sentimentBreakdown.${after.sentiment}`]: 1 };
  }

  const wasCounted = !before.deletedAt;
  const isCounted = !after.deletedAt;

  if (wasCounted && !isCounted) {
    // Soft delete.
    return { totalVoters: -1, [`sentimentBreakdown.${before.sentiment}`]: -1 };
  }
  if (!wasCounted && isCounted) {
    // Restored (deletedAt cleared) — not exposed in the UI today, handled for completeness.
    return { totalVoters: 1, [`sentimentBreakdown.${after.sentiment}`]: 1 };
  }
  if (wasCounted && isCounted && before.sentiment !== after.sentiment) {
    return { [`sentimentBreakdown.${before.sentiment}`]: -1, [`sentimentBreakdown.${after.sentiment}`]: 1 };
  }
  return {};
}

export const maintainVoterCounters = onDocumentWritten(
  { document: 'tenants/{tenantId}/voters/{voterId}', region: REGION },
  async (event) => {
    const delta = voterCounterDelta(
      event.data?.before?.data() as VoterSnapshot | undefined,
      event.data?.after?.data() as VoterSnapshot | undefined,
    );
    await handle(event.id, (event.params as { tenantId: string }).tenantId, delta);
  },
);

// ---- incidents --------------------------------------------------------------

type IncidentStatus = 'LOGGED' | 'TRIAGED' | 'ESCALATED' | 'REFERRED' | 'RESOLVED' | 'CLOSED';
interface IncidentSnapshot {
  status: IncidentStatus;
}

/** Exported for testing. Create counts the initial status; status-change moves the bucket. */
export function incidentCounterDelta(before: IncidentSnapshot | undefined, after: IncidentSnapshot | undefined): Delta {
  if (!after) {
    return before ? { [`incidentsByStatus.${before.status}`]: -1 } : {};
  }
  if (!before) {
    return { [`incidentsByStatus.${after.status}`]: 1 };
  }
  if (before.status !== after.status) {
    return mergeDeltas(
      { [`incidentsByStatus.${before.status}`]: -1 },
      { [`incidentsByStatus.${after.status}`]: 1 },
    );
  }
  return {};
}

export const maintainIncidentCounters = onDocumentWritten(
  { document: 'tenants/{tenantId}/incidents/{incidentId}', region: REGION },
  async (event) => {
    const delta = incidentCounterDelta(
      event.data?.before?.data() as IncidentSnapshot | undefined,
      event.data?.after?.data() as IncidentSnapshot | undefined,
    );
    await handle(event.id, (event.params as { tenantId: string }).tenantId, delta);
  },
);

// ---- field diary --------------------------------------------------------------

type DiaryActivityType = 'CANVASS' | 'RALLY' | 'OBSERVATION' | 'OTHER';
interface DiarySnapshot {
  activityType: DiaryActivityType;
  householdsVisited: number;
}

function householdsFor(entry: DiarySnapshot | undefined): number {
  if (!entry || entry.activityType !== 'CANVASS') return 0;
  return entry.householdsVisited;
}

/**
 * Exported for testing. Only CANVASS entries contribute — see
 * src/dal/ports/diary.ts for why RALLY/OBSERVATION/OTHER carry no
 * household count. Entries are create-only in the shipped UI today
 * (DiaryEntryForm.tsx always mints a new id), but this still handles an
 * edit correctly for any future admin/edit flow.
 */
export function diaryCounterDelta(before: DiarySnapshot | undefined, after: DiarySnapshot | undefined): Delta {
  const change = householdsFor(after) - householdsFor(before);
  return change === 0 ? {} : { totalHouseholdsVisited: change };
}

// ---- households -----------------------------------------------------------

type ContactStatus =
  | 'NOT_CONTACTED'
  | 'IN_PROGRESS'
  | 'CONTACTED'
  | 'NO_ANSWER'
  | 'INACCESSIBLE'
  | 'REFUSED_RECONTACT';

interface HouseholdSnapshot {
  contactStatus?: ContactStatus;
  deletedAt: string | null;
}

/**
 * Exported for testing. Doors by the state they were actually left in —
 * the counterpart to `totalHouseholdsVisited`, which is a canvasser's own
 * account of their shift and can differ.
 *
 * An absent `contactStatus` reads as NOT_CONTACTED, exactly as
 * `canvassQueue.statusOf()` does on the app side. A door with no status
 * is a door nobody has been to, not a door outside the count.
 */
export function householdCounterDelta(
  before: HouseholdSnapshot | undefined,
  after: HouseholdSnapshot | undefined,
): Delta {
  const bucketOf = (snapshot: HouseholdSnapshot | undefined): ContactStatus | null => {
    if (!snapshot || snapshot.deletedAt) return null;
    return snapshot.contactStatus ?? 'NOT_CONTACTED';
  };

  const from = bucketOf(before);
  const to = bucketOf(after);
  if (from === to) return {};

  return mergeDeltas(
    from ? { [`householdsByContactStatus.${from}`]: -1 } : {},
    to ? { [`householdsByContactStatus.${to}`]: 1 } : {},
  );
}

export const maintainHouseholdCounters = onDocumentWritten(
  { document: 'tenants/{tenantId}/households/{householdId}', region: REGION },
  async (event) => {
    const delta = householdCounterDelta(
      event.data?.before?.data() as HouseholdSnapshot | undefined,
      event.data?.after?.data() as HouseholdSnapshot | undefined,
    );
    await handle(event.id, (event.params as { tenantId: string }).tenantId, delta);
  },
);

export const maintainDiaryCounters = onDocumentWritten(
  { document: 'tenants/{tenantId}/diaryEntries/{entryId}', region: REGION },
  async (event) => {
    const delta = diaryCounterDelta(
      event.data?.before?.data() as DiarySnapshot | undefined,
      event.data?.after?.data() as DiarySnapshot | undefined,
    );
    await handle(event.id, (event.params as { tenantId: string }).tenantId, delta);
  },
);
