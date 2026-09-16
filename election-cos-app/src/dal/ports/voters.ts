/**
 * Election Campaign OS — Voter repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.2
 */
import type { Page, PageRequest, SessionContext, UpsertResult } from './session';

export interface Voter {
  id: string;
  tenantId: string;
  householdId: string;
  vdCode: string;
  wardCode: string;
  firstName: string;
  lastName: string;
  phoneMasked: string; // display value
  phoneEncrypted?: string; // AES-256, §6.2.1 — never plaintext
  sentiment: 'STRONG_SUPPORT' | 'LEAN_SUPPORT' | 'UNDECIDED' | 'LEAN_OPPOSITION' | 'STRONG_OPPOSITION';
  popiaConsentGiven: boolean; // write blocked (server-side) if false
  popiaConsentAt?: string;
  popiaConsentMethod: 'VERBAL_DOORSTEP' | 'WRITTEN' | 'DIGITAL';
  /**
   * How this consent could be demonstrated if it were ever questioned —
   * a membership-form batch reference, an event name and date, a signup
   * campaign id. POPIA puts the burden of showing consent was given on
   * the responsible party, and "WRITTEN" on its own shows nothing.
   *
   * Optional because a doorstep capture is already evidenced by the
   * canvasser and timestamp on the record. Required by `bulkImport.ts`
   * for anything imported in bulk, where there is no canvasser standing
   * at a door to be the evidence.
   */
  popiaConsentReference?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type VoterDraft = Omit<Voter, 'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'>;

export interface VoterRepository {
  getById(ctx: SessionContext, id: string): Promise<Voter | null>;
  listByVD(ctx: SessionContext, vdCode: string, page: PageRequest): Promise<Page<Voter>>;
  /**
   * Find a person by name, for a POPIA access or correction request.
   *
   * Added session 27. Until then the only way into the roll was by voting
   * district, so a compliance officer handed "Thandi Mokoena wants to
   * know what you hold about her" had no way to find her unless the
   * request happened to include a VD code — which is not something a data
   * subject knows or should have to supply.
   *
   * Narrowed by the caller's geographic scope like every other read, so a
   * ward-scoped user searching finds only their own ward. A tenant-scoped
   * compliance officer searches the tenant, which is the point.
   */
  findByName(ctx: SessionContext, firstName: string, lastName: string): Promise<Voter[]>;
  upsert(ctx: SessionContext, voter: VoterDraft): Promise<UpsertResult>;
  softDelete(ctx: SessionContext, id: string, reason: string): Promise<void>;
}
