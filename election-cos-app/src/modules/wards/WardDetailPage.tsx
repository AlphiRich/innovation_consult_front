/**
 * Election-COS1.0 — Ward detail: its voting districts
 * IC-ECOS-BUILD-2026-V2 §6.1.
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { VotingDistrict } from '@/dal/ports/votingDistricts';
import { SchematicMap } from './SchematicMap';
import { VDForm } from './VDForm';

export function WardDetailPage() {
  const { wardCode } = useParams<{ wardCode: string }>();
  const session = useSession();

  const [showForm, setShowForm] = useState<
    { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; vd: VotingDistrict }
  >({ mode: 'closed' });

  const wardQuery = useQuery({
    queryKey: ['ward', session?.tenantId, wardCode],
    queryFn: () => dal.wards.getByCode(session!, wardCode!),
    enabled: Boolean(session && wardCode),
  });

  const vdsQuery = useQuery({
    queryKey: ['votingDistricts', session?.tenantId, wardCode],
    queryFn: () => dal.votingDistricts.listByWard(session!, wardCode!),
    enabled: Boolean(session && wardCode),
  });

  if (!session || !wardCode) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-body-md font-body text-slate">No active session.</p>
      </div>
    );
  }

  const vds = vdsQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link to="/wards" className="text-body-md font-body text-teal hover:underline">
          ← All wards
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/wards/{wardCode}</p>
          <h1 className="text-headline-md font-display text-ink mt-1">
            {wardQuery.data?.name ?? (wardQuery.isLoading ? 'Loading…' : wardCode)}
          </h1>
          {wardQuery.data && (
            <p className="text-data-mono font-mono text-slate mt-1">
              {wardQuery.data.municipalityCode} · {wardQuery.data.registeredVoters.toLocaleString('en-ZA')} registered
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm({ mode: 'create' })}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap"
        >
          + New VD
        </button>
      </div>

      <SchematicMap votingDistricts={vds} />

      {vdsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading voting districts…</p>}

      <div className="space-y-2">
        {vds.map((vd) => (
          <div key={vd.id} className="bg-white border border-ink/10 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-headline-md font-display text-ink">{vd.name}</p>
              <p className="text-data-mono font-mono text-slate">
                VD {vd.vdCode} · {vd.registeredVoters.toLocaleString('en-ZA')} registered
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm({ mode: 'edit', vd })}
              className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {showForm.mode !== 'closed' && (
        <VDForm
          ctx={session}
          wardCode={wardCode}
          vd={showForm.mode === 'edit' ? showForm.vd : undefined}
          onDone={() => setShowForm({ mode: 'closed' })}
          onCancel={() => setShowForm({ mode: 'closed' })}
        />
      )}
    </div>
  );
}
