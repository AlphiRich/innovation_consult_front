/**
 * Election Campaign OS — tenant-wide sentiment summary
 * IC-ECOS-BUILD-2026-V2 §8.1, §8.3. Derives a single net sentiment index
 * from the real warRoomCounters aggregate (§7.4 pre-aggregated-only rule
 * — no live collection scan). Deliberately NOT a per-ward breakdown or
 * ranking — the counters this build maintains are tenant-wide only; see
 * ScheduledReportsPage.tsx's header for what a richer, ward-segmented
 * version would need that doesn't exist yet.
 */
import type { WarRoomCounters } from '@/dal/ports/warRoomCounters';

export interface SentimentSummary {
  totalVoters: number;
  supportCount: number;
  oppositionCount: number;
  undecidedCount: number;
  supportPct: number;
  oppositionPct: number;
  undecidedPct: number;
  /** (support - opposition) / total, as a percentage, -100..100. Positive leans supportive. */
  netSentimentIndex: number;
}

export function summarizeSentiment(counters: WarRoomCounters): SentimentSummary {
  const b = counters.sentimentBreakdown;
  const supportCount = b.STRONG_SUPPORT + b.LEAN_SUPPORT;
  const oppositionCount = b.STRONG_OPPOSITION + b.LEAN_OPPOSITION;
  const undecidedCount = b.UNDECIDED;
  const total = counters.totalVoters;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    totalVoters: total,
    supportCount,
    oppositionCount,
    undecidedCount,
    supportPct: pct(supportCount),
    oppositionPct: pct(oppositionCount),
    undecidedPct: pct(undecidedCount),
    netSentimentIndex: total > 0 ? Math.round(((supportCount - oppositionCount) / total) * 100) : 0,
  };
}
