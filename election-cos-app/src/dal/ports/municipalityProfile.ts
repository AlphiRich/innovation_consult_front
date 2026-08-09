/**
 * Election-COS1.0 — municipality profile port
 * IC-ECOS-BUILD-2026-V2 §3.2 (Municipality Config, "retained deliberately
 * — carries seat totals and election parameters the seat calculator
 * depends on").
 *
 * `tenants/{tid}/profile/{docId}` already had a firestore.rules entry
 * (read: any tenant member; write: `settings.tenant`) with no DAL port at
 * all — same class of gap as `counters/warRoom` and `logisticsApprovals`
 * found in earlier session-9 passes. This is that port. One tenant is one
 * municipality's campaign (matches how Wards seeding already treats
 * `municipalityCode` as a single informational value, not a multi-
 * municipality-per-tenant concept), so this is a single fixed document —
 * `profile/municipality` — not a list.
 *
 * NOT wired into SeatCalculatorPage.tsx this session — that page is a
 * standalone what-if tool (§8.2) that already opens on a real worked
 * example (nw405Example.ts); pulling its defaults from this profile
 * instead is a reasonable follow-up, not done here to avoid destabilising
 * an already-shipped, tested module in the same pass that builds its
 * data source.
 */
import type { SessionContext, UpsertResult } from './session';

export interface MunicipalityProfile {
  id: string; // always 'municipality'
  tenantId: string;
  municipalityCode: string; // 'NW405'
  municipalityName: string; // 'JB Marks Local Municipality'
  province: string;
  totalCouncilSeats: number;
  wardSeats: number;
  prSeats: number;
  electionDate?: string; // ISO 8601 date
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type MunicipalityProfileDraft = Omit<MunicipalityProfile, 'createdAt' | 'updatedAt' | 'updatedBy'>;

export interface MunicipalityProfileRepository {
  get(ctx: SessionContext): Promise<MunicipalityProfile | null>;
  upsert(ctx: SessionContext, profile: MunicipalityProfileDraft): Promise<UpsertResult>;
}
