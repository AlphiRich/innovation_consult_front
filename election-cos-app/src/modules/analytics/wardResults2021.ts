/**
 * Election Campaign OS — the 2021 ward-ballot result for NW405
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * Generated data, loaded rather than typed: `seed-data/nw405-2021-ward-results.json`
 * is written by `tools/seed-data/parse-nw405-2021-results.mjs`, which
 * carries five reconciliations against figures this module does not
 * contain. Re-run it with `--check` to re-prove them.
 *
 * WHAT THE FILE HOLDS, AND THE THING IT DOES NOT
 *
 * One row per ward: the winner, the runner-up, their votes, and the ward's
 * own valid-vote total. **Not** a full per-party ward breakdown. In 2021,
 * `VOTES_OUTSIDE_TOP_TWO` — 5 989 votes, 11.7% of the ward ballot — went
 * to parties in neither position and cannot be recovered from this file.
 *
 * That constraint is the reason `wardScenario.ts` models a ward as a
 * two-party contest and says so, rather than quietly pretending the top
 * two are the whole ward.
 *
 * WHICH DELIMITATION THESE WARDS BELONG TO
 *
 * The 2021 one, which is superseded. The 2026 delimitation proclaimed in
 * Annexure A to IEC Circular 1 of 2025 also gives NW405 34 wards under the
 * same IEC codes, but *the same code is not a promise of the same
 * boundary*. Anything that puts a 2021 result beside a 2026 ward is
 * asserting a correspondence, not reading one off, and must label it —
 * see `WARD_CORRESPONDENCE_CAVEAT`.
 */
import raw from '../../../seed-data/nw405-2021-ward-results.json';

export interface WardResult2021 {
  /** IEC ward id, e.g. `64005001`. */
  wardId: string;
  /** 1–34, the number the ward is known by locally. */
  wardNumber: number;
  winnerPartyId: string;
  winnerVotes: number;
  runnerUpPartyId: string;
  runnerUpVotes: number;
  /** Valid votes cast on the ward ballot in this ward. */
  wardVotes: number;
}

export interface WardResults2021 {
  municipalityCode: string;
  delimitationId: string;
  electionDate: string;
  wardBallotVotes: number;
  votesNotInTopTwo: number;
  independentWardSeats: number;
  /** Wards where an independent was runner-up. They won none. */
  independentRunnerUpWards: string[];
  wards: WardResult2021[];
}

export const NW405_WARD_RESULTS_2021 = raw as WardResults2021;

export const WARD_BALLOT_VOTES_2021 = NW405_WARD_RESULTS_2021.wardBallotVotes;
export const VOTES_OUTSIDE_TOP_TWO = NW405_WARD_RESULTS_2021.votesNotInTopTwo;

export const WARD_CORRESPONDENCE_CAVEAT =
  'Wards are matched by IEC code across two delimitations. The 2026 boundary for a ' +
  'code may differ from the 2021 one, so a ward-by-ward comparison is a stated ' +
  'correspondence, not an identity.';

/** Winner's share of the ward's valid votes, 0–100. */
export function winnerShare(ward: WardResult2021): number {
  return (ward.winnerVotes / ward.wardVotes) * 100;
}

/** Runner-up's share of the ward's valid votes, 0–100. */
export function runnerUpShare(ward: WardResult2021): number {
  return (ward.runnerUpVotes / ward.wardVotes) * 100;
}

/** The gap between first and second, in points of the ward's valid vote. */
export function marginPoints(ward: WardResult2021): number {
  return winnerShare(ward) - runnerUpShare(ward);
}

/**
 * The two-party swing, in percentage points, that would have changed the
 * ward's result in 2021 — half the margin, by the standard definition,
 * because a swing moves votes *from* one side *to* the other and so closes
 * the gap at twice its own size.
 *
 * It is denominated as a swing, not as one party's gain. Build the pair
 * with `twoPartySwing()` in `wardScenario.ts`; handing `projectWard` a
 * single `{ DA: 1.5 }` closes the gap by 1.5 and not by 3.0, which is the
 * half-size mistake this number invites if read loosely.
 *
 * THIS IS THE HONEST REPLACEMENT FOR A "FLIP RISK" SCORE
 *
 * It is a fact about a certified result, reproducible by anyone holding
 * the same file, and it carries no claim about next week. A percentage
 * labelled "flip probability" would be a claim about next week, and this
 * product has no model that could produce one.
 */
export function swingToFlip(ward: WardResult2021): number {
  return marginPoints(ward) / 2;
}

/** Wards ordered by how little it would take to turn them. Closest first. */
export function marginalWards(results = NW405_WARD_RESULTS_2021): WardResult2021[] {
  return [...results.wards].sort((a, b) => marginPoints(a) - marginPoints(b));
}

/** Ward seats won per party in 2021, derived rather than restated. */
export function wardSeatsByParty(results = NW405_WARD_RESULTS_2021): Record<string, number> {
  const seats: Record<string, number> = {};
  for (const ward of results.wards) {
    seats[ward.winnerPartyId] = (seats[ward.winnerPartyId] ?? 0) + 1;
  }
  return seats;
}
