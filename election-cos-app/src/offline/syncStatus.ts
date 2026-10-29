/**
 * Election Campaign OS — what to tell the user about their work
 * IC-ECOS-BUILD-2026-V2 §7.1, §7.5.
 *
 * THE WORD "SYNCED" WAS NOT SAYABLE BEFORE THIS
 *
 * `ConnectionStatus` — the component this supersedes, removed in the
 * same change — reported two facts, `navigator.onLine` and the Dexie
 * outbox depth, and its own header said why it refused the word:
 * "It will not claim anything is synced." That refusal was correct.
 * `navigator.onLine` means "attached to a network", not "can reach the
 * server", and an empty Dexie outbox says nothing about writes sitting in
 * Firestore's own offline queue, which is a separate queue the outbox
 * cannot see.
 *
 * Firestore's listener metadata closes both gaps, and that is the whole
 * reason this module exists:
 *
 *  - `fromCache === false` means the client is attached to the backend
 *    now — measured, not inferred from the network interface.
 *  - `hasPendingWrites === false` means the server has acknowledged every
 *    write the SDK is holding.
 *
 * Those two, plus an empty local queue, enumerate every place work can
 * hide in this application. When all three are clear the work *is* on the
 * server, and saying so is a statement of fact rather than an
 * encouragement. When any one of them is unreadable, this returns
 * `UNKNOWN` and the chrome says it cannot tell.
 *
 * THE CAPTIVE PORTAL GETS ITS OWN STATE
 *
 * A handset attached to a municipal or hotel wifi that has not been
 * logged into reports `navigator.onLine === true` and can reach nothing.
 * That is not a hypothetical on a product used in community halls and
 * council buildings: it is the single most confusing failure a field user
 * can hit, because every signal they can see says they are online. With
 * the Firestore link measured separately it becomes distinguishable, so
 * `UNREACHABLE` says "this device has a network but cannot reach the
 * server" rather than lumping it in with "offline".
 */

/** Everything that can be known about where this user's work is. */
export type SyncStatus =
  /** Reachable, nothing outstanding anywhere. The server has it all. */
  | 'SYNCED'
  /** Reachable, and something is still on its way. */
  | 'SENDING'
  /** The device reports no network at all. */
  | 'OFFLINE'
  /** The device has a network but Firestore cannot be reached over it. */
  | 'UNREACHABLE'
  /** Not established yet, or a signal could not be read. */
  | 'UNKNOWN';

export interface SyncStatusInput {
  /** Where the last Firestore snapshot came from. */
  link: 'SERVER' | 'CACHE' | 'UNKNOWN';
  /** Writes Firestore itself has not had acknowledged. */
  pendingWrites: boolean;
  /**
   * Operations queued in IndexedDB — the Dexie outbox plus the photo
   * queue. `null` means the count could not be read (private browsing, a
   * locked profile), which is NOT the same as zero and must never be
   * rendered as "nothing waiting".
   */
  queued: number | null;
  /** `navigator.onLine`. Reports the network interface, nothing more. */
  browserOnline: boolean;
}

export interface SyncStatusReading {
  status: SyncStatus;
  /** Two or three words, for the chrome. */
  label: string;
  /** One sentence: what this means for the user's work. */
  detail: string;
  /**
   * Whether this state should draw the eye. Offline with nothing waiting
   * is normal on this product and is not a warning; offline with work
   * waiting is the state a canvasser must notice before they close the
   * app believing the day is filed.
   */
  attention: boolean;
}

/** `null` queue depth renders as the honest phrase, never as zero. */
function queueClause(queued: number | null): string {
  if (queued === null) return 'the local queue could not be read';
  if (queued === 0) return 'nothing is waiting on this device';
  if (queued === 1) return '1 item is waiting on this device';
  return `${queued} items are waiting on this device`;
}

/**
 * Turn the three signals into one thing to say.
 *
 * Pure, and deliberately so: every branch below is a sentence a user
 * reads at a gate with one bar of signal, and `syncStatus.test.ts`
 * exercises the whole truth table without a browser, a listener or a
 * clock.
 *
 * PRECEDENCE, AND WHY IT IS THIS ORDER
 *
 * 1. No network at all is the most certain and most actionable fact
 *    there is, so it outranks a stale `SERVER` reading — the browser
 *    fires its `offline` event before the SDK notices the drop, and for
 *    that interval `link` still says `SERVER`.
 * 2. An unestablished link outranks a cache reading, because "we have
 *    not found out yet" and "we have found out, and we are on the cache"
 *    are different things to tell somebody.
 * 3. Only then is the link itself read.
 */
export function deriveSyncStatus(input: SyncStatusInput): SyncStatusReading {
  const { link, pendingWrites, queued, browserOnline } = input;
  const waiting = queued === null || queued > 0 || pendingWrites;

  if (!browserOnline) {
    return {
      status: 'OFFLINE',
      label: 'Offline',
      detail: `No network connection. Keep working — ${queueClause(queued)} and it will send when you reconnect.`,
      // Nothing waiting while offline is the normal, designed state of
      // this product and does not deserve a warning colour.
      attention: waiting,
    };
  }

  if (link === 'UNKNOWN') {
    return {
      status: 'UNKNOWN',
      label: 'Checking',
      detail: `Not yet established whether the server can be reached — ${queueClause(queued)}.`,
      attention: false,
    };
  }

  if (link === 'CACHE') {
    return {
      status: 'UNREACHABLE',
      label: 'Cannot reach server',
      detail:
        'This device has a network but cannot reach the server — a sign-in page on the wifi will do this. ' +
        `Your work is safe: ${queueClause(queued)}.`,
      attention: true,
    };
  }

  // link === 'SERVER' — attached to the backend, measured.
  if (queued === null) {
    /*
     * Firestore is reachable and has acknowledged its own writes, but the
     * local queue could not be read, so "nothing outstanding" cannot be
     * asserted. This is the branch that keeps the word "synced" honest:
     * two of three signals clear is not three.
     */
    return {
      status: 'UNKNOWN',
      label: 'Cannot confirm',
      detail:
        'Connected to the server, but the local queue on this device could not be read, ' +
        'so whether everything has been sent cannot be confirmed.',
      attention: true,
    };
  }

  if (queued > 0) {
    return {
      status: 'SENDING',
      label: 'Sending',
      detail: `Connected, and ${queueClause(queued)} — sending now.`,
      attention: false,
    };
  }

  if (pendingWrites) {
    /*
     * The local queue is empty but Firestore is still holding a write the
     * server has not acknowledged. Deliberately a separate branch and a
     * separate sentence: composing this from `queueClause` produced
     * "nothing is waiting on this device — sending now", which is a
     * sentence that contradicts itself. The two queues are different
     * places and only one of them is the Dexie outbox.
     */
    return {
      status: 'SENDING',
      label: 'Sending',
      detail: 'Connected, and a change is still being confirmed by the server.',
      attention: false,
    };
  }

  return {
    status: 'SYNCED',
    label: 'Synced',
    detail: 'Connected, and everything captured on this device has been saved to the server.',
    attention: false,
  };
}
