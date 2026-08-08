/**
 * Election Campaign OS — Seat calculator (Municipal Structures Act MMP allocation)
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * The prior specification contained an arithmetic contradiction: it
 * permitted 35 ward wins against 34 available seats with no overhang
 * handling and no tie-break. This module fixes that:
 *
 *   Quota        Q  = floor(totalValidVotes / (totalSeats + 1)) + 1
 *   Entitlement  E  = floor(partyVotes / Q)
 *   PR seats     PR = max(0, E - wardSeatsWon)                // never negative
 *   Overhang     if wardSeatsWon > E, party retains ward seats; council expands
 *   Ties         highest remainder; if still tied, flag for manual
 *                resolution — NEVER auto-resolve
 *
 * "Ties never silently resolve" is implemented as: when the largest-
 * remainder round can't unambiguously decide which party(ies) get the last
 * available seat(s), this function stops assigning further remainder seats
 * and reports them as `pendingSeats` + `tieFlags`, rather than picking a
 * winner by any arbitrary rule (array order, party id, etc). No seat is
 * ever silently dropped either: `totalSeatsAllocated + pendingSeats ===
 * councilSizeFinal` always holds — see seatCalculator.test.ts.
 */

export interface PartyInput {
  id: string;
  name: string;
  votes: number;
  wardSeatsWon: number;
}

export interface SeatAllocationInput {
  totalValidVotes: number;
  totalSeats: number; // nominal council size before overhang expansion
  parties: PartyInput[];
}

export interface PartyResult {
  id: string;
  name: string;
  votes: number;
  wardSeatsWon: number;
  quotaEntitlement: number;
  remainder: number; // votes - entitlement * quota, for transparency and tie audit
  prSeats: number; // never negative
  overhangSeats: number; // 0 unless wardSeatsWon > quotaEntitlement
  totalSeats: number; // wardSeatsWon + prSeats
}

export interface TieFlag {
  remainder: number;
  partyIds: string[];
  seatsContested: number; // how many seats were left when this tie was hit
}

export interface SeatAllocationResult {
  quota: number;
  councilSizeFinal: number; // totalSeats + total overhang — never smaller than totalSeats
  totalSeatsAllocated: number;
  pendingSeats: number; // seats withheld pending manual tie resolution — never auto-assigned
  parties: PartyResult[];
  tieFlags: TieFlag[];
}

export function allocateSeats(input: SeatAllocationInput): SeatAllocationResult {
  const { totalValidVotes, totalSeats, parties } = input;
  if (totalSeats < 1) throw new Error('totalSeats must be at least 1');
  if (totalValidVotes < 0) throw new Error('totalValidVotes cannot be negative');

  const quota = Math.floor(totalValidVotes / (totalSeats + 1)) + 1;

  const working = parties.map((p) => {
    const entitlement = quota > 0 ? Math.floor(p.votes / quota) : 0;
    const remainder = p.votes - entitlement * quota;
    const prSeats = Math.max(0, entitlement - p.wardSeatsWon); // never negative
    const overhangSeats = Math.max(0, p.wardSeatsWon - entitlement);
    return { ...p, entitlement, remainder, prSeats, overhangSeats };
  });

  const totalOverhang = working.reduce((sum, p) => sum + p.overhangSeats, 0);
  const councilSizeFinal = totalSeats + totalOverhang; // overhang expands the council, never shrinks it

  let allocatedSoFar = working.reduce((sum, p) => sum + p.wardSeatsWon + p.prSeats, 0);
  let remainingSeats = councilSizeFinal - allocatedSoFar;

  const tieFlags: TieFlag[] = [];

  // Largest-remainder distribution, in ranked passes. A normal pass gives
  // at most one top-up seat per party, ranked by remainder descending —
  // that covers every realistic input, where remainingSeats < party count.
  // A degenerate input (e.g. one party's overhang inflating councilSizeFinal
  // far past the number of parties) can leave seats after every party has
  // had a turn; when that happens we run another ranked pass rather than
  // handing everything to whichever party happened to be highest first,
  // so a genuine multi-way tie at the front of the ranking is still
  // caught (and flagged) on every pass, not just the first.
  outer: while (remainingSeats > 0) {
    const ranked = [...working].sort((a, b) => b.remainder - a.remainder);
    let progressed = false;
    let i = 0;
    while (i < ranked.length && remainingSeats > 0) {
      const currentRemainder = ranked[i].remainder;
      const tiedGroup = ranked.slice(i).filter((p) => p.remainder === currentRemainder);

      if (tiedGroup.length > remainingSeats) {
        // Cannot unambiguously award the remaining seat(s) — flag, stop, never guess.
        tieFlags.push({
          remainder: currentRemainder,
          partyIds: tiedGroup.map((p) => p.id),
          seatsContested: remainingSeats,
        });
        break outer;
      }

      for (const p of tiedGroup) {
        p.prSeats += 1;
        remainingSeats -= 1;
      }
      progressed = true;
      i += tiedGroup.length;
    }
    if (!progressed) break; // safety valve — no parties to award to
  }

  allocatedSoFar = working.reduce((sum, p) => sum + p.wardSeatsWon + p.prSeats, 0);
  const pendingSeats = councilSizeFinal - allocatedSoFar;

  return {
    quota,
    councilSizeFinal,
    totalSeatsAllocated: allocatedSoFar,
    pendingSeats,
    tieFlags,
    parties: working.map((p) => ({
      id: p.id,
      name: p.name,
      votes: p.votes,
      wardSeatsWon: p.wardSeatsWon,
      quotaEntitlement: p.entitlement,
      remainder: p.remainder,
      prSeats: p.prSeats,
      overhangSeats: p.overhangSeats,
      totalSeats: p.wardSeatsWon + p.prSeats,
    })),
  };
}
