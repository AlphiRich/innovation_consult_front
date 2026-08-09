/**
 * Election-COS1.0 — Household repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.2
 *
 * `dwellingType` + `informalDescriptor` + GPS is the working identifier for
 * informal settlements where formal street addressing does not exist —
 * do not require addressLine to resolve to a real street address.
 */
import type { Page, PageRequest, SessionContext, UpsertResult } from './session';

export interface Household {
  id: string;
  tenantId: string;
  vdCode: string;
  wardCode: string;
  addressLine: string;
  dwellingType: 'FORMAL' | 'INFORMAL' | 'BACKYARD' | 'OTHER';
  informalDescriptor?: string;
  geo?: { lat: number; lng: number; accuracyM: number };
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type HouseholdDraft = Omit<
  Household,
  'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'
>;

export interface HouseholdRepository {
  getById(ctx: SessionContext, id: string): Promise<Household | null>;
  listByVD(ctx: SessionContext, vdCode: string, page: PageRequest): Promise<Page<Household>>;
  upsert(ctx: SessionContext, household: HouseholdDraft): Promise<UpsertResult>;
  softDelete(ctx: SessionContext, id: string, reason: string): Promise<void>;
}
