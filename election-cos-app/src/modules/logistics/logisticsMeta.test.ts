import { describe, expect, it } from 'vitest';
import type { LogisticsItem, LogisticsUrgency } from '@/dal/ports/logistics';
import { STATUS_LABEL, STATUS_ORDER, URGENCY_META, URGENCY_ORDER } from './logisticsMeta';

const ALL_URGENCIES: LogisticsUrgency[] = ['ROUTINE', 'URGENT', 'IMMEDIATE'];
const ALL_STATUSES: LogisticsItem['status'][] = ['AVAILABLE', 'REQUESTED', 'APPROVED', 'DISPATCHED', 'DEPLETED'];

describe('logistics metadata', () => {
  it('has an order entry and a meta entry for every urgency, one-to-one', () => {
    expect(URGENCY_ORDER).toHaveLength(3);
    expect([...URGENCY_ORDER].sort()).toEqual([...ALL_URGENCIES].sort());
    for (const u of URGENCY_ORDER) expect(URGENCY_META[u]).toBeDefined();
  });

  it('orders urgency least to most time-critical', () => {
    expect(URGENCY_ORDER).toEqual(['ROUTINE', 'URGENT', 'IMMEDIATE']);
  });

  it('uses only design-token tone names, never raw colours', () => {
    const validTones = ['maroon', 'gold', 'slate', 'teal', 'green'];
    for (const meta of Object.values(URGENCY_META)) {
      expect(validTones).toContain(meta.tone);
    }
  });

  it('has a label for every status, and STATUS_ORDER covers every status exactly once', () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual([...ALL_STATUSES].sort());
    expect(STATUS_ORDER).toHaveLength(5);
    expect(new Set(STATUS_ORDER).size).toBe(5);
  });
});
