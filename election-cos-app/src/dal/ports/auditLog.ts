/**
 * Election-COS1.0 — Audit log port (read-only from the client)
 * IC-ECOS-BUILD-2026-V2 §7.5, §6.2.1, §6.8.4. Written server-side only
 * (Cloud Functions, Admin SDK) — e.g. on phone-number unmask, on PPFA
 * export, on threshold change. See firestore.rules: client writes denied.
 */
import type { SessionContext } from './session';

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorUid: string;
  action: string; // e.g. 'voter.phone.unmask', 'ppfa.export', 'ppfa.config.create'
  targetType: string;
  targetId: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRepository {
  listRecent(ctx: SessionContext, limitCount: number): Promise<AuditEvent[]>;
}
