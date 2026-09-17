/**
 * Election Campaign OS — Voting District repository port
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.1. Seeded from IEC demarcation PDFs for
 * JB Marks (NW405) via a repeatable ingest script — see
 * tools/seed-data/parse-nw-demarcation.mjs and docs/nw405-seed-data.md.
 *
 * `vdCode` is the IEC's code for a physical voting station — it is NOT
 * globally unique to one ward. The real NW405 gazette schedules ~19% of
 * its VDs as "VD SPLIT: Y": a single voting station's roll is divided
 * across two or more adjacent wards (the same vdCode reappears in each
 * ward's schedule with only that ward's portion of registeredVoters).
 * `id`/document identity is therefore the (wardCode, vdCode) pair, not
 * vdCode alone — `getByCode` requires both, and `findByVdCode` is the
 * escape hatch for the "which ward is this VD code in?" direction, which
 * can legitimately return more than one record.
 */
import type { SessionContext, UpsertResult } from './session';

export interface VotingDistrict {
  id: string; // `${wardCode}::${vdCode}` — see module doc comment
  tenantId: string;
  vdCode: string; // '86910138' — IEC code; not unique across wards, see above
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
  /** Exact lookup — use when the ward is already known (e.g. the Wards module). */
  getByCode(ctx: SessionContext, wardCode: string, vdCode: string): Promise<VotingDistrict | null>;
  /**
   * All ward-portions of a VD code. Length 1 for the ~81% of VDs that
   * aren't split; length >1 for a split VD — callers MUST handle that case
   * explicitly (disambiguate against ctx.wardScope, or ask) rather than
   * picking array[0] and silently guessing a household into the wrong ward.
   */
  findByVdCode(ctx: SessionContext, vdCode: string): Promise<VotingDistrict[]>;
  listByWard(ctx: SessionContext, wardCode: string): Promise<VotingDistrict[]>;
  upsert(ctx: SessionContext, vd: VotingDistrictDraft): Promise<UpsertResult>;
}
