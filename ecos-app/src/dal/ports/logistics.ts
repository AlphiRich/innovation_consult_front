/**
 * Election Campaign OS — Logistics repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.5. Inventory, resupply requests, approval
 * workflow, voucher allocation. Field list provisional — no Stitch field
 * inventory available this session; refine before Phase 3 sign-off.
 */
import type { SessionContext, UpsertResult } from './session';

export interface LogisticsItem {
  id: string;
  tenantId: string;
  wardCode?: string;
  itemName: string;
  quantityOnHand: number;
  quantityRequested: number;
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

export interface LogisticsRepository {
  getById(ctx: SessionContext, id: string): Promise<LogisticsItem | null>;
  listAll(ctx: SessionContext): Promise<LogisticsItem[]>;
  upsert(ctx: SessionContext, item: LogisticsItemDraft): Promise<UpsertResult>;
  approve(ctx: SessionContext, id: string): Promise<void>;
}
