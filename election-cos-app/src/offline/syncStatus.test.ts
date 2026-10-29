/**
 * Election Campaign OS — the sync-status truth table
 *
 * This is the module that decides whether to tell a canvasser their work
 * is safe. Every branch is a sentence somebody reads at a gate and acts
 * on, so the whole table is exercised rather than a sample of it.
 *
 * Proved by injection, each separately, then reverted clean:
 *
 *  - returning SYNCED when `queued === null` → "refuses to say synced
 *    when the local queue could not be read" fails.
 *  - dropping the `!browserOnline` branch so a stale SERVER reading wins
 *    → "a browser offline event outranks a stale server reading" fails.
 *  - collapsing UNKNOWN into CACHE → "distinguishes not-yet-established
 *    from demonstrably-on-cache" fails.
 *  - treating CACHE as OFFLINE → "gives the captive portal its own
 *    state" fails.
 *  - ignoring `pendingWrites` when the Dexie queue is empty → "counts
 *    Firestore's own queue, which the outbox cannot see" fails.
 */
import { describe, expect, it } from 'vitest';
import { deriveSyncStatus, type SyncStatus, type SyncStatusInput } from './syncStatus';

/** Reachable and clean, so each test varies only what it is about. */
const CLEAN: SyncStatusInput = {
  link: 'SERVER',
  pendingWrites: false,
  queued: 0,
  browserOnline: true,
};

const statusOf = (over: Partial<SyncStatusInput>): SyncStatus =>
  deriveSyncStatus({ ...CLEAN, ...over }).status;

describe('the one state in which "synced" is sayable', () => {
  it('says it when all three signals are clear', () => {
    const reading = deriveSyncStatus(CLEAN);
    expect(reading.status).toBe('SYNCED');
    expect(reading.label).toBe('Synced');
    expect(reading.attention).toBe(false);
  });

  it('refuses to say synced when the local queue could not be read', () => {
    // Two of three signals clear is not three. `null` is not zero.
    const reading = deriveSyncStatus({ ...CLEAN, queued: null });
    expect(reading.status).toBe('UNKNOWN');
    expect(reading.label).not.toBe('Synced');
    expect(reading.detail).toContain('could not be read');
    expect(reading.attention).toBe(true);
  });

  it('counts Firestore’s own queue, which the outbox cannot see', () => {
    // An empty Dexie outbox says nothing about writes the Firestore SDK
    // is still holding. This is the gap `navigator.onLine` + outbox depth
    // could not close, and the reason this module exists.
    expect(statusOf({ pendingWrites: true, queued: 0 })).toBe('SENDING');
  });

  it('never says synced in any state but that one', () => {
    const everythingElse: Array<Partial<SyncStatusInput>> = [
      { browserOnline: false },
      { link: 'CACHE' },
      { link: 'UNKNOWN' },
      { queued: null },
      { queued: 1 },
      { pendingWrites: true },
      { link: 'CACHE', browserOnline: false },
      { link: 'UNKNOWN', queued: 3 },
    ];
    for (const over of everythingElse) {
      const reading = deriveSyncStatus({ ...CLEAN, ...over });
      expect(reading.status, JSON.stringify(over)).not.toBe('SYNCED');
      expect(reading.label.toLowerCase(), JSON.stringify(over)).not.toContain('synced');
      expect(reading.detail.toLowerCase(), JSON.stringify(over)).not.toContain('has been saved');
    }
  });
});

describe('the three ways of not reaching the server', () => {
  it('gives the captive portal its own state', () => {
    /**
     * A handset on a council or hotel wifi that has not been signed into
     * reports a network and can reach nothing. Lumping it into "offline"
     * would tell the user to look for signal they already have; the
     * sentence has to point at the wifi instead.
     */
    const reading = deriveSyncStatus({ ...CLEAN, link: 'CACHE' });
    expect(reading.status).toBe('UNREACHABLE');
    expect(reading.detail).toContain('has a network but cannot reach the server');
    expect(reading.detail).toContain('wifi');
    expect(reading.attention).toBe(true);
  });

  it('a browser offline event outranks a stale server reading', () => {
    // The browser fires `offline` before the SDK notices the drop, so for
    // that interval `link` still reads SERVER. No network at all is the
    // more certain and more actionable fact, so it wins.
    expect(statusOf({ browserOnline: false, link: 'SERVER' })).toBe('OFFLINE');
    expect(statusOf({ browserOnline: false, link: 'CACHE' })).toBe('OFFLINE');
    expect(statusOf({ browserOnline: false, link: 'UNKNOWN' })).toBe('OFFLINE');
  });

  it('distinguishes not-yet-established from demonstrably-on-cache', () => {
    expect(statusOf({ link: 'UNKNOWN' })).toBe('UNKNOWN');
    expect(statusOf({ link: 'CACHE' })).toBe('UNREACHABLE');
  });

  it('does not raise an alarm before anything has been established', () => {
    // The first render, every time the app opens. A warning here would
    // cry wolf on every cold start.
    const reading = deriveSyncStatus({ ...CLEAN, link: 'UNKNOWN' });
    expect(reading.attention).toBe(false);
    expect(reading.label).toBe('Checking');
  });
});

