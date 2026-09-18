/**
 * Election Campaign OS — reading the audit log, and its limits
 * IC-ECOS-BUILD-2026-V2 §7.5, §6.2.1, §6.8.4.
 *
 * WHY THIS EXISTS
 *
 * `dal.auditLog.listRecent()` has existed since Phase 3 with a Firestore
 * adapter behind it and a security rule allowing the read to
 * `settings.permissions` holders. No screen ever called it. Three
 * modules promise an audit event in their own headers — unmasking a
 * candidate's identity number, exporting the donor ledger, changing a
 * PPFA threshold — and an administrator asking "who unmasked that
 * number?" had no way to find out, and no way to learn that they could
 * not find out.
 *
 * A supplied screen design (session 31) put a "filing compliance audit"
 * panel and a "view full audit log" button on a candidates screen, and a
 * security review of a different build recommended a hash-chained,
 * tamper-evident audit table. Both point at the same hole from opposite
 * directions.
 *
 * WHAT THIS LOG IS, EXACTLY
 *
 * Append-only from the client's point of view: `firestore.rules` sets
 * `allow write: if false`, so nothing in the application can add to it,
 * edit it or remove from it. Entries are written by Cloud Functions with
 * the Admin SDK.
 *
 * WHAT IT IS NOT, AND THE SCREEN SAYS SO
 *
 *  - **Not tamper-evident.** There is no hash chain. A client cannot
 *    alter it; somebody with Admin SDK credentials could, and nothing in
 *    the record would show it. The security review that recommended a
 *    chained log is right and it is not built. Saying "audit log" on a
 *    screen without saying that would let a reader believe a property the
 *    data does not have.
 *  - **Not a record of who read what.** It records specific acts, not
 *    page views. SOP-12 already tells administrators this; the screen
 *    repeats it where the question is actually asked.
 *  - **Empty until the functions that write it are deployed.** No live
 *    Firebase project exists in this build (BUILD-STATUS.md), so no
 *    entries are produced. An empty page that says why is the honest
 *    version; a page that just looked quiet would read as "nothing has
 *    happened".
 */
import type { AuditEvent } from '@/dal/ports/auditLog';

/**
 * Printed on the screen, above the entries. Guarded by
 * `auditTrail.test.ts`, which fails if it stops disclosing that the log
 * is not tamper-evident.
 */
export const AUDIT_INTEGRITY_BASIS =
  'This log is append-only from inside the application: the security rules deny every client write, so ' +
  'nothing you or anybody else does in this platform can edit or remove an entry. It is not tamper-evident ' +
  'beyond that — there is no hash chain, so an administrator holding server credentials could alter it and ' +
  'the record would not show it. Treat it as a reliable account of what the platform did, not as evidence ' +
  'that nobody has interfered with it.';

export const AUDIT_SCOPE_BASIS =
  'Specific acts are recorded — unmasking an identity number, exporting the donor ledger, changing a ' +
  'disclosure threshold. Ordinary reads are not. Nobody is logged for opening a page, and this log cannot ' +
  'tell you who looked at a voter record.';

export const AUDIT_EMPTY_BASIS =
  'No entries. Audit events are written by server-side functions, and this build has no live Firebase ' +
  'project provisioned, so none are being produced yet. An empty log here means the writer is not running — ' +
  'it does not mean the acts above have never happened.';

/**
 * Plain-language labels for the actions the codebase actually claims to
 * write. Deliberately not a catch-all map: an unknown action shows its
 * raw identifier rather than a guessed sentence, because inventing a
 * description for an event nobody declared is how a log starts saying
 * things the system never did.
 */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  'voter.phone.unmask': 'Unmasked a voter’s contact number',
  'candidate.idNumber.unmask': 'Unmasked a candidate’s identity number',
  'ppfa.export': 'Exported the donor ledger',
  'ppfa.config.create': 'Changed the PPFA disclosure thresholds',
};

export function describeAction(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

/** True when the platform has no plain-language description for it. */
export function isUnknownAction(action: string): boolean {
  return !(action in AUDIT_ACTION_LABEL);
}

export interface AuditGrouping {
  /** ISO date, newest first. */
  day: string;
  events: AuditEvent[];
}

/** Newest first, grouped by day, for a reader scanning backwards. */
export function groupByDay(events: AuditEvent[]): AuditGrouping[] {
  const byDay = new Map<string, AuditEvent[]>();
  for (const event of [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))) {
    const day = event.occurredAt.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), event]);
  }
  return [...byDay.entries()].map(([day, dayEvents]) => ({ day, events: dayEvents }));
}
