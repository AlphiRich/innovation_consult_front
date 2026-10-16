/**
 * Election Campaign OS — guards on the sync merge
 *
 * This is the file that justifies splitting the merge out of `sync.ts`.
 * The endpoint sat as a skeleton from session 7 to session 38 because it
 * could not be tested without a live Firestore, and a half-right sync
 * destroys a canvasser's day of work without raising an error. These are
 * plain-object tests over the decisions, so the decisions are proven even
 * though the Firestore plumbing is still only reviewed.
 *
 * The case that matters most is the third block: per-field, not
 * per-document. Per-document last-write-wins is the easy implementation
 * and it silently reverts other people's work.
 */
import { describe, expect, it } from 'vitest';
import {
  CLIENT_IMMUTABLE_FIELDS,
  CONSENT_BASIS,
  FIELD_LWW_BASIS,
  SYNC_MAX_OPERATIONS_PER_BATCH,
  collectionFor,
  consentProblem,
  mergeFields,
  planOperation,
  stripImmutable,
  validateBatch,
  validateOperation,
  type ServerDocument,
  type SyncOperation,
} from './syncMerge';

const NOW = '2026-10-16T12:00:00.000Z';
const EARLIER = '2026-10-16T11:00:00.000Z';
const LATER = '2026-10-16T13:00:00.000Z';

const operation = (over: Partial<SyncOperation> = {}): SyncOperation => ({
  seq: 1,
  entity: 'voter',
  entityId: 'v1',
  op: 'upsert',
  payload: { firstName: 'Thandi', popiaConsentGiven: true },
  localUpdatedAt: NOW,
  ...over,
});

describe('operation validation', () => {
  it('accepts a well-formed operation', () => {
    expect(validateOperation(operation())).toBeNull();
  });

  it('refuses an unparseable localUpdatedAt, because nothing can be compared without it', () => {
    const problem = validateOperation(operation({ localUpdatedAt: 'yesterday' }));
    expect(problem?.code).toBe('VALIDATION_FAILED');
    expect(problem?.retryable).toBe(false);
    expect(problem?.message).toMatch(/no field can be compared/i);
  });

  it('refuses an unknown entity rather than guessing a collection', () => {
    expect(validateOperation(operation({ entity: 'candidate' as never }))?.code).toBe('VALIDATION_FAILED');
  });

  it('refuses an empty payload on an upsert', () => {
    expect(validateOperation(operation({ payload: {} }))?.message).toMatch(/nothing to write/i);
  });

  it('requires a seq, because the response is matched to the request by it', () => {
    expect(validateOperation(operation({ seq: -1 as never }))?.message).toMatch(/seq must be/i);
    expect(validateOperation(operation({ seq: 1.5 as never }))?.message).toMatch(/seq must be/i);
  });

  it('does not require a payload on a soft delete', () => {
    expect(validateOperation(operation({ op: 'softDelete', payload: {} }))).toBeNull();
  });
});

describe('fields a client may not author', () => {
  it('strips the tenant id above all', () => {
    // §5.2 non-negotiable #2. An operation that could rewrite tenantId
    // would move a record between tenants.
    expect(CLIENT_IMMUTABLE_FIELDS).toContain('tenantId');
    const { clean, removed } = stripImmutable({ tenantId: 'other', firstName: 'Thandi' });
    expect(clean).toEqual({ firstName: 'Thandi' });
    expect(removed).toEqual(['tenantId']);
  });

  it('rejects an operation that is nothing but server-managed fields', () => {
    const plan = planOperation(
      operation({ payload: { tenantId: 'other', updatedBy: 'someone' } }),
      null,
      NOW,
      'uid',
    );
    expect(plan.kind).toBe('REJECTED');
    expect(plan.rejected?.message).toMatch(/server-managed/i);
    // Says which, so a client bug is reportable rather than mysterious.
    expect(plan.rejected?.message).toContain('tenantId');
  });
});

