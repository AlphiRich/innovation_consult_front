/**
 * Election Campaign OS — ward and council scenario projection
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * WHAT THIS IS, SAID PLAINLY, BECAUSE IT MATTERS
 *
 * This is not a forecast and it contains no model of what voters will do.
 * It answers one question: **given a swing you supply, what council does
 * the statute produce?** You bring the hypothesis; this brings Schedule 1.
 *
 * Every number it emits is a consequence of two things the caller can
 * check — a certified 2021 result, and a swing typed in by a person. There
 * is no third ingredient, no weighting, no fitted parameter and nothing
 * learned from canvass data. Change the swing and every output changes
 * with it, which is the point: the screen is for exploring how much has to
 * move before the council changes hands, and the answer to that is a
 * property of the 2021 result, not a prediction.
 *
 * WHY THAT RESTRAINT IS NOT TIMIDITY
 *
 * A "72% chance ANC holds Ward 4" is the single most persuasive thing this
 * product could put on a screen, and the single most damaging, because
 * nothing here could produce it honestly. Canvass sentiment is a sample of
 * the doors a campaign chose to knock on — not a random sample, not
 * weighted, not a poll — and turning it into a probability would be
 * inventing the one number a campaign would most want to believe.
 * `wardSentiment.ts` keeps that data as counts for exactly this reason.
 *
 * So the scenario engine takes the swing as *input*. A campaign manager
 * who believes the swing is four points to the DA can see what that does
 * to the council in full statutory detail. What this product will not do
 * is tell them the swing is four points.
 *
 * THE TWO-PARTY LIMIT ON WARD PROJECTION
 *
 * `wardResults2021.ts` holds the winner and the runner-up only — 11.7% of
 * the 2021 ward ballot sat outside both and is not in the file. So a ward
 * is projected as a contest between those two, and `unmodelledWardVotes`
 * reports what that leaves out. The PR projection has no such limit: the
 * full party vote is in `nw405Example.ts`.
 */
import { allocateSeats, type SeatAllocationResult } from './seatCalculator';
import { NW405_2021_EXAMPLE, NW405_2021_DELIMITATION } from './nw405Example';
import {
  NW405_WARD_RESULTS_2021,
  marginPoints,
  runnerUpShare,
  swingToFlip,
  winnerShare,
  type WardResult2021,
  type WardResults2021,
} from './wardResults2021';

/**
 * A swing, in percentage points of the valid vote, per party.
 *
 * Positive is a gain. Parties left out are assumed flat. The values need
 * not sum to zero — a campaign's working assumption rarely does, and
 * forcing it to balance would silently edit the caller's hypothesis.
 * `netSwing` reports the imbalance instead, so it is visible rather than
 * corrected behind their back.
 */
export type Swing = Record<string, number>;

export interface WardProjection {
  wardId: string;
  wardNumber: number;
  /** Who held it in 2021. */
  heldBy: string;
  challenger: string;
  /** The 2021 gap, in points of that ward's valid vote. */
  marginPoints2021: number;
  /** Two-party swing that would have turned it in 2021. Half the margin. */
  swingToFlip: number;
  /** Who holds it under the supplied swing. */
  projectedWinner: string;
  /** The gap after the swing. Negative only ever appears as a flip. */
  projectedMarginPoints: number;
  /** True when the swing is enough to change hands. */
  flips: boolean;
  /** Ward valid votes in 2021 that were in neither top-two position. */
  unmodelledWardVotes: number;
}

export interface CouncilProjection {
  /** Per-ward outcome under this swing. */
  wards: WardProjection[];
  /** Ward seats per party after the swing. */
  wardSeats: Record<string, number>;
  /** The full statutory allocation — quota, PR seats, overhang, ties. */
  allocation: SeatAllocationResult;
  /** Wards that change hands under this swing. */
  flipped: WardProjection[];
  /** Sum of the supplied swing. Non-zero means the hypothesis does not balance. */
  netSwing: number;
  /** Ward votes outside the top two in 2021, across the municipality. */
  unmodelledWardVotes: number;
  /** The certified allocation the projection is a departure from. */
  baseline: SeatAllocationResult;
}

const swingFor = (swing: Swing, partyId: string): number => swing[partyId] ?? 0;

/**
 * The balanced pair of deltas that `swingToFlip` is denominated in.
 *
 * A swing moves votes *between* two sides, so "a 1.5-point swing from VF+
 * to the DA" means VF+ −1.5 and DA +1.5, and closes a 3.0-point gap. A
 * `Swing` map takes independent per-party deltas, which is more general
 * and is also easy to get wrong by half: `{ DA: 1.5 }` alone closes the
 * gap by 1.5, not 3.0, and leaves the ward where it was.
 *
 * This existed as a sentence in a comment until a test took the sentence
 * literally and failed. A helper cannot be misread the way a convention
 * can, so the convention is now a function.
 */
export function twoPartySwing(fromPartyId: string, toPartyId: string, points: number): Swing {
  return { [fromPartyId]: -points, [toPartyId]: points };
}

/**
 * One ward under one swing.
 *
 * The swing is applied to each side's share of that ward's own vote, which
 * is the uniform-swing convention: a party gaining three points gains them
 * everywhere, regardless of where it was starting from. It is a crude
 * model and a well-understood one, which is the right trade for a tool
 * whose job is to be checkable.
 */
