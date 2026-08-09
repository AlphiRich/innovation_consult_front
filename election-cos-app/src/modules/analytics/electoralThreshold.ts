/**
 * Election-COS1.0 — electoral qualification threshold (Schedule 1 Step 2)
 * IC-ECOS-BUILD-2026-V2 §8.2. ELECTORAL vote threshold — not to be
 * confused with the PPFA statutory funding-disclosure thresholds at
 * /settings/ppfa-thresholds (see ThresholdAnalyzerPage.tsx's own naming-
 * discipline comment).
 *
 * The 1% figure is a commonly-cited feature of the Municipal Structures
 * Act Schedule 1 PR system (a party must clear 1% of total valid votes
 * cast across both ballots to be entitled to PR seats) and appears in the
 * session-8 "Seat Allocation Mathematical Conventions" digest — but
 * unlike that digest's quota formula (independently confirmed against
 * the real NW405 IEC report, see seatCalculator.ts), the 1% threshold
 * itself has NOT been independently verified against a primary source in
 * this build. Treat it as a reasonable working assumption, not a
 * confirmed statutory fact — see docs/unverified-source-documents.md.
 */
export const QUALIFICATION_THRESHOLD_PCT = 1;

export function pctOfTotal(votes: number, totalValidVotes: number): number {
  if (totalValidVotes <= 0) return 0;
  return (votes / totalValidVotes) * 100;
}

export function meetsQualificationThreshold(votes: number, totalValidVotes: number): boolean {
  if (totalValidVotes <= 0) return false;
  return votes >= (QUALIFICATION_THRESHOLD_PCT / 100) * totalValidVotes;
}

/** Additional votes needed to clear the threshold; 0 if already met. */
export function votesNeededForThreshold(votes: number, totalValidVotes: number): number {
  if (totalValidVotes <= 0) return 0;
  const needed = Math.ceil((QUALIFICATION_THRESHOLD_PCT / 100) * totalValidVotes) - votes;
  return Math.max(0, needed);
}
