/**
 * Election-COS1.0 — ward/VD aggregate stats
 * IC-ECOS-BUILD-2026-V2 §6.1. Pure helper, kept separate from the page so
 * it's testable without a live session — the Ward/VD Voter Matrix pattern
 * in the reference screens rolls these up at the municipality level.
 */
import type { Ward } from '@/dal/ports/wards';

export interface WardTotals {
  wardCount: number;
  vdCount: number;
  registeredVoters: number;
}

export function totalsFor(wards: Ward[]): WardTotals {
  return wards.reduce<WardTotals>(
    (acc, w) => ({
      wardCount: acc.wardCount + 1,
      vdCount: acc.vdCount + w.vdCodes.length,
      registeredVoters: acc.registeredVoters + w.registeredVoters,
    }),
    { wardCount: 0, vdCount: 0, registeredVoters: 0 },
  );
}

/** Most-recently-used municipality code, to default a new ward's field rather than leave it blank every time. */
export function defaultMunicipalityCode(wards: Ward[]): string {
  return wards[0]?.municipalityCode ?? '';
}
