/**
 * Election Campaign OS — separations of duty, and who is holding both ends
 * IC-ECOS-BUILD-2026-V2 §4.4.
 *
 * WHY THIS EXISTS
 *
 * `roleModel.test.ts` enforces separations of duty across the seed roles,
 * carefully and with reasons. Every one of them can be reassembled from
 * the Permissions page with a checkbox. `capOverrides.granted` accepts any
 * capability in the catalogue, `resolveEffectiveCapabilities` unions it
 * onto the role, and the Cloud Function stamps the result into a token.
 * The separations were enforced against the seven static roles and not
 * against the mechanism that exists to depart from them — which is the
 * only mechanism anybody would use to depart from them.
 *
 * TWO KINDS OF RULE, AND THEY ARE NOT INTERCHANGEABLE
 *
 * The first draft of this module got that wrong, and the seed roles
 * disproved it within a minute: it declared "donor data requests and
 * disclosure thresholds" and "the full funding set" as general
 * separations, and `party-hq-admin` holds the first pair while
 * `finance-officer` holds the second by design. Neither is a general rule
 * of this build. So:
 *
 *  - `SEPARATION_RULES` holds combinations **no role may have**,
 *    whoever they are. There is exactly one, and `roleModel.test.ts`
 *    asserts it of every seed role.
 *  - `ROLE_WITHHOLDINGS` holds capabilities a **specific role** is
 *    deliberately denied. A Compliance Officer may edit the donor ledger
 *    — POPIA's correction right needs it — but may not set the thresholds
 *    applied to that donor or export the ledger. A Finance Officer may do
 *    both of those and may not answer data subject requests. Those are
 *    facts about two roles, not about any capability set.
 *
 * Stating a role-specific rule as a general one would have warned on
 * correctly-configured roles, which is how a warning gets ignored.
 *
 * WHY THIS WARNS AND DOES NOT BLOCK
 *
 * A ward campaign may genuinely have one person doing everything, and a
 * platform that refused would be telling a small party it may not operate.
 * Same discipline the funding module applies to a donation: flag it, name
 * it, and leave the decision with the people accountable for it. What is
 * not acceptable is the combination happening silently.
 */
import type { Capability } from '@/auth/types';

export interface SeparationRule {
  /** Short, so it fits a warning line. */
  label: string;
  /** Held together, these concentrate a duty that is meant to be split. */
  capabilities: Capability[];
  /** Why the split exists, in terms of what could go wrong. */
  reason: string;
}

/**
 * Combinations no role holds, and none may be given.
 *
 * One rule, because one is what this build actually enforces —
 * `roleModel.test.ts`'s "grants no role every capability at once". Adding
 * a rule here that a seed role breaches fails `dutyConcentration.test.ts`,
 * which is the right order round: the rule is the thing, and the roles
 * conform to it.
 */
export const SEPARATION_RULES: SeparationRule[] = [
  {
    label: 'The whole disclosure chain, plus the donor’s own data requests',
    capabilities: ['ppfa.edit', 'ppfa.manage_thresholds', 'dsr.manage'],
    reason:
      'One person would record a donor’s money, set the thresholds deciding what is disclosed about it, and ' +
      'answer that donor’s request to know what is held about them. No seed role holds all three.',
  },
];

export interface RoleWithholding {
  roleId: string;
  /** Deliberately denied to this role. */
  capabilities: Capability[];
  reason: string;
}

/**
 * Capabilities a particular role is deliberately denied, from
 * `roleModel.test.ts`'s own reasoning.
 *
 * Granting one of these by override is not forbidden — see the header —
 * but it is a departure from a decision somebody made on purpose, and the
 * person making it should know which decision.
 */
export const ROLE_WITHHOLDINGS: RoleWithholding[] = [
  {
    roleId: 'compliance-officer',
    capabilities: ['ppfa.manage_thresholds', 'ppfa.export'],
    reason:
      'The person who answers a donor’s data subject request is deliberately kept away from the thresholds ' +
      'that decide what is disclosed about that donor, and from exporting the ledger.',
  },
  {
    roleId: 'finance-officer',
    capabilities: ['dsr.view', 'dsr.manage'],
    reason:
      'Funding compliance and data compliance are separate jobs here. The officer who records donations does ' +
      'not answer the data subject requests those donors make.',
  },
];

export interface DutyConcentration {
  rule: SeparationRule;
  /** The capabilities from this rule the person would hold. */
  held: Capability[];
}

export interface WithholdingBreach {
  withholding: RoleWithholding;
  /** The deliberately-denied capabilities this person would hold. */
  held: Capability[];
}

export const CONCENTRATION_BASIS =
  'This does not stop you saving. A small campaign may have one person doing several jobs, and that is a ' +
  'decision for the people accountable for it, not for this platform. What it must not be is accidental — ' +
  'so the combination is named here, before it is granted, and the staff record shows who granted it.';

/**
 * Separations a set of effective capabilities would breach.
 *
 * Takes the resolved set rather than a role plus overrides, so it answers
 * the question that matters — what this person will actually be able to
 * do — regardless of which side supplied the capability.
 */
export function dutyConcentrations(caps: Capability[]): DutyConcentration[] {
  const held = new Set(caps);
  return SEPARATION_RULES.filter((rule) => rule.capabilities.every((c) => held.has(c))).map((rule) => ({
    rule,
    held: rule.capabilities,
  }));
}

/** Capabilities this role is meant not to have, that this person would. */
export function withholdingBreaches(roleId: string, caps: Capability[]): WithholdingBreach[] {
  const held = new Set(caps);
  return ROLE_WITHHOLDINGS.filter((w) => w.roleId === roleId)
    .map((withholding) => ({
      withholding,
      held: withholding.capabilities.filter((c) => held.has(c)),
    }))
    .filter((breach) => breach.held.length > 0);
}
