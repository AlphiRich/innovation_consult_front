/**
 * Election Campaign OS — the sync merge, as pure functions
 * IC-ECOS-BUILD-2026-V2 §7.3, §7.5, §7.6.
 *
 * WHY THIS IS SEPARATE FROM sync.ts
 *
 * The merge is the part that can be wrong in a way nobody notices. A
 * canvasser's phone that has been offline for a day sends forty voter
 * edits; somewhere in the middle, one of them is older than what a ward
 * lead typed into the web app an hour ago. Getting that wrong silently
 * overwrites real work, and no error is raised because both writes
 * succeeded.
 *
 * `sync.ts` could not be tested without a live Firestore, and this build
 * has never had one — which is exactly why the endpoint sat as a skeleton
 * for thirty sessions. So the decisions live here, as functions over
 * plain objects, and `syncMerge.test.ts` exercises every branch. What is
 * left in `sync.ts` is the shell: read the token, read the document,
 * write what this module decided.
 *
 * PER FIELD, NOT PER DOCUMENT
 *
 * §7.5 says last-write-wins per field. That is not a detail. Per-document
 * LWW means a canvasser who corrects a phone number also reverts the
 * sentiment a ward lead recorded ten minutes ago, because the whole
 * document loses. Per-field means each wins its own contest, so the
 * canvasser's phone number lands and the ward lead's sentiment stays.
 *
 * To do that the server keeps, beside each synced document, a map of when
 * each field was last written: `_fieldUpdatedAt`. A field with no entry
 * there has never been written by sync and loses to any incoming value —
 * the alternative, treating "unknown" as "infinitely new", would make the
 * first sync after this ships discard everything the web app had.
 *
 * TIES GO TO THE SERVER
 *
 * Equal timestamps keep the server's value. Two writes in the same
 * millisecond is a coin toss either way; resolving it toward the server
 * at least makes the outcome the same if the client retries, which
 * matters more than which one wins.
 */

export type SyncEntity = 'voter' | 'household' | 'incident' | 'diaryEntry';
export type SyncOp = 'upsert' | 'softDelete';

export interface SyncOperation {
  seq: number;
  entity: SyncEntity;
  entityId: string;
  op: SyncOp;
  payload: Record<string, unknown>;
  localUpdatedAt: string;
}

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
  yours: Record<string, unknown>;
  theirs: Record<string, unknown>;
  resolution: 'SERVER_WINS';
  resolvedFields: string[];
}

/** A stored document as this module needs to see it. */
export interface ServerDocument {
  tenantId?: string;
  deletedAt?: string | null;
  /** When each field was last written by a sync. */
  _fieldUpdatedAt?: Record<string, string>;
  [field: string]: unknown;
}

export const SYNC_ENTITIES: SyncEntity[] = ['voter', 'household', 'incident', 'diaryEntry'];
export const SYNC_MAX_OPERATIONS_PER_BATCH = 200;
export const SYNC_MAX_BATCH_BYTES = 5 * 1024 * 1024;

/**
 * Fields a client may never set, whatever it sends.
 *
 * `tenantId` is the one that matters: §5.2's second non-negotiable is that
 * a caller-supplied tenant id is never trusted, and an operation that
 * could rewrite it would move a record between tenants. The rest are
 * server bookkeeping that a client has no business authoring.
 */
export const CLIENT_IMMUTABLE_FIELDS = [
  'tenantId',
  'id',
  'createdAt',
  'updatedAt',
  'updatedBy',
  'schemaVersion',
  '_fieldUpdatedAt',
];

export const FIELD_LWW_BASIS =
  'Conflicts are resolved per field, not per document. Each field is compared against when the server last ' +
  'saw it written, and only the fields that are genuinely older are discarded. A canvasser correcting a ' +
  'phone number therefore does not revert a sentiment somebody recorded in the web app ten minutes ago. ' +
  'Equal timestamps keep the server value, so a retry produces the same outcome.';

export const CONSENT_BASIS =
  'A voter record cannot be written without recorded POPIA consent. firestore.rules enforces that on every ' +
  'direct write; this endpoint enforces the same rule itself so the client is told CONSENT_REQUIRED and ' +
  'stops retrying, rather than being handed a generic permission error it will queue and send again forever.';

export interface ValidationProblem {
  code: SyncRejected['code'];
  retryable: boolean;
  message: string;
}

