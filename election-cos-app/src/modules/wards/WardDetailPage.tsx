/**
 * Election Campaign OS — Ward detail: its voting districts
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
import { Button, Card, DataLine, PageHeader } from '@/components/ui';

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
      <Card className="max-w-lg">
        <p className="text-body-md font-body text-slate">No active session.</p>
      </Card>
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

      <PageHeader
        slug={`/wards/${wardCode}`}
        title={wardQuery.data?.name ?? (wardQuery.isLoading ? 'Loading…' : wardCode)}
        action={
          <Button onClick={() => setShowForm({ mode: 'create' })} className="whitespace-nowrap">
            + New VD
          </Button>
        }
      />
      {wardQuery.data && (
        <DataLine>
          {wardQuery.data.municipalityCode} · {wardQuery.data.registeredVoters.toLocaleString('en-ZA')} registered
        </DataLine>
      )}

      <SchematicMap votingDistricts={vds} />

      {vdsQuery.isLoading && <p className="text-body-md font-body text-slate">Loading voting districts…</p>}

      <div className="space-y-2">
        {vds.map((vd) => (
          <Card key={vd.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-headline-md font-display text-ink">{vd.name}</p>
              <DataLine>
                VD {vd.vdCode} · {vd.registeredVoters.toLocaleString('en-ZA')} registered
              </DataLine>
            </div>
            {/* An accessible name per row: eighteen buttons all announced
                as "Edit" tell a screen-reader user nothing about which
                voting district they are about to edit. */}
            <Button
              variant="ghost"
              onClick={() => setShowForm({ mode: 'edit', vd })}
              aria-label={`Edit voting district ${vd.vdCode}`}
            >
              Edit
            </Button>
          </Card>
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
