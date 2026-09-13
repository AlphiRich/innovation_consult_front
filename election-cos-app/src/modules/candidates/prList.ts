/**
 * Election Campaign OS — PR party list compliance aid
 * IC-ECOS-BUILD-2026-V2 §6.6, §8.2.
 *
 * The candidates port has carried `affiliation: 'PR'` and `listRank` since
 * Phase 3 with nothing enforcing either. This is the missing half: the
 * checks a party should see *before* it submits a list, so a fixable
 * problem is caught here rather than by the Commission's rejection.
 *
 * WHAT THIS IS NOT
 *
 * It is not a filing integration. The Commission does not expose an API
 * for party-list submission — submission is by hand or through the
 * Commission's own system. This produces a checked list and an export for
 * a human to submit, and no surface may describe it as automated IEC
 * filing. Same discipline as the PPFA module, which aggregates and never
 * files.
 *
 * STATUTORY BASIS — and what is and is not verified
 *
 * Party lists are governed by **section 14** of the Local Government:
 * Municipal Electoral Act 27 of 2000 (submission, deposit, declarations,
 * cut-off) and **section 15** (the Commission's compilation and
 * certification). List composition is governed by **Schedule 1 of the
 * Local Government: Municipal Structures Act 117 of 1998**.
 *
 * Section 17 of the Municipal Electoral Act governs **ward candidate**
 * nominations — an individual standing in a specific ward — and is NOT
 * the basis for PR party lists. That mis-citation was found in another
 * build's UI copy; it does not appear in this repository and
 * `prList.test.ts` keeps it out.
 *
 * Verified for this build (search against the Acts, Sep 2026):
 *  - s14 concerns party-list submission; s17 concerns ward nominations —
 *    confirmed, and it is the correction that matters most here;
 *  - Schedule 1's gender provision is worded as a duty to **"seek to
 *    ensure"** that 50% of candidates are women and that candidates of
 *    each sex are **"evenly distributed"** through the list — an
 *    aspirational standard, not a hard mathematical gate.
 *
 * NOT verified from a primary source in this build: the exact numeric cap
 * on list length (reported elsewhere as twice the number of PR seats).
 * SAFLII, lawlibrary.org.za and the gov.za mirror were all unreachable
 * from this environment. The cap is therefore **configured, cited and
 * hedged** rather than hardcoded — the same treatment `PPFAConfig` gives
 * the funding thresholds, and for the same reason: a wrong hard block
 * would reject a lawful list. See docs/unverified-source-documents.md.
 */
import type { Candidate } from '@/dal/ports/candidates';

export const PR_LIST_CITATIONS = {
  submission: 'Section 14, Local Government: Municipal Electoral Act 27 of 2000',
  certification: 'Section 15, Local Government: Municipal Electoral Act 27 of 2000',
  removal: 'Section 14(5), Local Government: Municipal Electoral Act 27 of 2000',
  composition: 'Schedule 1, Local Government: Municipal Structures Act 117 of 1998',
} as const;

/**
 * Printed anywhere this module's output is shown or exported. It says what
 * the export is, because "IEC export" on a button invites the reader to
 * think something was filed.
 */
export const PR_LIST_EXPORT_BASIS =
  'This is a compliance aid, not a submission. The Electoral Commission does not accept party ' +
  'lists through this platform — the export is a document for a person to check and submit. ' +
  'Nothing here is filed with the Commission, and nothing here certifies a list.';

/**
 * Default multiplier for the list-length cap. NOT independently verified
 * — see the header. Overridable per tenant so a corrected figure does not
 * need a code change.
 */
export const DEFAULT_LIST_LENGTH_MULTIPLIER = 2;

export const LIST_LENGTH_BASIS =
  `A list longer than ${DEFAULT_LIST_LENGTH_MULTIPLIER}× the PR seats to be filled is reported as ` +
  'blocking, per Schedule 1 of the Municipal Structures Act. This multiplier has not been ' +
  'confirmed against a primary source in this build and is configurable for that reason — ' +
  'confirm it against the Act before relying on it. Pending attorney review.';

