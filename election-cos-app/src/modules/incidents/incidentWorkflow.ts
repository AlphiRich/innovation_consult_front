/**
 * Election Campaign OS — the incident lifecycle
 * IC-ECOS-BUILD-2026-V2 §6.4.
 *
 * WHY THIS EXISTS
 *
 * `IncidentStatus` declares six states and the product could reach four.
 * RESOLVED and CLOSED were in the type, in `STATUS_LABEL`, and in
 * `STATUS_ORDER` — so the Incidents page rendered a tab for each of them
 * — and no capability, no repository method and no security rule could
 * put an incident into either. An incident referred to a municipality
 * stayed REFERRED for ever, which means a war room's count of open
 * incidents only ever goes up, and the two tabs at the end of the row were
 * permanently empty.
 *
 * This is the one place that says which move is legal and who may make it.
 * The security rules mirror it; `incidentWorkflow.test.ts` asserts the two
 * agree, because a transition allowed here and refused there is a button
 * that fails at the moment somebody presses it in the field.
 *
 * WHY RESOLVING AND CLOSING ARE DIFFERENT PERMISSIONS
 *
 * Resolving records something that happened in the world: the water is
 * back on. Whoever triages is close enough to the ground to know, so
 * `incidents.triage` carries it.
 *
 * Closing is a judgement that the campaign will do nothing further —
 * duplicate, out of scope, resident withdrew, or resolved and finished
 * with. That ends the record, so it sits with the same capability that
 * authorises escalation and referral.
 *
 * NOTHING IS EVER DELETED
 *
 * CLOSED is terminal in this workflow, but the incident remains. The
 * security rules set `delete: if false` on this collection like every
 * other, and closing an incident is not a way around that.
 */
import type { Capability } from '@/auth/types';
import type { IncidentStatus } from '@/dal/ports/incidents';

export interface IncidentTransition {
  from: IncidentStatus;
  to: IncidentStatus;
  capability: Capability;
  /** What the operator is actually saying, for the button and the manual. */
  label: string;
}

export const INCIDENT_TRANSITIONS: IncidentTransition[] = [
  { from: 'LOGGED', to: 'TRIAGED', capability: 'incidents.triage', label: 'Confirm severity' },
  { from: 'TRIAGED', to: 'ESCALATED', capability: 'incidents.escalate', label: 'Escalate' },
  { from: 'ESCALATED', to: 'REFERRED', capability: 'incidents.escalate', label: 'Issue referral' },

  // Something got fixed. Reachable from any point after it was triaged,
  // because a municipality can act before a referral is ever issued.
  { from: 'TRIAGED', to: 'RESOLVED', capability: 'incidents.triage', label: 'Mark resolved' },
  { from: 'ESCALATED', to: 'RESOLVED', capability: 'incidents.triage', label: 'Mark resolved' },
  { from: 'REFERRED', to: 'RESOLVED', capability: 'incidents.triage', label: 'Mark resolved' },

  // The campaign will do nothing further.
  { from: 'LOGGED', to: 'CLOSED', capability: 'incidents.escalate', label: 'Close' },
  { from: 'TRIAGED', to: 'CLOSED', capability: 'incidents.escalate', label: 'Close' },
  { from: 'ESCALATED', to: 'CLOSED', capability: 'incidents.escalate', label: 'Close' },
  { from: 'REFERRED', to: 'CLOSED', capability: 'incidents.escalate', label: 'Close' },
  { from: 'RESOLVED', to: 'CLOSED', capability: 'incidents.escalate', label: 'Close' },
];

/** Terminal: nothing moves out of it, and nothing deletes it either. */
export const TERMINAL_STATUS: IncidentStatus = 'CLOSED';

export function transitionsFrom(status: IncidentStatus): IncidentTransition[] {
  return INCIDENT_TRANSITIONS.filter((t) => t.from === status);
}

/** The moves this user can make on an incident in this state. */
export function availableTransitions(status: IncidentStatus, caps: Capability[]): IncidentTransition[] {
  return transitionsFrom(status).filter((t) => caps.includes(t.capability));
}

export function canTransition(from: IncidentStatus, to: IncidentStatus, caps: Capability[]): boolean {
  return availableTransitions(from, caps).some((t) => t.to === to);
}

/**
 * Why a move was refused, for a message the operator can act on. Separates
 * "that is not a legal move" from "you are not the one who makes it",
 * because the two have different answers.
 */
export function transitionRefusal(from: IncidentStatus, to: IncidentStatus, caps: Capability[]): string | null {
  if (canTransition(from, to, caps)) return null;
  const legal = transitionsFrom(from).find((t) => t.to === to);
  if (!legal) {
    if (from === TERMINAL_STATUS) {
      return 'This incident is closed. Closing is the end of the record — log a new incident rather than reopening this one.';
    }
    return 'That is not a move this incident can make from where it is.';
  }
  return `You do not hold the permission this step needs (${legal.capability}). Ask whoever does.`;
}

/**
 * Statuses still awaiting campaign action — what an "open incidents" count
 * should mean. Resolved and closed are out of it, which is the whole point
 * of being able to reach them.
 */
export function isOpen(status: IncidentStatus): boolean {
  return status !== 'RESOLVED' && status !== TERMINAL_STATUS;
}
