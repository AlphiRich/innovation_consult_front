import { describe, expect, it } from 'vitest';
import { centsToRand, randToCents, formatZAR } from './money';

describe('money helpers (§6.8.2 — integer cents, never a float)', () => {
  it('centsToRand rejects non-integer input', () => {
    expect(() => centsToRand(100.5)).toThrow();
  });

  it('round-trips rand -> cents -> rand without drift', () => {
    expect(centsToRand(randToCents(160_000))).toBe(160_000);
  });

  it('formats the R200,000 disclosure threshold correctly', () => {
    expect(formatZAR(200_000_00)).toContain('200');
    expect(formatZAR(200_000_00)).toContain('000');
  });
});
