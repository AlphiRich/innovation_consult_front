/**
 * Election Campaign OS — Voting District repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.1. Seeded from IEC demarcation PDFs for
 * JB Marks (NW405) via a repeatable ingest script, not a one-off.
 */
import type { SessionContext, UpsertResult } from './session';

export interface VotingDistrict {
  id: string;
  tenantId: string;
  vdCode: string; // '86910138' — IEC code
  wardCode: string;
  name: string; // 'Pudulogo Primary'
  registeredVoters: number;
  centroid?: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export type VotingDistrictDraft = Omit<
  VotingDistrict,
  'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'schemaVersion'
>;

export interface VotingDistrictRepository {
  getByCode(ctx: SessionContext, vdCode: string): Promise<VotingDistrict | null>;
  listByWard(ctx: SessionContext, wardCode: string): Promise<VotingDistrict[]>;
  upsert(ctx: SessionContext, vd: VotingDistrictDraft): Promise<UpsertResult>;
}
