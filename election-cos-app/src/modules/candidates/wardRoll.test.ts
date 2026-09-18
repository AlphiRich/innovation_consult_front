/**
 * Election Campaign OS — guards on the ward candidate roll
 *
 * The tile this replaces read "100% — TARGET MET" over a claim that all
 * 242 wards were covered. Three things have to hold for a coverage figure
 * to mean anything, and each is a test here: it is counted against wards
 * that exist, a ward with two candidates is not better covered than one
 * with one, and a candidate whose ward code is wrong does not disappear.
 */
import { describe, expect, it } from 'vitest';
import type { Candidate } from '@/dal/ports/candidates';
import { buildWardRoll, COVERAGE_BASIS, DOUBLE_NOMINATION_BASIS } from './wardRoll';

const WARDS = ['NW405001', 'NW405002', 'NW405003'];

let seq = 0;
const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  id: `c${++seq}`,
  tenantId: 't',
  fullName: 'A. Candidate',
  affiliation: 'WARD',
  wardCode: 'NW405001',
  idNumberEncrypted: '',
  idNumberMasked: '••••••••• 9087',
  verificationStatus: 'PENDING',
  createdAt: '',
  updatedAt: '',
  updatedBy: 'u',
  deletedAt: null,
  schemaVersion: 1,
  ...over,
});

describe('the ward roll', () => {
  it('lists every loaded ward, including the empty ones', () => {
    const roll = buildWardRoll([candidate()], WARDS);
    expect(roll.entries.map((e) => e.wardCode)).toEqual(WARDS);
    expect(roll.wardCount).toBe(3);
  });

  it('names the wards with nobody standing, rather than only counting them', () => {
    const roll = buildWardRoll([candidate({ wardCode: 'NW405002' })], WARDS);
    expect(roll.covered).toEqual(['NW405002']);
    expect(roll.missing).toEqual(['NW405001', 'NW405003']);
  });

  it('does not count two candidates in a ward as coverage', () => {
    const roll = buildWardRoll(
      [candidate({ wardCode: 'NW405001' }), candidate({ wardCode: 'NW405001' })],
      WARDS,
    );
    expect(roll.doubled).toEqual(['NW405001']);
    expect(roll.covered).not.toContain('NW405001');
    expect(roll.missing).not.toContain('NW405001');
  });

  it('keeps a candidate whose ward this campaign has not loaded', () => {
    // A wrong ward code must make somebody visible as unplaceable, never
    // make them vanish from a roll their name should be on.
    const stray = candidate({ wardCode: 'NW999999', fullName: 'S. Ndlovu' });
    const roll = buildWardRoll([candidate(), stray], WARDS);
    expect(roll.unplaceable.map((c) => c.fullName)).toEqual(['S. Ndlovu']);
    expect(roll.entries.flatMap((e) => e.candidates)).not.toContainEqual(stray);
  });

  it('keeps a candidate with no ward code at all', () => {
    const roll = buildWardRoll([candidate({ wardCode: undefined })], WARDS);
    expect(roll.unplaceable).toHaveLength(1);
    expect(roll.missing).toEqual(WARDS);
  });

  it('ignores party-list candidates and suppressed records', () => {
    const roll = buildWardRoll(
      [
        candidate({ affiliation: 'PR', wardCode: undefined, listRank: 1 }),
        candidate({ wardCode: 'NW405001', deletedAt: '2026-01-01' }),
        candidate({ wardCode: 'NW405002' }),
      ],
      WARDS,
    );
    expect(roll.covered).toEqual(['NW405002']);
    expect(roll.unplaceable).toEqual([]);
    expect(roll.entries.flatMap((e) => e.candidates)).toHaveLength(1);
  });

  it('has nothing to count against when no wards are loaded', () => {
    // Zero of zero is not full coverage. Every candidate becomes
    // unplaceable, which is the honest reading and the one that sends an
    // administrator to seed the wards.
    const roll = buildWardRoll([candidate()], []);
    expect(roll.wardCount).toBe(0);
    expect(roll.covered).toEqual([]);
    expect(roll.missing).toEqual([]);
    expect(roll.unplaceable).toHaveLength(1);
  });

  it('accounts for every loaded ward exactly once', () => {
    const roll = buildWardRoll(
      [
        candidate({ wardCode: 'NW405001' }),
        candidate({ wardCode: 'NW405002' }),
        candidate({ wardCode: 'NW405002' }),
      ],
      WARDS,
    );
    expect(roll.covered.length + roll.missing.length + roll.doubled.length).toBe(roll.wardCount);
  });
});

describe('what the coverage figure says about itself', () => {
  it('refuses to be read as a target met', () => {
    expect(COVERAGE_BASIS).toMatch(/not against a target anybody typed/i);
    expect(COVERAGE_BASIS).toMatch(/listed by code rather than summarised as a percentage/i);
    expect(COVERAGE_BASIS).not.toMatch(/\b(target met|100%|complete coverage)\b/i);
  });

  it('is clear that a double nomination is a finding', () => {
    expect(DOUBLE_NOMINATION_BASIS).toMatch(/never coverage/i);
    expect(DOUBLE_NOMINATION_BASIS).toMatch(/needs a person/i);
  });
});
