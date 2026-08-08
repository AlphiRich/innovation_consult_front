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
