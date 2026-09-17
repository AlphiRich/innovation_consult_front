/**
 * Election Campaign OS — the canvassing work queue
 * IC-ECOS-BUILD-2026-V2 §6.2, §7.
 *
 * WHY THIS EXISTS
 *
 * Until now this build could record *that* canvassing happened — the
 * field diary logs a `CANVASS` entry with a `householdsVisited` count —
 * but nothing could answer the question a canvasser standing in a street
 * actually has: **which doors are left?** The diary's count is an
 * aggregate written after the fact; it carries no per-door state, so two
 * canvassers working the same VD have no way to avoid knocking on the
 * same door twice, and no way to know which ones were already refused.
 *
 * `Household.contactStatus` is that state, and this module owns what the
 * statuses mean, which transitions are legal, and — the part that matters
 * most — **when a door may be offered again**.
 *
 * REFUSAL IS TERMINAL, AND THAT IS DELIBERATE
 *
 * The canvassing status sets this pattern is usually modelled on
 * (CANVASSED / IN_PROGRESS / PENDING / UNREACHABLE) have no way to record
 * "this household asked us not to come back". Without it, a refusal is
 * indistinguishable from a no-answer and the door returns to the queue on
 * the next round.
 *
 * `REFUSED_RECONTACT` is terminal here. A household that asks not to be
 * called on again has objected to being canvassed, and honouring that is
 * both ordinary courtesy and the safer reading of POPIA's objection
 * right — a party that keeps knocking after being told not to is
 * processing personal information the subject has objected to, and is
 * also losing the argument on the doorstep. Reopening it is a deliberate
 * act by someone with `voters.edit`, not something the queue does on a
 * timer.
 *
 * THE COOL-OFF IS OPERATIONAL, NOT LEGAL
 *
 * `NO_ANSWER_COOLOFF_HOURS` is a campaign-operations default — nobody is
 * home at 10am, try again in the evening. It is not a statutory period
 * and this module never presents it as one.
 */
import type { ContactStatus, Household } from '@/dal/ports/households';

/**
 * How long a door that did not answer waits before the queue offers it
 * again. An operational default, not a legal one; tenants may override.
 */
export const NO_ANSWER_COOLOFF_HOURS = 6;

/**
 * An inaccessible door (locked gate, dog loose, security estate) waits
 * longer — the obstacle is usually still there a few hours later.
 */
export const INACCESSIBLE_COOLOFF_HOURS = 48;

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  NOT_CONTACTED: 'Not contacted',
  IN_PROGRESS: 'In progress',
  CONTACTED: 'Contacted',
  NO_ANSWER: 'No answer',
  INACCESSIBLE: 'Could not reach the door',
  REFUSED_RECONTACT: 'Asked not to be contacted again',
};

/** Statuses a door can be moved to from each status. */
const ALLOWED: Record<ContactStatus, ContactStatus[]> = {
  NOT_CONTACTED: ['IN_PROGRESS', 'CONTACTED', 'NO_ANSWER', 'INACCESSIBLE', 'REFUSED_RECONTACT'],
  IN_PROGRESS: ['CONTACTED', 'NO_ANSWER', 'INACCESSIBLE', 'REFUSED_RECONTACT', 'NOT_CONTACTED'],
  CONTACTED: ['REFUSED_RECONTACT', 'IN_PROGRESS'],
  NO_ANSWER: ['IN_PROGRESS', 'CONTACTED', 'NO_ANSWER', 'INACCESSIBLE', 'REFUSED_RECONTACT'],
  INACCESSIBLE: ['IN_PROGRESS', 'CONTACTED', 'NO_ANSWER', 'INACCESSIBLE', 'REFUSED_RECONTACT'],
  // Terminal. Reopening is a deliberate act elsewhere, not a transition
  // the round can make on its own.
  REFUSED_RECONTACT: [],
};

export function statusOf(household: Household): ContactStatus {
  return household.contactStatus ?? 'NOT_CONTACTED';
}

