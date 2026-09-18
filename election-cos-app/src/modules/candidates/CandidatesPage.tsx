/**
 * Election Campaign OS — Candidates and the PR party list
 * IC-ECOS-BUILD-2026-V2 §6.6. Capability: `team.manage`, which is what
 * `firestore.rules` gates the candidates collection on.
 *
 * WHY THIS EXISTS
 *
 * `prList.ts` carried the entire compliance check — list length,
 * positions, duplicates, verification, the Schedule 1 gender position —
 * and nothing could reach it. There was no route, no page and no form, so
 * a party could not add a candidate, could not run the check, and could
 * not produce anything to submit. Writing SOP-11 is what made that
 * impossible to leave alone: a procedure whose every step names a screen
 * that does not exist is not a procedure.
 *
 * It lives under Settings rather than in the primary nav because §3.2
 * fixes that nav at nine items and `nav.test.ts` holds it there. Preparing
 * a list is an administrative act performed a handful of times in a cycle,
 * which is what the Settings section is for.
 *
 * NOTHING HERE FILES ANYTHING
 *
 * The Commission does not accept party lists through this platform. The
 * export is a document for a person to check and submit by hand, and
 * `PR_LIST_EXPORT_BASIS` is printed on the button and on the paper.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { Candidate } from '@/dal/ports/candidates';
import { documentFileStem } from '@/lib/document/model';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import { checkPrList, PR_LIST_EXPORT_BASIS, type PrListIssue } from './prList';
import { buildWardRoll, COVERAGE_BASIS, DOUBLE_NOMINATION_BASIS } from './wardRoll';
import { prListDocument } from './prListDocument';
import { CandidateForm } from './CandidateForm';

function downloadPdf(bytes: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function IssueList({ issues, tone }: { issues: PrListIssue[]; tone: 'BLOCKING' | 'WARNING' }) {
  if (issues.length === 0) return null;
  const border = tone === 'BLOCKING' ? 'border-maroon' : 'border-gold';
  return (
    <div className={`border-l-4 ${border} bg-white p-3 space-y-2`}>
      <p className="text-label-caps font-display uppercase text-maroon">
        {tone === 'BLOCKING' ? 'Stops the export' : 'Worth knowing before you submit'}
      </p>
      <ul className="space-y-1">
        {issues.map((issue) => (
          <li key={`${issue.code}-${issue.candidateIds.join(',')}`} className="text-body-md font-body text-ink">
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CandidatesPage() {
  const session = useSession();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [partyName, setPartyName] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const candidatesQuery = useQuery({
    queryKey: ['candidates', session?.tenantId],
    queryFn: () => dal.candidates.listAll(session!),
    enabled: Boolean(session),
  });
  const profileQuery = useQuery({
    queryKey: ['municipalityProfile', session?.tenantId],
    queryFn: () => dal.municipalityProfile.get(session!),
    enabled: Boolean(session),
  });
  const staffQuery = useQuery({
    queryKey: ['staff', session?.tenantId, session?.uid],
    queryFn: () => dal.staff.getByUid(session!, session!.uid),
    enabled: Boolean(session),
  });
  const wardsQuery = useQuery({
    queryKey: ['wards', session?.tenantId],
    queryFn: () => dal.wards.listAll(session!),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/settings/candidates</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Candidates</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const candidates = candidatesQuery.data ?? [];
  const profile = profileQuery.data ?? null;
  const staff = staffQuery.data ?? null;
  const canManage = session.caps.includes('team.manage');

  const result = checkPrList({ candidates, prSeats: profile?.prSeats ?? 0 });
  const wardRoll = buildWardRoll(
    candidates,
    (wardsQuery.data ?? []).filter((w) => w.deletedAt === null).map((w) => w.wardCode),
  );

  function handleExport() {
    setExportError(null);
    if (!profile) {
      setExportError('No municipality profile — the PR seat count the cap depends on comes from it.');
      return;
    }
    if (!partyName.trim()) {
      setExportError('Type the party name. It goes on the document and this platform does not know it.');
      return;
    }
    const doc = prListDocument(result, {
      organisation: profile.municipalityName,
      partyName: partyName.trim(),
      municipalityName: `${profile.municipalityName} (${profile.municipalityCode})`,
      version: '1.0',
      preparedByName: staff ? `${staff.firstName} ${staff.lastName}`.trim() : session!.uid,
      preparedAt: new Date().toISOString(),
    });
    downloadPdf(renderDocumentPdf(doc), `${documentFileStem(doc)}.pdf`);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/settings/candidates</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Candidates & party list</h1>
          <p className="text-body-md font-body text-slate mt-1">{PR_LIST_EXPORT_BASIS}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap"
          >
            + Add candidate
          </button>
        )}
      </div>

      {!profileQuery.isLoading && !profile && (
        <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">
          No municipality profile exists for this tenant, so the PR seat count the list-length cap depends on is
          unknown. Set it in Settings → Municipality Config before relying on the cap.
        </p>
      )}

      {showForm && (
        <CandidateForm
          ctx={session}
          candidate={editing ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <IssueList issues={result.blocking} tone="BLOCKING" />
      <IssueList issues={result.warnings} tone="WARNING" />

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-headline-md font-display text-ink">The list, in order of preference</h2>
          <p className="text-data-mono font-mono text-slate">
            {result.ordered.length} of a cap of {result.maxListLength} · {result.womenCount} of{' '}
            {result.declaredCount} declared are women
          </p>
        </div>

        {result.ordered.length === 0 && (
          <p className="text-body-md font-body text-slate">No PR candidates captured yet.</p>
        )}

        {result.ordered.map((candidate) => (
          <div
            key={candidate.id}
            className="bg-white border border-ink/10 rounded p-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-body-md font-body text-ink">
                <span className="font-mono text-slate">{candidate.listRank ?? '—'}</span> {candidate.fullName}
              </p>
              <p className="text-data-mono font-mono text-slate">
                {candidate.idNumberMasked} · {candidate.gender ?? 'UNDISCLOSED'} · {candidate.verificationStatus}
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setEditing(candidate);
                  setShowForm(true);
                }}
                className="px-3 py-1.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
              >
                Edit
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-headline-md font-display text-ink">Ward candidates</h2>
          <p className="text-data-mono font-mono text-slate">
            {wardRoll.covered.length} of {wardRoll.wardCount} wards have exactly one candidate
          </p>
        </div>
        <p className="text-body-md font-body text-slate">
          Nominated under section 17 of the Municipal Electoral Act, which is a different process from the
          party list above. None of the list checks apply to them and they are not on the exported list.
        </p>
        <p className="text-body-md font-body text-slate">{COVERAGE_BASIS}</p>

        {wardRoll.wardCount === 0 && (
          <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">
            No wards are loaded for this campaign, so there is nothing to count coverage against. Seed the
            wards first — SOP-03 covers it.
          </p>
        )}

        {wardRoll.missing.length > 0 && (
          <div className="border-l-4 border-maroon bg-white p-3 space-y-1">
            <p className="text-label-caps font-display uppercase text-maroon">
              {wardRoll.missing.length} ward(s) with no candidate
            </p>
            <p className="text-data-mono font-mono text-slate">{wardRoll.missing.join(', ')}</p>
          </div>
        )}

        {wardRoll.doubled.length > 0 && (
          <div className="border-l-4 border-maroon bg-white p-3 space-y-1">
            <p className="text-label-caps font-display uppercase text-maroon">
              {wardRoll.doubled.length} ward(s) with more than one candidate
            </p>
            <p className="text-data-mono font-mono text-slate">{wardRoll.doubled.join(', ')}</p>
            <p className="text-body-md font-body text-slate">{DOUBLE_NOMINATION_BASIS}</p>
          </div>
        )}

        {wardRoll.unplaceable.length > 0 && (
          <div className="border-l-4 border-maroon bg-white p-3 space-y-1">
            <p className="text-label-caps font-display uppercase text-maroon">
              {wardRoll.unplaceable.length} candidate(s) in a ward this campaign has not loaded
            </p>
            {wardRoll.unplaceable.map((candidate) => (
              <p key={candidate.id} className="text-body-md font-body text-ink">
                {candidate.fullName} —{' '}
                <span className="text-data-mono font-mono text-slate">{candidate.wardCode || 'no ward code'}</span>
              </p>
            ))}
          </div>
        )}

        {wardRoll.entries
          .filter((entry) => entry.candidates.length > 0)
          .map((entry) => (
            <div key={entry.wardCode} className="bg-white border border-ink/10 rounded p-3">
              <p className="text-data-mono font-mono text-slate">{entry.wardCode}</p>
              {entry.candidates.map((candidate) => (
                <p key={candidate.id} className="text-body-md font-body text-ink">
                  {candidate.fullName}{' '}
                  <span className="text-data-mono font-mono text-slate">
                    {candidate.idNumberMasked} · {candidate.verificationStatus}
                  </span>
                </p>
              ))}
            </div>
          ))}
      </section>

      <section className="space-y-3 border-t border-ink/10 pt-4">
        <label className="space-y-1 block max-w-sm">
          <span className="text-label-caps font-display uppercase text-slate">Party name, for the document</span>
          <input
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="As it must appear on the list"
          />
        </label>
        <button
          type="button"
          disabled={!result.canExport}
          onClick={handleExport}
          className="bg-ink text-paper rounded px-4 py-2.5 text-label-caps font-display uppercase disabled:opacity-40"
        >
          Download the checked list
        </button>
        {!result.canExport && result.ordered.length > 0 && (
          <p className="text-body-md font-body text-maroon">
            Resolve what is stopping the export above. Nothing is truncated or filled in for you.
          </p>
        )}
        {exportError && <p className="text-body-md font-body text-maroon">{exportError}</p>}
      </section>
    </div>
  );
}
