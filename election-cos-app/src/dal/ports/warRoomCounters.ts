/**
 * Election Campaign OS — War Room / Command Center counters port
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
import type { ContactStatus } from './households';
import type { IncidentStatus } from './incidents';
import type { SessionContext } from './session';
import type { Voter } from './voters';

export interface WarRoomCounters {
  totalVoters: number;
  sentimentBreakdown: Record<Voter['sentiment'], number>;
  incidentsByStatus: Record<IncidentStatus, number>;
  /**
   * Households a canvasser *said* they visited, summed from CANVASS diary
   * entries. Self-reported and unreconciled against anything.
   *
   * Kept, because a diary entry is a person's own account of their shift
   * and that has its own value — but it is not the same number as
   * `householdsByContactStatus` below, and the two will routinely
   * disagree. The war room labels which is which; see SOP-08.
   */
  totalHouseholdsVisited: number;
  /**
   * Doors by the state they were actually left in, from the household
   * records themselves.
   *
   * Added session 27. Until the round screen existed nothing wrote
   * `contactStatus`, so this counter would have been all zeros and the
   * war room had only the self-reported figure to show. Now that doors
   * carry real outcomes, the dashboard can report what happened rather
   * than what was claimed.
   */
  householdsByContactStatus: Record<ContactStatus, number>;
  updatedAt: string | null;
}

export interface WarRoomCountersRepository {
  get(ctx: SessionContext): Promise<WarRoomCounters>;
}
