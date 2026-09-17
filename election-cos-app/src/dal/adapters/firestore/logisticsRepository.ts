/**
 * Election Campaign OS — Firestore adapter: logistics
 * IC-ECOS-BUILD-2026-V2 §5, §6.5.
 */
import { collection, getDocs, query } from 'firebase/firestore';
import type { SessionContext } from '@/dal/ports/session';
import type { LogisticsItem, LogisticsItemDraft, LogisticsRepository } from '@/dal/ports/logistics';
import { db, getByIdGeneric, tenantCollectionPath, toISO, upsertGeneric } from './base';

function fromFirestore(id: string, data: Record<string, unknown>): LogisticsItem {
  return {
    id,
    tenantId: data.tenantId as string,
    wardCode: data.wardCode as string | undefined,
    vdCode: data.vdCode as string | undefined,
    itemName: data.itemName as string,
    quantityOnHand: (data.quantityOnHand as number) ?? 0,
    quantityRequested: (data.quantityRequested as number) ?? 0,
    urgency: (data.urgency as LogisticsItem['urgency']) ?? 'ROUTINE',
    dropOffInstructions: data.dropOffInstructions as string | undefined,
    requestedBy: data.requestedBy as string | undefined,
    status: data.status as LogisticsItem['status'],
    createdAt: toISO(data.createdAt as string) ?? '',
    updatedAt: toISO(data.updatedAt as string) ?? '',
    updatedBy: data.updatedBy as string,
    deletedAt: toISO(data.deletedAt as string | null),
    schemaVersion: (data.schemaVersion as number) ?? 1,
  };
}

export const logisticsRepository: LogisticsRepository = {
  async getById(ctx: SessionContext, id: string): Promise<LogisticsItem | null> {
    return getByIdGeneric(ctx, 'logistics', id, fromFirestore);
  },

  async listAll(ctx: SessionContext): Promise<LogisticsItem[]> {
    const snap = await getDocs(query(collection(db(), tenantCollectionPath(ctx.tenantId, 'logistics'))));
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async upsert(ctx: SessionContext, item: LogisticsItemDraft) {
    return upsertGeneric(ctx, 'logistics', item.id, item, false);
  },

  async approve(ctx: SessionContext, id: string): Promise<void> {
    // Two sequential writes, not a transaction — same level of rigor as
    // VDForm.tsx's parent-ward sync (session 7): correct for this build's
    // single-writer-at-a-time reality, not race-proof under concurrent
    // approval attempts. A real transaction would need both documents
    // read first, which upsertGeneric's helper doesn't support today.
    await upsertGeneric(ctx, 'logistics', id, { status: 'APPROVED' }, false);
    await upsertGeneric(
      ctx,
      'logisticsApprovals',
      crypto.randomUUID(),
      { itemId: id, approvedBy: ctx.uid, approvedAt: new Date().toISOString() },
      true,
    );
  },
};
