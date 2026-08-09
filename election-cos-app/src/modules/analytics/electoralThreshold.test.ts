import { describe, expect, it } from 'vitest';
import { meetsQualificationThreshold, pctOfTotal, votesNeededForThreshold } from './electoralThreshold';

describe('electoral qualification threshold (1%, Schedule 1 Step 2)', () => {
  it('computes % of total valid votes', () => {
    expect(pctOfTotal(1_000, 100_000)).toBeCloseTo(1);
    expect(pctOfTotal(50, 100_000)).toBeCloseTo(0.05);
  });

  it('a party exactly at 1% meets the threshold', () => {
    expect(meetsQualificationThreshold(1_000, 100_000)).toBe(true);
  });

  it('a party just under 1% does not meet the threshold', () => {
    expect(meetsQualificationThreshold(999, 100_000)).toBe(false);
  });

  it('reproduces the real NW405 2021 result: every party in the actual report cleared 1% except the four with zero seats', () => {
    // Source: docs/nw405-seed-data.md — real IEC report, 101,439 total valid votes.
    expect(meetsQualificationThreshold(48_911, 101_439)).toBe(true); // ANC
    expect(meetsQualificationThreshold(25_837, 101_439)).toBe(true); // DA
    expect(meetsQualificationThreshold(9_200, 101_439)).toBe(true); // EFF
    expect(meetsQualificationThreshold(13_800, 101_439)).toBe(true); // VF+
    expect(meetsQualificationThreshold(2_389, 101_439)).toBe(true); // PA — smallest vote count among parties that won seats
    expect(meetsQualificationThreshold(340, 101_439)).toBe(false); // ABC — 0 seats in the real result
  });

  it('votesNeededForThreshold is 0 once a party already qualifies', () => {
    expect(votesNeededForThreshold(2_000, 100_000)).toBe(0);
  });

  it('votesNeededForThreshold reports the exact shortfall', () => {
    expect(votesNeededForThreshold(900, 100_000)).toBe(100);
  });

  it('a municipality with zero valid votes never qualifies anyone, and needs nothing (undefined scenario, not a crash)', () => {
    expect(meetsQualificationThreshold(0, 0)).toBe(false);
    expect(votesNeededForThreshold(0, 0)).toBe(0);
  });
});
