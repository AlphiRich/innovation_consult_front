/**
 * Election Campaign OS — Household repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.2
 *
 * `dwellingType` + `informalDescriptor` + GPS is the working identifier for
 * informal settlements where formal street addressing does not exist —
 * do not require addressLine to resolve to a real street address.
 */
import type { Page, PageRequest, SessionContext, UpsertResult } from './session';

/**
 * FLAT and CAMPUS_RES are not cosmetic additions to FORMAL: a block of
 * flats and a student residence are one structure holding many voters
 * with high turnover, so they are canvassed and counted differently from
 * a house. NW405's Ward 28 is the NWU campus, which makes CAMPUS_RES a
 * real case here rather than a hypothetical one.
 */
export type DwellingType = 'FORMAL' | 'INFORMAL' | 'BACKYARD' | 'FLAT' | 'CAMPUS_RES' | 'OTHER';

/**
 * Canvassing round state for a door. Ordered loosely from untouched to
 * closed; `canvassQueue.ts` owns the transitions and the re-contact rules.
 */
export type ContactStatus =
  | 'NOT_CONTACTED'
  | 'IN_PROGRESS'
  | 'CONTACTED'
  | 'NO_ANSWER'
  | 'INACCESSIBLE'
  | 'REFUSED_RECONTACT';

export interface Household {
  id: string;
  tenantId: string;
  vdCode: string;
  wardCode: string;
  addressLine: string;
  dwellingType: DwellingType;
  informalDescriptor?: string;
  geo?: { lat: number; lng: number; accuracyM: number };
  /**
   * Where this door sits in the canvassing round. Absent on older records,
   * which `canvassQueue.ts` reads as NOT_CONTACTED. See that module — the
   * status is not free-form, and REFUSED_RECONTACT is terminal.
   */
  contactStatus?: ContactStatus;
  lastContactedAt?: string;
  /** uid of whoever last worked this door, for a supervisor's follow-up. */
  lastContactedBy?: string;
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
