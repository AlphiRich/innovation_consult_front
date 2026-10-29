/**
 * Election Campaign OS — how much work is still on this handset
 * IC-ECOS-BUILD-2026-V2 §7.2, §7.5.
 *
 * WHY THIS COUNTS TWO TABLES AND NOT ONE
 *
 * `useConnectionStatus` — removed in the same change as this file was
 * added — counted `outbox` alone. That was correct only by accident:
 * `photoQueue` is declared in the Dexie schema (`src/offline/db.ts`) and
 * nothing in the application has ever written to it. Grep it and the only
 * hits are the schema line and its type declaration, so the count has
 * never actually been wrong.
 *
 * It would become wrong the first time an incident photo is queued. A
 * canvasser would see "nothing waiting", close the app, and the photo —
 * the evidence attached to an incident report — would still be in
 * IndexedDB on that handset. Counting both tables now means the
 * indicator cannot start lying on the day that feature lands, rather
 * than relying on whoever builds it remembering to come back here.
 *
 * `conflicts` is deliberately NOT counted. An unresolved conflict is not
 * work waiting to be sent — it has reached the server and been found to
 * disagree with what was there. It needs a person to decide, which is a
 * different message in a different place (`SyncConflictsPage`), and
 * folding it into "sending" would hide it behind a spinner.
 */
import { offlineDb } from './db';

/**
 * Operations still held locally, or `null` if IndexedDB could not be
 * read at all.
 *
 * `null` rather than `0` on failure, and the distinction is load-bearing:
 * `deriveSyncStatus` refuses to say "synced" on a `null` and says so out
 * loud. A zero returned from a failed read is the shape of bug that
 * tells somebody their day is filed when it is sitting in a browser
 * profile they are about to clear.
 */
export async function readQueueDepth(): Promise<number | null> {
  try {
    await offlineDb.ensureOpen();
    const [ops, photos] = await Promise.all([
      offlineDb.outbox.count(),
      offlineDb.photoQueue.count(),
    ]);
    return ops + photos;
  } catch {
    // IndexedDB can be unavailable for reasons that are nobody's fault:
    // private browsing, a locked profile, storage pressure, a blocked
    // schema upgrade in another tab.
    return null;
  }
}
