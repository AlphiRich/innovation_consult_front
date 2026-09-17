/**
 * Election Campaign OS — outbox helpers
 * IC-ECOS-BUILD-2026-V2 §7.3, §7.5, §7.6.
 *
 * enqueue() is the only way a local write becomes a pending sync operation.
 * applySyncResponse() is where accepted/rejected/conflicts from the server
 * get folded back into local state — this is the function that makes
 * §7.5 ("conflicts must be visible") and §7.6 ("rejections must be
 * actionable") real rather than aspirational.
 *
 * Every exported function here starts with `offlineDb.ensureOpen()`. These
 * are the three entry points that touch IndexedDB after the app may have
 * been backgrounded, and Dexie does not reopen a closed connection on its
 * own — see the note on `ensureOpen()` in db.ts.
 */
import { offlineDb, type ConflictEntry, type OutboxEntry, type SyncState } from './db';
import type { SyncOperation, SyncResponse } from './syncTypes';

export async function enqueue(entry: Omit<OutboxEntry, 'seq'>): Promise<void> {
  await offlineDb.ensureOpen();
  await offlineDb.outbox.add(entry as OutboxEntry);
  const table = tableFor(entry.entity);
  await table.update(entry.entityId, { _syncState: 'PENDING' as SyncState });
}

function tableFor(entity: OutboxEntry['entity']) {
  switch (entity) {
    case 'voter':
      return offlineDb.voters;
    case 'household':
      return offlineDb.households;
    case 'incident':
      return offlineDb.incidents;
    case 'diaryEntry':
      return offlineDb.diaryEntries;
  }
}

export async function drainOutboxBatch(maxOps: number): Promise<SyncOperation[]> {
  await offlineDb.ensureOpen();
  const entries = await offlineDb.outbox.orderBy('seq').limit(maxOps).toArray();
  return entries.map((e) => ({
    seq: e.seq!,
    entity: e.entity,
    entityId: e.entityId,
    op: e.op,
    payload: e.payload as Record<string, unknown>,
    localUpdatedAt: e._localUpdatedAt,
  }));
}

/**
 * Folds a SyncResponse back into local state. Never silently discards a
 * losing write (§7.5) and never leaves a rejected record retrying forever
 * (§7.6).
 */
export async function applySyncResponse(response: SyncResponse): Promise<void> {
  await offlineDb.ensureOpen();
  for (const accepted of response.accepted) {
    await offlineDb.outbox.delete(accepted.seq);
  }

  for (const rejected of response.rejected) {
    const outboxEntry = await offlineDb.outbox.get(rejected.seq);
    if (!outboxEntry) continue;
    const table = tableFor(outboxEntry.entity);
    if (!rejected.retryable) {
      // §7.6: stop retrying, surface it. The UI reads _syncState === 'REJECTED'.
      await table.update(outboxEntry.entityId, { _syncState: 'REJECTED' as SyncState });
      await offlineDb.outbox.delete(rejected.seq);
    }
    // retryable rejections are left in the outbox for the next sync attempt.
  }

  for (const conflict of response.conflicts) {
    const table = tableFor(conflict.entity as OutboxEntry['entity']);
    await table.update(conflict.entityId, { _syncState: 'CONFLICT' as SyncState });
    const entry: ConflictEntry = {
      id: crypto.randomUUID(),
      entity: conflict.entity,
      entityId: conflict.entityId,
      detectedAt: new Date().toISOString(),
      resolved: false,
      yours: conflict.yours,
      theirs: conflict.theirs,
      resolvedFields: conflict.resolvedFields,
    };
    // Never auto-discarded: written to the conflicts table for the review
    // queue, and `resolved` stays false until a human acts (§7.5).
    await offlineDb.conflicts.add(entry);
  }
}
