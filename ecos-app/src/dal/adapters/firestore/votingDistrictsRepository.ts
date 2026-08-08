/**
 * Election Campaign OS — Firestore adapter: voting districts
 * IC-ECOS-BUILD-2026-V2 §5, §6.1.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { VotingDistrict, VotingDistrictDraft, VotingDistrictRepository } from '@/dal/ports/votingDistricts';
import { db, getByIdGeneric, tenantCollectionPath, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): VotingDistrict {
  return {
    id,
    tenantId: data.tenantId as string,
    vdCode: data.vdCode as string,
    wardCode: data.wardCode as string,
    name: data.name as string,
    registeredVoters: (data.registeredVoters as number) ?? 0,
    centroid: data.centroid as VotingDistrict['centroid'],
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const votingDistrictsRepository: VotingDistrictRepository = {
  async getByCode(ctx: SessionContext, vdCode: string): Promise<VotingDistrict | null> {
    return getByIdGeneric(ctx, 'votingDistricts', vdCode, fromFirestore);
  },

  async listByWard(ctx: SessionContext, wardCode: string): Promise<VotingDistrict[]> {
    const snap = await getDocs(
      query(collection(db(), tenantCollectionPath(ctx.tenantId, 'votingDistricts')), where('wardCode', '==', wardCode)),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async upsert(ctx: SessionContext, vd: VotingDistrictDraft) {
    return upsertGeneric(ctx, 'votingDistricts', vd.vdCode, vd, false);
  },
};