export const GENDER_BASIS =
  'Schedule 1 asks a party to seek to ensure that half its candidates are women and that ' +
  'candidates of each sex are evenly distributed through the list. That is a standard to aim ' +
  'at, not a threshold to pass, so a shortfall is shown as a warning and never blocks an ' +
  'export — a party may submit a list that falls short and answer for it politically.';

export type PrListIssueCode =
  | 'LIST_TOO_LONG'
  | 'RANK_MISSING'
  | 'RANK_DUPLICATED'
  | 'RANK_NOT_CONTIGUOUS'
  | 'CANDIDATE_DUPLICATED'
  | 'NOT_VERIFIED'
  | 'GENDER_SHORTFALL'
  | 'GENDER_CLUSTERED'
  | 'GENDER_UNDECLARED';

export interface PrListIssue {
  code: PrListIssueCode;
  /** BLOCKING stops an export. WARNING is shown and does not stop it. */
  severity: 'BLOCKING' | 'WARNING';
  message: string;
  /** Candidate ids this concerns, where it concerns specific ones. */
  candidateIds: string[];
}

export interface PrListCheckInput {
  candidates: Candidate[];
  /** PR seats to be filled, from the tenant's municipality profile. */
  prSeats: number;
  listLengthMultiplier?: number;
}

export interface PrListCheckResult {
  issues: PrListIssue[];
  blocking: PrListIssue[];
  warnings: PrListIssue[];
  canExport: boolean;
  /** Ordered by list position, for display and export. */
  ordered: Candidate[];
  maxListLength: number;
  womenCount: number;
  declaredCount: number;
}

function issue(
  code: PrListIssueCode,
  severity: PrListIssue['severity'],
  message: string,
  candidateIds: string[] = [],
): PrListIssue {
  return { code, severity, message, candidateIds };
}

/**
 * Evenness check for Schedule 1's "evenly distributed" wording. Not a
 * statutory formula — the Act gives none — so this is a deliberately
 * simple, explainable heuristic: it flags a run of three or more
 * consecutive same-sex candidates, which is what "all the women at the
 * bottom of the list" actually looks like in a list.
 */
function longestSameGenderRun(ordered: Candidate[]): { run: number; ids: string[] } {
  let best = { run: 0, ids: [] as string[] };
  let current: Candidate[] = [];
  for (const candidate of ordered) {
    if (!candidate.gender || candidate.gender === 'UNDISCLOSED') {
      current = [];
      continue;
    }
    if (current.length > 0 && current[0].gender === candidate.gender) {
      current.push(candidate);
    } else {
      current = [candidate];
    }
    if (current.length > best.run) best = { run: current.length, ids: current.map((c) => c.id) };
  }
  return best;
}

