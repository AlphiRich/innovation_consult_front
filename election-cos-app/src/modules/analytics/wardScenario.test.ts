/**
 * Election Campaign OS — ward and council scenario projection
 *
 * The load-bearing test here is the first one: a zero swing must
 * reproduce the certified 2021 council exactly, seat for seat. If it does
 * not, every other number this module produces is a departure from the
 * wrong starting point and none of them mean anything.
 *
 * The 2021 figures it is held to — quota 1 515, ANC 33, DA 17, VF+ 9,
 * EFF 6, PA 2 — come from the IEC Seat Calculation Detail via
 * `nw405Example.ts` (docs/nw405-seed-data.md), and the ward seats come
 * from a separate file reconciled against them in
 * `tools/seed-data/parse-nw405-2021-results.mjs`.
 */
import { describe, expect, it } from 'vitest';
import {
  majorityPosition,
  projectCouncil,
  projectPrVotes,
  projectWard,
  seatChange,
  twoPartySwing,
  type Swing,
} from './wardScenario';
import {
  NW405_WARD_RESULTS_2021,
  marginalWards,
  marginPoints,
  swingToFlip,
  wardSeatsByParty,
} from './wardResults2021';

const noSwing = { swing: {} };

describe('the 2021 ward dataset', () => {
  it('holds 34 wards whose winners are the certified ward seats', () => {
    expect(NW405_WARD_RESULTS_2021.wards).toHaveLength(34);
    expect(wardSeatsByParty()).toEqual({ ANC: 24, DA: 9, VFP: 1 });
  });

  it('sums to the ward-ballot total that A is derived from', () => {
    const total = NW405_WARD_RESULTS_2021.wards.reduce((sum, w) => sum + w.wardVotes, 0);
    expect(total).toBe(51_156);
    expect(NW405_WARD_RESULTS_2021.wardBallotVotes).toBe(51_156);
  });

  it('records the votes it cannot account for rather than hiding them', () => {
    // 11.7% of the ward ballot went to parties in neither top-two slot and
    // is not recoverable from this file. A module that quietly treated the
    // top two as the whole ward would overstate every margin.
    expect(NW405_WARD_RESULTS_2021.votesNotInTopTwo).toBe(5_989);
    const share = (5_989 / 51_156) * 100;
    expect(share).toBeGreaterThan(11);
    expect(share).toBeLessThan(12);
  });

  it('records that independents won no ward, which the quota depends on', () => {
    // Schedule 1 Item 12 deducts independent ward wins from the
    // denominator. An independent was runner-up in ward 64005027 and won
    // nothing, so C is 0 — which is what nw405Example.ts asserts.
    expect(NW405_WARD_RESULTS_2021.independentWardSeats).toBe(0);
    expect(NW405_WARD_RESULTS_2021.independentRunnerUpWards).toEqual(['64005027']);
  });
});

describe('a zero swing', () => {
  it('reproduces the certified 2021 council exactly', () => {
    const p = projectCouncil(noSwing);
    expect(p.allocation.quota).toBe(1_515);
    expect(p.allocation.councilSizeFinal).toBe(67);

    const seats = Object.fromEntries(p.allocation.parties.map((x) => [x.id, x.totalSeats]));
    expect(seats).toMatchObject({ ANC: 33, DA: 17, VFP: 9, EFF: 6, PA: 2 });
  });

  it('reproduces the certified ward/PR split too, not just the totals', () => {
    const p = projectCouncil(noSwing);
    const ward = Object.fromEntries(p.allocation.parties.map((x) => [x.id, x.wardSeatsWon]));
    const pr = Object.fromEntries(p.allocation.parties.map((x) => [x.id, x.prSeats]));

    expect(ward).toMatchObject({ ANC: 24, DA: 9, VFP: 1, EFF: 0, PA: 0 });
    expect(pr).toMatchObject({ ANC: 9, DA: 8, VFP: 8, EFF: 6, PA: 2 });
  });

  it('turns no ward and changes no seat', () => {
    const p = projectCouncil(noSwing);
    expect(p.flipped).toEqual([]);
    expect(seatChange(p).every((s) => s.change === 0)).toBe(true);
  });
});

describe('the swing a ward would need', () => {
  it('is half the margin, because a swing moves votes between two sides', () => {
    const ward = NW405_WARD_RESULTS_2021.wards.find((w) => w.wardNumber === 2)!;
    expect(swingToFlip(ward)).toBeCloseTo(marginPoints(ward) / 2, 10);
  });

  it('names ward 2 as the municipality’s knife edge', () => {
    // VF+ held it over the DA by 3.0 points of the ward vote in 2021 —
    // the closest contest in NW405, and nothing in the uploaded
    // "flip risk" charts listed it at all.
    const closest = marginalWards()[0];
    expect(closest.wardNumber).toBe(2);
    expect(closest.winnerPartyId).toBe('VFP');
    expect(closest.runnerUpPartyId).toBe('DA');
    expect(marginPoints(closest)).toBeCloseTo(3.0, 1);
    expect(swingToFlip(closest)).toBeCloseTo(1.5, 1);
  });

  it('turns exactly at its own threshold, and not a fraction before', () => {
    const ward = marginalWards()[0];
    const needed = swingToFlip(ward);
    const swing = (points: number) => twoPartySwing(ward.winnerPartyId, ward.runnerUpPartyId, points);

    expect(projectWard(ward, swing(needed - 0.01)).flips).toBe(false);
    expect(projectWard(ward, swing(needed + 0.01)).flips).toBe(true);
  });

  it('is denominated as a swing between two sides, not as one party gaining', () => {
    // The half-size mistake, pinned. A 1.5-point swing turns ward 2; the
    // DA gaining 1.5 points on its own does not, because the gap only
    // closes by what the challenger gains.
    const ward = marginalWards()[0];
    const needed = swingToFlip(ward);

    expect(projectWard(ward, twoPartySwing(ward.winnerPartyId, ward.runnerUpPartyId, needed + 0.01)).flips).toBe(true);
    expect(projectWard(ward, { [ward.runnerUpPartyId]: needed + 0.01 }).flips).toBe(false);
    // One side moving the whole margin does it on its own, either way.
    expect(projectWard(ward, { [ward.runnerUpPartyId]: marginPoints(ward) + 0.01 }).flips).toBe(true);
    expect(projectWard(ward, { [ward.winnerPartyId]: -(marginPoints(ward) + 0.01) }).flips).toBe(true);
  });
});

