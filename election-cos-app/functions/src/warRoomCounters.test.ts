import { describe, expect, it } from 'vitest';
import {
  applyCounterEvent,
  counterEventDocId,
  COUNTER_EVENT_TTL_DAYS,
  diaryCounterDelta,
  householdCounterDelta,
  incidentCounterDelta,
  voterCounterDelta,
  type CounterTransaction,
} from './warRoomCounters';

describe('voterCounterDelta', () => {
  it('a new voter increments totalVoters and their sentiment bucket', () => {
    expect(voterCounterDelta(undefined, { sentiment: 'UNDECIDED', deletedAt: null })).toEqual({
      totalVoters: 1,
      'sentimentBreakdown.UNDECIDED': 1,
    });
  });

  it('a sentiment change moves the bucket without touching totalVoters', () => {
    expect(
      voterCounterDelta(
        { sentiment: 'UNDECIDED', deletedAt: null },
        { sentiment: 'STRONG_SUPPORT', deletedAt: null },
      ),
    ).toEqual({
      'sentimentBreakdown.UNDECIDED': -1,
      'sentimentBreakdown.STRONG_SUPPORT': 1,
    });
  });

  it('a soft delete (deletedAt newly set) decrements totalVoters and the old sentiment bucket', () => {
    expect(
      voterCounterDelta(
        { sentiment: 'LEAN_OPPOSITION', deletedAt: null },
        { sentiment: 'LEAN_OPPOSITION', deletedAt: '2026-08-09T00:00:00.000Z' },
      ),
    ).toEqual({
      totalVoters: -1,
      'sentimentBreakdown.LEAN_OPPOSITION': -1,
    });
  });

  it('an update that changes neither sentiment nor deletedAt produces no delta', () => {
    expect(
      voterCounterDelta({ sentiment: 'UNDECIDED', deletedAt: null }, { sentiment: 'UNDECIDED', deletedAt: null }),
    ).toEqual({});
  });

  it('a hard delete of a still-counted voter undoes their contribution (defensive — rules disallow this in practice)', () => {
    expect(voterCounterDelta({ sentiment: 'STRONG_OPPOSITION', deletedAt: null }, undefined)).toEqual({
      totalVoters: -1,
      'sentimentBreakdown.STRONG_OPPOSITION': -1,
    });
  });

  it('a hard delete of an already-soft-deleted voter produces no further delta', () => {
    expect(
      voterCounterDelta({ sentiment: 'STRONG_OPPOSITION', deletedAt: '2026-01-01T00:00:00.000Z' }, undefined),
    ).toEqual({});
  });
});

describe('incidentCounterDelta', () => {
  it('a new incident increments its initial status bucket', () => {
    expect(incidentCounterDelta(undefined, { status: 'LOGGED' })).toEqual({ 'incidentsByStatus.LOGGED': 1 });
  });

  it('a status change (triage) moves the bucket', () => {
    expect(incidentCounterDelta({ status: 'LOGGED' }, { status: 'TRIAGED' })).toEqual({
      'incidentsByStatus.LOGGED': -1,
      'incidentsByStatus.TRIAGED': 1,
    });
  });

  it('an update that leaves status unchanged produces no delta', () => {
    expect(incidentCounterDelta({ status: 'ESCALATED' }, { status: 'ESCALATED' })).toEqual({});
  });
});

