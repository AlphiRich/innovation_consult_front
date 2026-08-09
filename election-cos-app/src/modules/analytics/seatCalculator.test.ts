import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { allocateSeats, type PartyInput } from './seatCalculator';

// IC-ECOS-BUILD-2026-V2 §8.2: "Write property-based tests. Assert: PR
// seats never negative; total allocated ≥ total seats; overhang produces
// a warning; ties never silently resolve."

const partyArb: fc.Arbitrary<Omit<PartyInput, 'id' | 'name'>> = fc.record({
  votes: fc.integer({ min: 0, max: 100_000 }),
  wardSeatsWon: fc.integer({ min: 0, max: 10 }),
});

const inputArb = fc
  .array(partyArb, { minLength: 1, maxLength: 6 })
  .chain((parties) => {
    const totalValidVotes = parties.reduce((s, p) => s + p.votes, 0);
    return fc.record({
      totalSeats: fc.integer({ min: 1, max: 60 }),
      totalValidVotes: fc.constant(totalValidVotes),
      parties: fc.constant(
        parties.map((p, i) => ({ ...p, id: `party-${i}`, name: `Party ${i}` })),
      ),
    });
  });

describe('allocateSeats — property-based', () => {
  it('PR seats are never negative, for any input', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = allocateSeats(input);
        return result.parties.every((p) => p.prSeats >= 0);
      }),
    );
  });

  it('no seat is ever silently lost: allocated + pending always equals the final council size', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = allocateSeats(input);
        return result.totalSeatsAllocated + result.pendingSeats === result.councilSizeFinal;
      }),
    );
  });

  it('overhang never shrinks the council below the nominal seat count', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = allocateSeats(input);
        return result.councilSizeFinal >= input.totalSeats;
      }),
    );
  });

  it('when no tie was flagged, total allocated seats reaches the full (possibly overhang-expanded) council', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = allocateSeats(input);
        if (result.tieFlags.length === 0) {
          return result.totalSeatsAllocated === result.councilSizeFinal && result.pendingSeats === 0;
        }
        return true; // property vacuously holds when a tie occurred — see the dedicated tie test below
      }),
    );
  });
});

describe('allocateSeats — overhang (the fixed arithmetic contradiction)', () => {
  it('a party winning more ward seats than its quota entitlement keeps them and expands the council, with a visible overhang flag', () => {
    // Reproduces the class of bug the prior spec had: 35 ward wins against
    // 34 available seats. Here: one dominant party wins far more wards
    // than its vote share would entitle it to under the quota.
    const parties: PartyInput[] = [
      { id: 'A', name: 'Dominant Local Party', votes: 6_000, wardSeatsWon: 30 },
      { id: 'B', name: 'Opposition', votes: 34_000, wardSeatsWon: 4 },
    ];
    const result = allocateSeats({ totalValidVotes: 40_000, totalSeats: 34, parties });

    const partyA = result.parties.find((p) => p.id === 'A')!;
    expect(partyA.wardSeatsWon).toBe(30);
    expect(partyA.overhangSeats).toBeGreaterThan(0);
    expect(partyA.totalSeats).toBe(30); // retains all ward seats even though entitlement is lower
    expect(partyA.prSeats).toBe(0); // never negative, and no PR top-up beyond what it won on wards

    // Council expands rather than silently capping someone's ward wins.
    expect(result.councilSizeFinal).toBeGreaterThan(34);
    expect(result.totalSeatsAllocated + result.pendingSeats).toBe(result.councilSizeFinal);
  });
});

describe('allocateSeats — ties are flagged, never auto-resolved', () => {
  it('two parties with an identical remainder contesting the last seat produces a tieFlag and a pendingSeat, not a guess', () => {
    // Engineered so two parties land on exactly the same remainder after
    // quota division, with one seat left to distribute.
    const parties: PartyInput[] = [
      { id: 'A', name: 'Party A', votes: 5_005, wardSeatsWon: 0 },
      { id: 'B', name: 'Party B', votes: 5_005, wardSeatsWon: 0 },
      { id: 'C', name: 'Party C', votes: 10, wardSeatsWon: 0 },
    ];
    // totalSeats chosen so quota division leaves exactly one contested seat between A and B.
    const result = allocateSeats({ totalValidVotes: 10_020, totalSeats: 1, parties });

    expect(result.tieFlags.length).toBeGreaterThan(0);
    expect(result.pendingSeats).toBeGreaterThan(0);
    // Nobody was silently awarded the contested seat by array order or id.
    const tie = result.tieFlags[0];
    expect(tie.partyIds.sort()).toEqual(['A', 'B']);
  });
});