describe('a swing that moves the council', () => {
  it('takes wards off the ANC and gives the DA seats', () => {
    const p = projectCouncil({ swing: { DA: 8, ANC: -8 } });
    const before = Object.fromEntries(p.baseline.parties.map((x) => [x.id, x.totalSeats]));
    const after = Object.fromEntries(p.allocation.parties.map((x) => [x.id, x.totalSeats]));

    expect(p.flipped.length).toBeGreaterThan(0);
    expect(after.DA).toBeGreaterThan(before.DA);
    expect(after.ANC).toBeLessThan(before.ANC);
  });

  it('keeps the council whole: seats always sum to the council size', () => {
    const swings: Swing[] = [{}, { DA: 8, ANC: -8 }, { EFF: 12, ANC: -12 }, { VFP: 5, DA: -5 }];
    for (const swing of swings) {
      const p = projectCouncil({ swing });
      const total = p.allocation.parties.reduce((sum, x) => sum + x.totalSeats, 0);
      expect(total + p.allocation.pendingSeats).toBe(p.allocation.councilSizeFinal);
    }
  });

  it('routes through Schedule 1 rather than adding ward seats up by hand', () => {
    // A large ward sweep by a party with a modest PR vote is exactly the
    // Item 16 overhang case. Whatever the allocator does with it, the
    // council may only grow, never shrink — which is the property that
    // would break if this module did its own arithmetic.
    const p = projectCouncil({ swing: { EFF: 25, ANC: -25 } });
    expect(p.allocation.councilSizeFinal).toBeGreaterThanOrEqual(67);
  });

  it('reports an unbalanced hypothesis instead of silently balancing it', () => {
    // A campaign's working assumption rarely sums to zero. Correcting it
    // behind their back would mean the screen answers a question they did
    // not ask.
    expect(projectCouncil({ swing: { DA: 5 } }).netSwing).toBe(5);
    expect(projectCouncil({ swing: { DA: 5, ANC: -5 } }).netSwing).toBe(0);
  });
});

describe('the PR projection', () => {
  it('never returns a negative vote, however large the swing against', () => {
    // PA polled 2.4% in 2021. A ten-point swing away from it is
    // arithmetically below zero and politically just "wiped out".
    const votes = projectPrVotes({ PA: -10 }, 101_439);
    expect(votes.find((v) => v.id === 'PA')!.votes).toBe(0);
    expect(votes.every((v) => v.votes >= 0)).toBe(true);
  });

  it('keeps the total at the turnout the scenario assumes', () => {
    const total = projectPrVotes({ DA: 6, ANC: -6 }, 110_000).reduce((s, v) => s + v.votes, 0);
    expect(Math.abs(total - 110_000)).toBeLessThanOrEqual(5); // rounding only
  });

  it('moves a higher turnout into more votes for everyone, not more seats for free', () => {
    const low = projectCouncil({ swing: {}, projectedValidVotes: 90_000 });
    const high = projectCouncil({ swing: {}, projectedValidVotes: 130_000 });
    expect(high.allocation.quota).toBeGreaterThan(low.allocation.quota);
    expect(high.allocation.councilSizeFinal).toBe(low.allocation.councilSizeFinal);
  });
});

describe('the majority position', () => {
  it('needs 34 of 67 and reports the 2021 ANC majority as real', () => {
    const m = majorityPosition(projectCouncil(noSwing));
    expect(m.seatsForMajority).toBe(34);
    expect(m.leader).toEqual({ id: 'ANC', seats: 33 });
    // 33 of 67 is not a majority. The 2021 council was hung by one seat,
    // which is a fact about the certified result and worth not rounding.
    expect(m.hasMajority).toBe(false);
  });

  it('is a statement about this scenario, not a probability', () => {
    // Guard on the shape of the answer: a seat count and a threshold.
    // Anything that returned a likelihood here would be inventing the one
    // number a campaign would most want to believe.
    const m = majorityPosition(projectCouncil({ swing: { ANC: 6 } }));
    expect(Object.keys(m).sort()).toEqual(['hasMajority', 'leader', 'seatsForMajority']);
    expect(typeof m.hasMajority).toBe('boolean');
  });
});
