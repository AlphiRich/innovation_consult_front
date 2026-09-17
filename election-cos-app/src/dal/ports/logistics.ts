/**
 * Election Campaign OS — Logistics repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.5. Inventory, resupply requests, approval
 * workflow, voucher allocation.
 *
 * `urgency`, `dropOffInstructions`, `requestedBy`, and `vdCode` added
 * session 9 against a real Stitch reference (`vd_captain_request_materials_modal`'s
 * "Request Campaign Materials" modal: Material Type / Quantity / Delivery
 * Urgency [Routine 2-3 days / Urgent 24h / Immediate GOTV Priority] /
 * Drop-off Point). The original field list was provisional — no screen
 * had been available — and this port had zero other consumers yet, same
 * situation as diary.ts's session-9 reconciliation: the schema itself was
 * updated rather than just flagged. `itemName` stays free text rather
 * than adopting the screen's fixed 5-item taxonomy (Posters/Flyers/Forms/
 * T-Shirts/Stationery) — that list is plausible for one campaign's needs
 * but not a statutory or structural constraint the way incident categories
 * are, and a free-text field degrades gracefully for material types the
 * mockup didn't anticipate. `requestedBy` was previously missing
 * entirely — a request/approval workflow with no record of who requested
 * an item is a real gap, not a stylistic omission.
 */
import type { SessionContext, UpsertResult } from './session';

export type LogisticsUrgency = 'ROUTINE' | 'URGENT' | 'IMMEDIATE';

export interface LogisticsItem {
  id: string;
  tenantId: string;
  wardCode?: string;
  vdCode?: string;
  itemName: string;
  quantityOnHand: number;
  quantityRequested: number;
  urgency: LogisticsUrgency;
  dropOffInstructions?: string;
  /** uid of the requester — undefined for AVAILABLE stock entries that were never a request. */
  requestedBy?: string;
  status: 'AVAILABLE' | 'REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'DEPLETED';
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type LogisticsItemDraft = Omit<
  LogisticsItem,
  'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'
>;

/**
 * A lightweight approval record — `tenants/{tid}/logisticsApprovals`
 * already existed in firestore.rules (client-writable, gated on
 * logistics.approve) with nothing writing to it until session 9. Distinct
 * from the server-only `auditLog` (src/dal/ports/auditLog.ts) — this is a
 * per-item approval trail a Party HQ Admin's own client writes directly,
 * not a Cloud-Function-written system audit event.
 */
export interface LogisticsApproval {
  id: string;
  tenantId: string;
  itemId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface LogisticsRepository {
  getById(ctx: SessionContext, id: string): Promise<LogisticsItem | null>;
  listAll(ctx: SessionContext): Promise<LogisticsItem[]>;
  upsert(ctx: SessionContext, item: LogisticsItemDraft): Promise<UpsertResult>;
  /** Sets status to APPROVED and writes a LogisticsApproval record. */
  approve(ctx: SessionContext, id: string): Promise<void>;
}
