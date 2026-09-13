/**
 * Election Campaign OS — is the ward seed finished, and is it right?
 * IC-ECOS-BUILD-2026-V2 §6.1.
 *
 * WHY THIS EXISTS
 *
 * Seeding wards is the one onboarding step whose failure mode is a number
 * that is quietly wrong rather than an error. Thirty-three wards loaded
 * out of thirty-four is not an exception anywhere: the ward list renders,
 * the map draws, coverage percentages compute, and the seat projection
 * comes out confidently short. Nothing in the application was asking the
 * question that would catch it — "does this match the demarcation notice
 * you typed into Municipality Config?" — so this asks it.
 *
 * The checks are arithmetic against data the tenant already holds. There
 * is no external source here, and there is deliberately no attempt to
 * fetch one: the authority for a ward count is the Municipal Demarcation
 * Board's notice for that municipality, which a person reads and enters.
 * This only tells them whether what they loaded agrees with what they
 * said they were loading.
 *
 * SEVERITY MEANS THE SAME THING IT MEANS IN `prList.ts`
 *
 * BLOCKING is a contradiction: two numbers in this tenant disagree, and
 * one of them is wrong. WARNING is a shape that is usually a mistake but
 * can be legitimate — a ward with no voting districts yet is exactly what
 * a half-finished seed looks like, and also exactly what a correctly
 * seeded ward looks like five minutes before its VDs are added.
 *
 * WHAT IT WILL NOT TELL YOU
 *
 * That the ward codes are the real ones, that the voter numbers match the
 * gazette, or that the demarcation you entered is the current one. Those
 * need the notice in front of you, and SOP-03 says so.
 */
import type { Ward } from '@/dal/ports/wards';
import type { MunicipalityProfile } from '@/dal/ports/municipalityProfile';

export type SeedIssueCode =
  | 'PROFILE_MISSING'
  | 'SEATS_DO_NOT_ADD_UP'
  | 'WARD_COUNT_MISMATCH'
  | 'WARD_CODE_DUPLICATED'
  | 'MUNICIPALITY_CODE_MISMATCH'
  | 'WARD_WITHOUT_VDS'
  | 'WARD_WITHOUT_VOTERS'
  | 'VD_CODE_REPEATED_IN_WARD'
  | 'NO_WARDS_AT_ALL';

export interface SeedIssue {
  code: SeedIssueCode;
  /** BLOCKING is a contradiction. WARNING is a shape worth a second look. */
  severity: 'BLOCKING' | 'WARNING';
  message: string;
  /** Ward codes this concerns, where it concerns specific ones. */
  wardCodes: string[];
}

export interface SeedReconciliation {
  issues: SeedIssue[];
  blocking: SeedIssue[];
  warnings: SeedIssue[];
  /** True when nothing contradicts anything. Warnings do not clear it to false. */
  reconciled: boolean;
  wardCount: number;
  vdCount: number;
  registeredVoters: number;
  /** From the municipality profile, for display beside the counts above. */
  expectedWardCount: number | null;
}

/**
 * The sentence that belongs beside any reconciliation result. Guarded by
 * `seedReconciliation.test.ts` — this check compares a tenant against
 * itself, and presenting it as verification against the Board would be
 * the same overclaim this product refuses everywhere else.
 */
export const RECONCILIATION_BASIS =
  'This compares what has been loaded against what was entered in Municipality Config. Both come from ' +
  'this tenant, so agreement means the two are consistent — not that either is correct. Only the ' +
  'Municipal Demarcation Board’s delimitation notice for this municipality can tell you that, and it has ' +
  'to be read by a person.';

function issue(
  code: SeedIssueCode,
  severity: SeedIssue['severity'],
  message: string,
  wardCodes: string[] = [],
): SeedIssue {
  return { code, severity, message, wardCodes };
}

