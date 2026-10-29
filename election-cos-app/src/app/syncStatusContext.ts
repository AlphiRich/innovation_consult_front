/**
 * Election Campaign OS — sync-status context and hook
 * IC-ECOS-BUILD-2026-V2 §7.1, §7.5.
 *
 * Split from `SyncStatusProvider.tsx` for the same reason `useSession.ts`
 * is split from `AuthProvider.tsx`: a module that exports both a hook and
 * a component defeats React Fast Refresh, and
 * `react-refresh/only-export-components` is set to error in this project.
 *
 * The default value is the pre-subscription state — nothing established,
 * no queue read — so a component rendered outside the provider shows
 * "Checking" rather than throwing or, worse, claiming to be synced.
 */
import { createContext, useContext } from 'react';
import { deriveSyncStatus, type SyncStatusReading } from '@/offline/syncStatus';

export const SyncStatusContext = createContext<SyncStatusReading>(
  deriveSyncStatus({ link: 'UNKNOWN', pendingWrites: false, queued: null, browserOnline: true }),
);

/** Where this user's work is, as one thing to say. */
export function useSyncStatus(): SyncStatusReading {
  return useContext(SyncStatusContext);
}