describe('last write wins PER FIELD', () => {
  const existing: ServerDocument = {
    firstName: 'Thandi',
    sentiment: 'SUPPORTER',
    phoneMasked: '082 *** 4567',
    popiaConsentGiven: true,
    _fieldUpdatedAt: { firstName: EARLIER, sentiment: LATER, phoneMasked: EARLIER },
  };

  it('accepts only the fields that are genuinely newer', () => {
    // The canonical case: a canvasser corrects a phone number offline
    // while a ward lead updates sentiment in the web app. Per-document
    // LWW would discard one of them wholesale.
    const merge = mergeFields({ phoneMasked: '082 *** 9999', sentiment: 'UNDECIDED' }, existing, NOW);
    expect(merge.updates).toEqual({ phoneMasked: '082 *** 9999' });
    expect(merge.overriddenFields).toEqual(['sentiment']);
    expect(merge.theirs).toEqual({ sentiment: 'SUPPORTER' });
    expect(merge.yours).toEqual({ sentiment: 'UNDECIDED' });
  });

  it('keeps the server value on an exact tie', () => {
    // A coin toss either way; resolving toward the server makes a retry
    // produce the same answer.
    const merge = mergeFields({ sentiment: 'UNDECIDED' }, existing, LATER);
    expect(merge.updates).toEqual({});
    expect(merge.overriddenFields).toEqual(['sentiment']);
  });

  it('accepts everything for a document the server has never seen', () => {
    const merge = mergeFields({ firstName: 'Thandi' }, null, NOW);
    expect(merge.updates).toEqual({ firstName: 'Thandi' });
    expect(merge.overriddenFields).toEqual([]);
  });

  it('lets an incoming value win a field the server has no timestamp for', () => {
    // Everything already in Firestore predates this endpoint. Treating an
    // unknown write time as "infinitely new" would make the first sync
    // after this ships discard every offline edit ever queued.
    const merge = mergeFields({ ward: 'NW405-W12' }, existing, EARLIER);
    expect(merge.updates).toEqual({ ward: 'NW405-W12' });
    expect(merge.overriddenFields).toEqual([]);
  });

  it('reports a conflict while still writing the fields that won', () => {
    const plan = planOperation(
      operation({ payload: { phoneMasked: '082 *** 9999', sentiment: 'UNDECIDED' } }),
      existing,
      NOW,
      'uid',
    );
    expect(plan.kind).toBe('ACCEPTED');
    expect(plan.write).toMatchObject({ phoneMasked: '082 *** 9999', updatedBy: 'uid' });
    expect(plan.write).not.toHaveProperty('sentiment');
    expect(plan.conflict?.resolution).toBe('SERVER_WINS');
    expect(plan.conflict?.resolvedFields).toEqual(['sentiment']);
  });

  it('writes nothing when every field lost, but still reports the conflict', () => {
    // An empty update would bump updatedAt for no reason and wake every
    // listener on the document.
    const plan = planOperation(
      operation({ payload: { sentiment: 'UNDECIDED' } }),
      existing,
      NOW,
      'uid',
    );
    expect(plan.kind).toBe('NOOP');
    expect(plan.write).toBeUndefined();
    expect(plan.conflict?.resolvedFields).toEqual(['sentiment']);
  });

  it('carries forward the timestamps of fields it did not touch', () => {
    const plan = planOperation(operation({ payload: { phoneMasked: 'x' } }), existing, NOW, 'uid');
    expect(plan.fieldUpdatedAt).toEqual({
      firstName: EARLIER,
      sentiment: LATER,
      phoneMasked: NOW,
    });
  });

  it('says in words that it is per field', () => {
    expect(FIELD_LWW_BASIS).toMatch(/per field, not per document/i);
    expect(FIELD_LWW_BASIS).toMatch(/does not revert a sentiment/i);
  });
});

describe('the POPIA consent gate', () => {
  it('refuses a new voter with no recorded consent, and says stop retrying', () => {
    const plan = planOperation(operation({ payload: { firstName: 'Thandi' } }), null, NOW, 'uid');
    expect(plan.kind).toBe('REJECTED');
    expect(plan.rejected?.code).toBe('CONSENT_REQUIRED');
    // §7.6: retryable false, or the client queues it and sends it forever.
    expect(plan.rejected?.retryable).toBe(false);
    expect(plan.rejected?.message).toMatch(/capture consent with the person present/i);
  });

  it('refuses one that sets consent to false explicitly', () => {
    const plan = planOperation(
      operation({ payload: { firstName: 'Thandi', popiaConsentGiven: false } }),
      null,
      NOW,
      'uid',
    );
    expect(plan.rejected?.code).toBe('CONSENT_REQUIRED');
  });

  it('allows an edit to a voter who already consented', () => {
    // The gate is on the resulting document, not the payload: changing a
    // phone number must not require re-sending consent.
    const existing: ServerDocument = { popiaConsentGiven: true, _fieldUpdatedAt: {} };
    const plan = planOperation(operation({ payload: { phoneMasked: 'x' } }), existing, NOW, 'uid');
    expect(plan.kind).toBe('ACCEPTED');
  });

  it('does not apply to entities that are not voters', () => {
    expect(consentProblem('incident', { title: 'x' }, null)).toBeNull();
    expect(consentProblem('household', { line1: 'x' }, null)).toBeNull();
    expect(consentProblem('diaryEntry', { title: 'x' }, null)).toBeNull();
  });

  it('explains why it is a typed rejection and not a permission error', () => {
    expect(CONSENT_BASIS).toMatch(/firestore\.rules enforces that/i);
    expect(CONSENT_BASIS).toMatch(/stops retrying/i);
  });
});

