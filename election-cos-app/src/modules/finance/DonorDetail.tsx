/**
 * Election Campaign OS — donor detail: donation history + live provisional status
 * IC-ECOS-BUILD-2026-V2 §6.8.2, §6.8.3.
 *
 * The banner below is a CLIENT-SIDE, DISPLAY-ONLY computation
 * (levelForAggregate over this donor's current-financial-year donations,
 * summed here in the UI) — it is explicitly NOT the real aggregation.
 * The real one is a Cloud Function (functions/src/ppfaAggregation.ts),
 * deliberately not built/deployed pending legal confirmation of §6.8.1
 * Q1–Q3, and it alone may write a real DonationAlert (firestore.rules:
 * donationAlerts create is `if false` for clients). This banner never
 * blocks the donation form below it, and nothing here writes an alert —
 * it exists purely so a compliance officer isn't flying blind between
 * now and whenever the real aggregation ships.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Donor } from '@/dal/ports/donors';
import type { PPFAConfig } from '@/dal/ports/ppfaConfig';
import { formatZAR } from '@/lib/money';
import { levelForAggregate } from './escalation';
import { deriveFinancialYear } from './financialYear';
import { DonationForm } from './DonationForm';

const LEVEL_LABEL: Record<string, string> = {
  WARNING: 'Approaching disclosure threshold',
  DISCLOSURE_REQUIRED: 'Disclosure threshold reached',
  CAP_APPROACHING: 'Approaching annual cap',
  CAP_EXCEEDED: 'Annual cap exceeded',
};

interface DonorDetailProps {
  ctx: SessionContext;
  donor: Donor;
  config: PPFAConfig;
}

export function DonorDetail({ ctx, donor, config }: DonorDetailProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [disclosingId, setDisclosingId] = useState<string | null>(null);
  const [iecReference, setIecReference] = useState('');

  const donationsQuery = useQuery({
    queryKey: ['donations', ctx.tenantId, donor.id],
    queryFn: () => dal.donations.listByDonor(ctx, donor.id),
  });

  const alertsQuery = useQuery({
    queryKey: ['donationAlerts', ctx.tenantId, donor.id],
    queryFn: () => dal.donationAlerts.listByDonor(ctx, donor.id),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => dal.donationAlerts.acknowledge(ctx, id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donationAlerts', ctx.tenantId, donor.id] }),
  });

  const discloseMutation = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref: string }) => dal.donations.markDisclosed(ctx, id, ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations', ctx.tenantId, donor.id] });
      setDisclosingId(null);
      setIecReference('');
    },
  });

  const donations = donationsQuery.data ?? [];
  const currentFY = deriveFinancialYear(new Date(), config.financialYearStartMonth);
  const currentFYTotal = donations.filter((d) => d.financialYear === currentFY).reduce((sum, d) => sum + d.amountZAR, 0);
  const provisionalLevel = levelForAggregate(currentFYTotal, config);
  const openAlerts = (alertsQuery.data ?? []).filter((a) => !a.acknowledgedAt);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-headline-md font-display text-ink">{donor.displayName}</p>
        <p className="text-data-mono font-mono text-slate">
          {currentFY} total: {formatZAR(currentFYTotal)}
        </p>
      </div>

      {provisionalLevel && (
        <div className="border-l-4 border-gold bg-white p-3 space-y-1">
          <p className="text-label-caps font-display uppercase text-maroon">
            Provisional: {LEVEL_LABEL[provisionalLevel]}
          </p>
          <p className="text-body-md font-body text-slate">
            Computed client-side for visibility only — not the official aggregation, which is held pending §6.8.1
            legal confirmation. Never blocks recording a donation.
          </p>
        </div>
      )}

      {openAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-label-caps font-display uppercase text-slate">Open alerts (system-raised)</h4>
          {openAlerts.map((alert) => (
            <div key={alert.id} className="border-l-4 border-maroon bg-white p-3 space-y-2">
              <p className="text-body-md font-body text-ink">
                {LEVEL_LABEL[alert.level] ?? alert.level} — raised {new Date(alert.raisedAt).toLocaleDateString('en-ZA')}
              </p>
              <button
                type="button"
                onClick={() => acknowledgeMutation.mutate({ id: alert.id, note: 'Acknowledged' })}
                disabled={acknowledgeMutation.isPending}
                className="px-3 py-1.5 bg-ink text-paper rounded text-label-caps font-display uppercase disabled:opacity-40"
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-gold text-ink rounded text-label-caps font-display uppercase"
      >
        + Record donation
      </button>

      {showForm && (
        <DonationForm
          ctx={ctx}
          donorId={donor.id}
          config={config}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-2">
        {donationsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading donations…</p>}
        {[...donations]
          .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
          .map((donation) => (
            <div key={donation.id} className="bg-white border border-ink/10 rounded p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-body-md font-body text-ink">
                  {formatZAR(donation.amountZAR)} {donation.inKind && '(in-kind)'} — {donation.financialYear} Q
                  {donation.quarter}
                </p>
                <p className="text-data-mono font-mono text-slate">
                  {new Date(donation.receivedAt).toLocaleDateString('en-ZA')}
                  {donation.description && ` · ${donation.description}`}
                </p>
              </div>
              {donation.disclosedAt ? (
                <span className="text-label-caps font-display uppercase text-green">
                  Disclosed — {donation.iecReference}
                </span>
              ) : disclosingId === donation.id ? (
                <div className="flex items-center gap-2">
                  <input
                    className="border border-ink/20 rounded px-2 py-1 text-body-md font-body w-32"
                    value={iecReference}
                    onChange={(e) => setIecReference(e.target.value)}
                    placeholder="IEC reference"
                  />
                  <button
                    type="button"
                    disabled={!iecReference.trim() || discloseMutation.isPending}
                    onClick={() => discloseMutation.mutate({ id: donation.id, ref: iecReference.trim() })}
                    className="px-2 py-1 bg-ink text-paper rounded text-label-caps font-display uppercase disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDisclosingId(donation.id)}
                  className="px-2 py-1 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
                >
                  Mark disclosed
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
