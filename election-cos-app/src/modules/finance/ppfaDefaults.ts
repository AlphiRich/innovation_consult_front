/**
 * Election-COS1.0 — PPFA statutory defaults
 * IC-ECOS-BUILD-2026-V2 §0 rule 4, §6.8.2.
 *
 * These are SEED VALUES for a new tenant's first PPFAConfig document, not
 * constants used anywhere in aggregation/alerting logic. Every place that
 * needs a threshold must read the tenant's current PPFAConfig
 * (dal.ppfaConfig.getCurrent), never this file directly, and must record
 * configIdApplied on anything it triggers.
 *
 * Source: Government Gazette No. 53182, 18 August 2025.
 *
 * §6.8.1 — the aggregation rule and financial-year start month below are
 * PROVISIONAL. Do not build the aggregation Cloud Function against these
 * without legal confirmation of Q1 (per-donation vs cumulative) and Q2
 * (financial year boundary). See functions/src/ppfaAggregation.ts.
 */
import type { PPFAConfigDraft } from '@/dal/ports/ppfaConfig';

export const PPFA_GAZETTE_CITATION = 'Government Gazette No. 53182, 18 August 2025';

export function defaultPPFAConfig(tenantId: string, createdBy: string): PPFAConfigDraft {
  return {
    tenantId,
    disclosureThresholdZAR: 200_000_00, // R200,000, integer cents
    annualDonorCapZAR: 30_000_000_00, // R30,000,000, integer cents
    warningPercentage: 0.8, // 80% of R200,000 = R160,000 — never R80,000 (superseded)
    aggregationRule: 'CUMULATIVE_PER_DONOR_PER_YEAR', // PROVISIONAL — §6.8.1 Q1 unresolved
    financialYearStartMonth: 4, // PROVISIONAL — §6.8.1 Q2 unresolved, assumed April
    effectiveDate: new Date().toISOString(),
    sourceCitation: PPFA_GAZETTE_CITATION,
    createdBy,
  };
}
