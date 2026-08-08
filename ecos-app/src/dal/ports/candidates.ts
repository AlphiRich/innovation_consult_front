/**
 * Election Campaign OS — Candidate list repository port
 * IC-ECOS-BUILD-2026-V2 §6.6. SA ID numbers here are special personal
 * information: encrypted at rest, masked in all UI, unmask requires an
 * explicit capability and writes an audit event, export requires a
 * second-factor confirmation (Digital Signature Pin per the screens).
 */
import type { SessionContext, UpsertResult } from './session';

export interface Candidate {
  id: string;
  tenantId: string;
  fullName: string;
  affiliation: 'WARD' | 'PR';
  wardCode?: string;
  listRank?: number;
  idNumberEncrypted: string; // never plaintext
  idNumberMasked: string; // e.g. '771120 •••• 081'
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type CandidateDraft = Omit<
  Candidate,
  'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'
>;

export interface CandidateRepository {
  getById(ctx: SessionContext, id: string): Promise<Candidate | null>;
  listAll(ctx: SessionContext): Promise<Candidate[]>;
  upsert(ctx: SessionContext, candidate: CandidateDraft): Promise<UpsertResult>;
  /** Unmasking requires an explicit capability and writes an audit event server-side. */
  unmaskIdNumber(ctx: SessionContext, id: string): Promise<string>;
}
