import { describe, expect, it } from 'vitest';
import { diaryCounterDelta, incidentCounterDelta, voterCounterDelta } from './warRoomCounters';

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
