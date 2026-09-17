import { describe, expect, it } from 'vitest';
import type { DiaryActivityType } from '@/dal/ports/diary';
import { ACTIVITY_META, ACTIVITY_ORDER } from './diaryMeta';

const ALL_TYPES: DiaryActivityType[] = ['CANVASS', 'RALLY', 'OBSERVATION', 'OTHER'];

describe('diary activity metadata', () => {
  it('has an order entry and a meta entry for every activity type, one-to-one', () => {
    expect(ACTIVITY_ORDER).toHaveLength(4);
    expect(new Set(ACTIVITY_ORDER).size).toBe(4);
    expect([...ACTIVITY_ORDER].sort()).toEqual([...ALL_TYPES].sort());
    for (const key of ACTIVITY_ORDER) {
      expect(ACTIVITY_META[key]).toBeDefined();
    }
  });

  it('uses only design-token tone names, never raw colours', () => {
    const validTones = ['maroon', 'gold', 'slate', 'teal', 'green'];
    for (const meta of Object.values(ACTIVITY_META)) {
      expect(validTones).toContain(meta.tone);
    }
  });
});
