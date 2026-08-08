/**
 * Election Campaign OS — sync contract
 * IC-ECOS-BUILD-2026-V2 §7.3.
 *
 * "Write the OpenAPI spec before the implementation." This file is that
 * contract expressed as TypeScript types (the source of truth for both the
 * client outbox drain and functions/src/sync.ts); see openapi/sync.yaml
 * for the OpenAPI document itself.
 *
 * POST /api/sync — Cloud Function, africa-south1.
 * Max 200 operations or 5 MB per batch; client chunks. idempotencyKey is
 * required; server dedupes for 24 hours. Partial success is normal — never
 * all-or-nothing.
 */

export type SyncEntity = 'voter' | 'household' | 'incident' | 'diaryEntry';
export type SyncOp = 'upsert' | 'softDelete';

export interface SyncOperation {
  seq: number;
  entity: SyncEntity;
  entityId: string;
  op: SyncOp;
  payload: Record<string, unknown>;
  localUpdatedAt: string; // ISO 8601
}

export interface SyncRequest {
  clientId: string;
  idempotencyKey: string; // required; server dedupes for 24h
  since: string; // ISO 8601 — server returns changes after this
  operations: SyncOperation[]; // max 200 per batch, 5 MB
}

export interface SyncAccepted {
  seq: number;
  serverId: string;
  serverUpdatedAt: string;
}

/** `retryable: false` means the client must stop retrying and surface it to the user (§7.6). */
export interface SyncRejected {
  seq: number;
  code: 'CONSENT_REQUIRED' | 'VALIDATION_FAILED' | 'FORBIDDEN' | 'UNKNOWN';
  retryable: boolean;
  message: string;
}

export interface SyncConflict {
  seq: number;
  entity: SyncEntity;
  entityId: string;
  yours: Record<string, unknown>; // discarded
  theirs: Record<string, unknown>; // winning
  resolution: 'SERVER_WINS'; // last-write-wins PER FIELD, not per document, §7.5
  resolvedFields: string[];
}

export interface SyncResponse {
  accepted: SyncAccepted[];
  rejected: SyncRejected[];
  conflicts: SyncConflict[];
  changes: Record<string, unknown>[]; // server-side changes since `since`
  nextSince: string;
}

export const SYNC_MAX_OPERATIONS_PER_BATCH = 200;
export const SYNC_MAX_BATCH_BYTES = 5 * 1024 * 1024;