describe('what it says while offline', () => {
  it('does not warn when offline with nothing waiting', () => {
    // The designed, normal state of an offline-first field product.
    expect(deriveSyncStatus({ ...CLEAN, browserOnline: false, queued: 0 }).attention).toBe(false);
  });

  it('warns when offline with work waiting', () => {
    /**
     * The single worst failure this application could have: a canvasser
     * finishes a round in a dead spot, closes the app believing the day
     * is filed, and the queue is still full.
     */
    expect(deriveSyncStatus({ ...CLEAN, browserOnline: false, queued: 4 }).attention).toBe(true);
  });

  it('warns when offline and the queue could not be read', () => {
    // Cannot show it is safe, so must not imply it is.
    expect(deriveSyncStatus({ ...CLEAN, browserOnline: false, queued: null }).attention).toBe(true);
  });

  it('tells the user to keep working', () => {
    // The product's promise. The offline sentence is the one place to
    // repeat it, because this is the moment a user doubts it.
    expect(deriveSyncStatus({ ...CLEAN, browserOnline: false }).detail).toContain('Keep working');
  });
});

describe('the sentences themselves', () => {
  it('never renders an unread queue as zero', () => {
    // `null` and `0` are different answers and the second one is
    // reassuring. Conflating them is how an indicator starts lying.
    for (const over of [
      { queued: null },
      { queued: null, browserOnline: false },
      { queued: null, link: 'CACHE' as const },
      { queued: null, link: 'UNKNOWN' as const },
    ]) {
      const { detail } = deriveSyncStatus({ ...CLEAN, ...over });
      expect(detail, JSON.stringify(over)).not.toMatch(/\bnothing is waiting\b/);
      expect(detail, JSON.stringify(over)).toContain('could not be read');
    }
  });

  it('agrees in number with the count it reports', () => {
    expect(deriveSyncStatus({ ...CLEAN, queued: 1 }).detail).toContain('1 item is waiting');
    expect(deriveSyncStatus({ ...CLEAN, queued: 2 }).detail).toContain('2 items are waiting');
    expect(deriveSyncStatus({ ...CLEAN, queued: 1 }).detail).not.toContain('items');
  });

  it('writes no sentence that contradicts itself', () => {
    /**
     * The first draft composed the SENDING sentence from the queue clause
     * and produced "nothing is waiting on this device — sending now" when
     * the only outstanding write was one Firestore itself was holding.
     * The two queues are different places.
     */
    const reading = deriveSyncStatus({ ...CLEAN, pendingWrites: true, queued: 0 });
    expect(reading.status).toBe('SENDING');
    expect(reading.detail).not.toContain('nothing is waiting');
    expect(reading.detail).toContain('confirmed by the server');
  });

  it('gives every state a label and a full sentence', () => {
    const seen = new Set<SyncStatus>();
    for (const over of [
      {},
      { queued: 2 },
      { pendingWrites: true },
      { browserOnline: false },
      { link: 'CACHE' as const },
      { link: 'UNKNOWN' as const },
      { queued: null },
    ]) {
      const reading = deriveSyncStatus({ ...CLEAN, ...over });
      seen.add(reading.status);
      expect(reading.label.length, JSON.stringify(over)).toBeGreaterThan(2);
      // A sentence, not a fragment: something a user can read aloud.
      expect(reading.detail, JSON.stringify(over)).toMatch(/\.$/);
      expect(reading.detail.length, JSON.stringify(over)).toBeGreaterThan(30);
    }
    // All five states are reachable from the signals the app can read —
    // a state nothing can produce is a state nobody has thought through.
    expect([...seen].sort()).toEqual(['OFFLINE', 'SENDING', 'SYNCED', 'UNKNOWN', 'UNREACHABLE']);
  });
});
