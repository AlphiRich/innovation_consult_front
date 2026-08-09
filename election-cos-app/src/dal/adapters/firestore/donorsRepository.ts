/**
 * Election-COS1.0 — Firestore adapter: donors (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8.2. Online only — never wired into the offline
 * layer (§7.1).
 */
import { collection, getDocs, query } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { Donor, DonorDraft, DonorRepository } from '@/dal/ports/donors';
import { db, getByIdGeneric, tenantCollectionPath, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): Donor {
  return {
    id,
    tenantId: data.tenantId as string,
    donorType: data.donorType as Donor['donorType'],
    displayName: data.displayName as string,
    idNumberEncrypted: data.idNumberEncrypted as string | undefined,
    registrationNumberEncrypted: data.registrationNumberEncrypted as string | undefined,
    contactEmail: data.contactEmail as string | undefined,
    isForeign: Boolean(data.isForeign),
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
  };
}

export const donorsRepository: DonorRepository = {
  async getById(ctx: SessionContext, id: string): Promise<Donor | null> {
    return getByIdGeneric(ctx, 'donorLedger', id, fromFirestore);
  },

  async listAll(ctx: SessionContext): Promise<Donor[]> {
    const snap = await getDocs(query(collection(db(), tenantCollectionPath(ctx.tenantId, 'donorLedger'))));
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async upsert(ctx: SessionContext, donor: DonorDraft) {
    return upsertGeneric(ctx, 'donorLedger', donor.id, donor, false);
  },
};
