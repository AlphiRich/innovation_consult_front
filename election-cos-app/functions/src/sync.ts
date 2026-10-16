/**
 * Election Campaign OS — POST /api/sync Cloud Function
 * IC-ECOS-BUILD-2026-V2 §7.3. Implements the contract in openapi/sync.yaml
 * and src/offline/syncTypes.ts — keep all three in lockstep.
 *
 * @deployable yes
 *
 * WHAT THIS FILE IS AND IS NOT
 *
 * It is the shell. Every decision about which value wins, what is
 * rejected and why lives in `syncMerge.ts` as pure functions over plain
 * objects, because that is the part that can be wrong without anybody
 * noticing and it needed to be testable without a live Firestore. This
 * file reads the token, reads the documents, and writes what the merge
 * decided.
 *
 * It was a skeleton from session 7 to session 38 — deliberately, with
 * TODOs rather than a fake implementation, because a half-right sync
 * silently destroys a canvasser's day of work. The three things it was
 * waiting for are now done:
 *
 *  1. THE TENANT COMES FROM THE TOKEN, NEVER THE BODY. §5.2's second
 *     non-negotiable. The custom claims minted by `resolveCapabilities`
 *     carry `tenantId` and `caps`; a caller-supplied tenantId is stripped
 *     by `CLIENT_IMMUTABLE_FIELDS` and never read.
 *
 *  2. IDEMPOTENCY IS A STORED RESPONSE, NOT A FLAG. A batch whose
 *     response was lost in a tunnel gets retried. Writing a "seen" marker
 *     would stop the double-apply but leave the client with no response
 *     and no way to get one, so the whole response body is stored and
 *     replayed verbatim for 24 hours.
 *
 *  3. ONE TRANSACTION PER OPERATION, NOT PER BATCH. Partial success is
 *     the normal case (§7.3), so a batch of forty operations where three
 *     conflict must apply thirty-seven. A single transaction over the
 *     whole batch would roll all forty back on one conflict, which is the
 *     all-or-nothing behaviour the contract explicitly forbids.
 *
 * WHAT IS STILL NOT PROVEN
 *
 * This has not run against Firestore. No project in this build has ever
 * been deployed to, so the merge logic is proven by unit test and the
 * Firestore plumbing is proven by review only. Before trusting it with
 * real canvasser data, run it against the emulator (`npm run emulators`)
 * with a real token and watch a conflicting pair resolve.
 */
import { onRequest } from 'firebase-functions/v2/https';
import {
  getFirestore,
  FieldValue,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp } from 'firebase-admin/app';
import { REGION } from './region';
import {
  collectionFor,
  planOperation,
  validateBatch,
  type ServerDocument,
  type SyncConflict,
  type SyncOperation,
  type SyncRejected,
} from './syncMerge';

if (!getApps().length) initializeApp();

/** How long a stored response is replayed for. §7.3 says 24 hours. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Server-side changes returned per batch. Bounded so one reply cannot be unbounded. */
const MAX_CHANGES_RETURNED = 200;

interface Caller {
  uid: string;
  tenantId: string;
  caps: string[];
}

/**
 * Derive the caller from the bearer token.
 *
 * Returns a string on failure rather than throwing, so the handler can
 * answer 401 with a reason instead of a stack trace.
 */
async function callerFrom(authorization: string | undefined): Promise<Caller | string> {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  if (!match) return 'Missing Authorization: Bearer <Firebase ID token>.';
  try {
    const token = await getAuth().verifyIdToken(match[1], true);
    const tenantId = typeof token.tenantId === 'string' ? token.tenantId : '';
    if (!tenantId) {
      return 'This account has no tenant assigned yet, so there is nowhere to sync to.';
    }
    return {
      uid: token.uid,
      tenantId,
      caps: Array.isArray(token.caps) ? (token.caps as string[]) : [],
    };
  } catch (error) {
    return `Token rejected: ${error instanceof Error ? error.message : 'unknown reason'}`;
  }
}

