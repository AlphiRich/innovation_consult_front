/**
 * Election Campaign OS — the connection and outbox-depth hook
 * IC-ECOS-BUILD-2026-V2 §7.1, §7.5.
 *
 * Split from `ConnectionStatus.tsx` so that file exports only a
 * component: a module mixing hooks and components defeats React Fast
 * Refresh, and the lint rule that says so is set to error here.
 *
 * See `ConnectionStatus.tsx` for why this exists at all — in short, a
 * canvasser cannot otherwise tell a filed round from a queued one, and
 * that is the worst failure this product could have.
 */
import { useEffect, useState } from 'react';
import { offlineDb } from '@/offline/db';

/** How often the queue depth is re-read, in ms. */
const POLL_MS = 5000;

export function useConnectionStatus(): { online: boolean; pending: number | null } {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  // null means "not read yet" — distinct from zero, which is a real and
  // reassuring answer.
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        await offlineDb.ensureOpen();
        const count = await offlineDb.outbox.count();
        if (!cancelled) setPending(count);
      } catch {
        // IndexedDB can be unavailable — private browsing, a locked
        // profile. Leaving `pending` null renders nothing rather than
        // claiming a queue of zero that was never read.
        if (!cancelled) setPending(null);
      }
    };
    void read();
    const timer = setInterval(() => void read(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { online, pending };
}
