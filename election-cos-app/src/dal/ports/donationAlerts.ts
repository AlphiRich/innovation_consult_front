/**
 * Election Campaign OS — Donation alert port (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.3. System-raised (Cloud Function),
 * human-acknowledged. Never auto-resolved, never blocks the underlying
 * donation write.
 */
import type { SessionContext } from './session';

export type AlertLevel = 'WARNING' | 'DISCLOSURE_REQUIRED' | 'CAP_APPROACHING' | 'CAP_EXCEEDED';

export interface DonationAlert {
  id: string;
  tenantId: string;
  donorId: string;
  level: AlertLevel;
  thresholdApplied: number;
  configIdApplied: string; // evidential — which config governed at trigger time
  aggregateAtTrigger: number;
  raisedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolutionNote?: string;
}

export interface DonationAlertRepository {
  listOpen(ctx: SessionContext): Promise<DonationAlert[]>;
  listByDonor(ctx: SessionContext, donorId: string): Promise<DonationAlert[]>;
  acknowledge(ctx: SessionContext, id: string, resolutionNote: string): Promise<void>;
}
