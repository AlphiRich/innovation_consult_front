import { describe, expect, it } from 'vitest';
import { currentYearMonth, decideReservation, usageDocId } from './sentimentBudget';

describe('decideReservation', () => {
  it('allows the first refresh of the month when no usage doc exists yet', () => {
    expect(decideReservation(undefined, 24)).toEqual({ allowed: true, nextCount: 1 });
  });

  it('allows a refresh strictly below the limit', () => {
    expect(decideReservation({ executionCount: 23 }, 24)).toEqual({ allowed: true, nextCount: 24 });
  });

  it('denies a refresh once the limit is already reached', () => {
    expect(decideReservation({ executionCount: 24 }, 24)).toEqual({ allowed: false, nextCount: 24 });
  });

  it('denies and does not go negative if usage is somehow already over the limit', () => {
    expect(decideReservation({ executionCount: 30 }, 24)).toEqual({ allowed: false, nextCount: 30 });
  });

  it('denies outright for a ward provisioned with a zero limit', () => {
    expect(decideReservation(undefined, 0)).toEqual({ allowed: false, nextCount: 0 });
  });
});

describe('usageDocId', () => {
  it('joins ward code and year-month with an underscore', () => {
    expect(usageDocId('NW405-W12', '2026-10')).toBe('NW405-W12_2026-10');
  });
});

describe('currentYearMonth', () => {
  it('formats as zero-padded YYYY-MM in UTC', () => {
    expect(currentYearMonth()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});
