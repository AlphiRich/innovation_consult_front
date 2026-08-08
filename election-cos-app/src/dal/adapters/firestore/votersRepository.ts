/**
 * Election-COS1.0 — Firestore adapter: voters
 * IC-ECOS-BUILD-2026-V2 §5, §6.2.
 */
import { where } from 'firebase/firestore';
import type { Page, PageRequest, SessionContext } from '@/dal/ports/session';
import type { Voter, VoterDraft, VoterRepository } from '@/dal/ports/voters';
import { getByIdGeneric, geoScopeConstraints, listPageGeneric, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): Voter {
  return {
    id,
    tenantId: data.tenantId as string,
    householdId: data.householdId as string,
    vdCode: data.vdCode as string,
    wardCode: data.wardCode as string,
    firstName: data.firstName as string,
    lastName: data.lastName as string,
    phoneMasked: data.phoneMasked as string,
    phoneEncrypted: data.phoneEncrypted as string | undefined,
    sentiment: data.sentiment as Voter['sentiment'],
    popiaConsentGiven: Boolean(data.popiaConsentGiven),
    popiaConsentAt: (data.popiaConsentAt as string | undefined) ?? undefined,
    popiaConsentMethod: data.popiaConsentMethod as Voter['popiaConsentMethod'],
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const votersRepository: VoterRepository = {
  async getById(ctx: SessionContext, id: string): Promise<Voter | null> {
    return getByIdGeneric(ctx, 'voters', id, fromFirestore);
  },

  async listByVD(ctx: SessionContext, vdCode: string, page: PageRequest): Promise<Page<Voter>> {
    return listPageGeneric(
      ctx,
      'voters',
      [where('vdCode', '==', vdCode), ...geoScopeConstraints(ctx)],
      page,
      fromFirestore,
    );
  },

  async upsert(ctx: SessionContext, voter: VoterDraft) {
    // popiaConsentGiven === false is rejected by firestore.rules, not here —
    // the client should surface CONSENT_REQUIRED per §7.6, not pre-empt it.
    return upsertGeneric(ctx, 'voters', voter.id, voter, false);
  },

  async softDelete(ctx: SessionContext, id: string, reason: string): Promise<void> {
    await upsertGeneric(ctx, 'voters', id, { deletedAt: new Date().toISOString(), deleteReason: reason }, false);
  },
};
