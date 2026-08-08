/**
 * Election Campaign OS — Ward repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.1 — foundational; everything else scopes to it.
 */
import type { SessionContext, UpsertResult } from './session';

export interface Ward {
  id: string;
  tenantId: string;
  wardCode: string; // 'NW405-W12'
  municipalityCode: string; // 'NW405'
  name: string;
  registeredVoters: number;
  vdCodes: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type WardDraft = Omit<Ward, 'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'>;

export interface WardRepository {
  getByCode(ctx: SessionContext, wardCode: string): Promise<Ward | null>;
  listAll(ctx: SessionContext): Promise<Ward[]>;
  upsert(ctx: SessionContext, ward: WardDraft): Promise<UpsertResult>;
}