/** Structural checks on one operation. Null when it is well formed. */
export function validateOperation(operation: unknown): ValidationProblem | null {
  const invalid = (message: string): ValidationProblem => ({
    code: 'VALIDATION_FAILED',
    retryable: false,
    message,
  });

  if (typeof operation !== 'object' || operation === null) return invalid('Operation is not an object.');
  const op = operation as Partial<SyncOperation>;

  if (typeof op.seq !== 'number' || !Number.isInteger(op.seq) || op.seq < 0) {
    return invalid('seq must be a non-negative integer; it is how the response is matched to the request.');
  }
  if (typeof op.entityId !== 'string' || op.entityId.trim() === '') return invalid('entityId is required.');
  if (!op.entity || !SYNC_ENTITIES.includes(op.entity)) {
    return invalid(`entity must be one of ${SYNC_ENTITIES.join(', ')}.`);
  }
  if (op.op !== 'upsert' && op.op !== 'softDelete') return invalid("op must be 'upsert' or 'softDelete'.");
  if (typeof op.localUpdatedAt !== 'string' || Number.isNaN(Date.parse(op.localUpdatedAt))) {
    return invalid('localUpdatedAt must be an ISO 8601 timestamp; without it no field can be compared.');
  }
  if (op.op === 'upsert') {
    if (typeof op.payload !== 'object' || op.payload === null || Array.isArray(op.payload)) {
      return invalid('payload must be an object for an upsert.');
    }
    if (Object.keys(op.payload).length === 0) return invalid('payload is empty; there is nothing to write.');
  }
  return null;
}

/**
 * Strip the fields a client may not author.
 *
 * Returns the removed names so the caller can say so rather than
 * discarding them silently — a client sending `tenantId` has a bug worth
 * reporting, even though the write is safe.
 */
export function stripImmutable(payload: Record<string, unknown>): {
  clean: Record<string, unknown>;
  removed: string[];
} {
  const clean: Record<string, unknown> = {};
  const removed: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (CLIENT_IMMUTABLE_FIELDS.includes(key)) removed.push(key);
    else clean[key] = value;
  }
  return { clean, removed };
}

/**
 * Would this write leave a voter without recorded consent?
 *
 * Checked against the *resulting* document, not the payload: an operation
 * that touches only a phone number on a voter who already consented is
 * fine, and one that creates a voter without consent is not.
 */
export function consentProblem(
  entity: SyncEntity,
  payload: Record<string, unknown>,
  existing: ServerDocument | null,
): ValidationProblem | null {
  if (entity !== 'voter') return null;
  const resulting =
    'popiaConsentGiven' in payload ? payload.popiaConsentGiven : existing?.popiaConsentGiven;
  if (resulting === true) return null;
  return {
    code: 'CONSENT_REQUIRED',
    retryable: false,
    message:
      'This voter record has no recorded POPIA consent, so it cannot be stored. ' +
      'Capture consent with the person present and sync again. ' +
      CONSENT_BASIS,
  };
}

export interface MergeResult {
  /** The fields to write, already filtered to the ones that won. */
  updates: Record<string, unknown>;
  /** `_fieldUpdatedAt` entries for the fields being written. */
  fieldTimestamps: Record<string, string>;
  /** Fields where the server value was kept. */
  overriddenFields: string[];
  /** The server values that won, for the conflict report. */
  theirs: Record<string, unknown>;
  /** The client values that lost, for the conflict report. */
  yours: Record<string, unknown>;
}

/**
 * Decide, field by field, which values win.
 *
 * `existing` null means the document is new: everything is accepted and
 * nothing conflicts.
 */
export function mergeFields(
  payload: Record<string, unknown>,
  existing: ServerDocument | null,
  localUpdatedAt: string,
): MergeResult {
  const updates: Record<string, unknown> = {};
  const fieldTimestamps: Record<string, string> = {};
  const overriddenFields: string[] = [];
  const theirs: Record<string, unknown> = {};
  const yours: Record<string, unknown> = {};

  const incoming = Date.parse(localUpdatedAt);
  const seen = existing?._fieldUpdatedAt ?? {};

  for (const [field, value] of Object.entries(payload)) {
    if (!existing) {
      updates[field] = value;
      fieldTimestamps[field] = localUpdatedAt;
      continue;
    }
    const lastSeen = seen[field];
    // A field the server has never recorded a write time for loses to any
    // incoming value. Treating unknown as newest would make the first
    // sync after this ships throw away everything already in Firestore.
    if (lastSeen === undefined) {
      updates[field] = value;
      fieldTimestamps[field] = localUpdatedAt;
      continue;
    }
    const serverTime = Date.parse(lastSeen);
    if (Number.isNaN(serverTime) || incoming > serverTime) {
      updates[field] = value;
      fieldTimestamps[field] = localUpdatedAt;
    } else {
      // Ties included: the server keeps it.
      overriddenFields.push(field);
      theirs[field] = existing[field];
      yours[field] = value;
    }
  }

  return { updates, fieldTimestamps, overriddenFields, theirs, yours };
}

export interface OperationOutcome {
  seq: number;
  /** ACCEPTED means something was written, even if some fields lost. */
  kind: 'ACCEPTED' | 'REJECTED' | 'NOOP';
  rejected?: SyncRejected;
  conflict?: SyncConflict;
  /** The document fields to write. Absent unless kind is ACCEPTED. */
  write?: Record<string, unknown>;
  /** `_fieldUpdatedAt` merged with what the server already had. */
  fieldUpdatedAt?: Record<string, string>;
}

/**
 * Decide what to do with one validated operation against one document.
 *
 * NOOP is the case where every field lost. It still reports a conflict —
 * the client needs to know its values were discarded — but there is
 * nothing to write, and writing an empty update would bump `updatedAt`
 * for no reason and wake every listener on the document.
 */
