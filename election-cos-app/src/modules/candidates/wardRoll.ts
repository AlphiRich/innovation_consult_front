/**
 * Election Campaign OS — the ward candidate roll
 * IC-ECOS-BUILD-2026-V2 §6.6. Section 17, Municipal Electoral Act.
 *
 * WHY THIS EXISTS
 *
 * SOP-11 and `CandidatesPage` shipped last session with ward candidates
 * as a flat list under the party list. That is the right separation — a
 * ward nomination is a different process and none of the list checks
 * apply — but a flat list cannot answer the question a party actually has
 * in the weeks before nominations close: **which wards do we not have a
 * candidate for.**
 *
 * A supplied screen design (session 31) put a "ward coverage index" on
 * exactly this, reading `100% — TARGET MET` over a summary claiming all
 * 242 wards covered and "IEC VERIFIED CANDIDATES 218". This module is the
 * honest form of that tile.
 *
 * COVERAGE IS COUNTED AGAINST THE SEED, NOT AGAINST A TARGET
 *
 * The expected number of wards comes from the wards actually loaded for
 * the tenant, and the count of those with a candidate comes from the
 * candidate records. Neither is a goal anybody typed. If the ward seed is
 * short, coverage will read high against a short roll — which is the
 * silent-short-seed defect SOP-03 exists to catch, so `wardsMissing` is
 * reported by name rather than as a percentage, and the caller shows the
 * seed check beside it.
 *
 * A DOUBLE NOMINATION IS A FINDING, NOT A ROUNDING ERROR
 *
 * Two candidates recorded in one ward is not a coverage improvement. It
 * is either a duplicate record or two people who both think they are
 * standing, and both need a person. It is reported separately and never
 * folded into the covered count.
 */
import type { Candidate } from '@/dal/ports/candidates';

export interface WardRollEntry {
  wardCode: string;
  /** Live ward candidates recorded for this ward. */
  candidates: Candidate[];
}

export interface WardRoll {
  /** Every ward the tenant has loaded, in code order. */
  entries: WardRollEntry[];
  /** Wards with exactly one candidate. */
  covered: string[];
  /** Wards with none. Named, never expressed only as a percentage. */
  missing: string[];
  /** Wards with more than one. Always a finding. */
  doubled: string[];
  /**
   * Candidates recorded against a ward code the tenant has not loaded.
   * Kept rather than dropped: a candidate who vanishes from a roll
   * because their ward code is wrong is worse than one shown as
   * unplaceable.
   */
  unplaceable: Candidate[];
  wardCount: number;
}

export const COVERAGE_BASIS =
  'Coverage is counted against the wards loaded for this campaign, not against a target anybody typed. If ' +
  'the ward seed is short, this will read high against a short roll — the wards with no candidate are ' +
  'therefore listed by code rather than summarised as a percentage.';

export const DOUBLE_NOMINATION_BASIS =
  'More than one candidate in a ward is never coverage. It is a duplicate record or two people who both ' +
  'believe they are standing, and either way it needs a person before nominations close.';

export function buildWardRoll(candidates: Candidate[], wardCodes: string[]): WardRoll {
  const wardCandidates = candidates.filter((c) => c.affiliation === 'WARD' && c.deletedAt === null);
  const known = new Set(wardCodes);

  const byWard = new Map<string, Candidate[]>();
  const unplaceable: Candidate[] = [];
  for (const candidate of wardCandidates) {
    const code = candidate.wardCode ?? '';
    if (!known.has(code)) {
      unplaceable.push(candidate);
      continue;
    }
    byWard.set(code, [...(byWard.get(code) ?? []), candidate]);
  }

  const entries = [...wardCodes]
    .sort()
    .map((wardCode) => ({ wardCode, candidates: byWard.get(wardCode) ?? [] }));

  return {
    entries,
    covered: entries.filter((e) => e.candidates.length === 1).map((e) => e.wardCode),
    missing: entries.filter((e) => e.candidates.length === 0).map((e) => e.wardCode),
    doubled: entries.filter((e) => e.candidates.length > 1).map((e) => e.wardCode),
    unplaceable,
    wardCount: wardCodes.length,
  };
}
