/**
 * Election Campaign OS — Incident repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.4. Fixed taxonomy — never free-text.
 * Workflow: Canvasser logs -> Ward Lead triages -> Municipal Lead
 * authorises -> formal referral PDF generated (authorisation strips the
 * DRAFT watermark and appends signature + timestamp).
 */
import type { Page, PageRequest, SessionContext, UpsertResult } from './session';

export type IncidentCategory = 'WATER_SANITATION' | 'ELECTRICITY' | 'ROADS_TRANSPORT' | 'PUBLIC_SAFETY';
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'LOGGED' | 'TRIAGED' | 'ESCALATED' | 'REFERRED' | 'RESOLVED' | 'CLOSED';

export interface Incident {
  id: string;
  tenantId: string;
  vdCode: string;
  wardCode: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  photoPaths: string[]; // Cloud Storage paths — never Base64 in the document, §6.4
  reportedBy: string;
  referralPdfPath?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type IncidentDraft = Omit<
  Incident,
  'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion' | 'status' | 'referralPdfPath'
>;

export interface IncidentRepository {
  getById(ctx: SessionContext, id: string): Promise<Incident | null>;
  listByStatus(ctx: SessionContext, status: IncidentStatus, page: PageRequest): Promise<Page<Incident>>;
  /**
   * Every incident logged between two instants, across statuses.
   *
   * Added session 31 for the municipal incident report. `listByStatus`
   * answers "what is waiting on us now", which is the incidents board's
   * question; a report answers "what did this ward live with last
   * month", which is a different one and could not be asked. Narrowed by
   * the caller's geographic scope like every other read, so a ward lead
   * reports on their own ward.
   */
  listByDateRange(ctx: SessionContext, fromIso: string, toIso: string): Promise<Incident[]>;
  create(ctx: SessionContext, incident: IncidentDraft): Promise<UpsertResult>;
  triage(ctx: SessionContext, id: string, severity: IncidentSeverity): Promise<void>;
  escalate(ctx: SessionContext, id: string): Promise<void>;
  markReferred(ctx: SessionContext, id: string, referralPdfPath: string): Promise<void>;
  /**
   * Something in the world got fixed. Reachable from any point after
   * triage — a municipality can act before a referral is ever issued.
   * See `src/modules/incidents/incidentWorkflow.ts` for who may do it.
   */
  resolve(ctx: SessionContext, id: string): Promise<void>;
  /**
   * The campaign will do nothing further. Terminal in the workflow, and
   * still not a deletion — `delete: if false` holds on this collection
   * like every other.
   */
  close(ctx: SessionContext, id: string, reason: string): Promise<void>;
}
