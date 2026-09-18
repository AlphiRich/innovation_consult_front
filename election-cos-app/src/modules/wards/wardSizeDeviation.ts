/**
 * Election Campaign OS — how evenly the wards are sized
 * IC-ECOS-BUILD-2026-V2 §6.1.
 *
 * WHY THIS EXISTS
 *
 * A source-acquisition plan supplied in session 33 proposed, as its
 * "control metric" for checking a demarcation gazette, *verification
 * against the maximum deviation norm from the municipal average*. That is
 * the one computational idea in a document otherwise made of folder names
 * and a pipeline that fetches nothing (see the register, entry 33.1), and
 * it is a good one: it is arithmetic over data the tenant already holds,
 * which is the same standard `seedReconciliation.ts` is built to.
 *
 * `reconcileSeed()` checks that the ward *count* and the ward *codes* are
 * right. It says nothing about their sizes. A seed can have all 34 wards,
 * no duplicates, correct codes, and one ward carrying four times the
 * voters of another — which is either a transcription error or a real
 * fact about the municipality, and a campaign needs to know which because
 * it decides how many canvassers a ward needs.
 *
 * THE THRESHOLD IS CONFIGURED AND CITED, NOT ASSERTED
 *
 * The supplied document gives the norm as 15% of the municipal average.
 * This build has **not verified that figure against the Municipal
 * Structures Act or the Municipal Demarcation Board's published
 * delimitation methodology**, and the sources were not reachable from the
 * build environment — the same position `prList.ts` takes on the party
 * list-length cap, and for the same reason: a wrong hard threshold that
 * flagged a lawful demarcation would be worse than no check.
 *
 * So the threshold is a parameter with a stated default and a stated
 * basis, every finding is a WARNING, and nothing here blocks anything.
 *
 * WHAT THE REFERENCE MUNICIPALITY ACTUALLY DOES
 *
 * Run against `seed-data/jb-marks-nw405-wards-vds.json`: 34 wards,
 * mean 3,590 registered voters, range 3,052 to 4,127. Every ward falls
 * inside ±15%, and the two extremes sit 0.5 and 1.5 voters inside the
 * bounds. `wardSizeDeviation.test.ts` computes that from the seed rather
 * than trusting this comment.
 *
 * That tightness is worth a second look by whoever holds the gazette. It
 * is what a demarcation drawn to a norm looks like; it is also what
 * generated figures look like. This module reports the arithmetic and
 * draws no conclusion about which — the same restraint applied to the
 * ward geometry in entry 32.1.
 */
import type { Ward } from '@/dal/ports/wards';

/**
 * Default deviation allowance, as a fraction of the municipal average.
 *
 * NOT independently verified — see the header. Overridable so that a
 * corrected figure is an argument, not a code change.
 */
export const DEFAULT_DEVIATION_ALLOWANCE = 0.15;

export const DEVIATION_BASIS =
  'Wards are compared against the average number of registered voters per ward in this municipality. The ' +
  'allowance used here is 15% of that average, taken from a supplied source-acquisition note and not ' +
  'confirmed against the Municipal Structures Act or the Demarcation Board’s published methodology in ' +
  'this build. Treat an outlier as a question for whoever holds the gazette, not as a finding that the ' +
  'demarcation is wrong. Nothing here blocks anything.';

export const WORKLOAD_BASIS =
  'This is also an operational number, not only a data check. A ward well above the average needs more ' +
  'canvassers to reach the same share of its doors, and a round planned on ward count alone will run short ' +
  'there first.';

export interface WardDeviation {
  wardCode: string;
  registeredVoters: number;
  /** Signed fraction of the mean: +0.12 is 12% above it. */
  deviation: number;
  outsideAllowance: boolean;
}

export interface WardSizeReport {
  wardCount: number;
  totalRegisteredVoters: number;
  /** Mean registered voters per ward. Zero when there are no wards. */
  mean: number;
  allowance: number;
  /** Every ward, smallest first. */
  wards: WardDeviation[];
  /** Wards outside the allowance, largest absolute deviation first. */
  outliers: WardDeviation[];
  /** Wards recorded with no registered voters at all. */
  emptyWards: string[];
  /**
   * Totals appearing on more than one ward. Not an error — two wards can
   * genuinely hold the same number — but repeated totals in a transcribed
   * gazette are worth a second look, and nothing else in the build would
   * mention them.
   */
  repeatedTotals: { registeredVoters: number; wardCodes: string[] }[];
}

export function analyseWardSizes(
  wards: Ward[],
  allowance: number = DEFAULT_DEVIATION_ALLOWANCE,
): WardSizeReport {
  const live = wards.filter((w) => w.deletedAt === null);
  const totalRegisteredVoters = live.reduce((sum, w) => sum + w.registeredVoters, 0);
  const mean = live.length > 0 ? totalRegisteredVoters / live.length : 0;

  const deviations: WardDeviation[] = live
    .map((ward) => {
      // A municipality with no voters recorded at all has no average to
      // deviate from. Reporting every ward as an outlier there would be
      // noise on a seed that simply has not been filled in yet.
      const deviation = mean > 0 ? (ward.registeredVoters - mean) / mean : 0;
      return {
        wardCode: ward.wardCode,
        registeredVoters: ward.registeredVoters,
        deviation,
        outsideAllowance: mean > 0 && Math.abs(deviation) > allowance,
      };
    })
    .sort((a, b) => a.registeredVoters - b.registeredVoters);

  const byTotal = new Map<number, string[]>();
  for (const ward of live) {
    byTotal.set(ward.registeredVoters, [...(byTotal.get(ward.registeredVoters) ?? []), ward.wardCode]);
  }

  return {
    wardCount: live.length,
    totalRegisteredVoters,
    mean,
    allowance,
    wards: deviations,
    outliers: deviations
      .filter((d) => d.outsideAllowance)
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)),
    emptyWards: live.filter((w) => w.registeredVoters === 0).map((w) => w.wardCode),
    repeatedTotals: [...byTotal.entries()]
      .filter(([, codes]) => codes.length > 1)
      .map(([registeredVoters, wardCodes]) => ({ registeredVoters, wardCodes: [...wardCodes].sort() }))
      .sort((a, b) => b.wardCodes.length - a.wardCodes.length),
  };
}

/** `+12.4%`, or `—` where there is no average to compare against. */
export function formatDeviation(deviation: number, mean: number): string {
  if (mean <= 0) return '—';
  return `${deviation >= 0 ? '+' : ''}${(deviation * 100).toFixed(1)}%`;
}
