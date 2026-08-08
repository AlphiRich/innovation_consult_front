/**
 * Election-COS1.0 — Voters module
 * IC-ECOS-BUILD-2026-V2 §6.2. List + capture/edit, wired to the real DAL.
 * Layout informed by the Stitch suite's "ELECTION CAMPAIGN OS" shell
 * screens (our actual target shell, not the retired Civic Architect/
 * Authority ones) — reskinned to our tokens throughout.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { Voter } from '@/dal/ports/voters';
import { VoterCard } from './VoterCard';
import { VoterForm } from './VoterForm';

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; voter: Voter };

export function VotersPage() {
  const session = useSession();
  const [vdCode, setVdCode] = useState(session?.vdScope ?? '');
  const [form, setForm] = useState<FormState>({ mode: 'closed' });

  const votersQuery = useQuery({
    queryKey: ['voters', session?.tenantId, vdCode],
    queryFn: () => dal.voters.listByVD(session!, vdCode, { pageSize: 25 }),
    enabled: Boolean(session && vdCode),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/voters</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Voters</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session. This module needs a signed-in session with a resolved tenant/capability claim to load
          data — see BUILD-STATUS.md (no live Firebase project provisioned yet in this environment).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/voters</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Voters</h1>
        </div>
        <button
          type="button"
          onClick={() => setForm({ mode: 'create' })}
          disabled={!vdCode}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase disabled:opacity-40"
        >
          + New voter
        </button>
      </div>

      <label className="block space-y-1 max-w-xs">
        <span className="text-label-caps font-display uppercase text-slate">Voting district</span>
        <input
          className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
          value={vdCode}
          onChange={(e) => setVdCode(e.target.value)}
          placeholder="e.g. 86910138"
        />
        {!session.vdScope && (
          <p className="text-body-md font-body text-slate">
            No VD in your session scope — enter one manually. A ward/VD picker (§6.1) isn't built yet.
          </p>
        )}
      </label>

      {votersQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {votersQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          {votersQuery.error instanceof Error ? votersQuery.error.message : 'Failed to load voters.'}
        </p>
      )}
      {votersQuery.data && votersQuery.data.items.length === 0 && (
        <p className="text-body-md font-body text-slate">No voters captured for this VD yet.</p>
      )}

      <div className="space-y-3">
        {votersQuery.data?.items.map((voter) => (
          <VoterCard key={voter.id} voter={voter} onLogResponse={(v) => setForm({ mode: 'edit', voter: v })} />
        ))}
      </div>

      {votersQuery.data?.nextCursor && (
        <p className="text-body-md font-body text-slate">
          More records exist. Pagination cursor resolution is a known gap — see src/dal/adapters/firestore/base.ts.
        </p>
      )}

      {form.mode !== 'closed' && (
        <div className="fixed inset-0 bg-ink/60 flex items-start justify-center overflow-y-auto p-4 z-50">
          <div className="bg-paper rounded-lg p-6 max-w-lg w-full my-8">
            <h2 className="text-headline-md font-display text-ink mb-4">
              {form.mode === 'create' ? 'New voter' : 'Log response'}
            </h2>
            <VoterForm
              ctx={session}
              voter={form.mode === 'edit' ? form.voter : undefined}
              onDone={() => setForm({ mode: 'closed' })}
              onCancel={() => setForm({ mode: 'closed' })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