export function canTransition(from: ContactStatus, to: ContactStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** Why a transition was refused, for a message the canvasser can act on. */
export function transitionRefusalReason(from: ContactStatus, to: ContactStatus): string | null {
  if (canTransition(from, to)) return null;
  if (from === 'REFUSED_RECONTACT') {
    return 'This household asked not to be contacted again. Reopening that is a supervisor decision, not a round action.';
  }
  return `A door that is "${CONTACT_STATUS_LABEL[from]}" cannot move straight to "${CONTACT_STATUS_LABEL[to]}".`;
}

function hoursSince(iso: string | undefined, now: Date): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - then) / 3_600_000;
}

export interface QueueOptions {
  now?: Date;
  noAnswerCooloffHours?: number;
  inaccessibleCooloffHours?: number;
}

/**
 * Whether this door should be offered to a canvasser right now.
 *
 * Suppressed records are never offered, and neither is a refusal — at any
 * age, which is the point of it being terminal rather than a long
 * cool-off.
 */
export function isQueueable(household: Household, options: QueueOptions = {}): boolean {
  if (household.deletedAt !== null) return false;

  const now = options.now ?? new Date();
  const status = statusOf(household);

  switch (status) {
    case 'NOT_CONTACTED':
      return true;
    case 'CONTACTED':
    case 'REFUSED_RECONTACT':
      return false;
    case 'IN_PROGRESS':
      // Someone is at this door now. Offering it to a second canvasser is
      // how two people knock on the same gate a minute apart.
      return false;
    case 'NO_ANSWER':
      return hoursSince(household.lastContactedAt, now) >= (options.noAnswerCooloffHours ?? NO_ANSWER_COOLOFF_HOURS);
    case 'INACCESSIBLE':
      return (
        hoursSince(household.lastContactedAt, now) >=
        (options.inaccessibleCooloffHours ?? INACCESSIBLE_COOLOFF_HOURS)
      );
  }
}

export interface QueueSummary {
  total: number;
  queueable: number;
  contacted: number;
  refused: number;
  waiting: number;
  inProgress: number;
  byStatus: Record<ContactStatus, number>;
  /** Doors worked at least once, over doors that can be worked at all. */
  coveragePct: number;
}

/**
 * The numbers a ward lead needs to see for a VD: how much of it is done,
 * what is left, and what is deliberately out of scope.
 *
 * Refusals are counted and excluded from the coverage denominator —
 * reporting a VD as 80% covered when the other 20% asked not to be
 * visited misrepresents both the work and the households.
 */
export function summariseQueue(households: Household[], options: QueueOptions = {}): QueueSummary {
  const live = households.filter((h) => h.deletedAt === null);

  const byStatus = Object.fromEntries(
    (Object.keys(CONTACT_STATUS_LABEL) as ContactStatus[]).map((s) => [s, 0]),
  ) as Record<ContactStatus, number>;
  for (const household of live) byStatus[statusOf(household)] += 1;

  const refused = byStatus.REFUSED_RECONTACT;
  const contacted = byStatus.CONTACTED;
  const queueable = live.filter((h) => isQueueable(h, options)).length;
  const inProgress = byStatus.IN_PROGRESS;

  const workable = live.length - refused;
  const worked = contacted + byStatus.NO_ANSWER + byStatus.INACCESSIBLE + inProgress;

  return {
    total: live.length,
    queueable,
    contacted,
    refused,
    inProgress,
    // Doors that were tried and are simply waiting out a cool-off.
    waiting: live.length - queueable - contacted - refused - inProgress,
    byStatus,
    coveragePct: workable === 0 ? 0 : Math.round((worked / workable) * 1000) / 10,
  };
}

/**
 * The next doors to work, oldest attempt first so a round sweeps evenly
 * rather than repeatedly returning to the same few.
 */
export function nextDoors(households: Household[], limit: number, options: QueueOptions = {}): Household[] {
  return households
    .filter((h) => isQueueable(h, options))
    .sort((a, b) => {
      const aAt = a.lastContactedAt ?? '';
      const bAt = b.lastContactedAt ?? '';
      if (aAt === bAt) return a.id.localeCompare(b.id);
      return aAt.localeCompare(bAt);
    })
    .slice(0, Math.max(0, limit));
}
