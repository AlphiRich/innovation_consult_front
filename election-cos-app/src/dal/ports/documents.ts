/**
 * Election Campaign OS — Document repository port
 * IC-ECOS-BUILD-2026-V2 §8.4. Classification, watermark, e-signature,
 * SHA-256 content hash. Labelled "Document Integrity Hash (SHA-256)" —
 * never "Blockchain Verified Hash" (master index §3.3, build spec §3.5).
 */
import type { SessionContext, UpsertResult } from './session';

export type DocumentClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface CampaignDocument {
  id: string;
  tenantId: string;
  title: string;
  classification: DocumentClassification;
  storagePath: string;
  integrityHashSha256: string;
  /**
   * The exact serialization the integrity hash was computed over.
   *
   * Without it the printed hash is unverifiable by anyone, including the
   * campaign that issued the document: the hash covers the referral's
   * particulars, and until session 27 those particulars existed only
   * inside the PDF. A hash nobody can recompute attests to nothing, which
   * is the failure the fork's "SHA-256 Verified" badge made loudly and
   * this build was making quietly.
   *
   * Optional because documents predating this carry none, and a
   * verification that cannot be performed says so rather than failing.
   */
  canonicalPayload?: string;
  watermark: 'DRAFT' | 'FINAL' | null;
  signedBy?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type CampaignDocumentDraft = Omit<
  CampaignDocument,
  'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'
>;

export interface DocumentRepository {
  getById(ctx: SessionContext, id: string): Promise<CampaignDocument | null>;
  listAll(ctx: SessionContext): Promise<CampaignDocument[]>;
  upsert(ctx: SessionContext, document: CampaignDocumentDraft): Promise<UpsertResult>;
}
