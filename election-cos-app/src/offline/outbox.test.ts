import { beforeEach, describe, expect, it } from 'vitest';
import { offlineDb } from './db';
import { applySyncResponse, drainOutboxBatch, enqueue } from './outbox';
import type { SyncResponse } from './syncTypes';

async function seedVoter(id: string) {
  await offlineDb.voters.put({ id, vdCode: 'VD1', _syncState: 'LOCAL_ONLY', _localUpdatedAt: new Date().toISOString() });
}

beforeEach(async () => {
  // Some tests below deliberately close the connection; reopen before
  // clearing so this suite stays order-independent.
  await offlineDb.ensureOpen();
  await Promise.all(offlineDb.tables.map((t) => t.clear()));
});

describe('enqueue', () => {
  it('marks the local record PENDING and adds an outbox entry', async () => {
    await seedVoter('v1');
    await enqueue({ entity: 'voter', entityId: 'v1', op: 'upsert', payload: { id: 'v1' }, _localUpdatedAt: new Date().toISOString() });

    const voter = await offlineDb.voters.get('v1');
    expect(voter?._syncState).toBe('PENDING');

    const batch = await drainOutboxBatch(10);
    expect(batch).toHaveLength(1);
    expect(batch[0].entityId).toBe('v1');
  });
});

describe('applySyncResponse (§7.5 conflicts visible, §7.6 rejections actionable)', () => {
  it('accepted operations are removed from the outbox', async () => {
    await seedVoter('v1');
    await enqueue({ entity: 'voter', entityId: 'v1', op: 'upsert', payload: {}, _localUpdatedAt: new Date().toISOString() });
    const [op] = await drainOutboxBatch(10);

    const response: SyncResponse = {
      accepted: [{ seq: op.seq, serverId: 'v1', serverUpdatedAt: new Date().toISOString() }],
      rejected: [],
      conflicts: [],
      changes: [],
      nextSince: new Date().toISOString(),
    };
    await applySyncResponse(response);
    expect(await drainOutboxBatch(10)).toHaveLength(0);
  });

  it('a non-retryable rejection (CONSENT_REQUIRED) stops retrying and marks the record REJECTED, never silently', async () => {
    await seedVoter('v2');
    await enqueue({ entity: 'voter', entityId: 'v2', op: 'upsert', payload: {}, _localUpdatedAt: new Date().toISOString() });
    const [op] = await drainOutboxBatch(10);

    const response: SyncResponse = {
      accepted: [],
      rejected: [{ seq: op.seq, code: 'CONSENT_REQUIRED', retryable: false, message: 'no consent' }],
      conflicts: [],
      changes: [],
      nextSince: new Date().toISOString(),
    };
    await applySyncResponse(response);

    const voter = await offlineDb.voters.get('v2');
    expect(voter?._syncState).toBe('REJECTED');
    expect(await drainOutboxBatch(10)).toHaveLength(0); // stopped retrying
  });

  it('a retryable rejection stays in the outbox for the next attempt', async () => {
    await seedVoter('v3');
    await enqueue({ entity: 'voter', entityId: 'v3', op: 'upsert', payload: {}, _localUpdatedAt: new Date().toISOString() });
    const [op] = await drainOutboxBatch(10);

    await applySyncResponse({
      accepted: [],
      rejected: [{ seq: op.seq, code: 'UNKNOWN', retryable: true, message: 'transient' }],
      conflicts: [],
      changes: [],
      nextSince: new Date().toISOString(),
    });

    expect(await drainOutboxBatch(10)).toHaveLength(1);
  });

  it('enqueue survives the browser having closed the connection (backgrounded tab)', async () => {
    // The real-world case this covers: a canvasser backgrounds the app,
    // the browser closes IndexedDB under storage pressure, they return and
    // log a canvass result. Without ensureOpen() in enqueue() that write
    // rejects with DatabaseClosedError and the result is lost.
    await seedVoter('v5');
    offlineDb.close();
    expect(offlineDb.isOpen()).toBe(false);

    await enqueue({ entity: 'voter', entityId: 'v5', op: 'upsert', payload: { id: 'v5' }, _localUpdatedAt: new Date().toISOString() });

    const batch = await drainOutboxBatch(10);
    expect(batch).toHaveLength(1);
    expect(batch[0].entityId).toBe('v5');
  });

  it('applySyncResponse survives a closed connection too', async () => {
    await seedVoter('v6');
    await enqueue({ entity: 'voter', entityId: 'v6', op: 'upsert', payload: {}, _localUpdatedAt: new Date().toISOString() });
    const [op] = await drainOutboxBatch(10);

    offlineDb.close();

    await applySyncResponse({
      accepted: [{ seq: op.seq, serverId: 'v6', serverUpdatedAt: new Date().toISOString() }],
      rejected: [],
      conflicts: [],
      changes: [],
      nextSince: new Date().toISOString(),
    });

    expect(await drainOutboxBatch(10)).toHaveLength(0);
  });

  it('a genuine conflict is written to the conflicts table, never silently discarded, and marks CONFLICT state', async () => {
    await seedVoter('v4');
    await applySyncResponse({
      accepted: [],
      rejected: [],
      conflicts: [
        {
          seq: 1,
          entity: 'voter',
          entityId: 'v4',
          yours: { sentiment: 'UNDECIDED' },
          theirs: { sentiment: 'LEAN_SUPPORT' },
          resolution: 'SERVER_WINS',
          resolvedFields: ['sentiment'],
        },
      ],
      changes: [],
      nextSince: new Date().toISOString(),
    });

    const voter = await offlineDb.voters.get('v4');
    expect(voter?._syncState).toBe('CONFLICT');

    const conflicts = await offlineDb.conflicts.where('entityId').equals('v4').toArray();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].resolved).toBe(false); // never auto-discarded
  });
});
