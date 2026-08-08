/**
 * Election-COS1.0 — POST /api/sync Cloud Function
 * IC-ECOS-BUILD-2026-V2 §7.3. Implements the contract in openapi/sync.yaml
 * / src/offline/syncTypes.ts (election-cos-app side) — keep all three in lockstep.
 *
 * This is a skeleton: request validation, idempotency dedup, and per-field
 * last-write-wins are stubbed with clear TODOs rather than faked, because
 * getting this wrong is exactly the failure mode §7.3/§7.5/§7.6 exist to
 * prevent. Do not deploy until every TODO below is resolved and tested
 * against the Firestore emulator.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { REGION } from './region';

if (!getApps().length) initializeApp();

const MAX_OPERATIONS_PER_BATCH = 200;
const MAX_BATCH_BYTES = 5 * 1024 * 1024;

export const sync = onRequest({ region: REGION, cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  // TODO(Phase 4): verify the Firebase ID token from the Authorization
  // header and derive SessionContext server-side — never trust a
  // caller-supplied tenantId (§5.2 non-negotiable #2).
  const body = req.body as { operations?: unknown[]; idempotencyKey?: string };

  if (!body.idempotencyKey) {
    res.status(400).json({ error: 'idempotencyKey is required' });
    return;
  }
  if (Array.isArray(body.operations) && body.operations.length > MAX_OPERATIONS_PER_BATCH) {
    res.status(413).json({ error: `Max ${MAX_OPERATIONS_PER_BATCH} operations per batch — client must chunk` });
    return;
  }
  if (Buffer.byteLength(JSON.stringify(req.body)) > MAX_BATCH_BYTES) {
    res.status(413).json({ error: `Max ${MAX_BATCH_BYTES} bytes per batch — client must chunk` });
    return;
  }

  // TODO(Phase 4): idempotency dedup — check/write
  // tenants/{tenantId}/_syncIdempotency/{idempotencyKey} with a 24h TTL
  // field, short-circuit with the cached response if already processed.

  // TODO(Phase 4): for each operation, apply per-field last-write-wins
  // (§7.5) against Firestore via getFirestore(), collecting accepted /
  // rejected / conflicts exactly as SyncResponse requires. The consent
  // gate on voters (popiaConsentGiven) must produce CONSENT_REQUIRED,
  // retryable: false, not a generic Firestore permission error (§7.6).
  void getFirestore;

  res.status(501).json({
    error: 'Not implemented — see TODOs in functions/src/sync.ts. Contract is finalised (openapi/sync.yaml).',
  });
});
