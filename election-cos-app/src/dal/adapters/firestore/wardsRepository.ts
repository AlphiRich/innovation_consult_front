/**
 * Election-COS1.0 — Firestore adapter: wards
 * IC-ECOS-BUILD-2026-V2 §5, §6.1.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { Ward, WardDraft, WardRepository } from '@/dal/ports/wards';
import { db, getByIdGeneric, tenantCollectionPath, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): Ward {
  return {
    id,
    tenantId: data.tenantId as string,
    wardCode: data.wardCode as string,
    municipalityCode: data.municipalityCode as string,
    name: data.name as string,
    registeredVoters: (data.registeredVoters as number) ?? 0,
    vdCodes: (data.vdCodes as string[]) ?? [],
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const wardsRepository: WardRepository = {
  async getByCode(ctx: SessionContext, wardCode: string): Promise<Ward | null> {
    return getByIdGeneric(ctx, 'wards', wardCode, fromFirestore);
  },

  async listAll(ctx: SessionContext): Promise<Ward[]> {
    const snap = await getDocs(
      query(collection(db(), tenantCollectionPath(ctx.tenantId, 'wards')), where('deletedAt', '==', null)),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async upsert(ctx: SessionContext, ward: WardDraft) {
    return upsertGeneric(ctx, 'wards', ward.wardCode, ward, false);
  },
};
