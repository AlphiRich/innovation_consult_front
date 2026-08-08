/**
 * Election-COS1.0 — data subject request response tracking
 *
 * POPIA does not prescribe a fixed statutory response window the way
 * GDPR's 30-day rule does — Condition 8 just requires that the responsible
 * party act on a request. `RESPONSE_TARGET_DAYS` is a working assumption
 * (not a legal deadline) so the request log can flag ones going stale.
 * ATTORNEY REVIEW NEEDED before this is presented to a customer as a
 * commitment — see 04-legal-compliance-workstream.md's action table
 * (LG2/LG3 are the closest analogues; this specific question isn't listed
 * there and should be raised alongside them).
 */
export const RESPONSE_TARGET_DAYS = 30;

export function isOverdue(receivedAt: string, status: string, now: Date = new Date()): boolean {
  if (status === 'FULFILLED' || status === 'REJECTED') return false;
  const received = new Date(receivedAt);
  const elapsedDays = (now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays > RESPONSE_TARGET_DAYS;
}