export const sync = onRequest({ region: REGION, cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only.' });
    return;
  }

  const caller = await callerFrom(req.headers.authorization);
  if (typeof caller === 'string') {
    res.status(401).json({ error: caller });
    return;
  }

  const batchProblem = validateBatch(req.body);
  if (batchProblem) {
    res.status(batchProblem.status).json({ error: batchProblem.error });
    return;
  }

  const body = req.body as {
    clientId: string;
    idempotencyKey: string;
    since?: string;
    operations: SyncOperation[];
  };

  const db = getFirestore();
  const tenant = db.collection('tenants').doc(caller.tenantId);
  const idempotencyRef = tenant.collection('_syncIdempotency').doc(body.idempotencyKey);

  // Replay a stored response rather than reapplying the batch.
  const stored = await idempotencyRef.get();
  if (stored.exists) {
    const record = stored.data() as { response?: unknown; expiresAtMs?: number } | undefined;
    if (record?.response && (record.expiresAtMs ?? 0) > Date.now()) {
      res.status(200).json({ ...(record.response as object), replayed: true });
      return;
    }
  }

  const serverNow = new Date().toISOString();
  const accepted: { seq: number; serverId: string; serverUpdatedAt: string }[] = [];
  const rejected: SyncRejected[] = [];
  const conflicts: SyncConflict[] = [];

  for (const operation of body.operations) {
    // One transaction per operation: partial success is the contract.
    try {
      const outcome = await applyOne(db, tenant, operation, caller, serverNow);
      if (outcome.rejected) rejected.push(outcome.rejected);
      if (outcome.conflict) conflicts.push(outcome.conflict);
      if (outcome.accepted) accepted.push(outcome.accepted);
    } catch (error) {
      // A thrown Firestore error is retryable: the operation did not
      // land, and the client should send it again. Anything the client
      // must stop retrying is already a typed rejection from the merge.
      rejected.push({
        seq: operation.seq,
        code: 'UNKNOWN',
        retryable: true,
        message: error instanceof Error ? error.message : 'Write failed for an unknown reason.',
      });
    }
  }

  const { changes, nextSince } = await changesSince(tenant, body.since, serverNow);

  const response = { accepted, rejected, conflicts, changes, nextSince };

  // Stored after the work, so a crash mid-batch leaves no response to
  // replay and the client's retry is applied for real. The per-field
  // merge makes that retry safe: a field already written is simply no
  // longer newer.
  await idempotencyRef.set({
    clientId: body.clientId,
    uid: caller.uid,
    storedAt: serverNow,
    expiresAtMs: Date.now() + IDEMPOTENCY_TTL_MS,
    // A TTL policy on this field lets Firestore delete these itself; set
    // it on tenants/{tid}/_syncIdempotency.expiresAt in the console.
    expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    response,
  });

  res.status(200).json(response);
});

async function applyOne(
  db: Firestore,
  tenant: DocumentReference,
  operation: SyncOperation,
  caller: Caller,
  serverNow: string,
): Promise<{
  accepted?: { seq: number; serverId: string; serverUpdatedAt: string };
  rejected?: SyncRejected;
  conflict?: SyncConflict;
}> {
  const ref = tenant.collection(collectionFor(operation.entity)).doc(operation.entityId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists ? (snapshot.data() as ServerDocument) : null;

    // A document that exists under another tenant is not this caller's to
    // write. Defence in depth: the path is already tenant-scoped, so this
    // can only fire if a document was written with the wrong tenantId.
    if (existing && typeof existing.tenantId === 'string' && existing.tenantId !== caller.tenantId) {
      return {
        rejected: {
          seq: operation.seq,
          code: 'FORBIDDEN' as const,
          retryable: false,
          message: 'That record belongs to another tenant.',
        },
      };
    }

    const plan = planOperation(operation, existing, serverNow, caller.uid);

    if (plan.kind === 'REJECTED') return { rejected: plan.rejected };
    if (plan.kind === 'NOOP') return { conflict: plan.conflict };

    transaction.set(
      ref,
      {
        ...plan.write,
        tenantId: caller.tenantId,
        id: operation.entityId,
        _fieldUpdatedAt: plan.fieldUpdatedAt,
        _syncedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      accepted: { seq: operation.seq, serverId: operation.entityId, serverUpdatedAt: serverNow },
      conflict: plan.conflict,
    };
  });
}

/**
 * Server-side changes the client has not seen.
 *
 * Returns `nextSince` as the server's clock, not the newest document's
 * timestamp: a document written during this request but after the query
 * ran would otherwise be skipped forever.
 */
async function changesSince(
  tenant: DocumentReference,
  since: string | undefined,
  serverNow: string,
): Promise<{ changes: Record<string, unknown>[]; nextSince: string }> {
  if (!since || Number.isNaN(Date.parse(since))) {
    // No usable cursor: send nothing and give the client one. A full dump
    // here would be an unbounded reply on a phone's data.
    return { changes: [], nextSince: serverNow };
  }

  const changes: Record<string, unknown>[] = [];
  const perEntity = Math.max(1, Math.floor(MAX_CHANGES_RETURNED / 4));

  for (const entity of ['voter', 'household', 'incident', 'diaryEntry'] as const) {
    const snapshot = await tenant
      .collection(collectionFor(entity))
      .where('updatedAt', '>', since)
      .orderBy('updatedAt')
      .limit(perEntity)
      .get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Server bookkeeping is not the client's business and bloats the
      // reply on a metered connection.
      delete data._fieldUpdatedAt;
      delete data._syncedAt;
      changes.push({ entity, entityId: doc.id, ...data });
    }
  }

  return { changes, nextSince: serverNow };
}
