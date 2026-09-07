/**
 * Election Campaign OS — Firestore adapter: documents
 * IC-ECOS-BUILD-2026-V2 §8.4.
 */
import { collection, getDocs, query } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { CampaignDocument, CampaignDocumentDraft, DocumentRepository } from '@/dal/ports/documents';
import { db, getByIdGeneric, tenantCollectionPath, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): CampaignDocument {
  return {
    id,
    tenantId: data.tenantId as string,
    title: data.title as string,
    classification: data.classification as CampaignDocument['classification'],
    storagePath: data.storagePath as string,
    integrityHashSha256: data.integrityHashSha256 as string,
    watermark: (data.watermark as CampaignDocument['watermark']) ?? null,
    signedBy: data.signedBy as string | undefined,
    signedAt: data.signedAt as string | undefined,
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const documentsRepository: DocumentRepository = {
  async getById(ctx: SessionContext, id: string): Promise<CampaignDocument | null> {
    return getByIdGeneric(ctx, 'documents', id, fromFirestore);
  },

  async listAll(ctx: SessionContext): Promise<CampaignDocument[]> {
    const snap = await getDocs(query(collection(db(), tenantCollectionPath(ctx.tenantId, 'documents'))));
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async upsert(ctx: SessionContext, document: CampaignDocumentDraft) {
    return upsertGeneric(ctx, 'documents', document.id, document, false);
  },
};