export function projectWard(ward: WardResult2021, swing: Swing): WardProjection {
  const heldShare = winnerShare(ward) + swingFor(swing, ward.winnerPartyId);
  const challengerShare = runnerUpShare(ward) + swingFor(swing, ward.runnerUpPartyId);
  const flips = challengerShare > heldShare;

  return {
    wardId: ward.wardId,
    wardNumber: ward.wardNumber,
    heldBy: ward.winnerPartyId,
    challenger: ward.runnerUpPartyId,
    marginPoints2021: marginPoints(ward),
    swingToFlip: swingToFlip(ward),
    projectedWinner: flips ? ward.runnerUpPartyId : ward.winnerPartyId,
    projectedMarginPoints: Math.abs(heldShare - challengerShare),
    flips,
    unmodelledWardVotes: ward.wardVotes - ward.winnerVotes - ward.runnerUpVotes,
  };
}

/**
 * The PR ballot under the same swing.
 *
 * Shares move by the swing, are floored at zero — a party cannot poll
 * negative, and a swing larger than a small party's whole vote would
 * otherwise produce one — and are then renormalised onto the projected
 * turnout. Renormalising is what keeps the result a distribution; without
 * it an unbalanced swing would quietly change the number of votes cast.
 */
export function projectPrVotes(swing: Swing, projectedValidVotes: number): Array<{ id: string; name: string; votes: number }> {
  const base = NW405_2021_EXAMPLE;
  const shares = base.parties.map((party) => ({
    id: party.id,
    name: party.name,
    share: Math.max(0, (party.votes / base.totalValidVotes) * 100 + swingFor(swing, party.id)),
  }));

  const total = shares.reduce((sum, s) => sum + s.share, 0);
  if (total === 0) return shares.map((s) => ({ id: s.id, name: s.name, votes: 0 }));

  return shares.map((s) => ({
    id: s.id,
    name: s.name,
    votes: Math.round((s.share / total) * projectedValidVotes),
  }));
}

export interface ScenarioInput {
  swing: Swing;
  /**
   * Total valid votes the scenario assumes. Defaults to the 2021 figure,
   * which makes a zero swing reproduce the certified result exactly — the
   * property `wardScenario.test.ts` leans on hardest.
   */
  projectedValidVotes?: number;
  results?: WardResults2021;
}

/**
 * The whole scenario: wards, then PR, then Schedule 1 over both.
 *
 * The ward seats fed to the allocator are the *projected* ones, so a swing
 * that turns wards changes the quota's arithmetic through Item 12 and can
 * trigger Item 16 overhang — which is the entire reason this routes
 * through `allocateSeats` rather than adding seats up by hand.
 */
export function projectCouncil(input: ScenarioInput): CouncilProjection {
  const results = input.results ?? NW405_WARD_RESULTS_2021;
  const projectedValidVotes = input.projectedValidVotes ?? NW405_2021_EXAMPLE.totalValidVotes;

  const wards = results.wards.map((ward) => projectWard(ward, input.swing));

  const wardSeats: Record<string, number> = {};
  for (const party of NW405_2021_EXAMPLE.parties) wardSeats[party.id] = 0;
  for (const ward of wards) wardSeats[ward.projectedWinner] = (wardSeats[ward.projectedWinner] ?? 0) + 1;

  const prVotes = projectPrVotes(input.swing, projectedValidVotes);

  const allocation = allocateSeats({
    totalValidVotes: projectedValidVotes,
    totalSeats: NW405_2021_EXAMPLE.totalSeats,
    independentWardSeats: results.independentWardSeats,
    noPRListWardSeats: 0,
    delimitationId: NW405_2021_DELIMITATION,
    parties: prVotes.map((party) => ({
      id: party.id,
      name: party.name,
      votes: party.votes,
      wardSeatsWon: wardSeats[party.id] ?? 0,
    })),
  });

  return {
    wards,
    wardSeats,
    allocation,
    flipped: wards.filter((w) => w.flips),
    netSwing: Object.values(input.swing).reduce((sum, v) => sum + v, 0),
    unmodelledWardVotes: results.votesNotInTopTwo,
    baseline: allocateSeats({ ...NW405_2021_EXAMPLE, delimitationId: NW405_2021_DELIMITATION }),
  };
}

/** Seats gained or lost against the certified 2021 council, per party. */
export function seatChange(projection: CouncilProjection): Array<{ id: string; name: string; from: number; to: number; change: number }> {
  const before = new Map(projection.baseline.parties.map((p) => [p.id, p]));
  return projection.allocation.parties
    .map((party) => {
      const from = before.get(party.id)?.totalSeats ?? 0;
      return { id: party.id, name: party.name, from, to: party.totalSeats, change: party.totalSeats - from };
    })
    .sort((a, b) => b.to - a.to || b.change - a.change);
}

/**
 * Whether any single party holds more than half the council.
 *
 * Reported as a fact about this scenario's arithmetic — "under this swing,
 * no party reaches 34 of 67" — and never as a probability that the council
 * will hang. The difference is the whole discipline of this module.
 */
export function majorityPosition(projection: CouncilProjection): {
  seatsForMajority: number;
  leader: { id: string; seats: number } | null;
  hasMajority: boolean;
} {
  const council = projection.allocation.councilSizeFinal;
  const seatsForMajority = Math.floor(council / 2) + 1;
  const ranked = [...projection.allocation.parties].sort((a, b) => b.totalSeats - a.totalSeats);
  const top = ranked[0];
  return {
    seatsForMajority,
    leader: top ? { id: top.id, seats: top.totalSeats } : null,
    hasMajority: top ? top.totalSeats >= seatsForMajority : false,
  };
}
