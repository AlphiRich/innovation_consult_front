/**
 * Election Campaign OS — Firestore adapter: War Room counters
 * IC-ECOS-BUILD-2026-V2 §7.4, §8.1. One doc read, never a collection scan
 * — see src/dal/ports/warRoomCounters.ts.
 */
import type { SessionContext } from '@/dal/ports/session';
import type { WarRoomCounters, WarRoomCountersRepository } from '@/dal/ports/warRoomCounters';
import { getByIdGeneric, toISO } from './base';

const ZERO_COUNTERS: WarRoomCounters = {
  totalVoters: 0,
  sentimentBreakdown: {
    STRONG_SUPPORT: 0,
    LEAN_SUPPORT: 0,
    UNDECIDED: 0,
    LEAN_OPPOSITION: 0,
    STRONG_OPPOSITION: 0,
  },
  incidentsByStatus: {
    LOGGED: 0,
    TRIAGED: 0,
    ESCALATED: 0,
    REFERRED: 0,
    RESOLVED: 0,
    CLOSED: 0,
  },
  totalHouseholdsVisited: 0,
  updatedAt: null,
};

function fromFirestore(_id: string, data: Record<string, unknown>): WarRoomCounters {
  return {
    totalVoters: (data.totalVoters as number) ?? 0,
    sentimentBreakdown: { ...ZERO_COUNTERS.sentimentBreakdown, ...(data.sentimentBreakdown as object) },
    incidentsByStatus: { ...ZERO_COUNTERS.incidentsByStatus, ...(data.incidentsByStatus as object) },
    totalHouseholdsVisited: (data.totalHouseholdsVisited as number) ?? 0,
    updatedAt: toISO(data.updatedAt as string | undefined),
  };
}

export const warRoomCountersRepository: WarRoomCountersRepository = {
  async get(ctx: SessionContext): Promise<WarRoomCounters> {
    const doc = await getByIdGeneric(ctx, 'counters', 'warRoom', fromFirestore);
    return doc ?? ZERO_COUNTERS;
  },
};
