/**
 * Election Campaign OS — Firestore adapter: tenant entitlements
 * IC-ECOS-BUILD-2026-V2 §5.
 *
 * Read-only from the client by design. Entitlements are provisioned
 * server-side when a subscription is taken or renewed; `firestore.rules`
 * denies every client write, so there is deliberately no upsert here to
 * match — the same shape as auditLogRepository.
 */
import { collection, getDocs, query } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { EntitlementRepository, TenantEntitlement } from '@/dal/ports/entitlements';
import type { ModuleKey } from '@/auth/modules';
import { db, tenantCollectionPath, toISO } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): TenantEntitlement {
  return {
    id,
    tenantId: data.tenantId as string,
    module: data.module as ModuleKey,
    wardCode: data.wardCode as string | undefined,
    activeFrom: toISO(data.activeFrom as string) ?? '',
    activeUntil: toISO(data.activeUntil as string | null) ?? undefined,
    sourceReference: data.sourceReference as string | undefined,
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
  };
}

export const entitlementsRepository: EntitlementRepository = {
  async listAll(ctx: SessionContext): Promise<TenantEntitlement[]> {
    const snap = await getDocs(query(collection(db(), tenantCollectionPath(ctx.tenantId, 'entitlements'))));
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },
};
