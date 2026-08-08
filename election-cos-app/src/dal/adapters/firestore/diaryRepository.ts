/**
 * Election-COS1.0 — Firestore adapter: field diary
 * IC-ECOS-BUILD-2026-V2 §5, §6.3.
 */
import { where } from 'firebase/firestore';
import type { Page, PageRequest, SessionContext } from '@/dal/ports/session';
import type { DiaryEntry, DiaryEntryDraft, DiaryRepository } from '@/dal/ports/diary';
import { geoScopeConstraints, getByIdGeneric, listPageGeneric, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): DiaryEntry {
  return {
    id,
    tenantId: data.tenantId as string,
    vdCode: data.vdCode as string,
    wardCode: data.wardCode as string,
    staffUid: data.staffUid as string,
    streetName: data.streetName as string,
    householdsVisited: (data.householdsVisited as number) ?? 0,
    notes: data.notes as string | undefined,
    occurredAt: toISO(data.occurredAt as string) ?? '',
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const diaryRepository: DiaryRepository = {
  async getById(ctx: SessionContext, id: string): Promise<DiaryEntry | null> {
    return getByIdGeneric(ctx, 'diaryEntries', id, fromFirestore);
  },

  async listByVD(ctx: SessionContext, vdCode: string, page: PageRequest): Promise<Page<DiaryEntry>> {
    return listPageGeneric(
      ctx,
      'diaryEntries',
      [where('vdCode', '==', vdCode), ...geoScopeConstraints(ctx)],
      page,
      fromFirestore,
    );
  },

  async upsert(ctx: SessionContext, entry: DiaryEntryDraft) {
    return upsertGeneric(ctx, 'diaryEntries', entry.id, entry, false);
  },
};