export function reconcileSeed(wards: Ward[], profile: MunicipalityProfile | null): SeedReconciliation {
  const live = wards.filter((w) => w.deletedAt === null);
  const issues: SeedIssue[] = [];

  const wardCount = live.length;
  const vdCount = live.reduce((sum, w) => sum + w.vdCodes.length, 0);
  const registeredVoters = live.reduce((sum, w) => sum + w.registeredVoters, 0);
  const expectedWardCount = profile ? profile.wardSeats : null;

  if (wardCount === 0) {
    issues.push(
      issue(
        'NO_WARDS_AT_ALL',
        'WARNING',
        'No wards have been loaded yet. Nothing that scopes to a ward — canvassing, coverage, the seat ' +
          'projection — will work until they are.',
      ),
    );
  }

  if (!profile) {
    issues.push(
      issue(
        'PROFILE_MISSING',
        'BLOCKING',
        'Municipality Config has not been completed, so there is nothing to check the ward list against. ' +
          'Record the municipality first — it is the only place the expected ward count is stated.',
      ),
    );
    // Everything below compares against the profile, so stop here rather
    // than reporting a cascade of consequences of one missing document.
    return finish(issues, { wardCount, vdCount, registeredVoters, expectedWardCount });
  }

  // --- the profile's own arithmetic -------------------------------------
  const seatSum = profile.wardSeats + profile.prSeats;
  if (profile.totalCouncilSeats !== seatSum) {
    issues.push(
      issue(
        'SEATS_DO_NOT_ADD_UP',
        'BLOCKING',
        `Municipality Config says ${profile.totalCouncilSeats} council seats, but ${profile.wardSeats} ` +
          `ward seats plus ${profile.prSeats} PR seats is ${seatSum}. The seat projection reads all ` +
          'three, so one of them is wrong. Check them against the demarcation notice.',
      ),
    );
  }

  // --- the ward count ---------------------------------------------------
  if (wardCount > 0 && wardCount !== profile.wardSeats) {
    const short = profile.wardSeats - wardCount;
    issues.push(
      issue(
        'WARD_COUNT_MISMATCH',
        'BLOCKING',
        short > 0
          ? `${wardCount} wards are loaded but Municipality Config expects ${profile.wardSeats}. ` +
            `${short} ward(s) are missing, and nothing will report them as missing except this check — ` +
            'coverage and the seat projection will simply be computed over the wards that are here.'
          : `${wardCount} wards are loaded but Municipality Config expects only ${profile.wardSeats}. ` +
            'Either a ward has been captured twice under different codes, or the expected figure is wrong.',
      ),
    );
  }

  // --- duplicates and mismatched municipalities -------------------------
  const seenWardCodes = new Map<string, number>();
  for (const ward of live) {
    seenWardCodes.set(ward.wardCode, (seenWardCodes.get(ward.wardCode) ?? 0) + 1);
  }
  const duplicated = [...seenWardCodes.entries()].filter(([, count]) => count > 1).map(([code]) => code);
  if (duplicated.length > 0) {
    issues.push(
      issue(
        'WARD_CODE_DUPLICATED',
        'BLOCKING',
        `${duplicated.length} ward code(s) appear more than once. A ward counted twice inflates the ` +
          'registered-voter total and every percentage computed from it.',
        duplicated,
      ),
    );
  }

  const foreign = live.filter((w) => w.municipalityCode !== profile.municipalityCode);
  if (foreign.length > 0) {
    issues.push(
      issue(
        'MUNICIPALITY_CODE_MISMATCH',
        'BLOCKING',
        `${foreign.length} ward(s) carry a municipality code other than ${profile.municipalityCode}. ` +
          'Either they belong to another municipality and should not be in this tenant, or the code was ' +
          'mistyped — a ward under the wrong municipality is still counted in this tenant’s totals.',
        foreign.map((w) => w.wardCode),
      ),
    );
  }

  // --- shapes that usually mean the seed is unfinished ------------------
  const withoutVds = live.filter((w) => w.vdCodes.length === 0);
  if (withoutVds.length > 0) {
    issues.push(
      issue(
        'WARD_WITHOUT_VDS',
        'WARNING',
        `${withoutVds.length} ward(s) have no voting districts. Canvassers are scoped to a voting ` +
          'district, so nobody can be assigned to work these wards until theirs are loaded.',
        withoutVds.map((w) => w.wardCode),
      ),
    );
  }

  const withoutVoters = live.filter((w) => w.registeredVoters <= 0);
  if (withoutVoters.length > 0) {
    issues.push(
      issue(
        'WARD_WITHOUT_VOTERS',
        'WARNING',
        `${withoutVoters.length} ward(s) show no registered voters. Coverage is a percentage of that ` +
          'number, so it cannot be reported for them.',
        withoutVoters.map((w) => w.wardCode),
      ),
    );
  }

  // A VD code repeating ACROSS wards is normal — the gazette splits about
  // a fifth of voting stations across ward boundaries, which is why a
  // VotingDistrict is identified by the (ward, VD) pair. Repeating WITHIN
  // one ward is not: it double-counts that ward's own VD tally.
  const repeatedWithin = live.filter((w) => new Set(w.vdCodes).size !== w.vdCodes.length);
  if (repeatedWithin.length > 0) {
    issues.push(
      issue(
        'VD_CODE_REPEATED_IN_WARD',
        'BLOCKING',
        `${repeatedWithin.length} ward(s) list the same voting district code twice. The same code in two ` +
          'different wards is normal and expected — about a fifth of voting stations are split across a ' +
          'ward boundary — but twice in one ward is a double entry.',
        repeatedWithin.map((w) => w.wardCode),
      ),
    );
  }

  return finish(issues, { wardCount, vdCount, registeredVoters, expectedWardCount });
}

function finish(
  issues: SeedIssue[],
  totals: Pick<SeedReconciliation, 'wardCount' | 'vdCount' | 'registeredVoters' | 'expectedWardCount'>,
): SeedReconciliation {
  const blocking = issues.filter((i) => i.severity === 'BLOCKING');
  return {
    issues,
    blocking,
    warnings: issues.filter((i) => i.severity === 'WARNING'),
    reconciled: blocking.length === 0,
    ...totals,
  };
}
