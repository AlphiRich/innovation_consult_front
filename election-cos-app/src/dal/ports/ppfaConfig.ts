/**
 * Election-COS1.0 — PPFA configuration port
 * IC-ECOS-BUILD-2026-V2 §6.8.2. APPEND-ONLY — never updated in place.
 * Statutory defaults: R200,000 disclosure threshold, R30,000,000 annual
 * donor cap (Government Gazette No. 53182, 18 Aug 2025). These are tenant
 * configuration with effective dates, never constants in code (build spec
 * §0 rule 4) — see src/modules/finance/ppfaDefaults.ts for where the
 * gazetted defaults are seeded from, not hardcoded into logic.
 */
import type { SessionContext } from './session';

export type AggregationRule = 'PER_DONATION' | 'CUMULATIVE_PER_DONOR_PER_YEAR'; // Q1, §6.8.1

export interface PPFAConfig {
  id: string;
  tenantId: string;
  disclosureThresholdZAR: number; // default 200_000_00 (cents)
  annualDonorCapZAR: number; // default 30_000_000_00
  warningPercentage: number; // default 0.80 -> R160,000
  aggregationRule: AggregationRule;
  financialYearStartMonth: number; // Q2, §6.8.1. default 4 (April)
  effectiveDate: string;
  sourceCitation: string; // e.g. 'Government Gazette No. 53182, 18 Aug 2025'
  createdBy: string;
  createdAt: string;
}

export type PPFAConfigDraft = Omit<PPFAConfig, 'id' | 'createdAt'>;

export interface PPFAConfigRepository {
  getCurrent(ctx: SessionContext): Promise<PPFAConfig | null>;
  listHistory(ctx: SessionContext): Promise<PPFAConfig[]>;
  /** Append-only: creates a new effective-dated config, never mutates a prior one. */
  create(ctx: SessionContext, config: PPFAConfigDraft): Promise<{ id: string }>;
}
