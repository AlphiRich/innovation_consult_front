import { describe, expect, it } from 'vitest';
import { EcosOfflineDb, assertNoFinancialTables, offlineDb } from './db';

// IC-ECOS-BUILD-2026-V2 §7.1: "The Dexie schema must contain no donor,
// donation, or PPFA table ... If you find yourself adding a donation table
// to IndexedDB, stop and raise it." This test is the tripwire.
describe('offline schema (§7.2) contains no PPFA data', () => {
  it('the real schema has exactly the tables specified in §7.2', () => {
    const names = offlineDb.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      ['conflicts', 'diaryEntries', 'households', 'incidents', 'outbox', 'photoQueue', 'voters'].sort(),
    );
  });

  it('assertNoFinancialTables passes on the real schema', () => {
    expect(() => assertNoFinancialTables(offlineDb)).not.toThrow();
  });

  it('assertNoFinancialTables catches a hypothetical donations table', () => {
    class BadDb extends EcosOfflineDb {
      constructor() {
        super();
        this.version(2).stores({ donations: 'id, tenantId' });
      }
    }
    const bad = new BadDb();
    expect(() => assertNoFinancialTables(bad)).toThrow(/§7.1|forbidden/);
  });
});

// Session 14. The premise these tests protect is that Dexie does NOT
// transparently reopen a closed connection — the first test below proves
// that premise against the real Dexie version rather than assuming it, so
// if a future Dexie release changes the behaviour this suite says so
// instead of silently protecting nothing.
describe('connection lifecycle — ensureOpen()', () => {
  it('a closed connection really does reject writes (the failure ensureOpen exists for)', async () => {
    await offlineDb.open();
    offlineDb.close();
    expect(offlineDb.isOpen()).toBe(false);

    await expect(
      offlineDb.voters.put({ id: 'closed-1', vdCode: 'VD1', _syncState: 'LOCAL_ONLY', _localUpdatedAt: 'x' }),
    ).rejects.toThrow(/closed/i);
  });

  it('ensureOpen() reopens a closed connection and writes succeed again', async () => {
    await offlineDb.open();
    offlineDb.close();
    expect(offlineDb.isOpen()).toBe(false);

    await offlineDb.ensureOpen();

    expect(offlineDb.isOpen()).toBe(true);
    await offlineDb.voters.put({ id: 'reopened-1', vdCode: 'VD1', _syncState: 'LOCAL_ONLY', _localUpdatedAt: 'x' });
    expect(await offlineDb.voters.get('reopened-1')).toBeDefined();
  });

  it('ensureOpen() is a no-op on an already-open connection', async () => {
    await offlineDb.open();
    await offlineDb.ensureOpen();
    expect(offlineDb.isOpen()).toBe(true);
  });
});
