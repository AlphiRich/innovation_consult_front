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
  upsert(ctx: SessionContext, voter: VoterDraft): Promise<UpsertResult>;
  softDelete(ctx: SessionContext, id: string, reason: string): Promise<void>;
}
