/**
 * Election Campaign OS — Audit log
 * IC-ECOS-BUILD-2026-V2 §7.5. Capability: `settings.permissions`, which
 * is what `firestore.rules` gates the read on.
 *
 * See `auditTrail.ts` for why this exists and, more importantly, for what
 * this log is not. The three basis sentences on this page are the point
 * of the screen: a log labelled "audit" that did not say it has no hash
 * chain would let a reader believe a property the data does not have.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import {
  AUDIT_EMPTY_BASIS,
  AUDIT_INTEGRITY_BASIS,
  AUDIT_SCOPE_BASIS,
  describeAction,
  groupByDay,
  isUnknownAction,
} from './auditTrail';

const PAGE_SIZES = [50, 200, 500] as const;

export function AuditLogPage() {
  const session = useSession();
  const [limitCount, setLimitCount] = useState<number>(PAGE_SIZES[0]);

  const eventsQuery = useQuery({
    queryKey: ['auditLog', session?.tenantId, limitCount],
    queryFn: () => dal.auditLog.listRecent(session!, limitCount),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/settings/audit</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Audit log</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const canRead = session.caps.includes('settings.permissions');
  const events = eventsQuery.data ?? [];
  const days = groupByDay(events);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/settings/audit</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Audit log</h1>
        </div>
        <label className="space-y-1 block">
          <span className="text-label-caps font-display uppercase text-slate">Show</span>
          <select
            className="border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
            value={limitCount}
            onChange={(e) => setLimitCount(Number(e.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                Most recent {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="border-l-4 border-gold bg-white p-3 space-y-2">
        <p className="text-label-caps font-display uppercase text-ink">What this log is</p>
        <p className="text-body-md font-body text-slate">{AUDIT_INTEGRITY_BASIS}</p>
        <p className="text-body-md font-body text-slate">{AUDIT_SCOPE_BASIS}</p>
      </div>

      {!canRead && (
        <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">
          Your role does not include the permission this log is gated on. The rules refuse the read, so this
          page will stay empty whatever it looks like.
        </p>
      )}

      {eventsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}

      {eventsQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          The log could not be read. That is a failure to read it, not a finding that it is empty.
        </p>
      )}

      {!eventsQuery.isLoading && !eventsQuery.isError && events.length === 0 && (
        <p className="text-body-md font-body text-slate border-l-4 border-slate/40 bg-white p-3">
          {AUDIT_EMPTY_BASIS}
        </p>
      )}

      {days.map((group) => (
        <section key={group.day} className="space-y-2">
          <h2 className="text-label-caps font-display uppercase text-slate">
            {new Date(group.day).toLocaleDateString('en-ZA', { dateStyle: 'long' })}
          </h2>
          {group.events.map((event) => (
            <div key={event.id} className="bg-white border border-ink/10 rounded p-3 space-y-1">
              <p className="text-body-md font-body text-ink">
                {describeAction(event.action)}
                {isUnknownAction(event.action) && (
                  <span className="ml-2 text-label-caps font-display uppercase text-slate">
                    no description held
                  </span>
                )}
              </p>
              <p className="text-data-mono font-mono text-slate">
                {new Date(event.occurredAt).toLocaleTimeString('en-ZA')} · {event.actorUid} ·{' '}
                {event.targetType}/{event.targetId}
              </p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
