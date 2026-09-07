/**
 * Election Campaign OS — data subject request response tracking
 *
 * POPIA does not prescribe a fixed statutory response window the way
 * GDPR's 30-day rule does — Condition 8 just requires that the responsible
 * party act on a request. `RESPONSE_TARGET_DAYS` is a working assumption
 * (not a legal deadline) so the request log can flag ones going stale.
 * ATTORNEY REVIEW NEEDED before this is presented to a customer as a
 * commitment — see 04-legal-compliance-workstream.md's action table
 * (LG2/LG3 are the closest analogues; this specific question isn't listed
 * there and should be raised alongside them).
 *
 * Session 16: the caveat is now an exported string rendered by the UI
 * rather than prose retyped on the page, so the figure and the reason it
 * is hedged travel together. This is not hypothetical tidying — the
 * ecos-v2 fork took this exact file and rendered its 30-day working
 * assumption as "21-day statutory turnaround limit" on one screen and
 * "14-day SLA enforcement" on another (docs/ecos-v2-fork-review.md §4d).
 * A number that can be displayed without its caveat will eventually be
 * displayed without its caveat.
 */
export const RESPONSE_TARGET_DAYS = 30;

/**
 * The sentence any surface showing `RESPONSE_TARGET_DAYS` must show with
 * it. Guarded by `dataSubjectRequestSla.test.ts`, which fails if this ever
 * starts asserting the window is statutory.
 */
export const RESPONSE_TARGET_BASIS =
  `Overdue means past a working ${RESPONSE_TARGET_DAYS}-day internal target. ` +
  'POPIA sets no fixed response window — this figure is our working assumption, ' +
  'not a legal deadline, and is pending attorney review.';

export function isOverdue(receivedAt: string, status: string, now: Date = new Date()): boolean {
  if (status === 'FULFILLED' || status === 'REJECTED') return false;
  const received = new Date(receivedAt);
  const elapsedDays = (now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays > RESPONSE_TARGET_DAYS;
}
