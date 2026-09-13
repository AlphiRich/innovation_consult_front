/**
 * Election Campaign OS — running a round, and reading its coverage
 * IC-ECOS-BUILD-2026-V2 §6.2, §7. Capabilities: `voters.view` to read,
 * `voters.edit` to close a door out.
 *
 * The screen for `canvassQueue.ts`, which had none. Every rule about what
 * a door state means, when a door may be offered again, and which
 * transitions are legal lives in that module and is tested there. This
 * shows the queue, shows the coverage, and records outcomes.
 *
 * WHAT THIS FIXES BEYOND HAVING A SCREEN
 *
 * `Household.contactStatus` was written by nothing. Every household in
 * the product read as NOT_CONTACTED for ever, which meant the queue
 * offered every door on every round, coverage was permanently zero, and
 * the refusal that `canvassQueue.ts` goes to some length to make terminal
 * could not be recorded in the first place. SOP-01 has told canvassers
 * since it was written that a door ends in one of six states; until now
 * it ended in one.
 *
 * SCOPE COMES FROM THE TOKEN, NOT FROM THIS PAGE
 *
 * A ward lead opens their ward and sees it; a VD captain opening the same
 * ward sees their own district, because the data layer narrows the query
 * and the rules refuse anything wider. Nothing here filters for them, and
 * nothing here should — a client-side filter is a display convenience
 * that a determined user can remove.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { ContactStatus, Household } from '@/dal/ports/households';
import { HouseholdAccessNoteCard } from './HouseholdAccessNoteCard';
import {
  CONTACT_STATUS_LABEL,
  INACCESSIBLE_COOLOFF_HOURS,
  NO_ANSWER_COOLOFF_HOURS,
  canTransition,
  nextDoors,
  statusOf,
  summariseQueue,
  transitionRefusalReason,
} from './canvassQueue';

/** Outcomes a canvasser records at a door, in the order they occur. */
const OUTCOMES: ContactStatus[] = ['CONTACTED', 'NO_ANSWER', 'INACCESSIBLE', 'REFUSED_RECONTACT'];

const DOORS_SHOWN = 25;

export function RoundPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [wardCode, setWardCode] = useState('');
  const [refusalWarning, setRefusalWarning] = useState<string | null>(null);

  const householdsQuery = useQuery({
    queryKey: ['households-by-ward', session?.tenantId, wardCode],
    queryFn: () => dal.households.listByWard(session!, wardCode, { pageSize: 500 }),
    enabled: Boolean(session && wardCode),
  });

  const closeDoor = useMutation({
    mutationFn: async ({ household, status }: { household: Household; status: ContactStatus }) => {
      await dal.households.upsert(session!, {
        ...household,
        contactStatus: status,
        lastContactedAt: new Date().toISOString(),
        lastContactedBy: session!.uid,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['households-by-ward'] }),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/round</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Round</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const households = householdsQuery.data?.items ?? [];
  const summary = summariseQueue(households);
  const doors = nextDoors(households, DOORS_SHOWN);
  const canClose = session.caps.includes('voters.edit');

  function recordOutcome(household: Household, status: ContactStatus) {
    const from = statusOf(household);
    if (!canTransition(from, status)) {
      setRefusalWarning(transitionRefusalReason(from, status));
      return;
    }
    setRefusalWarning(null);
    closeDoor.mutate({ household, status });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/round</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Round</h1>
      </div>

      <label className="block space-y-1 max-w-xs">
        <span className="text-label-caps font-display uppercase text-slate">Ward code</span>
        <input
          className="w-full border border-ink/20 rounded px-2 py-1.5 text-data-mono font-mono"
          placeholder="NW405-W12"
          value={wardCode}
          onChange={(e) => setWardCode(e.target.value.trim())}
        />
      </label>

      {householdsQuery.isError && (
        <p className="text-body-md font-body text-maroon">
          Could not load that ward. If it is not the ward you are assigned to, that refusal is the permission
          model working.
        </p>
      )}

      {wardCode && !householdsQuery.isLoading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Doors" value={summary.total} />
            <Stat label="Left to work" value={summary.queueable} />
            <Stat label="Waiting out a cool-off" value={summary.waiting} />
            <Stat label="Asked not to be contacted" value={summary.refused} />
          </div>

          <div className="bg-ink text-paper rounded p-4">
            <p className="text-label-caps font-display uppercase text-gold">Coverage</p>
            <p className="text-display-lg-mobile font-display">{summary.coveragePct}%</p>
            <p className="text-body-md font-body mt-1">
              Doors worked at least once, out of the doors that can be worked.{' '}
              {summary.refused > 0
                ? `The ${summary.refused} household(s) who asked not to be contacted are excluded from that, not counted as outstanding.`
                : 'Households who ask not to be contacted are excluded from it, not counted as outstanding.'}
            </p>
          </div>

          <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-1">
            <p className="text-label-caps font-display uppercase text-slate">Every door, by state</p>
            {(Object.keys(CONTACT_STATUS_LABEL) as ContactStatus[]).map((status) => (
              <p key={status} className="text-body-md font-body text-ink">
                {CONTACT_STATUS_LABEL[status]}
                <span className="text-data-mono font-mono text-slate"> · {summary.byStatus[status]}</span>
              </p>
            ))}
          </div>

          {refusalWarning && <p className="text-body-md font-body text-maroon">{refusalWarning}</p>}

          <div className="space-y-3">
            <h2 className="text-label-caps font-display uppercase text-slate">
              Next {Math.min(DOORS_SHOWN, doors.length)} door{doors.length === 1 ? '' : 's'}
            </h2>

            {doors.length === 0 && summary.total > 0 && (
              <p className="text-body-md font-body text-slate">
                Nothing is due right now. A door that did not answer comes back after about{' '}
                {NO_ANSWER_COOLOFF_HOURS} hours, and one that could not be reached after about{' '}
                {INACCESSIBLE_COOLOFF_HOURS}.
              </p>
            )}

            {doors.map((household) => (
              <div key={household.id} className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
                <div>
                  <p className="text-body-md font-body text-ink font-semibold">{household.addressLine}</p>
                  <p className="text-data-mono font-mono text-slate">
                    VD {household.vdCode} · {CONTACT_STATUS_LABEL[statusOf(household)]}
                  </p>
                </div>

                <HouseholdAccessNoteCard household={household} showAccessCode={canClose} />

                {canClose && (
                  <div className="flex flex-wrap gap-2">
                    {OUTCOMES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={closeDoor.isPending}
                        onClick={() => recordOutcome(household, status)}
                        className={`px-3 py-1.5 border rounded text-label-caps font-display uppercase disabled:opacity-40 ${
                          status === 'REFUSED_RECONTACT' ? 'border-maroon/40 text-maroon' : 'border-ink/20 text-ink'
                        }`}
                      >
                        {CONTACT_STATUS_LABEL[status]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-ink/10 rounded p-4">
      <p className="text-label-caps font-display uppercase text-slate">{label}</p>
      <p className="text-headline-md font-display text-ink">{value}</p>
    </div>
  );
}
