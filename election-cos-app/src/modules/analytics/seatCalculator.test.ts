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

describe('allocateSeats — real-world regression (NW405 2021 LGE)', () => {
  it('reproduces the exact IEC "Seat Calculation Detail" result for JB Marks Local Municipality', () => {
    // Source: IEC-printed report supplied by the human — Province: North
    // West, Municipality: NW405 - JB Marks, Electoral Event: LOCAL
    // GOVERNMENT ELECTION 2021, printed 2021/11/22 15:43:44. Every figure
    // below (votes, ward seats, and the expected quota/round1/round2/total
    // columns) is transcribed directly from that report, not invented —
    // this is the fixture that caught and fixed the quota formula bug (see
    // the header comment above).
    const parties: PartyInput[] = [
      { id: 'ABC', name: 'Abantu Batho Congress', votes: 340, wardSeatsWon: 0 },
      { id: 'ANC', name: 'African National Congress', votes: 48_911, wardSeatsWon: 24 },
      { id: 'ATM', name: 'African Transformation Movement', votes: 330, wardSeatsWon: 0 },
      { id: 'BLF', name: 'Black First Land First', votes: 428, wardSeatsWon: 0 },
      { id: 'DA', name: 'Democratic Alliance', votes: 25_837, wardSeatsWon: 9 },
      { id: 'EFF', name: 'Economic Freedom Fighters', votes: 9_200, wardSeatsWon: 0 },
      { id: 'F4SD', name: 'Forum 4 Service Delivery', votes: 204, wardSeatsWon: 0 },
      { id: 'PA', name: 'Patriotic Alliance', votes: 2_389, wardSeatsWon: 0 },
      { id: 'VFP', name: 'Vryheidsfront Plus', votes: 13_800, wardSeatsWon: 1 },
    ];

    const result = allocateSeats({ totalValidVotes: 101_439, totalSeats: 67, parties });

    expect(result.quota).toBe(1_515);
    expect(result.councilSizeFinal).toBe(67); // no overhang in this result
    expect(result.tieFlags).toHaveLength(0);
    expect(result.pendingSeats).toBe(0);
    expect(result.totalSeatsAllocated).toBe(67);

    const byId = Object.fromEntries(result.parties.map((p) => [p.id, p]));
    // Round 1 quota entitlements, printed on the report.
    expect(byId.ABC.quotaEntitlement).toBe(0);
    expect(byId.ANC.quotaEntitlement).toBe(32);
    expect(byId.DA.quotaEntitlement).toBe(17);
    expect(byId.EFF.quotaEntitlement).toBe(6);
    expect(byId.PA.quotaEntitlement).toBe(1);
    expect(byId.VFP.quotaEntitlement).toBe(9);

    // Round 2 (largest-remainder) top-ups: only ANC and Patriotic Alliance,
    // matching the report's "Round 2 Allocation" column exactly.
    expect(byId.ANC.totalSeats).toBe(33);
    expect(byId.PA.totalSeats).toBe(2);
    expect(byId.DA.totalSeats).toBe(17); // no top-up
    expect(byId.EFF.totalSeats).toBe(6); // no top-up
    expect(byId.VFP.totalSeats).toBe(9); // no top-up

    // Final PR list seats (Total Party Seats − Ward Seats), report's last column.
    expect(byId.ANC.prSeats).toBe(9);
    expect(byId.DA.prSeats).toBe(8);
    expect(byId.EFF.prSeats).toBe(6);
    expect(byId.PA.prSeats).toBe(2);
    expect(byId.VFP.prSeats).toBe(8);

    const totalWardSeats = result.parties.reduce((s, p) => s + p.wardSeatsWon, 0);
    const totalPRSeats = result.parties.reduce((s, p) => s + p.prSeats, 0);
    expect(totalWardSeats).toBe(34); // report: "Total Seats 34 33 67"
    expect(totalPRSeats).toBe(33);
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
