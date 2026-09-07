/**
 * Election Campaign OS — Funding & Disclosure (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8. Online only — never wired into the offline
 * layer (§7.1), matches donors.ts's own header.
 *
 * The real aggregation/alerting Cloud Function
 * (functions/src/ppfaAggregation.ts) is deliberately HELD pending legal
 * confirmation of §6.8.1 Q1–Q3 — nothing here works around that. Donor
 * capture and donation recording are fully real and never blocked by
 * amount or threshold (§6.8.3); see DonorDetail.tsx for the
 * client-side-only, clearly-labelled provisional status banner that
 * exists in place of the held aggregation function.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { Donor } from '@/dal/ports/donors';
import { DonorForm } from './DonorForm';
import { DonorDetail } from './DonorDetail';

export function FinancePage() {
  const session = useSession();
  const [showDonorForm, setShowDonorForm] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);

  const configQuery = useQuery({
    queryKey: ['ppfaConfig', session?.tenantId],
    queryFn: () => dal.ppfaConfig.getCurrent(session!),
    enabled: Boolean(session),
  });

  const donorsQuery = useQuery({
    queryKey: ['donors', session?.tenantId],
    queryFn: () => dal.donors.listAll(session!),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/finance</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Funding & Disclosure</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const config = configQuery.data;
  const donors = donorsQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/finance</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Funding & Disclosure</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowDonorForm(true)}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap"
        >
          + New donor
        </button>
      </div>

      {!configQuery.isLoading && !config && (
        <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">
          No PPFA configuration exists for this tenant yet. Donations and thresholds can't be evaluated without one —
          an admin with the Manage Thresholds capability must create one at{' '}
          <Link to="/settings/ppfa-thresholds" className="underline">
            Settings → PPFA Thresholds
          </Link>
          .
        </p>
      )}

      {config && (
        <p className="text-body-md font-body text-slate">
          Governing figures: disclosure {(config.disclosureThresholdZAR / 100).toLocaleString('en-ZA')} ZAR · annual
          cap {(config.annualDonorCapZAR / 100).toLocaleString('en-ZA')} ZAR · effective{' '}
          {new Date(config.effectiveDate).toLocaleDateString('en-ZA')} · {config.sourceCitation}
        </p>
      )}

      {showDonorForm && (
        <DonorForm
          ctx={session}
          onDone={(donor) => {
            setShowDonorForm(false);
            setSelectedDonor(donor);
          }}
          onCancel={() => setShowDonorForm(false)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          {donorsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading donors…</p>}
          {donors.length === 0 && !donorsQuery.isLoading && (
            <p className="text-body-md font-body text-slate">No donors captured yet.</p>
          )}
          {donors.map((donor) => (
            <button
              key={donor.id}
              type="button"
              onClick={() => setSelectedDonor(donor)}
              className={`w-full text-left px-3 py-2 rounded border ${
                selectedDonor?.id === donor.id ? 'bg-ink text-paper border-ink' : 'bg-white text-ink border-ink/10'
              }`}
            >
              {donor.displayName}
            </button>
          ))}
        </div>

        <div>
          {!selectedDonor && <p className="text-body-md font-body text-slate">Select a donor to view details.</p>}
          {selectedDonor && config && <DonorDetail ctx={session} donor={selectedDonor} config={config} />}
          {selectedDonor && !config && (
            <p className="text-body-md font-body text-maroon">
              Create a PPFA configuration before recording donations — see the notice above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