describe('householdCounterDelta', () => {
  const door = (over: Record<string, unknown> = {}) => ({ deletedAt: null, ...over });

  it('a new door with no status counts as not contacted', () => {
    // statusOf() on the app side reads an absent status the same way. A
    // door nobody has been to is a door nobody has been to, not a door
    // outside the count.
    expect(householdCounterDelta(undefined, door())).toEqual({
      'householdsByContactStatus.NOT_CONTACTED': 1,
    });
  });

  it('closing a door out moves it between buckets, leaving the total alone', () => {
    const delta = householdCounterDelta(door(), door({ contactStatus: 'CONTACTED' }));
    expect(delta).toEqual({
      'householdsByContactStatus.NOT_CONTACTED': -1,
      'householdsByContactStatus.CONTACTED': 1,
    });
    expect(Object.values(delta).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('a refusal lands in its own bucket, so coverage can exclude it', () => {
    expect(householdCounterDelta(door({ contactStatus: 'NO_ANSWER' }), door({ contactStatus: 'REFUSED_RECONTACT' })))
      .toEqual({
        'householdsByContactStatus.NO_ANSWER': -1,
        'householdsByContactStatus.REFUSED_RECONTACT': 1,
      });
  });

  it('a write that changes neither status nor deletedAt produces no delta', () => {
    expect(householdCounterDelta(door({ contactStatus: 'CONTACTED' }), door({ contactStatus: 'CONTACTED' }))).toEqual({});
  });

  it('a soft delete removes the door from its bucket', () => {
    expect(householdCounterDelta(door({ contactStatus: 'CONTACTED' }), door({ contactStatus: 'CONTACTED', deletedAt: '2026-03-02' })))
      .toEqual({ 'householdsByContactStatus.CONTACTED': -1 });
  });

  it('a hard delete undoes the contribution, defensively', () => {
    // firestore.rules disallows a real delete; an admin-SDK one still fires.
    expect(householdCounterDelta(door({ contactStatus: 'NO_ANSWER' }), undefined)).toEqual({
      'householdsByContactStatus.NO_ANSWER': -1,
    });
    expect(householdCounterDelta(door({ deletedAt: '2026-03-02' }), undefined)).toEqual({});
  });
});

describe('diaryCounterDelta', () => {
  it('a CANVASS entry adds its householdsVisited', () => {
    expect(diaryCounterDelta(undefined, { activityType: 'CANVASS', householdsVisited: 12 })).toEqual({
      totalHouseholdsVisited: 12,
    });
  });

  it('a RALLY/OBSERVATION/OTHER entry contributes nothing, even if householdsVisited is non-zero', () => {
    expect(diaryCounterDelta(undefined, { activityType: 'RALLY', householdsVisited: 5 })).toEqual({});
    expect(diaryCounterDelta(undefined, { activityType: 'OBSERVATION', householdsVisited: 5 })).toEqual({});
  });

  it('editing a CANVASS entry\'s householdsVisited applies only the difference', () => {
    expect(
      diaryCounterDelta(
        { activityType: 'CANVASS', householdsVisited: 10 },
        { activityType: 'CANVASS', householdsVisited: 15 },
      ),
    ).toEqual({ totalHouseholdsVisited: 5 });
  });

  it('changing activityType from CANVASS to OTHER removes its prior contribution', () => {
    expect(
      diaryCounterDelta(
        { activityType: 'CANVASS', householdsVisited: 10 },
        { activityType: 'OTHER', householdsVisited: 10 },
      ),
    ).toEqual({ totalHouseholdsVisited: -10 });
  });
});

/**
 * Exactly-once application.
 *
 * Firestore triggers are at-least-once and `FieldValue.increment` is not
 * idempotent, so before this existed a redelivered event added its delta
 * twice — permanently, because nothing recomputes these counters, and
 * invisibly, because a wrong total looks exactly like a right one.
 *
 * The fake below is a ledger, not a mock: it records what was written and
 * replays an event the way Firestore would. Proved by injection — deleting
 * the `markerExists` short-circuit in `applyCounterEvent` makes
 * "a redelivered event is applied once" fail with totalVoters 2, and
 * dropping the hash from `counterEventDocId` makes "two event ids that
 * sanitise alike" fail. Both reverted clean.
 */
describe('applying a counter event exactly once', () => {
  interface Written {
    markers: string[];
    counters: Array<{ path: string; amounts: Record<string, number> }>;
  }

  function ledger(): { tx: CounterTransaction; written: Written; expiries: number[] } {
    const written: Written = { markers: [], counters: [] };
    const expiries: number[] = [];
    return {
      written,
      expiries,
      tx: {
        markerExists: async (path) => written.markers.includes(path),
        writeMarker: (path, expireAtMillis) => {
          written.markers.push(path);
          expiries.push(expireAtMillis);
        },
        incrementCounter: (path, amounts) => written.counters.push({ path, amounts }),
      },
    };
  }

  const NOW = Date.parse('2026-10-28T09:00:00.000Z');
  const CREATE = voterCounterDelta(undefined, { sentiment: 'UNDECIDED', deletedAt: null });

  it('applies a first delivery', async () => {
    const { tx, written } = ledger();
    await applyCounterEvent(tx, 'jbmarks', 'evt-1', CREATE, NOW);

    expect(written.counters).toEqual([
      {
        path: 'tenants/jbmarks/counters/warRoom',
        amounts: { totalVoters: 1, 'sentimentBreakdown.UNDECIDED': 1 },
      },
    ]);
    expect(written.markers).toHaveLength(1);
  });

  it('applies a redelivered event once, not twice', async () => {
    const { tx, written } = ledger();
    await applyCounterEvent(tx, 'jbmarks', 'evt-1', CREATE, NOW);
    await applyCounterEvent(tx, 'jbmarks', 'evt-1', CREATE, NOW + 5_000);

    expect(written.counters).toHaveLength(1);
    expect(written.markers).toHaveLength(1);
  });

  it('still applies a different event for the same voter', async () => {
    // The guard is per event, not per document — two real edits in a row
    // must both count.
    const { tx, written } = ledger();
    await applyCounterEvent(tx, 'jbmarks', 'evt-1', CREATE, NOW);
    await applyCounterEvent(
      tx,
      'jbmarks',
      'evt-2',
      voterCounterDelta(
        { sentiment: 'UNDECIDED', deletedAt: null },
        { sentiment: 'STRONG_SUPPORT', deletedAt: null },
      ),
      NOW,
    );

    expect(written.counters).toHaveLength(2);
  });

  it('keeps one tenant from suppressing another tenant', async () => {
    // Event ids are not globally unique across projects in any contract we
    // can rely on, and a marker that ignored the tenant would make one
    // municipality's write silently cancel another's.
    const { tx, written } = ledger();
    await applyCounterEvent(tx, 'jbmarks', 'evt-1', CREATE, NOW);
    await applyCounterEvent(tx, 'matlosana', 'evt-1', CREATE, NOW);

    expect(written.counters.map((c) => c.path)).toEqual([
      'tenants/jbmarks/counters/warRoom',
      'tenants/matlosana/counters/warRoom',
    ]);
  });

  it('writes nothing at all for an empty delta', async () => {
    // An update that changes no counter is already safe to replay, so it
    // buys no marker.
    const { tx, written } = ledger();
    await applyCounterEvent(
      tx,
      'jbmarks',
      'evt-noop',
      voterCounterDelta({ sentiment: 'UNDECIDED', deletedAt: null }, { sentiment: 'UNDECIDED', deletedAt: null }),
      NOW,
    );

    expect(written.counters).toEqual([]);
    expect(written.markers).toEqual([]);
  });

  it('expires a marker well after Firestore stops retrying its event', async () => {
    // Firestore retries a failed trigger for up to seven days. A marker
    // that expired first would let the retry land a second time, which is
    // the whole defect, back again and harder to see.
    const { tx, expiries } = ledger();
    await applyCounterEvent(tx, 'jbmarks', 'evt-1', CREATE, NOW);

    const days = (expiries[0] - NOW) / (24 * 60 * 60 * 1000);
    expect(days).toBe(COUNTER_EVENT_TTL_DAYS);
    expect(days).toBeGreaterThan(7);
  });
});

describe('the marker document id', () => {
  it('is a legal Firestore document id for an event id that is not', async () => {
    // A CloudEvent id is a string. Firestore ids may not contain `/`, may
    // not be `.` or `..`, may not match __*__, and cap at 1 500 bytes.
    const hostile = ['a/b/c', '.', '..', '__proto__', 'x'.repeat(4000)];
    for (const eventId of hostile) {
      const id = counterEventDocId(eventId);
      expect(id).not.toContain('/');
      expect(id).not.toBe('.');
      expect(id).not.toBe('..');
      expect(id).not.toMatch(/^__.*__$/);
      expect(Buffer.byteLength(id, 'utf8')).toBeLessThanOrEqual(1500);
    }
  });

  it('separates two event ids that sanitise to the same string', async () => {
    // This collision is the dangerous direction: it does not double-count,
    // it silently drops a real event, and the counter is then too low with
    // nothing anywhere saying so.
    expect(counterEventDocId('a/b')).not.toBe(counterEventDocId('a.b'));

    const { tx, written } = (() => {
      const markers: string[] = [];
      const counters: Array<{ path: string; amounts: Record<string, number> }> = [];
      return {
        written: { markers, counters },
        tx: {
          markerExists: async (path: string) => markers.includes(path),
          writeMarker: (path: string) => void markers.push(path),
          incrementCounter: (path: string, amounts: Record<string, number>) =>
            void counters.push({ path, amounts }),
        } satisfies CounterTransaction,
      };
    })();

    const delta = voterCounterDelta(undefined, { sentiment: 'UNDECIDED', deletedAt: null });
    await applyCounterEvent(tx, 'jbmarks', 'a/b', delta, 0);
    await applyCounterEvent(tx, 'jbmarks', 'a.b', delta, 0);
    expect(written.counters).toHaveLength(2);
  });
});