export function planOperation(
  operation: SyncOperation,
  existing: ServerDocument | null,
  serverNow: string,
  actorUid: string,
): OperationOutcome {
  const structural = validateOperation(operation);
  if (structural) {
    return { seq: operation.seq, kind: 'REJECTED', rejected: { seq: operation.seq, ...structural } };
  }

  if (operation.op === 'softDelete') {
    const merge = mergeFields({ deletedAt: serverNow }, existing, operation.localUpdatedAt);
    if (Object.keys(merge.updates).length === 0) {
      return {
        seq: operation.seq,
        kind: 'NOOP',
        conflict: conflictFrom(operation, merge),
      };
    }
    return {
      seq: operation.seq,
      kind: 'ACCEPTED',
      write: { ...merge.updates, updatedAt: serverNow, updatedBy: actorUid },
      fieldUpdatedAt: { ...(existing?._fieldUpdatedAt ?? {}), ...merge.fieldTimestamps },
    };
  }

  const { clean, removed } = stripImmutable(operation.payload);
  if (Object.keys(clean).length === 0) {
    return {
      seq: operation.seq,
      kind: 'REJECTED',
      rejected: {
        seq: operation.seq,
        code: 'VALIDATION_FAILED',
        retryable: false,
        message:
          `Every field in this operation is server-managed (${removed.join(', ')}) and cannot be set by a ` +
          'client. Nothing was written.',
      },
    };
  }

  const consent = consentProblem(operation.entity, clean, existing);
  if (consent) {
    return { seq: operation.seq, kind: 'REJECTED', rejected: { seq: operation.seq, ...consent } };
  }

  const merge = mergeFields(clean, existing, operation.localUpdatedAt);
  const conflict = merge.overriddenFields.length > 0 ? conflictFrom(operation, merge) : undefined;

  if (Object.keys(merge.updates).length === 0) {
    return { seq: operation.seq, kind: 'NOOP', conflict };
  }

  const write: Record<string, unknown> = {
    ...merge.updates,
    updatedAt: serverNow,
    updatedBy: actorUid,
  };
  if (!existing) {
    write.createdAt = serverNow;
    write.deletedAt = null;
  }

  return {
    seq: operation.seq,
    kind: 'ACCEPTED',
    write,
    fieldUpdatedAt: { ...(existing?._fieldUpdatedAt ?? {}), ...merge.fieldTimestamps },
    conflict,
  };
}

function conflictFrom(operation: SyncOperation, merge: MergeResult): SyncConflict {
  return {
    seq: operation.seq,
    entity: operation.entity,
    entityId: operation.entityId,
    yours: merge.yours,
    theirs: merge.theirs,
    resolution: 'SERVER_WINS',
    resolvedFields: [...merge.overriddenFields].sort(),
  };
}

export interface BatchProblem {
  status: 400 | 413;
  error: string;
}

/** Batch-level checks, before any document is read. */
export function validateBatch(body: unknown): BatchProblem | null {
  if (typeof body !== 'object' || body === null) return { status: 400, error: 'Body must be a JSON object.' };
  const request = body as { idempotencyKey?: unknown; operations?: unknown; clientId?: unknown };

  if (typeof request.idempotencyKey !== 'string' || request.idempotencyKey.trim() === '') {
    return {
      status: 400,
      error:
        'idempotencyKey is required. Without it a retried batch after a dropped response would be applied ' +
        'twice.',
    };
  }
  if (typeof request.clientId !== 'string' || request.clientId.trim() === '') {
    return { status: 400, error: 'clientId is required.' };
  }
  if (!Array.isArray(request.operations)) {
    return { status: 400, error: 'operations must be an array.' };
  }
  if (request.operations.length > SYNC_MAX_OPERATIONS_PER_BATCH) {
    return {
      status: 413,
      error: `Max ${SYNC_MAX_OPERATIONS_PER_BATCH} operations per batch — the client must chunk.`,
    };
  }
  if (Buffer.byteLength(JSON.stringify(body)) > SYNC_MAX_BATCH_BYTES) {
    return { status: 413, error: `Max ${SYNC_MAX_BATCH_BYTES} bytes per batch — the client must chunk.` };
  }
  // Two operations on the same document in one batch would race inside
  // the transaction, and the loser would be decided by array order rather
  // than by its timestamp.
  const keys = new Set<string>();
  for (const operation of request.operations as Partial<SyncOperation>[]) {
    const key = `${operation.entity}/${operation.entityId}`;
    if (keys.has(key)) {
      return {
        status: 400,
        error:
          `More than one operation for ${key} in one batch. Collapse them client-side: applying both here ` +
          'would resolve them by array order instead of by timestamp.',
      };
    }
    keys.add(key);
  }
  return null;
}

/** The Firestore collection a synced entity lives in. */
export function collectionFor(entity: SyncEntity): string {
  switch (entity) {
    case 'voter':
      return 'voters';
    case 'household':
      return 'households';
    case 'incident':
      return 'incidents';
    case 'diaryEntry':
      return 'diaryEntries';
  }
}
