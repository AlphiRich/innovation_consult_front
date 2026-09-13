/**
 * Election Campaign OS — Candidate list repository port
 * IC-ECOS-BUILD-2026-V2 §6.6. SA ID numbers here are special personal
 * information: encrypted at rest, masked in all UI, unmask requires an
 * explicit capability and writes an audit event, export requires a
 * second-factor confirmation (Digital Signature Pin per the screens).
 */
import type { SessionContext, UpsertResult } from './session';

/**
 * Self-declared, and optional. Needed because Schedule 1 of the Municipal
 * Structures Act asks a party to seek to ensure half its PR candidates are
 * women and that candidates of each sex are evenly distributed through the
 * list — a position that cannot be reported on without the datum.
 *
 * Optional and never inferred: `prList.ts` reports "cannot assess" for
 * undeclared candidates rather than guessing from a name, which would be
 * both wrong and offensive. UNDISCLOSED is a real answer, not a gap.
 */
export type CandidateGender = 'FEMALE' | 'MALE' | 'OTHER' | 'UNDISCLOSED';

export interface Candidate {
  id: string;
  tenantId: string;
  fullName: string;
  affiliation: 'WARD' | 'PR';
  wardCode?: string;
  /** Order of preference on the PR list (Schedule 1). Decides who takes a
   * seat as the quota calculator works down the list — never conflate it
   * with any internal campaign-strategy score. */
  listRank?: number;
  gender?: CandidateGender;
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
