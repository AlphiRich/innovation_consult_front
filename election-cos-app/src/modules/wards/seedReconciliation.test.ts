/**
 * Election Campaign OS — ward seed reconciliation
 *
 * The case that matters most is the one with no symptom: a seed that
 * stopped one ward short. Everything renders, every percentage computes,
 * and the seat projection is confidently wrong. Several of these tests
 * exist to make sure that case is BLOCKING rather than quiet.
 */
import { describe, expect, it } from 'vitest';
import type { Ward } from '@/dal/ports/wards';
import type { MunicipalityProfile } from '@/dal/ports/municipalityProfile';
import { RECONCILIATION_BASIS, reconcileSeed, type SeedIssueCode } from './seedReconciliation';

const ward = (over: Partial<Ward> = {}): Ward => ({
  id: over.wardCode ?? 'NW405-W01',
  tenantId: 't',
  wardCode: 'NW405-W01',
  municipalityCode: 'NW405',
  name: 'Ward 1',
  registeredVoters: 3500,
  vdCodes: ['86910138'],
  createdAt: '',
  updatedAt: '',
  updatedBy: 'system',
  deletedAt: null,
  schemaVersion: 1,
  ...over,
});

/** JB Marks as the gazette has it: 34 wards, 67 council seats. */
const profile = (over: Partial<MunicipalityProfile> = {}): MunicipalityProfile => ({
  id: 'municipality',
  tenantId: 't',
  municipalityCode: 'NW405',
  municipalityName: 'JB Marks Local Municipality',
  province: 'North West',
  totalCouncilSeats: 67,
  wardSeats: 34,
  prSeats: 33,
  createdAt: '',
  updatedAt: '',
  updatedBy: 'system',
  ...over,
});

const wards = (count: number, over: (i: number) => Partial<Ward> = () => ({})): Ward[] =>
  Array.from({ length: count }, (_, i) => {
    const code = `NW405-W${String(i + 1).padStart(2, '0')}`;
    return ward({ wardCode: code, id: code, name: `Ward ${i + 1}`, vdCodes: [`8691${1000 + i}`], ...over(i) });
  });

const codesOf = (issues: { code: SeedIssueCode }[]) => issues.map((i) => i.code);

describe('a complete seed', () => {
  it('reconciles when the ward count matches the profile', () => {
    const result = reconcileSeed(wards(34), profile());
    expect(result.issues).toEqual([]);
    expect(result.reconciled).toBe(true);
    expect(result.wardCount).toBe(34);
    expect(result.vdCount).toBe(34);
    expect(result.expectedWardCount).toBe(34);
  });

  it('sums registered voters across wards', () => {
    const result = reconcileSeed(wards(34), profile());
    expect(result.registeredVoters).toBe(34 * 3500);
  });

  it('ignores suppressed wards in every count', () => {
    const withDeleted = [...wards(34), ward({ wardCode: 'NW405-W99', id: 'NW405-W99', deletedAt: '2026-01-01' })];
    expect(reconcileSeed(withDeleted, profile()).reconciled).toBe(true);
    expect(reconcileSeed(withDeleted, profile()).wardCount).toBe(34);
  });
});

/**
 * The whole point of the module. A seed one ward short has no symptom
 * anywhere else in the application.
 */
describe('a seed that stopped short', () => {
  it('blocks on 33 of 34, and says how many are missing', () => {
    const result = reconcileSeed(wards(33), profile());
    expect(codesOf(result.blocking)).toContain('WARD_COUNT_MISMATCH');
    expect(result.reconciled).toBe(false);
    expect(result.blocking[0].message).toContain('1 ward(s) are missing');
  });

  it('blocks on too many wards, and says what that usually means', () => {
    const result = reconcileSeed(wards(35), profile());
    const found = result.blocking.find((i) => i.code === 'WARD_COUNT_MISMATCH')!;
    expect(found.message).toMatch(/captured twice|expected figure is wrong/i);
  });

  it('does not call an empty tenant a mismatch — it has not started', () => {
    const result = reconcileSeed([], profile());
    expect(codesOf(result.issues)).toEqual(['NO_WARDS_AT_ALL']);
    expect(result.reconciled).toBe(true);
  });
});

