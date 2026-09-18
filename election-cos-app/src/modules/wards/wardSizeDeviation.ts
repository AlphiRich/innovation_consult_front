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
 * THE THRESHOLD WAS BORROWED. IT IS NOW SOURCED.
 *
 * The supplied document gave the norm as 15% of the municipal average and
 * cited nothing, so sessions 33 and 34 shipped it as a parameter whose
 * own basis text admitted it was unverified.
 *
 * Session 35 received Annexure A to IEC Circular 1 of 2025, which prints
 * a Norm, a Min_Norm, a Max_Norm and a 15%_Deviation for every one of the
 * 214 warded municipalities in South Africa. The extraction
 * (`tools/annexure/extract-annexure-a.py`) checks that
 * `norm == voters // wards`, `deviation == floor(norm * 0.15)` and the
 * two bounds are `norm -/+ deviation` on every row, and all 214 hold
 * without an exception. The 15% is the IEC's own published arithmetic.
 *
 * What is still *not* claimed: which provision of the Municipal
 * Structures Act or which Demarcation Board methodology the IEC is
 * applying. The circular does not cite one and this build has not read
 * the Act. So the threshold stays a parameter, every finding stays a
 * WARNING, and nothing here blocks anything — the same position
 * `prList.ts` holds on the party list-length cap.
 *
 * `municipalRegister.ts` compares wards against the published integer
 * band directly, which is exact where this module's ±15% of an exact mean
 * is a close approximation of it. Both are shown; they answer slightly
 * different questions and a campaign should see when they differ.
 *
 * WHAT THE REFERENCE MUNICIPALITY ACTUALLY DOES
 *
 * Run against `seed-data/jb-marks-nw405-wards-vds.json`: 34 wards,
 * mean 3,590 registered voters, range 3,052 to 4,127. Every ward falls
 * inside ±15%, and the two extremes sit 0.5 and 1.5 voters inside the
 * bounds. `wardSizeDeviation.test.ts` computes that from the seed rather
 * than trusting this comment.
 *
 * Session 33 flagged that tightness as ambiguous — a demarcation drawn to
 * a norm and generated figures look the same from inside. Annexure A
 * resolves it as far as the totals go: the IEC independently publishes
 * NW405 as 122,059 voters across 34 wards, which is what the gazette
 * parser produced to the voter, from a different document issued by a
 * different body. The per-ward split still rests on the provincial
 * gazette alone, and this module still draws no conclusion about it.
 */
import type { Ward } from '@/dal/ports/wards';

/**
 * Default deviation allowance, as a fraction of the municipal average.
 *
 * The figure the IEC publishes — see the header. Still overridable, so a
 * municipality working to a different band is an argument rather than a
 * code change.
 */
export const DEFAULT_DEVIATION_ALLOWANCE = 0.15;

export const DEVIATION_BASIS =
  'Wards are compared against the average number of registered voters per ward in this municipality. The ' +
  'allowance is 15% of that average, which is the band the IEC itself publishes: Annexure A to Circular 1 ' +
  'of 2025 prints a Norm, a 15% deviation and a minimum and maximum either side of it for every warded ' +
  'municipality in the country, and the four columns hold together exactly on all 214 of them. Which ' +
  'provision of the Municipal Structures Act sits behind the 15% is not quoted here — the circular does ' +
  'not cite one. Treat an outlier as a question for whoever holds the gazette, not as a finding that the ' +
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
