/**
 * Election-COS1.0 — Voter repository port
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
