import { describe, expect, it } from 'vitest';
import type { ContactStatus, Household } from '@/dal/ports/households';
import {
  canTransition,
  CONTACT_STATUS_LABEL,
  INACCESSIBLE_COOLOFF_HOURS,
  isQueueable,
  nextDoors,
  NO_ANSWER_COOLOFF_HOURS,
  statusOf,
  summariseQueue,
  transitionRefusalReason,
} from './canvassQueue';

const NOW = new Date('2026-03-06T18:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

let seq = 0;
const door = (over: Partial<Household> = {}): Household => {
  seq += 1;
  return {
    id: `hh-${seq}`,
    tenantId: 'tenant-nw405',
    vdCode: '86821094',
    wardCode: 'NW405012',
    addressLine: `${seq} Lekhele Street`,
    dwellingType: 'FORMAL',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    updatedBy: 'uid-1',
    deletedAt: null,
    schemaVersion: 1,
    ...over,
  };
};

const ALL: ContactStatus[] = [
  'NOT_CONTACTED',
  'IN_PROGRESS',
  'CONTACTED',
  'NO_ANSWER',
  'INACCESSIBLE',
  'REFUSED_RECONTACT',
];

describe('statusOf', () => {
  it('reads a record with no status as never contacted', () => {
    expect(statusOf(door())).toBe('NOT_CONTACTED');
  });
});

describe('a refusal is terminal', () => {
  it('is never queueable, at any age', () => {
    for (const age of [0, 1, 24, 24 * 365]) {
      expect(
        isQueueable(door({ contactStatus: 'REFUSED_RECONTACT', lastContactedAt: hoursAgo(age) }), { now: NOW }),
        `${age}h old`,
      ).toBe(false);
    }
  });

  it('allows no transition out of itself', () => {
    for (const to of ALL) {
      expect(canTransition('REFUSED_RECONTACT', to), to).toBe(false);
    }
  });

  it('explains itself rather than failing silently', () => {
    const reason = transitionRefusalReason('REFUSED_RECONTACT', 'IN_PROGRESS');
    expect(reason).toMatch(/asked not to be contacted again/i);
    expect(reason).toMatch(/supervisor/i);
  });

  it('can be reached from every other status — a door can refuse at any point', () => {
    for (const from of ALL.filter((s) => s !== 'REFUSED_RECONTACT')) {
      expect(canTransition(from, 'REFUSED_RECONTACT'), from).toBe(true);
    }
  });
});

describe('isQueueable', () => {
  it('offers a door nobody has worked', () => {
    expect(isQueueable(door(), { now: NOW })).toBe(true);
  });

  it('does not offer a door someone is standing at', () => {
    // Two canvassers knocking on the same gate a minute apart is the
    // failure this prevents.
    expect(isQueueable(door({ contactStatus: 'IN_PROGRESS' }), { now: NOW })).toBe(false);
  });

  it('does not re-offer a door already contacted', () => {
    expect(isQueueable(door({ contactStatus: 'CONTACTED' }), { now: NOW })).toBe(false);
  });

  it('re-offers a no-answer only after the cool-off', () => {
    const justNow = door({ contactStatus: 'NO_ANSWER', lastContactedAt: hoursAgo(1) });
    const older = door({ contactStatus: 'NO_ANSWER', lastContactedAt: hoursAgo(NO_ANSWER_COOLOFF_HOURS + 1) });
    expect(isQueueable(justNow, { now: NOW })).toBe(false);
    expect(isQueueable(older, { now: NOW })).toBe(true);
  });

  it('makes an inaccessible door wait longer than a no-answer', () => {
    expect(INACCESSIBLE_COOLOFF_HOURS).toBeGreaterThan(NO_ANSWER_COOLOFF_HOURS);
    const between = door({
      contactStatus: 'INACCESSIBLE',
      lastContactedAt: hoursAgo(NO_ANSWER_COOLOFF_HOURS + 1),
    });
    expect(isQueueable(between, { now: NOW })).toBe(false);
    expect(
      isQueueable({ ...between, lastContactedAt: hoursAgo(INACCESSIBLE_COOLOFF_HOURS + 1) }, { now: NOW }),
    ).toBe(true);
  });

  it('honours a tenant override of the cool-off', () => {
    const d = door({ contactStatus: 'NO_ANSWER', lastContactedAt: hoursAgo(2) });
    expect(isQueueable(d, { now: NOW, noAnswerCooloffHours: 1 })).toBe(true);
  });

  it('treats a missing timestamp as long past rather than blocking forever', () => {
    expect(isQueueable(door({ contactStatus: 'NO_ANSWER' }), { now: NOW })).toBe(true);
  });

  it('never offers a suppressed record', () => {
    expect(isQueueable(door({ deletedAt: '2026-03-02T00:00:00.000Z' }), { now: NOW })).toBe(false);
  });
});

describe('summariseQueue', () => {
  const set = () => [
    door({ contactStatus: 'CONTACTED' }),
    door({ contactStatus: 'CONTACTED' }),
    door({ contactStatus: 'REFUSED_RECONTACT' }),
    door({ contactStatus: 'NO_ANSWER', lastContactedAt: hoursAgo(1) }),
    door({ contactStatus: 'NO_ANSWER', lastContactedAt: hoursAgo(24) }),
    door({ contactStatus: 'IN_PROGRESS' }),
    door(),
  ];

  it('counts every status', () => {
    const s = summariseQueue(set(), { now: NOW });
    expect(s.total).toBe(7);
    expect(s.contacted).toBe(2);
    expect(s.refused).toBe(1);
    expect(s.inProgress).toBe(1);
    expect(s.byStatus.NO_ANSWER).toBe(2);
  });

  it('queues only what is genuinely available', () => {
    // The untouched door and the stale no-answer; not the fresh
    // no-answer, the in-progress one, the contacted ones or the refusal.
    expect(summariseQueue(set(), { now: NOW }).queueable).toBe(2);
  });

  it('excludes refusals from the coverage denominator', () => {
    // Six workable doors, five of them worked at least once.
    const s = summariseQueue(set(), { now: NOW });
    expect(s.coveragePct).toBeCloseTo(83.3, 1);
  });

  it('does not report a VD as fully covered while doors remain', () => {
    const s = summariseQueue(set(), { now: NOW });
    expect(s.coveragePct).toBeLessThan(100);
    expect(s.queueable).toBeGreaterThan(0);
  });

  it('reaches 100% only when every workable door has been worked', () => {
    const s = summariseQueue(
      [door({ contactStatus: 'CONTACTED' }), door({ contactStatus: 'REFUSED_RECONTACT' })],
      { now: NOW },
    );
    expect(s.coveragePct).toBe(100);
    expect(s.queueable).toBe(0);
  });

  it('the parts add up to the whole', () => {
    const s = summariseQueue(set(), { now: NOW });
    expect(s.queueable + s.contacted + s.refused + s.inProgress + s.waiting).toBe(s.total);
  });

  it('handles an empty VD without dividing by zero', () => {
    const s = summariseQueue([], { now: NOW });
    expect(s.coveragePct).toBe(0);
    expect(s.total).toBe(0);
  });

  it('ignores suppressed records entirely', () => {
    const s = summariseQueue([door(), door({ deletedAt: '2026-03-02T00:00:00.000Z' })], { now: NOW });
    expect(s.total).toBe(1);
  });
});

describe('nextDoors', () => {
  it('sweeps oldest-attempt first rather than circling the same few', () => {
    const recent = door({ contactStatus: 'NO_ANSWER', lastContactedAt: hoursAgo(7) });
    const ancient = door({ contactStatus: 'NO_ANSWER', lastContactedAt: hoursAgo(40) });
    const untouched = door();
    const order = nextDoors([recent, ancient, untouched], 3, { now: NOW }).map((d) => d.id);
    // Never-contacted sorts first (no timestamp), then oldest attempt.
    expect(order).toEqual([untouched.id, ancient.id, recent.id]);
  });

  it('offers no refused door however short the queue', () => {
    const refused = door({ contactStatus: 'REFUSED_RECONTACT' });
    expect(nextDoors([refused], 10, { now: NOW })).toEqual([]);
  });

  it('respects the limit and a nonsensical limit', () => {
    const doors = [door(), door(), door()];
    expect(nextDoors(doors, 2, { now: NOW })).toHaveLength(2);
    expect(nextDoors(doors, -1, { now: NOW })).toEqual([]);
  });
});

describe('labels', () => {
  it('names the refusal in the household’s own terms, not the campaign’s', () => {
    // "Unreachable" would lump a refusal in with a locked gate; the
    // canvasser reading this needs to know which one it was.
    expect(CONTACT_STATUS_LABEL.REFUSED_RECONTACT).toMatch(/asked not to be contacted again/i);
    expect(CONTACT_STATUS_LABEL.INACCESSIBLE).not.toMatch(/refus/i);
  });

  it('labels every status', () => {
    for (const status of ALL) {
      expect(CONTACT_STATUS_LABEL[status]?.trim(), status).toBeTruthy();
    }
  });
});
