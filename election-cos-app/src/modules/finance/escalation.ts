/**
 * Election Campaign OS — PPFA escalation ladder
 * IC-ECOS-BUILD-2026-V2 §6.8.3.
 *
 * Pure function: given a donor's aggregate-to-date and the governing
 * config, returns the alert level to raise (or null). Never blocks a
 * write — this is called AFTER a donation is recorded
 * (dal.donations.record), by functions/src/ppfaAggregation.ts, to decide
 * whether to raise a DonationAlert. Kept pure and separate from the
 * Cloud Function itself so it can be unit-tested without emulators.
 *
 * NOT wired up to run automatically yet — the aggregation rule it depends
 * on (PPFAConfig.aggregationRule) is provisional pending §6.8.1 Q1/Q2/Q3.
 */
import type { AlertLevel } from '@/dal/ports/donationAlerts';
import type { PPFAConfig } from '@/dal/ports/ppfaConfig';

export function levelForAggregate(aggregateZAR: number, config: PPFAConfig): AlertLevel | null {
  const { disclosureThresholdZAR, annualDonorCapZAR, warningPercentage } = config;
  const warningZAR = disclosureThresholdZAR * warningPercentage;
  const capApproachingZAR = annualDonorCapZAR * warningPercentage;

  // Most severe first — never silently downgrade an exceeded cap to a warning.
  if (aggregateZAR >= annualDonorCapZAR) return 'CAP_EXCEEDED';
  if (aggregateZAR >= capApproachingZAR) return 'CAP_APPROACHING';
  if (aggregateZAR >= disclosureThresholdZAR) return 'DISCLOSURE_REQUIRED';
  if (aggregateZAR >= warningZAR) return 'WARNING';
  return null;
}

/**
 * §6.8.3: "record the donation ... require named human acknowledgement ...
 * Do not reject." This function only classifies; nothing in this module
 * ever throws or returns a rejection for the underlying write.
 */
export function requiresNamedAcknowledgement(level: AlertLevel): boolean {
  return level === 'CAP_EXCEEDED';
}