export function checkPrList(input: PrListCheckInput): PrListCheckResult {
  const multiplier = input.listLengthMultiplier ?? DEFAULT_LIST_LENGTH_MULTIPLIER;
  const maxListLength = Math.max(0, Math.floor(input.prSeats * multiplier));

  const prCandidates = input.candidates.filter((c) => c.affiliation === 'PR' && c.deletedAt === null);
  const ordered = [...prCandidates].sort(
    (a, b) => (a.listRank ?? Number.MAX_SAFE_INTEGER) - (b.listRank ?? Number.MAX_SAFE_INTEGER),
  );

  const issues: PrListIssue[] = [];

  // --- list length: blocking, and never silently truncated --------------
  if (maxListLength > 0 && prCandidates.length > maxListLength) {
    issues.push(
      issue(
        'LIST_TOO_LONG',
        'BLOCKING',
        `The list has ${prCandidates.length} candidates; the cap for ${input.prSeats} PR seats is ` +
          `${maxListLength}. Remove candidates deliberately — this export will not truncate the ` +
          'list for you, because silently dropping a name the party meant to include is worse ' +
          'than refusing to export.',
      ),
    );
  }

  // --- list positions ---------------------------------------------------
  const unranked = prCandidates.filter((c) => c.listRank === undefined || c.listRank === null);
  if (unranked.length > 0) {
    issues.push(
      issue(
        'RANK_MISSING',
        'BLOCKING',
        `${unranked.length} candidate(s) have no list position. Order of preference decides who ` +
          'takes a seat, so it cannot be left to the order rows happen to come back in.',
        unranked.map((c) => c.id),
      ),
    );
  }

  const ranks = prCandidates.map((c) => c.listRank).filter((r): r is number => typeof r === 'number');
  const duplicated = ranks.filter((r, i) => ranks.indexOf(r) !== i);
  if (duplicated.length > 0) {
    const dupSet = new Set(duplicated);
    issues.push(
      issue(
        'RANK_DUPLICATED',
        'BLOCKING',
        `List position(s) ${[...dupSet].sort((a, b) => a - b).join(', ')} are used more than once.`,
        prCandidates.filter((c) => typeof c.listRank === 'number' && dupSet.has(c.listRank)).map((c) => c.id),
      ),
    );
  }

  const sortedRanks = [...new Set(ranks)].sort((a, b) => a - b);
  const contiguous = sortedRanks.every((r, i) => r === i + 1);
  if (sortedRanks.length > 0 && !contiguous) {
    issues.push(
      issue(
        'RANK_NOT_CONTIGUOUS',
        'WARNING',
        'List positions are not a run of 1..n. That is usually a leftover gap from a removed ' +
          'candidate rather than an intention.',
      ),
    );
  }

  // --- a person appearing twice on the same list ------------------------
  const byMaskedId = new Map<string, Candidate[]>();
  for (const candidate of prCandidates) {
    const key = candidate.idNumberMasked.trim();
    if (key === '') continue;
    byMaskedId.set(key, [...(byMaskedId.get(key) ?? []), candidate]);
  }
  for (const [, group] of byMaskedId) {
    if (group.length > 1) {
      issues.push(
        issue(
          'CANDIDATE_DUPLICATED',
          'BLOCKING',
          `${group[0].fullName} appears ${group.length} times on this list.`,
          group.map((c) => c.id),
        ),
      );
    }
  }

  // --- verification -----------------------------------------------------
  const unverified = prCandidates.filter((c) => c.verificationStatus !== 'VERIFIED');
  if (unverified.length > 0) {
    issues.push(
      issue(
        'NOT_VERIFIED',
        unverified.some((c) => c.verificationStatus === 'REJECTED') ? 'BLOCKING' : 'WARNING',
        `${unverified.length} candidate(s) are not marked verified. A candidate the Commission ` +
          'cannot confirm as a registered voter in this municipality will be removed from the ' +
          'list under section 14(5) — better caught here.',
        unverified.map((c) => c.id),
      ),
    );
  }

  // --- gender: warnings only, per the "seek to ensure" wording ----------
  const declared = prCandidates.filter((c) => c.gender && c.gender !== 'UNDISCLOSED');
  const womenCount = prCandidates.filter((c) => c.gender === 'FEMALE').length;

  if (declared.length < prCandidates.length) {
    issues.push(
      issue(
        'GENDER_UNDECLARED',
        'WARNING',
        `${prCandidates.length - declared.length} candidate(s) have no declared gender, so the ` +
          'even-distribution position cannot be assessed for the whole list. Nothing is inferred ' +
          'from names.',
        prCandidates.filter((c) => !c.gender || c.gender === 'UNDISCLOSED').map((c) => c.id),
      ),
    );
  }

  if (declared.length > 0 && womenCount * 2 < declared.length) {
    issues.push(
      issue(
        'GENDER_SHORTFALL',
        'WARNING',
        `${womenCount} of ${declared.length} candidates with a declared gender are women, short ` +
          'of the half the Act asks a party to seek. This does not block the export.',
      ),
    );
  }

  const run = longestSameGenderRun(ordered);
  if (run.run >= 3) {
    issues.push(
      issue(
        'GENDER_CLUSTERED',
        'WARNING',
        `${run.run} candidates of the same sex sit consecutively on the list. The Act asks that ` +
          'candidates of each sex be evenly distributed through it.',
        run.ids,
      ),
    );
  }

  const blocking = issues.filter((i) => i.severity === 'BLOCKING');
  return {
    issues,
    blocking,
    warnings: issues.filter((i) => i.severity === 'WARNING'),
    canExport: blocking.length === 0 && prCandidates.length > 0,
    ordered,
    maxListLength,
    womenCount,
    declaredCount: declared.length,
  };
}
