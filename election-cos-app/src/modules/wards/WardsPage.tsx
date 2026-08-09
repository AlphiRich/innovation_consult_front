/**
 * Election-COS1.0 — Wards module
 * IC-ECOS-BUILD-2026-V2 §6.1 — foundational; everything else scopes to it.
 * Layout informed by the Stitch suite's lge_war_room_local_head screen
 * (municipality-level summary + Ward/VD table), reskinned to our tokens
 * and trimmed to fields the governing data model actually has (no
 * volunteer/performance columns — that's a different module's data).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { Ward } from '@/dal/ports/wards';
import { WardForm } from './WardForm';
import { defaultMunicipalityCode, totalsFor } from './wardStats';

export function WardsPage() {
  const session = useSession();
  const [showForm, setShowForm] = useState<{ mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; ward: Ward }>({
    mode: 'closed',
  });

  const wardsQuery = useQuery({
    queryKey: ['wards', session?.tenantId],
    queryFn: () => dal.wards.listAll(session!),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/wards</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Wards</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const wards = wardsQuery.data ?? [];
  const totals = totalsFor(wards);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/wards</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Wards</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm({ mode: 'create' })}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase"
        >
          + New ward
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-label-caps font-display uppercase text-slate">Wards</p>
          <p className="text-display-lg-mobile font-display text-ink">{totals.wardCount}</p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-label-caps font-display uppercase text-slate">Voting districts</p>
          <p className="text-display-lg-mobile font-display text-ink">{totals.vdCount}</p>
        </div>
        <div className="bg-ink text-paper rounded p-4">
          <p className="text-label-caps font-display uppercase text-gold">Registered voters</p>
          <p className="text-display-lg-mobile font-display">{totals.registeredVoters.toLocaleString('en-ZA')}</p>
        </div>
      </div>

      {wardsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {wardsQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          {wardsQuery.error instanceof Error ? wardsQuery.error.message : 'Failed to load wards.'}
        </p>
      )}
      {wards.length === 0 && !wardsQuery.isLoading && (
        <p className="text-body-md font-body text-slate">
          No wards captured yet. No IEC demarcation seed data was available to this build (see
          docs/phase-1-ia-consolidation.md) — add wards manually, or run a seed ingest once the source PDFs exist.
        </p>
      )}

      <div className="space-y-2">
        {wards.map((ward) => (
          <div key={ward.id} className="bg-white border border-ink/10 rounded-lg p-4 flex items-center justify-between">
            <div>
              <Link to={`/wards/${ward.wardCode}`} className="text-headline-md font-display text-ink hover:text-teal">
                {ward.name}
              </Link>
              <p className="text-data-mono font-mono text-slate">
                {ward.wardCode} · {ward.municipalityCode} · {ward.vdCodes.length} VD
                {ward.vdCodes.length === 1 ? '' : 's'} · {ward.registeredVoters.toLocaleString('en-ZA')} registered
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm({ mode: 'edit', ward })}
                className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
              >
                Edit
              </button>
              <Link
                to={`/wards/${ward.wardCode}`}
                className="px-3 py-1.5 bg-ink text-paper rounded text-label-caps font-display uppercase"
              >
                View VDs
              </Link>
            </div>
          </div>
        ))}
      </div>

      {showForm.mode !== 'closed' && (
        <WardForm
          ctx={session}
          ward={showForm.mode === 'edit' ? showForm.ward : undefined}
          defaultMunicipalityCode={defaultMunicipalityCode(wards)}
          onDone={() => setShowForm({ mode: 'closed' })}
          onCancel={() => setShowForm({ mode: 'closed' })}
        />
      )}
    </div>
  );
}
