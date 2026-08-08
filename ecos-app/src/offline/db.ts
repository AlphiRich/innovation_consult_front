/**
 * Election Campaign OS — offline local database (Dexie / IndexedDB)
 * IC-ECOS-BUILD-2026-V2 §7.2.
 *
 * DELIBERATELY NO donor/donation/PPFA TABLE HERE. §7.1: "The Dexie schema
 * must contain no donor, donation, or PPFA table. Financial records must
 * not sit unencrypted in a canvasser's browser storage, and a donation
 * captured offline against a stale threshold would aggregate incorrectly
 * on sync. If you find yourself adding a donation table to IndexedDB,
 * stop and raise it." The Funding & Disclosure module (src/modules/finance)
 * must never import this file.
 */
import Dexie, { type Table } from 'dexie';

export type SyncState = 'LOCAL_ONLY' | 'PENDING' | 'SYNCED' | 'REJECTED' | 'CONFLICT';

export interface LocalRecord {
  id: string;
  vdCode: string;
  _syncState: SyncState;
  _localUpdatedAt: string;
  [key: string]: unknown;
}

export interface PhotoQueueItem {
  id: string;
  incidentId: string;
  blob: Blob; // Blobs, not Base64 — more space-efficient in IndexedDB, §7.2
  _syncState: SyncState;
}

export interface OutboxEntry {
  seq?: number; // auto-increment
  entity: 'voter' | 'household' | 'incident' | 'diaryEntry';
  entityId: string;
  op: 'upsert' | 'softDelete';
  payload: unknown;
  _localUpdatedAt: string;
}

export interface ConflictEntry {
  id: string;
  entity: string;
  entityId: string;
  detectedAt: string;
  resolved: boolean;
  yours?: unknown;
  theirs?: unknown;
  resolvedFields?: string[];
}

export class EcosOfflineDb extends Dexie {
  voters!: Table<LocalRecord, string>;
  households!: Table<LocalRecord, string>;
  incidents!: Table<LocalRecord, string>;
  diaryEntries!: Table<LocalRecord, string>;
  photoQueue!: Table<PhotoQueueItem, string>;
  outbox!: Table<OutboxEntry, number>;
  conflicts!: Table<ConflictEntry, string>;

  constructor() {
    super('ecos-offline');
    // Schema exactly per §7.2 — do not add a donor/donation/ppfaConfig
    // table to this version or any future version without re-reading §7.1.
    this.version(1).stores({
      voters: 'id, vdCode, _syncState, _localUpdatedAt',
      households: 'id, vdCode, _syncState, _localUpdatedAt',
      incidents: 'id, vdCode, _syncState, _localUpdatedAt',
      diaryEntries: 'id, vdCode, _syncState, _localUpdatedAt',
      photoQueue: 'id, incidentId, _syncState',
      outbox: '++seq, entity, entityId, op, _localUpdatedAt',
      conflicts: 'id, entity, entityId, detectedAt, resolved',
    });
  }
}

export const offlineDb = new EcosOfflineDb();

const FORBIDDEN_TABLE_NAMES = ['donor', 'donation', 'ppfa'];

/**
 * Guard exercised by db.test.ts and re-checked at module init: fails loudly
 * if a future edit adds a table whose name matches the forbidden list,
 * rather than relying on code review catching it (§7.1).
 */
export function assertNoFinancialTables(db: EcosOfflineDb): void {
  const tableNames = db.tables.map((t) => t.name.toLowerCase());
  for (const forbidden of FORBIDDEN_TABLE_NAMES) {
    if (tableNames.some((name) => name.includes(forbidden))) {
      throw new Error(
        `Offline DB schema contains a table matching "${forbidden}" — forbidden by §7.1. ` +
          `PPFA data must never be written to IndexedDB.`,
      );
    }
  }
}

assertNoFinancialTables(offlineDb);
