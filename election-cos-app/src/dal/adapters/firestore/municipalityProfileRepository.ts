/**
 * Election Campaign OS — Firestore adapter: municipality profile
 * IC-ECOS-BUILD-2026-V2 §3.2. Single doc: tenants/{tid}/profile/municipality.
 */
import type { SessionContext } from '@/dal/ports/session';
import type {
  MunicipalityProfile,
  MunicipalityProfileDraft,
  MunicipalityProfileRepository,
} from '@/dal/ports/municipalityProfile';
import { getByIdGeneric, toISO, upsertGeneric } from './base';

const DOC_ID = 'municipality';

function fromFirestore(id: string, data: Record<string, unknown>): MunicipalityProfile {
  return {
    id,
    tenantId: data.tenantId as string,
    municipalityCode: data.municipalityCode as string,
    municipalityName: data.municipalityName as string,
    province: data.province as string,
    totalCouncilSeats: (data.totalCouncilSeats as number) ?? 0,
    wardSeats: (data.wardSeats as number) ?? 0,
    prSeats: (data.prSeats as number) ?? 0,
    electionDate: data.electionDate as string | undefined,
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
  };
}

export const municipalityProfileRepository: MunicipalityProfileRepository = {
  async get(ctx: SessionContext): Promise<MunicipalityProfile | null> {
    return getByIdGeneric(ctx, 'profile', DOC_ID, fromFirestore);
  },

  async upsert(ctx: SessionContext, profile: MunicipalityProfileDraft) {
    return upsertGeneric(ctx, 'profile', DOC_ID, profile, false);
  },
};