describe('soft delete', () => {
  it('sets deletedAt from the server clock', () => {
    const plan = planOperation(operation({ op: 'softDelete', payload: {} }), null, NOW, 'uid');
    expect(plan.kind).toBe('ACCEPTED');
    expect(plan.write).toMatchObject({ deletedAt: NOW });
  });

  it('loses to a newer server-side undelete', () => {
    const existing: ServerDocument = { deletedAt: null, _fieldUpdatedAt: { deletedAt: LATER } };
    const plan = planOperation(
      operation({ op: 'softDelete', payload: {}, localUpdatedAt: NOW }),
      existing,
      NOW,
      'uid',
    );
    expect(plan.kind).toBe('NOOP');
    expect(plan.conflict?.resolvedFields).toEqual(['deletedAt']);
  });
});

describe('batch validation', () => {
  const batch = (over: Record<string, unknown> = {}) => ({
    clientId: 'phone-1',
    idempotencyKey: 'k1',
    since: NOW,
    operations: [operation()],
    ...over,
  });

  it('accepts a well-formed batch', () => {
    expect(validateBatch(batch())).toBeNull();
  });

  it('requires an idempotency key, and says what it is for', () => {
    const problem = validateBatch(batch({ idempotencyKey: '' }));
    expect(problem?.status).toBe(400);
    expect(problem?.error).toMatch(/retried batch after a dropped response/i);
  });

  it('requires a clientId', () => {
    expect(validateBatch(batch({ clientId: '' }))?.status).toBe(400);
  });

  it('refuses an oversized batch with a 413 rather than truncating it', () => {
    const operations = Array.from({ length: SYNC_MAX_OPERATIONS_PER_BATCH + 1 }, (_, i) =>
      operation({ seq: i, entityId: `v${i}` }),
    );
    const problem = validateBatch(batch({ operations }));
    expect(problem?.status).toBe(413);
    expect(problem?.error).toMatch(/must chunk/i);
  });

  it('refuses two operations on the same document in one batch', () => {
    // Both would race inside the transaction and the loser would be
    // decided by array order rather than by its timestamp.
    const problem = validateBatch({
      ...batch(),
      operations: [operation({ seq: 1 }), operation({ seq: 2 })],
    });
    expect(problem?.status).toBe(400);
    expect(problem?.error).toMatch(/array order instead of by timestamp/i);
  });

  it('allows the same entityId across different entities', () => {
    expect(
      validateBatch({
        ...batch(),
        operations: [operation({ seq: 1 }), operation({ seq: 2, entity: 'household' })],
      }),
    ).toBeNull();
  });

  it('refuses a body that is not an object', () => {
    expect(validateBatch(null)?.status).toBe(400);
    expect(validateBatch('{}')?.status).toBe(400);
  });
});

describe('collection mapping', () => {
  it('maps every entity, with no default branch to fall through', () => {
    expect(collectionFor('voter')).toBe('voters');
    expect(collectionFor('household')).toBe('households');
    expect(collectionFor('incident')).toBe('incidents');
    expect(collectionFor('diaryEntry')).toBe('diaryEntries');
  });
});

describe('a new document', () => {
  it('gets createdAt and an explicit null deletedAt', () => {
    const plan = planOperation(operation(), null, NOW, 'uid');
    expect(plan.write).toMatchObject({ createdAt: NOW, deletedAt: null, updatedAt: NOW });
  });

  it('does not get createdAt rewritten on a later edit', () => {
    const existing: ServerDocument = { popiaConsentGiven: true, createdAt: EARLIER, _fieldUpdatedAt: {} };
    const plan = planOperation(operation({ payload: { phoneMasked: 'x' } }), existing, NOW, 'uid');
    expect(plan.write).not.toHaveProperty('createdAt');
  });
});
