/**
 * Election-COS1.0 — Firestore adapter: households
 * IC-ECOS-BUILD-2026-V2 §5, §6.2.
 */
import { where } from 'firebase/firestore';
import type { Page, PageRequest, SessionContext } from '@/dal/ports/session';
import type { Household, HouseholdDraft, HouseholdRepository } from '@/dal/ports/households';
import { getByIdGeneric, geoScopeConstraints, listPageGeneric, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): Household {
  return {
    id,
    tenantId: data.tenantId as string,
    vdCode: data.vdCode as string,
    wardCode: data.wardCode as string,
    addressLine: data.addressLine as string,
    dwellingType: data.dwellingType as Household['dwellingType'],
    informalDescriptor: data.informalDescriptor as string | undefined,
    geo: data.geo as Household['geo'],
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const householdsRepository: HouseholdRepository = {
  async getById(ctx: SessionContext, id: string): Promise<Household | null> {
    return getByIdGeneric(ctx, 'households', id, fromFirestore);
  },

  async listByVD(ctx: SessionContext, vdCode: string, page: PageRequest): Promise<Page<Household>> {
    return listPageGeneric(
      ctx,
      'households',
      [where('vdCode', '==', vdCode), ...geoScopeConstraints(ctx)],
      page,
      fromFirestore,
    );
  },

  async upsert(ctx: SessionContext, household: HouseholdDraft) {
    return upsertGeneric(ctx, 'households', household.id, household, false);
  },

  async softDelete(ctx: SessionContext, id: string, reason: string): Promise<void> {
    await upsertGeneric(ctx, 'households', id, { deletedAt: new Date().toISOString(), deleteReason: reason }, false);
  },
};
