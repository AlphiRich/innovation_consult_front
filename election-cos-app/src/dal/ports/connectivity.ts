/**
 * Election Campaign OS — the Firestore link, as a port
 * IC-ECOS-BUILD-2026-V2 §5.1, §7.1.
 *
 * WHY THIS IS A PORT AND NOT A HOOK
 *
 * `src/app/**` and `src/modules/**` may not import the Firebase SDK —
 * §2.2, enforced by the ESLint boundary in `.eslintrc.cjs`. The chrome
 * needs to know whether the Firestore client is actually talking to the
 * backend, which is a fact only the SDK holds, so it comes through the
 * same seam every other piece of Firestore state comes through.
 *
 * WHAT THE SDK CAN ACTUALLY TELL US
 *
 * Two bits of listener metadata, and they are different questions:
 *
 *  - `fromCache` — was this snapshot served from the local cache rather
 *    than the backend? The SDK sets it true the moment it loses its
 *    connection and false again when it reattaches, so it is a direct
 *    measurement of reachability rather than an inference from it.
 *  - `hasPendingWrites` — are there local writes the server has not
 *    acknowledged? This is the only authoritative answer to "has my work
 *    actually left this handset", because Firestore's own offline queue
 *    is invisible to the Dexie outbox and vice versa.
 *
 * Neither is the same question as `navigator.onLine`, which reports only
 * that the device is attached to *a* network. A handset on a hotel or
 * municipal captive portal reports online and can reach nothing — see
 * `src/offline/syncStatus.ts`, where that case gets its own state.
 */
import type { SessionContext } from './session';

/**
 * Where the last Firestore snapshot came from.
 *
 * `UNKNOWN` is the honest answer before the first snapshot arrives and
 * after a listener error, and it is deliberately not collapsed into
 * `CACHE`: "we have not established this yet" and "we are demonstrably
 * on the cache" lead to different words in the chrome.
 */
export type FirestoreLink = 'SERVER' | 'CACHE' | 'UNKNOWN';

export interface FirestoreLinkReading {
  link: FirestoreLink;
  /** Local writes Firestore itself has not had acknowledged. */
  pendingWrites: boolean;
  /** When this reading was taken, ISO 8601. */
  observedAt: string;
}

export interface ConnectivityPort {
  /**
   * Watch the link. Calls `onReading` with the current state and again on
   * every change, and returns the unsubscribe.
   *
   * Costs one document read per session, not one per callback: §7.4
   * free-tier discipline. Metadata-only changes — which is what a
   * connection drop and a recovery are — are served locally and bill
   * nothing, so the ongoing cost of watching is zero. The single
   * subscription is held by `SyncStatusProvider` so that mounting the
   * indicator twice (the phone bar and the desktop sidebar both render
   * it) cannot open two listeners.
   */
  observe(ctx: SessionContext, onReading: (reading: FirestoreLinkReading) => void): () => void;
}
