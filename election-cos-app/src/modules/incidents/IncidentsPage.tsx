/**
 * Election Campaign OS — Incidents module
 * IC-ECOS-BUILD-2026-V2 §6.4. Workflow: Canvasser/VD Captain logs (fixed
 * taxonomy) → Ward Lead triages (confirms/adjusts severity) → Municipal
 * Lead escalates → referral PDF.
 *
 * The referral step (§6.4: "authorisation strips the DRAFT watermark and
 * appends signature + timestamp") is built — see src/modules/incidents/
 * referral/. An earlier session deferred it for wanting a server-side PDF
 * generator; it turned out not to need one. The document is text-only over
 * the Adobe standard-14 fonts, so it is generated on the device by
 * src/lib/pdf/ with no dependency and no Cloud Function, which also means
 * a Municipal Lead can produce and read a draft with no connectivity.
 * Issuing it — Storage upload, registry entry, ESCALATED → REFERRED —
 * still needs a live project (BUILD-STATUS.md blocker #2).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import { Link } from 'react-router-dom';
import type { IncidentStatus } from '@/dal/ports/incidents';
import { IncidentCard } from './IncidentCard';
import { IncidentForm } from './IncidentForm';
import { STATUS_LABEL, STATUS_ORDER } from './incidentMeta';
import { Button, Card, PageHeader } from '@/components/ui';

export function IncidentsPage() {
  const session = useSession();
  const [status, setStatus] = useState<IncidentStatus>('LOGGED');
  const [showForm, setShowForm] = useState(false);

  const incidentsQuery = useQuery({
    queryKey: ['incidents', session?.tenantId, status],
    queryFn: () => dal.incidents.listByStatus(session!, status, { pageSize: 25 }),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <Card className="max-w-lg">
        <PageHeader slug="/incidents" title="Incidents" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
    );
  }

  const incidents = incidentsQuery.data?.items ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        slug="/incidents"
        title="Incidents"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/*
             * The report lives off this page rather than in the primary
             * nav, which §3.2 fixes at nine items and nav.test.ts holds
             * there. Same arrangement as the canvassing round off Voters.
             *
             * A <Link>, not Button: it navigates, and the primitive
             * renders a real <button>.
             */}
            <Link
              to="/incidents/report"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded border border-ink/20 px-4 py-2 text-label-caps font-display uppercase text-ink"
            >
              Report
            </Link>
            <Button onClick={() => setShowForm(true)} className="whitespace-nowrap">
              + Log incident
            </Button>
          </div>
        }
      />

      {/* A status filter. `aria-pressed` is what tells a screen-reader
          user which status is being shown — colour alone told them
          nothing. Hand-rolled because this is the one place with a
          selected state, and Button has none. */}
      <div className="flex flex-wrap gap-1 border-b border-ink/10 pb-2">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`inline-flex min-h-11 items-center rounded px-3 py-1.5 text-label-caps font-display uppercase ${
              status === s ? 'bg-ink text-paper' : 'text-slate hover:text-ink'
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {incidentsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {incidentsQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          {incidentsQuery.error instanceof Error ? incidentsQuery.error.message : 'Failed to load incidents.'}
        </p>
      )}
      {incidents.length === 0 && !incidentsQuery.isLoading && (
        <p className="text-body-md font-body text-slate">No incidents in "{STATUS_LABEL[status]}".</p>
      )}

      <div className="space-y-3">
        {incidents.map((incident) => (
          <IncidentCard key={incident.id} ctx={session} incident={incident} />
        ))}
      </div>

      {showForm && <IncidentForm ctx={session} onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
