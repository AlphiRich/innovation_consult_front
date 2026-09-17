import { describe, expect, it } from 'vitest';
import { deriveFinancialYear, deriveQuarter } from './financialYear';

describe('deriveFinancialYear (April-start, the provisional default)', () => {
  it('a date in April starts a new financial year', () => {
    expect(deriveFinancialYear(new Date('2026-04-01'), 4)).toBe('2026/27');
  });

  it('a date in March belongs to the financial year that started the previous April', () => {
    expect(deriveFinancialYear(new Date('2027-03-31'), 4)).toBe('2026/27');
  });

  it('a date in January belongs to the financial year that started the previous April', () => {
    expect(deriveFinancialYear(new Date('2027-01-15'), 4)).toBe('2026/27');
  });
});

describe('deriveQuarter (April-start, the provisional default)', () => {
  it('April–June is Q1', () => {
    expect(deriveQuarter(new Date('2026-04-01'), 4)).toBe(1);
    expect(deriveQuarter(new Date('2026-06-30'), 4)).toBe(1);
  });

  it('July–September is Q2', () => {
    expect(deriveQuarter(new Date('2026-07-01'), 4)).toBe(2);
  });

  it('October–December is Q3', () => {
    expect(deriveQuarter(new Date('2026-10-01'), 4)).toBe(3);
  });

  it('January–March is Q4', () => {
    expect(deriveQuarter(new Date('2027-01-01'), 4)).toBe(4);
    expect(deriveQuarter(new Date('2027-03-31'), 4)).toBe(4);
  });
});

describe('a non-April financial year start month (in case Sec6.8.1 Q2 resolves differently)', () => {
  it('January-start behaves like a plain calendar year', () => {
    expect(deriveFinancialYear(new Date('2026-01-01'), 1)).toBe('2026/27');
    expect(deriveQuarter(new Date('2026-01-01'), 1)).toBe(1);
    expect(deriveQuarter(new Date('2026-12-31'), 1)).toBe(4);
  });
});
