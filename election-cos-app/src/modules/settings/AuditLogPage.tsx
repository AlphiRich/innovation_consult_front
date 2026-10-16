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
import { Card, DataLine, Field, PageHeader, SectionLabel } from '@/components/ui';

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
      <Card className="max-w-lg">
        <PageHeader slug="/settings/audit" title="Audit log" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
    );
  }

  const canRead = session.caps.includes('settings.permissions');
  const events = eventsQuery.data ?? [];
  const days = groupByDay(events);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        slug="/settings/audit"
        title="Audit log"
        action={
          /* Was a bare <label> around the select — no association. */
          <Field label="Show">
            {(props) => (
              <select {...props} value={limitCount} onChange={(e) => setLimitCount(Number(e.target.value))}>
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    Most recent {size}
                  </option>
                ))}
              </select>
            )}
          </Field>
        }
      />

      <div className="border-l-4 border-gold bg-white p-3 space-y-2">
        <SectionLabel as="h2" tone="ink">
          What this log is
        </SectionLabel>
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
          <SectionLabel as="h2">
            {new Date(group.day).toLocaleDateString('en-ZA', { dateStyle: 'long' })}
          </SectionLabel>
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
              <DataLine>
                {new Date(event.occurredAt).toLocaleTimeString('en-ZA')} · {event.actorUid} ·{' '}
                {event.targetType}/{event.targetId}
              </DataLine>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