describe('the profile’s own arithmetic', () => {
  it('blocks when ward seats plus PR seats do not equal the total', () => {
    const result = reconcileSeed(wards(34), profile({ totalCouncilSeats: 66 }));
    expect(codesOf(result.blocking)).toContain('SEATS_DO_NOT_ADD_UP');
    expect(result.blocking[0].message).toContain('67');
  });

  it('accepts the real JB Marks figures, which is where these numbers come from', () => {
    // 34 ward + 33 PR = 67 council seats — the 2021 IEC seat-calculation
    // report for NW405, already a regression fixture in seatCalculator.test.ts.
    const real = profile();
    expect(real.wardSeats + real.prSeats).toBe(real.totalCouncilSeats);
    expect(reconcileSeed(wards(34), real).reconciled).toBe(true);
  });

  it('blocks with nothing else when Municipality Config is missing', () => {
    // One missing document, one message. Reporting every consequence of it
    // would bury the one thing to do about it.
    const result = reconcileSeed(wards(12), null);
    expect(codesOf(result.issues)).toEqual(['PROFILE_MISSING']);
    expect(result.expectedWardCount).toBeNull();
  });
});

describe('duplicates and strays', () => {
  it('blocks on a repeated ward code and names it', () => {
    const doubled = [...wards(34), ward({ wardCode: 'NW405-W01', id: 'dup' })];
    const result = reconcileSeed(doubled, profile());
    const found = result.blocking.find((i) => i.code === 'WARD_CODE_DUPLICATED')!;
    expect(found.wardCodes).toEqual(['NW405-W01']);
    expect(found.message).toMatch(/inflates the registered-voter total/i);
  });

  it('blocks on a ward from another municipality', () => {
    const mixed = [...wards(33), ward({ wardCode: 'NW403-W01', id: 'x', municipalityCode: 'NW403' })];
    const result = reconcileSeed(mixed, profile());
    expect(codesOf(result.blocking)).toContain('MUNICIPALITY_CODE_MISMATCH');
  });

  it('blocks on the same VD code twice inside one ward', () => {
    const doubledVd = wards(34, (i) => (i === 0 ? { vdCodes: ['86911000', '86911000'] } : {}));
    const result = reconcileSeed(doubledVd, profile());
    expect(codesOf(result.blocking)).toContain('VD_CODE_REPEATED_IN_WARD');
  });

  it('accepts the same VD code in two different wards, because the gazette does', () => {
    // ~19% of NW405's voting stations are split across a ward boundary —
    // the finding that made VotingDistrict.id the (ward, VD) pair. A
    // reconciliation that flagged this would flag a fifth of a real seed.
    const split = wards(34, (i) => (i < 2 ? { vdCodes: ['86910138'] } : {}));
    const result = reconcileSeed(split, profile());
    expect(codesOf(result.blocking)).not.toContain('VD_CODE_REPEATED_IN_WARD');
    expect(result.reconciled).toBe(true);
  });
});

describe('shapes that mean unfinished, not wrong', () => {
  it('warns about a ward with no voting districts without blocking', () => {
    const result = reconcileSeed(wards(34, (i) => (i === 0 ? { vdCodes: [] } : {})), profile());
    expect(codesOf(result.warnings)).toContain('WARD_WITHOUT_VDS');
    expect(result.reconciled).toBe(true);
    expect(result.warnings[0].message).toMatch(/nobody can be assigned/i);
  });

  it('warns about a ward with no registered voters without blocking', () => {
    const result = reconcileSeed(wards(34, (i) => (i === 0 ? { registeredVoters: 0 } : {})), profile());
    expect(codesOf(result.warnings)).toContain('WARD_WITHOUT_VOTERS');
    expect(result.reconciled).toBe(true);
  });
});

describe('what the check claims about itself', () => {
  it('says it compares the tenant against itself, not against the Board', () => {
    expect(RECONCILIATION_BASIS).toMatch(/not that either is correct/i);
    expect(RECONCILIATION_BASIS).toMatch(/Municipal Demarcation Board/);
    expect(RECONCILIATION_BASIS).toMatch(/read by a person/i);
  });

  it('claims no verification against any external source', () => {
    const result = reconcileSeed(wards(34), profile());
    const text = JSON.stringify(result) + RECONCILIATION_BASIS;
    expect(text).not.toMatch(/\bverified against\b/i);
    expect(text).not.toMatch(/\bconfirms?\b[^.]{0,40}\b(gazette|notice|Board)\b/i);
  });
});
