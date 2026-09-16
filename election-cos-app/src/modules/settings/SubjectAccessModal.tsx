/**
 * Election Campaign OS — preparing a response to an access request
 * POPIA §23, Condition 8. Capability: `dsr.manage` + `voters.view`.
 *
 * WHY THIS EXISTS
 *
 * The request log could record that an access request arrived and that
 * somebody marked it fulfilled. Between those two acts there was nothing:
 * no search, no assembly, no document. See `subjectAccess.ts`.
 *
 * WHAT THIS SCREEN IS CAREFUL ABOUT
 *
 * The search is an exact match on first and last name, because that is
 * what the underlying index can do. A screen that quietly returned
 * nothing for "Thandi" when the roll says "Thandiwe" would produce a
 * confident "we hold no record of you" that is false — so the search
 * terms are editable, the exactness is stated, and a nil result is
 * described as a nil result rather than as an answer.
 *
 * Nothing here marks the request fulfilled. A person reads the draft,
 * decides what may lawfully be disclosed, sends it, and then records the
 * outcome. That ordering is the whole point.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { DataSubjectRequest } from '@/dal/ports/dataSubjectRequests';
import type { Household } from '@/dal/ports/households';
import type { Voter } from '@/dal/ports/voters';
import { documentFileStem } from '@/lib/document/model';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import {
  ASSEMBLY_BASIS,
  splitRequesterName,
  subjectAccessDocument,
  UNSEARCHED_SOURCES,
} from './subjectAccess';

export interface SubjectAccessModalProps {
  ctx: SessionContext;
  request: DataSubjectRequest;
  onClose: () => void;
}

function downloadPdf(bytes: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SubjectAccessModal({ ctx, request, onClose }: SubjectAccessModalProps) {
  const split = useMemo(() => splitRequesterName(request.requesterName), [request.requesterName]);
  const [firstName, setFirstName] = useState(split.firstName);
  const [lastName, setLastName] = useState(split.lastName);
  const [searched, setSearched] = useState<{ voters: Voter[]; households: Household[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSearch = ctx.caps.includes('voters.view');

  const profileQuery = useQuery({
    queryKey: ['municipalityProfile', ctx.tenantId],
    queryFn: () => dal.municipalityProfile.get(ctx),
  });
  const staffQuery = useQuery({
    queryKey: ['staff', ctx.tenantId, ctx.uid],
    queryFn: () => dal.staff.getByUid(ctx, ctx.uid),
  });

  const staff = staffQuery.data ?? null;
  const organisation = profileQuery.data?.municipalityName ?? '';
  const assembledByName = staff ? `${staff.firstName} ${staff.lastName}`.trim() : ctx.uid;

  const search = useMutation({
    mutationFn: async () => {
      const voters = await dal.voters.findByName(ctx, firstName.trim(), lastName.trim());
      // Addresses come off the household record, which a voter points at
      // but does not carry. Read failures are survivable — a household
      // that cannot be read simply contributes no address, and the
      // response says what it found rather than what it hoped to.
      const households: Household[] = [];
      for (const id of new Set(voters.map((v) => v.householdId))) {
        const household = await dal.households.getById(ctx, id).catch(() => null);
        if (household) households.push(household);
      }
      return { voters, households };
    },
    onSuccess: (result) => {
      setError(null);
      setSearched(result);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'The search failed.'),
  });

  const download = useMutation({
    mutationFn: async () => {
      const doc = subjectAccessDocument(
        {
          request,
          voters: searched?.voters ?? [],
          households: searched?.households ?? [],
          assembledAt: new Date().toISOString(),
          assembledByName,
        },
        { organisation, version: '1.0' },
      );
      downloadPdf(renderDocumentPdf(doc), `${documentFileStem(doc)}.pdf`);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not build the document.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4">
      <div className="w-full max-w-2xl space-y-5 rounded-lg bg-white p-6 my-8">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">POPIA §23 — access</p>
          <h2 className="text-headline-md font-display text-ink mt-1">Prepare a response</h2>
          <p className="text-body-md font-body text-slate mt-2">{ASSEMBLY_BASIS}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Given names</span>
            <input
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Surname</span>
            <input
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>
        <p className="text-body-md font-body text-slate">
          The search is an exact match on both fields, as they were captured. If nothing comes back, try the
          spellings and shortenings a canvasser might have written down before you tell anybody their name is
          not on the roll.
        </p>

        {!canSearch && (
          <p className="text-body-md font-body text-maroon border-l-2 border-maroon/40 pl-3">
            Your role can manage requests but cannot read the voter roll, so the search is unavailable here.
            Ask someone holding voters.view to run it.
          </p>
        )}

        <button
          type="button"
          disabled={!canSearch || search.isPending || (!firstName.trim() && !lastName.trim())}
          onClick={() => search.mutate()}
          className="bg-ink text-paper rounded px-4 py-2 text-label-caps font-display uppercase disabled:opacity-40"
        >
          {search.isPending ? 'Searching…' : 'Search the voter roll'}
        </button>

        {searched && (
          <div className="space-y-2 border-t border-ink/10 pt-4">
            {searched.voters.length === 0 ? (
              <p className="text-body-md font-body text-ink">
                No record found under that name on the part of the roll you may read. That is a nil search
                result, not a finding that this campaign holds nothing — the sources below were not searched
                at all.
              </p>
            ) : (
              <>
                <p className="text-body-md font-body text-ink font-semibold">
                  {searched.voters.length} record(s) found.
                </p>
                <ul className="space-y-1">
                  {searched.voters.map((v) => (
                    <li key={v.id} className="text-data-mono font-mono text-slate">
                      {v.firstName} {v.lastName} · {v.wardCode} · VD {v.vdCode}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="pt-2">
              <p className="text-label-caps font-display uppercase text-slate">Not searched</p>
              <ul className="mt-1 space-y-1">
                {UNSEARCHED_SOURCES.map((s) => (
                  <li key={s.label} className="text-body-md font-body text-slate">
                    <span className="text-ink">{s.label}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {error && <p className="text-body-md font-body text-maroon">{error}</p>}

        <div className="flex gap-3 border-t border-ink/10 pt-4">
          <button
            type="button"
            disabled={!searched || download.isPending}
            onClick={() => download.mutate()}
            className="flex-1 bg-gold text-ink rounded py-2.5 text-label-caps font-display uppercase disabled:opacity-40"
          >
            {download.isPending ? 'Building…' : 'Download draft response'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
          >
            Close
          </button>
        </div>
        <p className="text-body-md font-body text-slate">
          The draft is not sent from here and does not mark the request fulfilled. Read it, decide what may
          lawfully be disclosed, send it yourself, and then record the outcome on the request.
        </p>
      </div>
    </div>
  );
}
