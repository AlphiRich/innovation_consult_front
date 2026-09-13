/**
 * Election Campaign OS — incident list card
 * IC-ECOS-BUILD-2026-V2 §6.4. One status-appropriate action per card:
 * Triage (LOGGED), Escalate (TRIAGED), Prepare referral (ESCALATED).
 * REFERRED shows the issued document's integrity hash rather than an
 * action — the workflow's last step has already happened.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Incident, IncidentSeverity, IncidentStatus } from '@/dal/ports/incidents';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { CATEGORY_LABEL, SEVERITY_META, SEVERITY_ORDER } from './incidentMeta';
import { ReferralPrepareModal } from './referral/ReferralPrepareModal';
import { referralDocumentId } from './referral/referralDocument';
import { availableTransitions } from './incidentWorkflow';
import { verifyIssuedReferral, type ReferralCheck } from './referral/verifyReferral';

interface IncidentCardProps {
  ctx: SessionContext;
  incident: Incident;
}

export function IncidentCard({ ctx, incident }: IncidentCardProps) {
  const queryClient = useQueryClient();
  const [triageSeverity, setTriageSeverity] = useState<IncidentSeverity>(incident.severity);
  const [showTriage, setShowTriage] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  // Only for an already-referred incident, so the card can show the hash a
  // municipality would quote back. Not fetched otherwise.
  const referralQuery = useQuery({
    queryKey: ['documents', ctx.tenantId, referralDocumentId(incident.id)],
    queryFn: () => dal.documents.getById(ctx, referralDocumentId(incident.id)),
    enabled: incident.status === 'REFERRED',
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['incidents', ctx.tenantId] });

  const triageMutation = useMutation({
    mutationFn: (severity: IncidentSeverity) => dal.incidents.triage(ctx, incident.id, severity),
    onSuccess: () => {
      setShowTriage(false);
      invalidate();
    },
  });

  // Only the two that end an incident; triage/escalate/refer have their
  // own buttons above, with their own confirmation steps.
  const endTransitions = availableTransitions(incident.status, ctx.caps).filter(
    (transition) => transition.to === 'RESOLVED' || transition.to === 'CLOSED',
  );

  const [check, setCheck] = useState<ReferralCheck | null>(null);
  const checkMutation = useMutation({
    mutationFn: () => verifyIssuedReferral(ctx, incident.id),
    onSuccess: setCheck,
  });

  const endMutation = useMutation({
    mutationFn: (to: IncidentStatus) =>
      to === 'RESOLVED'
        ? dal.incidents.resolve(ctx, incident.id)
        : dal.incidents.close(ctx, incident.id, 'Closed from the incidents list'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }),
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

      {incident.status === 'ESCALATED' && (
        <button
          type="button"
          onClick={() => setShowReferral(true)}
          className="px-3 py-1.5 bg-ink text-paper rounded text-label-caps font-display uppercase"
        >
          Prepare referral
        </button>
      )}

      {incident.status === 'REFERRED' && (
        <div className="border-t border-ink/10 pt-2 space-y-2">
          <p className="text-label-caps font-display uppercase text-slate">
            Referred{referralQuery.data ? ` · ${referralQuery.data.title}` : ''}
          </p>
          {referralQuery.data && (
            <p className="text-data-mono font-mono text-slate break-all">
              Integrity hash {referralQuery.data.integrityHashSha256}
            </p>
          )}
          {/*
           * The printed document tells its reader this hash verifies the
           * particulars against the record held here. Until session 27
           * nothing could perform that check — the particulars existed
           * only inside the PDF. See referral/verifyReferral.ts.
           */}
          <button
            type="button"
            disabled={checkMutation.isPending}
            onClick={() => checkMutation.mutate()}
            className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink disabled:opacity-40"
          >
            {checkMutation.isPending ? 'Checking…' : 'Check against the record'}
          </button>
          {check && (
            <div className="space-y-1">
              <p
                className={`text-body-md font-body ${
                  check.outcome === 'MATCHES' ? 'text-green' : check.outcome === 'DIFFERS' ? 'text-maroon' : 'text-slate'
                }`}
              >
                {check.message}
              </p>
              {check.recomputedHash && check.recomputedHash !== check.recordedHash && (
                <p className="text-data-mono font-mono text-maroon break-all">
                  Particulars hash to {check.recomputedHash}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/*
       * Resolve and close. Until session 27 an incident could not reach
       * either status: both were in the type, in STATUS_LABEL and in
       * STATUS_ORDER — so this page rendered a tab for each — and no
       * capability, repository method or security rule could put an
       * incident into one. Which moves are offered comes from
       * `incidentWorkflow.ts`, so this list cannot drift from the rules.
       */}
      {endTransitions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-2">
          {endTransitions.map((transition) => (
            <button
              key={transition.to}
              type="button"
              disabled={endMutation.isPending}
              onClick={() => endMutation.mutate(transition.to)}
              className={`px-3 py-1.5 border rounded text-label-caps font-display uppercase disabled:opacity-40 ${
                transition.to === 'RESOLVED' ? 'border-green/50 text-green' : 'border-ink/20 text-ink'
              }`}
            >
              {transition.label}
            </button>
          ))}
        </div>
      )}

      {(triageMutation.isError || escalateMutation.isError || endMutation.isError) && (
        <p className="text-body-md text-maroon">Action failed — try again.</p>
      )}

      {showReferral && (
        <ReferralPrepareModal ctx={ctx} incident={incident} onClose={() => setShowReferral(false)} />
      )}
    </div>
  );
}
