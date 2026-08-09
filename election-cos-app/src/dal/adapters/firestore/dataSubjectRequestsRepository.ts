/**
 * Election-COS1.0 — Firestore adapter: POPIA data subject requests
 * See src/dal/ports/dataSubjectRequests.ts for provenance.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type {
  DataSubjectRequest,
  DataSubjectRequestDraft,
  DataSubjectRequestRepository,
  DataSubjectRequestStatus,
} from '@/dal/ports/dataSubjectRequests';
import { db, getByIdGeneric, tenantCollectionPath, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): DataSubjectRequest {
  return {
    id,
    tenantId: data.tenantId as string,
    subjectType: data.subjectType as DataSubjectRequest['subjectType'],
    subjectId: data.subjectId as string | undefined,
    requestType: data.requestType as DataSubjectRequest['requestType'],
    requesterName: data.requesterName as string,
    requesterContact: data.requesterContact as string,
    status: data.status as DataSubjectRequestStatus,
    receivedAt: toISO(data.receivedAt as string) ?? '',
    handledBy: data.handledBy as string | undefined,
    fulfilledAt: data.fulfilledAt as string | undefined,
    rejectionReason: data.rejectionReason as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
  };
}

export const dataSubjectRequestsRepository: DataSubjectRequestRepository = {
  async getById(ctx: SessionContext, id: string): Promise<DataSubjectRequest | null> {
    return getByIdGeneric(ctx, 'dataSubjectRequests', id, fromFirestore);
  },

  async listOpen(ctx: SessionContext): Promise<DataSubjectRequest[]> {
    const snap = await getDocs(
      query(
        collection(db(), tenantCollectionPath(ctx.tenantId, 'dataSubjectRequests')),
        where('status', 'in', ['RECEIVED', 'IN_PROGRESS']),
      ),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async log(ctx: SessionContext, request: DataSubjectRequestDraft) {
    return upsertGeneric(
      ctx,
      'dataSubjectRequests',
      request.id,
      { ...request, status: 'RECEIVED' as DataSubjectRequestStatus, receivedAt: new Date().toISOString() },
      true,
    );
  },

  async updateStatus(
    ctx: SessionContext,
    id: string,
    status: DataSubjectRequestStatus,
    detail: { rejectionReason?: string; notes?: string },
  ): Promise<void> {
    await upsertGeneric(
      ctx,
      'dataSubjectRequests',
      id,
      {
        status,
        handledBy: ctx.uid,
        ...(status === 'FULFILLED' ? { fulfilledAt: new Date().toISOString() } : {}),
        ...detail,
      },
      false,
    );
  },
};
