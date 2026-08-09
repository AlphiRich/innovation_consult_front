/**
 * Election-COS1.0 — incident list card
 * IC-ECOS-BUILD-2026-V2 §6.4. One status-appropriate action per card:
 * Triage (LOGGED), Escalate (TRIAGED). ESCALATED has no action here —
 * referral-PDF generation isn't built (see IncidentsPage.tsx header).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Incident, IncidentSeverity } from '@/dal/ports/incidents';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { CATEGORY_LABEL, SEVERITY_META, SEVERITY_ORDER } from './incidentMeta';

interface IncidentCardProps {
  ctx: SessionContext;
  incident: Incident;
}

export function IncidentCard({ ctx, incident }: IncidentCardProps) {
  const queryClient = useQueryClient();
  const [triageSeverity, setTriageSeverity] = useState<IncidentSeverity>(incident.severity);
  const [showTriage, setShowTriage] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['incidents', ctx.tenantId] });

  const triageMutation = useMutation({
    mutationFn: (severity: IncidentSeverity) => dal.incidents.triage(ctx, incident.id, severity),
    onSuccess: () => {
      setShowTriage(false);
      invalidate();
    },
  });

  const escalateMutation = useMutation({
    mutationFn: () => dal.incidents.escalate(ctx, incident.id),
    onSuccess: invalidate,
  });

  const severityMeta = SEVERITY_META[incident.severity];

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-headline-md font-display text-ink">{CATEGORY_LABEL[incident.category]}</p>
          <p className="text-data-mono font-mono text-slate">
            VD {incident.vdCode} · {incident.wardCode}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded border text-label-caps font-display uppercase whitespace-nowrap ${TONE_PILL_CLASSES[severityMeta.tone]}`}
        >
          {severityMeta.label}
        </span>
      </div>

      <p className="text-body-md font-body text-ink">{incident.description}</p>

      {incident.status === 'LOGGED' && (
        <div>
          {!showTriage ? (
            <button
              type="button"
              onClick={() => setShowTriage(true)}
              className="px-3 py-1.5 bg-ink text-paper rounded text-label-caps font-display uppercase"
            >
              Triage
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="border border-ink/20 rounded px-2 py-1.5 text-body-md font-body bg-white"
                value={triageSeverity}
                onChange={(e) => setTriageSeverity(e.target.value as IncidentSeverity)}
              >
                {SEVERITY_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_META[s].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={triageMutation.isPending}
                onClick={() => triageMutation.mutate(triageSeverity)}
                className="px-3 py-1.5 bg-ink text-paper rounded text-label-caps font-display uppercase disabled:opacity-40"
              >
                {triageMutation.isPending ? 'Saving…' : 'Confirm severity'}
              </button>
              <button
                type="button"
                onClick={() => setShowTriage(false)}
                className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {incident.status === 'TRIAGED' && (
        <button
          type="button"
          disabled={escalateMutation.isPending}
          onClick={() => escalateMutation.mutate()}
          className="px-3 py-1.5 bg-maroon text-white rounded text-label-caps font-display uppercase disabled:opacity-40"
        >
          {escalateMutation.isPending ? 'Escalating…' : 'Escalate'}
        </button>
      )}

      {(triageMutation.isError || escalateMutation.isError) && (
        <p className="text-body-md text-maroon">Action failed — try again.</p>
      )}
    </div>
  );
}
