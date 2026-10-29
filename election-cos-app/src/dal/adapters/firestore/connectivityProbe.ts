/**
 * Election Campaign OS — Firestore adapter: the link probe
 * IC-ECOS-BUILD-2026-V2 §5.1, §7.1, §7.4.
 *
 * WHICH DOCUMENT IT WATCHES, AND WHY THAT ONE
 *
 * The caller's own staff document, `tenants/{tenantId}/staff/{uid}`.
 *
 * The first draft watched the war-room counters document, because the
 * application already reads it. Reading `firestore.rules` rather than
 * assuming killed that: `counters/{counterId}` requires
 * `cap('warroom.view')`, which a canvasser does not have. The listener
 * would have errored for exactly the user the whole indicator exists to
 * serve — somebody standing at a gate with one bar of signal — and
 * reported `UNKNOWN` for ever while looking fine to anybody testing it as
 * an administrator.
 *
 * The staff rule is `request.auth.uid == uid || cap('team.manage')`. The
 * first clause needs no capability at all, so every signed-in member of
 * the tenant can watch their own, and nobody can use this to watch
 * anybody else's.
 *
 * IT NEVER READS THE DOCUMENT
 *
 * Only `snapshot.metadata`. The document's contents are never touched,
 * which has three consequences worth stating: the probe works whether or
 * not the document exists (a session is resolved from ID-token claims,
 * not from this document, so its existence is not guaranteed and does not
 * need to be); it cannot leak a field that is later added to a staff
 * record; and it has no mapping layer to drift out of step with one.
 *
 * WHAT IT COSTS
 *
 * One document read when the listener attaches. After that, a connection
 * drop and a recovery are metadata-only events served from the local
 * cache, which bill nothing — so watching continuously costs nothing
 * continuously, and §7.4 holds. `includeMetadataChanges: true` is what
 * makes those events arrive at all; without it the SDK coalesces them and
 * a drop with no data change is silent.
 */
import { doc, onSnapshot } from 'firebase/firestore';
import type { ConnectivityPort, FirestoreLinkReading } from '@/dal/ports/connectivity';
import type { SessionContext } from '@/dal/ports/session';
import { db } from './base';

export const connectivityProbe: ConnectivityPort = {
  observe(ctx: SessionContext, onReading: (reading: FirestoreLinkReading) => void): () => void {
    const ref = doc(db(), `tenants/${ctx.tenantId}/staff/${ctx.uid}`);

    return onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snapshot) => {
        onReading({
          link: snapshot.metadata.fromCache ? 'CACHE' : 'SERVER',
          pendingWrites: snapshot.metadata.hasPendingWrites,
          observedAt: new Date().toISOString(),
        });
      },
      () => {
        /*
         * A listener error — rules denied it, or the SDK gave up. Report
         * `UNKNOWN` rather than `CACHE`: the chrome then says it cannot
         * tell, which is true, instead of "offline", which would be a
         * guess that happens to look like a measurement.
         *
         * `pendingWrites: false` here is not a claim that nothing is
         * waiting. `UNKNOWN` suppresses the "synced" wording outright in
         * `deriveSyncStatus`, so this value cannot be read as
         * reassurance; the Dexie queue depth is still reported beside it.
         */
        onReading({ link: 'UNKNOWN', pendingWrites: false, observedAt: new Date().toISOString() });
      },
    );
  },
};
