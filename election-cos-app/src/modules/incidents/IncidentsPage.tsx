/**
 * Election Campaign OS — Incidents module
 * IC-ECOS-BUILD-2026-V2 §6.4. Workflow: Canvasser/VD Captain logs (fixed
 * taxonomy) → Ward Lead triages (confirms/adjusts severity) → Municipal
 * Lead escalates → referral PDF.
 *
 * The referral PDF step (§6.4: "authorisation strips the DRAFT watermark
 * and appends signature + timestamp") is NOT built this session — it
 * needs a server-side PDF generator with Storage write access, the same
 * category of work as tools/docgen/ but triggered from the app rather
 * than run by hand, and there's no live Firebase project to deploy a
 * Cloud Function against yet (BUILD-STATUS.md blocker #2). ESCALATED is
 * therefore this UI's terminal state — real, not faked, and not silently
 * dead-ended either: IncidentCard.tsx shows no button past it rather than
 * a button that does nothing.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { IncidentStatus } from '@/dal/ports/incidents';
import { IncidentCard } from './IncidentCard';
import { IncidentForm } from './IncidentForm';
import { STATUS_LABEL, STATUS_ORDER } from './incidentMeta';

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
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/incidents</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Incidents</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const incidents = incidentsQuery.data?.items ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/incidents</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Incidents</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap"
        >
          + Log incident
        </button>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-ink/10 pb-2">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded text-label-caps font-display uppercase ${
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
