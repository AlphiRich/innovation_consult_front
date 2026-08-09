import { describe, expect, it } from 'vitest';
import type { WarRoomCounters } from '@/dal/ports/warRoomCounters';
import { summarizeSentiment } from './sentimentSummary';

function counters(overrides: Partial<WarRoomCounters['sentimentBreakdown']> = {}): WarRoomCounters {
  const breakdown = {
    STRONG_SUPPORT: 0,
    LEAN_SUPPORT: 0,
    UNDECIDED: 0,
    LEAN_OPPOSITION: 0,
    STRONG_OPPOSITION: 0,
    ...overrides,
  };
  const totalVoters = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return {
    totalVoters,
    sentimentBreakdown: breakdown,
    incidentsByStatus: {
      LOGGED: 0,
      TRIAGED: 0,
      ESCALATED: 0,
      REFERRED: 0,
      RESOLVED: 0,
      CLOSED: 0,
    },
    totalHouseholdsVisited: 0,
    updatedAt: null,
  };
}

describe('summarizeSentiment', () => {
  it('an empty tenant produces all zeros, not NaN or a crash', () => {
    const s = summarizeSentiment(counters());
    expect(s).toEqual({
      totalVoters: 0,
      supportCount: 0,
      oppositionCount: 0,
      undecidedCount: 0,
      supportPct: 0,
      oppositionPct: 0,
      undecidedPct: 0,
      netSentimentIndex: 0,
    });
  });

  it('combines STRONG_SUPPORT + LEAN_SUPPORT into supportCount, and the opposition pair likewise', () => {
    const s = summarizeSentiment(
      counters({ STRONG_SUPPORT: 30, LEAN_SUPPORT: 20, STRONG_OPPOSITION: 10, LEAN_OPPOSITION: 5, UNDECIDED: 35 }),
    );
    expect(s.totalVoters).toBe(100);
    expect(s.supportCount).toBe(50);
    expect(s.oppositionCount).toBe(15);
    expect(s.undecidedCount).toBe(35);
    expect(s.supportPct).toBe(50);
    expect(s.oppositionPct).toBe(15);
    expect(s.undecidedPct).toBe(35);
  });

  it('an all-support tenant has a net sentiment index of +100', () => {
    expect(summarizeSentiment(counters({ STRONG_SUPPORT: 40 })).netSentimentIndex).toBe(100);
  });

  it('an all-opposition tenant has a net sentiment index of -100', () => {
    expect(summarizeSentiment(counters({ STRONG_OPPOSITION: 40 })).netSentimentIndex).toBe(-100);
  });

  it('a perfectly balanced tenant has a net sentiment index of 0', () => {
    expect(summarizeSentiment(counters({ STRONG_SUPPORT: 20, STRONG_OPPOSITION: 20 })).netSentimentIndex).toBe(0);
  });
});
