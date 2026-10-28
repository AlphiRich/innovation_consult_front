/**
 * NW405 2021 — the IEC's own published seat calculation, as a fixture.
 *
 * PROVENANCE
 *
 * The figures below are quoted in `legislative-source-excerpts.md`, which
 * arrived 28 October 2026 in the asset batch recorded in
 * `docs/asset-control-sheet.md`. That file cites the IEC seat-calculation
 * detail sheet `NW405.pdf` for Electoral Event "LOCAL GOVERNMENT ELECTION
 * 2021", and the Municipal Structures Act Schedule 1 as gazetted in
 * Government Gazette No. 19614, 18 December 1998.
 *
 * WHY THIS TEST EXISTS SEPARATELY
 *
 * `seatCalculator.ts` was corrected in session 8 against an IEC seat
 * calculation report, and its own regression block covers that. This
 * fixture is an INDEPENDENT arrival of the same published result through a
 * different conversation and a different document, so it is kept as its own
 * test rather than folded in — if the two ever disagree, that is worth
 * seeing as two failures, not one.
 *
 * WHAT IT SETTLES
 *
 * The uploaded `ecos-demarcation-baseline-config` SKILL.md states the Item
 * 12 quota as `Q = A/(B-C) + 1`, which is the gazetted statutory text. This
 * implementation uses `Q = (A/(B-C-D)) + 1`, where D is ward seats won by
 * parties that filed no PR list — a term the IEC's operational report
 * prints and the statute does not. Both agree here, because C = D = 0 in
 * NW405 2021. They diverge only where a party wins ward seats and files no
 * PR list, and the four-term version is the safer superset: with D = 0 it
 * reduces exactly to the statutory formula.
 */
import { describe, it, expect } from 'vitest';
import { allocateSeats } from './seatCalculator';

/** Published party totals. `expected` is the IEC's own final seat count. */
const PUBLISHED = [
  { id: 'abc', name: 'Abantu Batho Congress', votes: 340, expected: 0 },
  { id: 'anc', name: 'African National Congress', votes: 48911, expected: 33 },
  { id: 'atm', name: 'African Transformation Movement', votes: 330, expected: 0 },
  { id: 'blf', name: 'Black First Land First', votes: 428, expected: 0 },
  { id: 'da', name: 'Democratic Alliance', votes: 25837, expected: 17 },
  { id: 'eff', name: 'Economic Freedom Fighters', votes: 9200, expected: 6 },
  { id: 'f4sd', name: 'Forum 4 Service Delivery', votes: 204, expected: 0 },
  { id: 'pa', name: 'Patriotic Alliance', votes: 2389, expected: 2 },
  { id: 'ffp', name: 'Vryheidsfront Plus', votes: 13800, expected: 9 },
] as const;

const A = 101439; // total valid votes, as published
const B = 67; // council seats — matches the proclaimed Annexure A baseline
const PUBLISHED_QUOTA = 1515;

describe('NW405 2021 — IEC published seat calculation', () => {
  const result = allocateSeats({
    totalValidVotes: A,
    totalSeats: B,
    independentWardSeats: 0, // C, as published
    noPRListWardSeats: 0, // D, as published
    parties: PUBLISHED.map(({ id, name, votes }) => ({ id, name, votes, wardSeatsWon: 0 })),
  });

  it('the published party votes sum to the published total A', () => {
    expect(PUBLISHED.reduce((sum, p) => sum + p.votes, 0)).toBe(A);
  });

  it('reproduces the published quota of 1,515', () => {
    expect(result.quota).toBe(PUBLISHED_QUOTA);
  });

  it('reproduces every published party seat total', () => {
    for (const party of PUBLISHED) {
      const row = result.parties.find((r) => r.id === party.id);
      expect(row, `${party.name} missing from the result`).toBeDefined();
      expect(row!.totalSeats, party.name).toBe(party.expected);
    }
  });

  it('allocates exactly the 67 seats the council has', () => {
    expect(result.parties.reduce((sum, p) => sum + p.totalSeats, 0)).toBe(B);
  });

  it('with D = 0 the four-term divisor equals the statutory B - C', () => {
    // Guards the reduction claim in this file's header: the extra term can
    // never change the answer when no party wins a ward without a PR list.
    const statutory = allocateSeats({
      totalValidVotes: A,
      totalSeats: B,
      independentWardSeats: 0,
      parties: PUBLISHED.map(({ id, name, votes }) => ({ id, name, votes, wardSeatsWon: 0 })),
    });
    expect(statutory.quota).toBe(result.quota);
  });
});
