/**
 * Election-COS1.0 — Field Diary repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.3. Street-level completion percentages
 * shown on the Command Center are DERIVED, never stored — see
 * src/modules/war-room for the counter that aggregates these.
 *
 * `activityType` and `title` added in session 9 against a real Stitch
 * reference (`ward_field_app_mobile`'s "Field Diary" panel: timestamped
 * entries with a type tag — Rally, Observation — a short title, and free
 * notes; no household-count field visible at all). The original fields
 * (`streetName`, `householdsVisited`) were written provisional — no real
 * screen was available yet — this header said so explicitly and invited
 * reconciliation once one existed. Rather than replace them (they're the
 * quantitative half War Room's future coverage-% derivation needs and
 * nothing else in this codebase produces that number) or ignore the
 * screen (per this build's standing discipline against silently dropping
 * richer reference material), both are kept: `activityType` defaults to
 * `CANVASS` for the coverage-log case (`householdsVisited` meaningful,
 * `title` usually empty); `RALLY`/`OBSERVATION`/`OTHER` are the screen's
 * qualitative journal case (`householdsVisited` typically 0, `title`
 * carries the headline). No other code in this repo consumed `DiaryEntry`
 * yet, so this is a real-data-informed schema decision at effectively
 * zero migration cost, not the same category of change as the Voters/
 * Incidents field discrepancies (already-shipped, already-tested schemas
 * — those stayed flag-only, see docs/screen-findings.md).
 */
import type { Page, PageRequest, SessionContext, UpsertResult } from './session';

export type DiaryActivityType = 'CANVASS' | 'RALLY' | 'OBSERVATION' | 'OTHER';

export interface DiaryEntry {
  id: string;
  tenantId: string;
  vdCode: string;
  wardCode: string;
  staffUid: string;
  activityType: DiaryActivityType;
  /** Short headline — mainly for RALLY/OBSERVATION/OTHER entries, e.g. "Street Corner Meeting: Oak & Main". */
  title?: string;
  streetName: string;
  /** Meaningful for CANVASS entries; 0 for the others. */
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
