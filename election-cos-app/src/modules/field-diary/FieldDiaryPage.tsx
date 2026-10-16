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
import { Button, Card, Field, PageHeader } from '@/components/ui';

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
      <Card className="max-w-lg">
        <PageHeader slug="/diary" title="Field Diary" />
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </Card>
    );
  }

  const entries = [...(entriesQuery.data?.items ?? [])].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        slug="/diary"
        title="Field Diary"
        action={
          <Button onClick={() => setShowForm(true)} disabled={!session.vdScope} className="whitespace-nowrap">
            + New entry
          </Button>
        }
      />

      {/* Was a bare <label> wrapping the input, which associates nothing —
          a screen reader announced an unlabelled text field. `Field`
          generates the id and ties the two together. */}
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
