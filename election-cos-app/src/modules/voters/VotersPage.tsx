/**
 * Election Campaign OS — Voters module
 * IC-ECOS-BUILD-2026-V2 §6.2. List + capture/edit, wired to the real DAL.
 * Layout informed by the Stitch suite's "ELECTION CAMPAIGN OS" shell
 * screens (our actual target shell, not the retired Civic Architect/
 * Authority ones) — reskinned to our tokens throughout.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { Voter } from '@/dal/ports/voters';
import { VoterCard } from './VoterCard';
import { VoterForm } from './VoterForm';
import { VoterHouseholdMap } from './VoterHouseholdMap';
import { Button, Card, Field, PageHeader } from '@/components/ui';

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; voter: Voter };
type ViewMode = 'list' | 'map';

export function VotersPage() {
  const session = useSession();
  const [vdCode, setVdCode] = useState(session?.vdScope ?? '');
  const [form, setForm] = useState<FormState>({ mode: 'closed' });
  const [view, setView] = useState<ViewMode>('list');

  const votersQuery = useQuery({
    queryKey: ['voters', session?.tenantId, vdCode],
    queryFn: () => dal.voters.listByVD(session!, vdCode, { pageSize: 25 }),
    enabled: Boolean(session && vdCode),
  });

  if (!session) {
    return (
      <Card className="max-w-lg">
        <PageHeader slug="/voters" title="Voters" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session. This module needs a signed-in session with a resolved tenant/capability claim to load
          data — see BUILD-STATUS.md (no live Firebase project provisioned yet in this environment).
        </p>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${view === 'map' ? 'max-w-4xl' : 'max-w-2xl'}`}>
      <PageHeader
        slug="/voters"
        title="Voters"
        action={
          <div className="flex flex-wrap gap-2">
            {/*
             * Reached from here rather than from the primary nav: §3.2
             * specifies nine nav items and `nav.test.ts` holds the build to
             * them. A round is work done on the voter roll, so this is where
             * it belongs anyway.
             *
             * Links, not <Button>s — the primitive renders a real <button>,
             * which would break cmd-click and "copy link address" on what
             * are plainly navigations. Same treatment as Button's `ghost`
             * variant, with its 44px target matched by hand.
             */}
            <Link
              to="/round"
              className="inline-flex min-h-11 items-center rounded border border-ink/20 px-4 py-2 text-label-caps font-display uppercase text-ink"
            >
              Work a round
            </Link>
            <Link
              to="/voters/import"
              className="inline-flex min-h-11 items-center rounded border border-ink/20 px-4 py-2 text-label-caps font-display uppercase text-ink"
            >
              Import a register
            </Link>
            <Button onClick={() => setForm({ mode: 'create' })} disabled={!vdCode}>
              + New voter
            </Button>
          </div>
        }
      />

      {/* Was a bare <label> wrapping the input — no association, so a
          screen reader announced an unlabelled text field. */}
      <div className="max-w-xs">
        <Field
          label="Voting district"
          hint={
            session.vdScope
              ? undefined
              : "No VD in your session scope — enter one manually. A ward/VD picker (§6.1) isn't built yet."
          }
        >
          {(props) => (
            <input
              {...props}
              value={vdCode}
              onChange={(e) => setVdCode(e.target.value)}
              placeholder="e.g. 86910138"
            />
          )}
        </Field>
      </div>

      {/*
       * A view switch, so it carries the state in the markup rather than
       * only in colour: `aria-pressed` is what tells a screen-reader user
       * which of the two is showing. Hand-rolled rather than `Button`,
       * because the primitive has no selected state and inventing one for
       * two toggles here would be the wrong place to decide it.
       */}
      <div className="flex gap-2">
        {(['list', 'map'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`inline-flex min-h-11 items-center rounded px-4 py-2 text-label-caps font-display uppercase ${
              view === v ? 'bg-ink text-paper' : 'border border-ink/20 text-ink'
            }`}
          >
            {v === 'list' ? 'Voter list' : 'Household map'}
          </button>
        ))}
      </div>

      {view === 'map' && vdCode && <VoterHouseholdMap ctx={session} vdCode={vdCode} />}
      {view === 'map' && !vdCode && (
        <p className="text-body-md font-body text-slate">Enter a voting district above to see its household map.</p>
      )}

      {view === 'list' && votersQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {view === 'list' && votersQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          {votersQuery.error instanceof Error ? votersQuery.error.message : 'Failed to load voters.'}
        </p>
      )}
      {view === 'list' && votersQuery.data && votersQuery.data.items.length === 0 && (
        <p className="text-body-md font-body text-slate">No voters captured for this VD yet.</p>
      )}

      {view === 'list' && (
        <div className="space-y-3">
          {votersQuery.data?.items.map((voter) => (
            <VoterCard key={voter.id} voter={voter} onLogResponse={(v) => setForm({ mode: 'edit', voter: v })} />
          ))}
        </div>
      )}

      {view === 'list' && votersQuery.data?.nextCursor && (
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
