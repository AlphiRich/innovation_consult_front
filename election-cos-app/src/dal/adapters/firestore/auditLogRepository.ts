/**
 * Election-COS1.0 — Firestore adapter: audit log (read-only)
 * IC-ECOS-BUILD-2026-V2 §7.5, §6.8.4.
 */
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { AuditEvent, AuditLogRepository } from '@/dal/ports/auditLog';
import { db, tenantCollectionPath } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): AuditEvent {
  return {
    id,
    tenantId: data.tenantId as string,
    actorUid: data.actorUid as string,
    action: data.action as string,
    targetType: data.targetType as string,
    targetId: data.targetId as string,
    occurredAt: data.occurredAt as string,
    metadata: data.metadata as Record<string, unknown> | undefined,
  };
}

export const auditLogRepository: AuditLogRepository = {
  async listRecent(ctx: SessionContext, limitCount: number): Promise<AuditEvent[]> {
    const snap = await getDocs(
      query(
        collection(db(), tenantCollectionPath(ctx.tenantId, 'auditLog')),
        orderBy('occurredAt', 'desc'),
        limit(limitCount),
      ),
    );
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },
};
