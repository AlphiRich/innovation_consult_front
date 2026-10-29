/**
 * Election Campaign OS — the one subscription to the Firestore link
 * IC-ECOS-BUILD-2026-V2 §7.1, §7.4, §7.5.
 *
 * WHY A PROVIDER RATHER THAN A HOOK CALLED WHERE IT IS NEEDED
 *
 * The indicator renders twice: the phone header bar and the desktop
 * sidebar footer both show it, and `Shell` mounts both (one is hidden by
 * a media query, which hides it from the user and not from React). A hook
 * that opened the listener itself would therefore open two listeners for
 * one user, double the attach-time document reads, and — worse — let the
 * two indicators disagree for the interval between their callbacks.
 *
 * One subscription, held here, read from context. That is also what makes
 * it *persistent* in the sense the request asked for: the listener's
 * lifetime is the signed-in session's, not any one screen's, so
 * navigating does not tear it down and re-establish it.
 *
 * WHERE IT SITS IN AppProviders
 *
 * Inside `AuthProvider`, because the probe needs `tenantId` and `uid` to
 * name the document it watches, and outside everything that renders
 * chrome. With no session it subscribes to nothing and reports the
 * browser's own network state, which is all that can honestly be said
 * before sign-in: the sign-in page's own offline message comes from the
 * same reading rather than from a second, separately-derived guess.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import { readQueueDepth } from '@/offline/queueDepth';
import { deriveSyncStatus } from '@/offline/syncStatus';
import type { FirestoreLink } from '@/dal/ports/connectivity';
import { SyncStatusContext } from './syncStatusContext';

/**
 * How often the local queue depth is re-read, in ms.
 *
 * IndexedDB counts are local and cost nothing on the network, so this is
 * about freshness rather than budget. Five seconds is carried over from
 * the `useConnectionStatus` hook this replaces, where it was chosen so
 * that a canvasser who captures a door and glances at the chrome sees
 * the number move.
 */
const QUEUE_POLL_MS = 5000;

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const session = useSession();

  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [link, setLink] = useState<FirestoreLink>('UNKNOWN');
  const [pendingWrites, setPendingWrites] = useState(false);
  // `null` is "not read yet", which is distinct from zero — see
  // `readQueueDepth`. Rendering a zero we never measured is the defect
  // this whole module is built around.
  const [queued, setQueued] = useState<number | null>(null);

  /* ------------------------------------------- the network interface */

  useEffect(() => {
    const up = () => setBrowserOnline(true);
    const down = () => setBrowserOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  /* --------------------------------------------- the Firestore link */

  useEffect(() => {
    if (!session) {
      // Signed out: no document to watch, and no claim to make about the
      // server. `UNKNOWN` plus the browser's own state is the whole of
      // what is knowable here.
      setLink('UNKNOWN');
      setPendingWrites(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = dal.connectivity.observe(session, (reading) => {
        if (cancelled) return;
        setLink(reading.link);
        setPendingWrites(reading.pendingWrites);
      });
    } catch {
      /*
       * `observe` throws synchronously when Firebase is not configured at
       * all — which is the state of every local build without a `.env`,
       * and of the test suite. Reporting `UNKNOWN` keeps the chrome
       * honest ("Checking") instead of letting an unconfigured build
       * crash the shell on mount.
       */
      setLink('UNKNOWN');
      setPendingWrites(false);
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [session]);

  /* ----------------------------------------------- the local queues */

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      const depth = await readQueueDepth();
      if (!cancelled) setQueued(depth);
    };
    void read();
    const timer = setInterval(() => void read(), QUEUE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  /*
   * Re-read the queue the moment the link changes, rather than waiting
   * out the poll. Reconnecting is exactly when the queue drains, so this
   * is the one moment the number is most wrong and most looked at.
   */
  useEffect(() => {
    let cancelled = false;
    void readQueueDepth().then((depth) => {
      if (!cancelled) setQueued(depth);
    });
    return () => {
      cancelled = true;
    };
  }, [link, pendingWrites]);

  const reading = useMemo(
    () => deriveSyncStatus({ link, pendingWrites, queued, browserOnline }),
    [link, pendingWrites, queued, browserOnline],
  );

  return <SyncStatusContext.Provider value={reading}>{children}</SyncStatusContext.Provider>;
}
