import { describe, expect, it } from 'vitest';
import { SENTIMENT_META, SENTIMENT_ORDER } from './sentiment';

describe('sentiment metadata', () => {
  it('has an order entry and a meta entry for every enum value, one-to-one', () => {
    expect(SENTIMENT_ORDER).toHaveLength(5);
    expect(new Set(SENTIMENT_ORDER).size).toBe(5);
    for (const key of SENTIMENT_ORDER) {
      expect(SENTIMENT_META[key]).toBeDefined();
    }
  });

  it('is ordered opposition to support, left to right', () => {
    expect(SENTIMENT_ORDER).toEqual([
      'STRONG_OPPOSITION',
      'LEAN_OPPOSITION',
      'UNDECIDED',
      'LEAN_SUPPORT',
      'STRONG_SUPPORT',
    ]);
  });

  it('uses only design-token tone names, never raw colours', () => {
    const validTones = ['maroon', 'gold', 'slate', 'teal', 'green'];
    for (const meta of Object.values(SENTIMENT_META)) {
      expect(validTones).toContain(meta.tone);
    }
  });
});
