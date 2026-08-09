/**
 * Election-COS1.0 — War Room / Command Center counters port
 * IC-ECOS-BUILD-2026-V2 §7.4, §8.1: "Must read pre-aggregated counter
 * documents only — never a live listener on a full collection." A single
 * doc read (`tenants/{tenantId}/counters/warRoom`), maintained by Cloud
 * Function Firestore triggers (`functions/src/warRoomCounters.ts`) on
 * voter/incident/diary writes — never computed by scanning those
 * collections client-side, which is exactly the cost/latency problem this
 * rule exists to prevent on a tenant with millions of voter records.
 *
 * The document may not exist yet (a fresh tenant with no writes since the
 * counters feature was deployed) — `get()` returns a zeroed shape rather
 * than null/throwing, so the UI shows real "nothing recorded yet" instead
 * of an error.
 */
import type { IncidentStatus } from './incidents';
import type { SessionContext } from './session';
import type { Voter } from './voters';

export interface WarRoomCounters {
  totalVoters: number;
  sentimentBreakdown: Record<Voter['sentiment'], number>;
  incidentsByStatus: Record<IncidentStatus, number>;
  totalHouseholdsVisited: number;
  updatedAt: string | null;
}

export interface WarRoomCountersRepository {
  get(ctx: SessionContext): Promise<WarRoomCounters>;
}
