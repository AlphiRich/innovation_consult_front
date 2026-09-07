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
 * map and applied via `FieldValue.increment()` — no read-modify-write, no
 * transaction, and therefore no lost-update race between two concurrent
 * writes to different voters/incidents/entries (each increment commits
 * independently; Firestore serialises increments to the same field on the
 * same document server-side).
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
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { REGION } from './region';

if (!getApps().length) initializeApp();

export type Delta = Record<string, number>;

function mergeDeltas(...deltas: Delta[]): Delta {
  const merged: Delta = {};
  for (const delta of deltas) {
    for (const [path, amount] of Object.entries(delta)) {
      merged[path] = (merged[path] ?? 0) + amount;
    }
  }
  return merged;
}

async function applyDelta(tenantId: string, delta: Delta): Promise<void> {
  const nonZero = Object.entries(delta).filter(([, amount]) => amount !== 0);
  if (nonZero.length === 0) return;

  const update: Record<string, FirebaseFirestore.FieldValue> = {};
  for (const [path, amount] of nonZero) {
    update[path] = FieldValue.increment(amount);
  }
  update.updatedAt = FieldValue.serverTimestamp();

  await getFirestore().doc(`tenants/${tenantId}/counters/warRoom`).set(update, { merge: true });
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
    await applyDelta((event.params as { tenantId: string }).tenantId, delta);
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
    await applyDelta((event.params as { tenantId: string }).tenantId, delta);
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

export const maintainDiaryCounters = onDocumentWritten(
  { document: 'tenants/{tenantId}/diaryEntries/{entryId}', region: REGION },
  async (event) => {
    const delta = diaryCounterDelta(
      event.data?.before?.data() as DiarySnapshot | undefined,
      event.data?.after?.data() as DiarySnapshot | undefined,
    );
    await applyDelta((event.params as { tenantId: string }).tenantId, delta);
  },
);
