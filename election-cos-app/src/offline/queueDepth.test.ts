/**
 * Election Campaign OS — the local queue depth
 *
 * The number this returns is what decides whether a canvasser is told
 * their day is filed. The two things worth guarding are that it counts
 * every table work can hide in, and that a read it could not perform
 * comes back as `null` rather than as a reassuring zero.
 *
 * Proved by injection, each separately, then reverted clean:
 *
 *  - counting `outbox` alone → "counts the photo queue as well as the
 *    outbox" fails.
 *  - `return 0` in the catch → "returns null, never zero, when IndexedDB
 *    cannot be read" fails.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineDb } from './db';
import { readQueueDepth } from './queueDepth';

beforeEach(async () => {
  await offlineDb.ensureOpen();
  await Promise.all(offlineDb.tables.map((t) => t.clear()));
  vi.restoreAllMocks();
});

const outboxEntry = (entityId: string) => ({
  entity: 'voter' as const,
  entityId,
  op: 'upsert' as const,
  payload: {},
  _localUpdatedAt: new Date().toISOString(),
});

describe('readQueueDepth', () => {
  it('is zero on an empty database, and that zero is real', async () => {
    // Distinct from `null`: this one was measured.
    await expect(readQueueDepth()).resolves.toBe(0);
  });

  it('counts queued operations', async () => {
    await offlineDb.outbox.bulkAdd([outboxEntry('v1'), outboxEntry('v2')]);
    await expect(readQueueDepth()).resolves.toBe(2);
  });

  it('counts the photo queue as well as the outbox', async () => {
    /**
     * Nothing in the application writes `photoQueue` yet, so counting the
     * outbox alone has never produced a wrong number. It would the first
     * time an incident photo is queued — the canvasser would be told
     * nothing was waiting while the evidence for an incident report sat
     * in IndexedDB on that handset.
     */
    await offlineDb.outbox.add(outboxEntry('v1'));
    await offlineDb.photoQueue.add({
      id: 'p1',
      incidentId: 'i1',
      blob: new Blob(['x']),
      _syncState: 'PENDING',
    });

    await expect(readQueueDepth()).resolves.toBe(2);
  });

  it('does not count unresolved conflicts', async () => {
    /**
     * A conflict has reached the server and been found to disagree with
     * what was there. It is not work waiting to be sent, it needs a
     * person to decide, and folding it into "sending" would hide it
     * behind a spinner that will never stop.
     */
    await offlineDb.conflicts.add({
      id: 'c1',
      entity: 'voter',
      entityId: 'v1',
      detectedAt: new Date().toISOString(),
      resolved: false,
    });

    await expect(readQueueDepth()).resolves.toBe(0);
  });

  it('returns null, never zero, when IndexedDB cannot be read', async () => {
    // Private browsing, a locked profile, storage pressure, a schema
    // upgrade blocked by another tab. A zero here would tell somebody
    // their work was sent when it is in a profile they are about to
    // clear.
    vi.spyOn(offlineDb.outbox, 'count').mockRejectedValue(new Error('DatabaseClosedError'));

    await expect(readQueueDepth()).resolves.toBeNull();
  });

  it('returns null when the database cannot even be opened', async () => {
    vi.spyOn(offlineDb, 'ensureOpen').mockRejectedValue(new Error('QuotaExceededError'));

    await expect(readQueueDepth()).resolves.toBeNull();
  });
});
