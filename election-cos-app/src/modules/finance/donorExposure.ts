/**
 * Election Campaign OS — what a donor's giving amounts to, under the rule
 * the tenant actually configured
 * IC-ECOS-BUILD-2026-V2 §6.8.1 Q1, §6.8.2, §6.8.3.
 *
 * WHY THIS EXISTS
 *
 * `functions/src/ppfaAggregation.ts` says the classification logic sits
 * "behind a strategy interface (PPFAConfig.aggregationRule) so answering
 * Q1 is a configuration choice, not a rewrite". There was no strategy
 * interface. `PPFAConfig.aggregationRule` is settable on the thresholds
 * page, printed back on that page and on the funding page, stored as
 * evidential configuration — and read by nothing. The one place that
 * computed a threshold level, `DonorDetail.tsx`, summed the donor's
 * financial year unconditionally.
 *
 * So a tenant whose config said PER_DONATION saw a screen computed
 * cumulatively, with its own configuration printed above it saying
 * otherwise, and nothing to tell them which they were looking at. The
 * promise the aggregation file makes about itself is now true: this is
 * the strategy interface, and answering Q1 is a config entry.
 *
 * BOTH READINGS ARE ALWAYS COMPUTED, DELIBERATELY
 *
 * Q1 is open. Until counsel answers it, a finance officer who can see
 * only the configured reading cannot tell whether the answer would change
 * their exposure — and the whole reason the question is held open is that
 * nobody here knows. So both figures are returned, the configured one is
 * named as governing, and the screen shows what the other rule would say
 * when the two disagree.
 *
 * WHICH DONATIONS GO ON A RETURN IS NOT ANSWERED HERE
 *
 * Once a donor crosses the threshold cumulatively, whether the return
 * carries every donation from that donor or only the ones that crossed it
 * is part of the same unresolved question. This module reports what is
 * undisclosed and does not decide what must be filed. `Q1_UNRESOLVED`
 * says so on the screen.
 */
import type { AlertLevel } from '@/dal/ports/donationAlerts';
import type { Donation } from '@/dal/ports/donations';
import type { AggregationRule, PPFAConfig } from '@/dal/ports/ppfaConfig';
import { levelForAggregate } from './escalation';
import { deriveFinancialYear } from './financialYear';

export const RULE_BASIS: Record<AggregationRule, string> = {
  CUMULATIVE_PER_DONOR_PER_YEAR:
    'Cumulative per donor per financial year: everything this donor gave in the year is added together and ' +
    'the total is tested against the threshold.',
  PER_DONATION:
    'Per donation: each donation is tested against the threshold on its own, so a donor can give several ' +
    'amounts below it without the total crossing anything.',
};

/**
 * The sentence that belongs beside any exposure figure. Guarded by
 * `donorExposure.test.ts`, which fails if it stops saying the question is
 * open.
 */
export const Q1_UNRESOLVED =
  'Which of the two readings the Political Party Funding Act requires is unresolved (build spec §6.8.1 Q1) ' +
  'and is pending attorney review. Your tenant configuration picks one so that this screen computes ' +
  'something definite; it does not settle the question. Where the two readings disagree, both are shown. ' +
  'Which donations a return must then carry is part of the same unanswered question.';

/**
 * Foreign and anonymous donors, carried forward to where money is
 * recorded.
 *
 * The donor form already tells the operator that "PPFA foreign-funding
 * restrictions apply" and then does nothing further with the flag: it
 * appears nowhere on the donation form, the donation list, or any total.
 * Surfacing the flag is not the same as implementing the restriction, and
 * this deliberately does not implement it — what may be accepted and what
 * must be done about it has not been settled by counsel, and inventing an
 * answer to a funding-source restriction is exactly the class of claim
 * this build does not make.
 */
export const RESTRICTED_DONOR_BASIS =
  'This donor is flagged foreign or anonymous. The platform records the flag and shows it wherever their ' +
  'money appears; it does not decide what the restriction requires and will not stop you recording a ' +
  'donation. What may be accepted, and what must be done about what has been, is a question for your ' +
  'attorney — it sits on the open list beside §6.8.1 Q1–Q3 and has not been answered.';

export interface DonorExposure {
  financialYear: string;
  /** The rule the tenant's current configuration selects. */
  rule: AggregationRule;
  /** The figure that rule tests against the threshold. */
  governingAmountZAR: number;
  /** Always computed, whichever rule governs. */
  cumulativeZAR: number;
  largestSingleZAR: number;
  level: AlertLevel | null;
  /** What the other reading of Q1 would give. */
  levelUnderOtherRule: AlertLevel | null;
  /** True when answering Q1 the other way would change what this screen says. */
  rulesDisagree: boolean;
  donationsInYear: Donation[];
  /** Recorded, in this year, and not yet marked disclosed. */
  undisclosed: Donation[];
}

export function otherRule(rule: AggregationRule): AggregationRule {
  return rule === 'PER_DONATION' ? 'CUMULATIVE_PER_DONOR_PER_YEAR' : 'PER_DONATION';
}

function governingAmount(rule: AggregationRule, cumulative: number, largest: number): number {
  return rule === 'PER_DONATION' ? largest : cumulative;
}

/**
 * A donor's position for one financial year.
 *
 * Takes donations rather than reading them, so it is testable without a
 * session and so the register below can compute a whole tenant from one
 * read instead of one read per donor.
 */
export function exposureForDonor(
  donations: Donation[],
  config: PPFAConfig,
  now: Date = new Date(),
): DonorExposure {
  const financialYear = deriveFinancialYear(now, config.financialYearStartMonth);
  const donationsInYear = donations.filter((d) => d.financialYear === financialYear);

  const cumulativeZAR = donationsInYear.reduce((sum, d) => sum + d.amountZAR, 0);
  const largestSingleZAR = donationsInYear.reduce((max, d) => Math.max(max, d.amountZAR), 0);

  const governingAmountZAR = governingAmount(config.aggregationRule, cumulativeZAR, largestSingleZAR);
  const level = levelForAggregate(governingAmountZAR, config);
  const levelUnderOtherRule = levelForAggregate(
    governingAmount(otherRule(config.aggregationRule), cumulativeZAR, largestSingleZAR),
    config,
  );

  return {
    financialYear,
    rule: config.aggregationRule,
    governingAmountZAR,
    cumulativeZAR,
    largestSingleZAR,
    level,
    levelUnderOtherRule,
    rulesDisagree: level !== levelUnderOtherRule,
    donationsInYear,
    undisclosed: donationsInYear.filter((d) => !d.disclosedAt),
  };
}
