/**
 * Election Campaign OS — Firestore adapter: candidates
 * IC-ECOS-BUILD-2026-V2 §6.6. Unmasking an SA ID number is a server
 * operation (Cloud Function, Admin SDK) that writes an audit event —
 * never a plain client-side Firestore read of the encrypted field.
 */
import { collection, getDocs, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { SessionContext } from '@/dal/ports/session';
import type { Candidate, CandidateDraft, CandidateRepository } from '@/dal/ports/candidates';
import { db, getByIdGeneric, tenantCollectionPath, toISO, upsertGeneric } from './base';
import { getFunctionsClient } from './client';

function fromFirestore(id: string, data: Record<string, unknown>): Candidate {
  return {
    id,
    tenantId: data.tenantId as string,
    fullName: data.fullName as string,
    affiliation: data.affiliation as Candidate['affiliation'],
    wardCode: data.wardCode as string | undefined,
    listRank: data.listRank as number | undefined,
    idNumberEncrypted: data.idNumberEncrypted as string,
    idNumberMasked: data.idNumberMasked as string,
    verificationStatus: data.verificationStatus as Candidate['verificationStatus'],
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const candidatesRepository: CandidateRepository = {
  async getById(ctx: SessionContext, id: string): Promise<Candidate | null> {
    return getByIdGeneric(ctx, 'candidates', id, fromFirestore);
  },

  async listAll(ctx: SessionContext): Promise<Candidate[]> {
    const snap = await getDocs(query(collection(db(), tenantCollectionPath(ctx.tenantId, 'candidates'))));
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async upsert(ctx: SessionContext, candidate: CandidateDraft) {
    return upsertGeneric(ctx, 'candidates', candidate.id, candidate, false);
  },

  async unmaskIdNumber(_ctx: SessionContext, id: string): Promise<string> {
    const call = httpsCallable<{ candidateId: string }, { idNumber: string }>(
      getFunctionsClient(),
      'unmaskCandidateIdNumber',
    );
    const result = await call({ candidateId: id });
    return result.data.idNumber;
  },
};
