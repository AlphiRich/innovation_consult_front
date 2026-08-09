/**
 * Election-COS1.0 — Document repository port
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
