/**
 * Election-COS1.0 — Field Diary repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.3. Street-level completion percentages
 * shown on the Command Center are DERIVED, never stored — see
 * src/modules/war-room for the counter that aggregates these.
 *
 * Field list is provisional: no Stitch screen field inventory was
 * available this session (master index §6 — Drive folder unresolved).
 * Refine against real screens before Phase 3 sign-off.
 */
import type { Page, PageRequest, SessionContext, UpsertResult } from './session';

export interface DiaryEntry {
  id: string;
  tenantId: string;
  vdCode: string;
  wardCode: string;
  staffUid: string;
  streetName: string;
  householdsVisited: number;
  notes?: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type DiaryEntryDraft = Omit<
  DiaryEntry,
  'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'
>;

export interface DiaryRepository {
  getById(ctx: SessionContext, id: string): Promise<DiaryEntry | null>;
  listByVD(ctx: SessionContext, vdCode: string, page: PageRequest): Promise<Page<DiaryEntry>>;
  upsert(ctx: SessionContext, entry: DiaryEntryDraft): Promise<UpsertResult>;
}
