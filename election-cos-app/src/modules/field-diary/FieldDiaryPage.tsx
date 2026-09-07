/**
 * Election Campaign OS — Field Diary module
 * IC-ECOS-BUILD-2026-V2 §6.3. Street-level completion % shown on the
 * Command Center is DERIVED from these entries (householdsVisited per
 * street vs. Household counts), never stored here — that derivation
 * belongs to War Room, which is still a placeholder itself (see
 * BUILD-STATUS.md). This page logs entries for the session's own VD and
 * lists any VD by code — `dal.diary.listByVD` only takes a single VD (no
 * listByWard exists), so a Ward/Municipal Lead without a vdScope needs
 * the code-entry fallback, same pattern as VotersPage.tsx. Firestore
 * security rules still bound what they can actually read.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import { DiaryEntryCard } from './DiaryEntryCard';
import { DiaryEntryForm } from './DiaryEntryForm';

export function FieldDiaryPage() {
  const session = useSession();
  const [showForm, setShowForm] = useState(false);
  const [vdCode, setVdCode] = useState(session?.vdScope ?? '');

  const entriesQuery = useQuery({
    queryKey: ['diaryEntries', session?.tenantId, vdCode],
    queryFn: () => dal.diary.listByVD(session!, vdCode, { pageSize: 25 }),
    enabled: Boolean(session) && vdCode.length > 0,
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/diary</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Field Diary</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const entries = [...(entriesQuery.data?.items ?? [])].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/diary</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Field Diary</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={!session.vdScope}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap disabled:opacity-40"
        >
          + New entry
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

      {entriesQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}
      {entriesQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          {entriesQuery.error instanceof Error ? entriesQuery.error.message : 'Failed to load diary entries.'}
        </p>
      )}
      {vdCode && entries.length === 0 && !entriesQuery.isLoading && (
        <p className="text-body-md font-body text-slate">No entries logged yet for this VD.</p>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <DiaryEntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {showForm && <DiaryEntryForm ctx={session} onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
