/**
 * Election Campaign OS — ward/VD aggregate stats
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

/**
 * Order ward codes the way a person reads them.
 *
 * Firestore returns documents in lexicographic id order, which puts
 * `NW405-W10` directly after `NW405-W1` and `NW405-W2` after `NW405-W19`.
 * On a 34-ward municipality that is not a cosmetic complaint: a ward lead
 * looking for Ward 3 finds it two thirds of the way down a list that
 * appears to be sorted, and the figures beside it belong to a ward they
 * did not mean to read.
 *
 * Compares the leading text, then any trailing number numerically, so
 * `NW405-W2` precedes `NW405-W10` and codes from different municipalities
 * still group together.
 */
export function compareWardCodes(a: string, b: string): number {
  const split = (code: string) => {
    const match = /^(.*?)(\d+)$/.exec(code.trim());
    return match ? { prefix: match[1], number: Number(match[2]) } : { prefix: code, number: null };
  };
  const left = split(a);
  const right = split(b);
  if (left.prefix !== right.prefix) return left.prefix.localeCompare(right.prefix);
  if (left.number === null || right.number === null) return a.localeCompare(b);
  return left.number - right.number;
}

/** The same ordering, applied to anything carrying a `wardCode`. */
export function byWardCode<T extends { wardCode: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareWardCodes(a.wardCode, b.wardCode));
}
