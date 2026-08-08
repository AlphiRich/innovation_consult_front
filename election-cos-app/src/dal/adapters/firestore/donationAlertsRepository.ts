/**
 * Election-COS1.0 — Firestore adapter: donation alerts (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8.3. Alerts are raised server-side
 * (functions/src/ppfaAggregation.ts, currently HELD per §6.8.1) — this
 * adapter only reads and acknowledges, never creates.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { DonationAlert, DonationAlertRepository } from '@/dal/ports/donationAlerts';
import { db, tenantCollectionPath, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): DonationAlert {
  return {
    id,
    tenantId: data.tenantId as string,
    donorId: data.donorId as string,
    level: data.level as DonationAlert['level'],
    thresholdApplied: data.thresholdApplied as number,
    configIdApplied: data.configIdApplied as string,
    aggregateAtTrigger: data.aggregateAtTrigger as number,
    raisedAt: data.raisedAt as string,
    acknowledgedBy: data.acknowledgedBy as string | undefined,
    acknowledgedAt: data.acknowledgedAt as string | undefined,
    resolutionNote: data.resolutionNote as string | undefined,
  };
}

export const donationAlertsRepository: DonationAlertRepository = {
  async listOpen(ctx: SessionContext): Promise<DonationAlert[]> {
    const snap = await getDocs(
      query(collection(db(), tenantCollectionPath(ctx.tenantId, 'donationAlerts')), where('acknowledgedAt', '==', null)),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async listByDonor(ctx: SessionContext, donorId: string): Promise<DonationAlert[]> {
    const snap = await getDocs(
      query(collection(db(), tenantCollectionPath(ctx.tenantId, 'donationAlerts')), where('donorId', '==', donorId)),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async acknowledge(ctx: SessionContext, id: string, resolutionNote: string): Promise<void> {
    await upsertGeneric(
      ctx,
      'donationAlerts',
      id,
      { acknowledgedBy: ctx.uid, acknowledgedAt: new Date().toISOString(), resolutionNote },
      false,
    );
  },
};
