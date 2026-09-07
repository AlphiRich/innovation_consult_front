/**
 * Election Campaign OS — Firestore adapter: donations (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.3. NEVER blocks on amount — see the
 * port file header. `financialYear` is derived by the caller (module layer)
 * from the current PPFAConfig.financialYearStartMonth, not computed here.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { Donation, DonationDraft, DonationRepository } from '@/dal/ports/donations';
import { db, getByIdGeneric, tenantCollectionPath, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): Donation {
  return {
    id,
    tenantId: data.tenantId as string,
    donorId: data.donorId as string,
    amountZAR: data.amountZAR as number,
    receivedAt: data.receivedAt as string,
    financialYear: data.financialYear as string,
    quarter: data.quarter as Donation['quarter'],
    inKind: Boolean(data.inKind),
    description: data.description as string | undefined,
    recordedBy: data.recordedBy as string,
    disclosedAt: data.disclosedAt as string | undefined,
    iecReference: data.iecReference as string | undefined,
  };
}

export const donationsRepository: DonationRepository = {
  async getById(ctx: SessionContext, id: string): Promise<Donation | null> {
    return getByIdGeneric(ctx, 'donations', id, fromFirestore);
  },

  async listByDonor(ctx: SessionContext, donorId: string): Promise<Donation[]> {
    const snap = await getDocs(
      query(collection(db(), tenantCollectionPath(ctx.tenantId, 'donations')), where('donorId', '==', donorId)),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async record(ctx: SessionContext, donation: DonationDraft) {
    // Deliberately: no threshold/cap check here. See §6.8.3 — flag, never block.
    return upsertGeneric(ctx, 'donations', donation.id, donation, true);
  },

  async markDisclosed(ctx: SessionContext, id: string, iecReference: string): Promise<void> {
    await upsertGeneric(ctx, 'donations', id, { disclosedAt: new Date().toISOString(), iecReference }, false);
  },
};
