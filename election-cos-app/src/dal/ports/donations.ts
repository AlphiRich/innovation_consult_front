/**
 * Election-COS1.0 — Donation repository port (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.3.
 *
 * Money is integer cents. Never a float — a rounding error on a statutory
 * threshold is a compliance failure. This repository NEVER blocks a write
 * on amount or threshold; it only records. Alerting is a separate
 * responsibility (donationAlerts.ts / functions/src/ppfaAggregation.ts),
 * and that aggregation function is deliberately HELD pending the three open
 * statutory questions in §6.8.1 — do not wire it up without reading that
 * section first.
 */
import type { SessionContext, UpsertResult } from './session';

export interface Donation {
  id: string;
  tenantId: string;
  donorId: string;
  amountZAR: number; // integer cents
  receivedAt: string; // ISO 8601
  financialYear: string; // '2026/27' — derived, stored for query
  quarter: 1 | 2 | 3 | 4;
  inKind: boolean;
  description?: string;
  recordedBy: string;
  disclosedAt?: string;
  iecReference?: string;
}

export type DonationDraft = Pick<
  Donation,
  'id' | 'tenantId' | 'donorId' | 'amountZAR' | 'receivedAt' | 'financialYear' | 'quarter' | 'inKind' | 'description' | 'recordedBy'
>;

export interface DonationRepository {
  getById(ctx: SessionContext, id: string): Promise<Donation | null>;
  listByDonor(ctx: SessionContext, donorId: string): Promise<Donation[]>;
  /** Never rejects on amount. See file header. */
  record(ctx: SessionContext, donation: DonationDraft): Promise<UpsertResult>;
  markDisclosed(ctx: SessionContext, id: string, iecReference: string): Promise<void>;
}
