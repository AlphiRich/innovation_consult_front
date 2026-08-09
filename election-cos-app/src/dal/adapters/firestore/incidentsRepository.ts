/**
 * Election-COS1.0 — Firestore adapter: incidents
 * IC-ECOS-BUILD-2026-V2 §5, §6.4.
 */
import { where } from 'firebase/firestore';
import type { Page, PageRequest, SessionContext } from '@/dal/ports/session';
import type {
  Incident,
  IncidentDraft,
  IncidentRepository,
  IncidentSeverity,
  IncidentStatus,
} from '@/dal/ports/incidents';
import { geoScopeConstraints, getByIdGeneric, listPageGeneric, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): Incident {
  return {
    id,
    tenantId: data.tenantId as string,
    vdCode: data.vdCode as string,
    wardCode: data.wardCode as string,
    category: data.category as Incident['category'],
    severity: data.severity as IncidentSeverity,
    status: data.status as IncidentStatus,
    description: data.description as string,
    photoPaths: (data.photoPaths as string[]) ?? [],
    reportedBy: data.reportedBy as string,
    referralPdfPath: data.referralPdfPath as string | undefined,
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const incidentsRepository: IncidentRepository = {
  async getById(ctx: SessionContext, id: string): Promise<Incident | null> {
    return getByIdGeneric(ctx, 'incidents', id, fromFirestore);
  },

  async listByStatus(ctx: SessionContext, status: IncidentStatus, page: PageRequest): Promise<Page<Incident>> {
    return listPageGeneric(
      ctx,
      'incidents',
      [where('status', '==', status), ...geoScopeConstraints(ctx)],
      page,
      fromFirestore,
    );
  },

  async create(ctx: SessionContext, incident: IncidentDraft) {
    return upsertGeneric(ctx, 'incidents', incident.id, { ...incident, status: 'LOGGED' as IncidentStatus }, true);
  },

  async triage(ctx: SessionContext, id: string, severity: IncidentSeverity): Promise<void> {
    await upsertGeneric(ctx, 'incidents', id, { severity, status: 'TRIAGED' as IncidentStatus }, false);
  },

  async escalate(ctx: SessionContext, id: string): Promise<void> {
    await upsertGeneric(ctx, 'incidents', id, { status: 'ESCALATED' as IncidentStatus }, false);
  },

  async markReferred(ctx: SessionContext, id: string, referralPdfPath: string): Promise<void> {
    await upsertGeneric(ctx, 'incidents', id, { status: 'REFERRED' as IncidentStatus, referralPdfPath }, false);
  },
};
