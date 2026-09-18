/**
 * Election Campaign OS — Municipality Config
 * IC-ECOS-BUILD-2026-V2 §3.2: "Carries seat totals and election
 * parameters the seat calculator depends on. Retained deliberately."
 *
 * Backed by `src/dal/ports/municipalityProfile.ts` — a single doc,
 * `tenants/{tid}/profile/municipality`, which had a firestore.rules entry
 * since Phase 1 with no DAL port at all (same class of gap as
 * `counters/warRoom` and `logisticsApprovals`, found and wired up
 * earlier this session). Capability: `settings.tenant`.
 *
 * SEAT TOTALS ARE NOT TYPED IN
 *
 * They used to be: three free number fields for council seats, ward seats
 * and PR seats, which is three chances to disagree with the delimitation
 * and with each other. The proclaimed delimitation for 4 November 2026
 * fixes all three — the MEC determined the council size, the Demarcation
 * Board delimited the wards, and PR seats are the difference. So entering
 * a municipality code fills them from the baseline and they are shown
 * rather than edited.
 *
 * PR seats in particular are never stored as an independent figure. A PR
 * list drawn to the wrong length is rejected at nomination, and the way
 * that happens is two modules each keeping their own copy of the number.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { MunicipalityProfileDraft } from '@/dal/ports/municipalityProfile';
import {
  BASELINE_AUTHORITY,
  DELIMITATION_VERSION,
  SCHEDULE_2_BASIS,
  delimitationFor,
} from '@/modules/reference/municipalRegister';

export function MunicipalityConfigPage() {
  const session = useSession();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['municipalityProfile', session?.tenantId],
    queryFn: () => dal.municipalityProfile.get(session!),
    enabled: Boolean(session),
  });

  const [editing, setEditing] = useState(false);
  const [municipalityCode, setMunicipalityCode] = useState('');
  const [municipalityName, setMunicipalityName] = useState('');
  const [province, setProvince] = useState('');
  // 4 November 2026 — corroborated by two independent sources (session 8's
  // digest, session 9's IEC timetable article); see
  // docs/iec-election-timetable-2026.md. Offered as a sensible default,
  // not asserted as certain — fully editable.
  const [electionDate, setElectionDate] = useState('2026-11-04');

  const mutation = useMutation({
    mutationFn: (draft: MunicipalityProfileDraft) => dal.municipalityProfile.upsert(session!, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipalityProfile', session?.tenantId] });
      setEditing(false);
    },
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/settings/municipality</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Municipality Config</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const profile = profileQuery.data;

  // The proclaimed baseline for whatever code is currently typed. Every
  // municipality contesting on 4 November is in it, so a miss is a
  // mistyped code rather than an unusual municipality.
  const baseline = delimitationFor(municipalityCode);

  function openForm() {
    setMunicipalityCode(profile?.municipalityCode ?? '');
    setMunicipalityName(profile?.municipalityName ?? '');
    setProvince(profile?.province ?? '');
    setElectionDate(profile?.electionDate?.slice(0, 10) ?? DELIMITATION_VERSION.electionDate);
    setEditing(true);
  }

  /**
   * Adopt the delimitation the moment a recognised code is entered.
   * Name and province are overwritten too: the Commission's spelling of
   * a municipality's name is the one that appears on a nomination form.
   */
  function onCodeChange(value: string) {
    setMunicipalityCode(value);
    const found = delimitationFor(value);
    if (found) {
      setMunicipalityName(found.name);
      setProvince(found.province);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!municipalityCode.trim() || !municipalityName.trim()) return;
    // Seat figures come from the baseline, never from the form. A code
    // the baseline does not carry cannot be saved with invented seat
    // totals — it is saved with none, and the Wards page says so.
    mutation.mutate({
      id: 'municipality',
      tenantId: session!.tenantId,
      municipalityCode: baseline?.code ?? municipalityCode.trim().toUpperCase(),
      municipalityName: municipalityName.trim(),
      province: province.trim(),
      totalCouncilSeats: baseline?.councillors ?? 0,
      wardSeats: baseline?.wardSeats ?? 0,
      prSeats: baseline?.prSeats ?? 0,
      electionDate: electionDate ? new Date(electionDate).toISOString() : undefined,
    });
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/settings/municipality</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Municipality Config</h1>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={openForm}
            className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap"
          >
            {profile ? 'Edit' : '+ Set up'}
          </button>
        )}
      </div>

      {!editing && profile && (
        <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-1">
          <p className="text-headline-md font-display text-ink">{profile.municipalityName}</p>
          <p className="text-data-mono font-mono text-slate">
            {profile.municipalityCode} · {profile.province}
          </p>
          <p className="text-body-md font-body text-ink">
            {profile.totalCouncilSeats} council seats ({profile.wardSeats} ward, {profile.prSeats} PR)
          </p>
          {/*
            * A profile saved before the delimitation was wired in can
            * still carry hand-entered seat totals. Say so rather than
            * silently showing them beside the code they contradict.
            */}
          {(() => {
            const stored = delimitationFor(profile.municipalityCode);
            if (!stored) return null;
            const agrees =
              stored.councillors === profile.totalCouncilSeats &&
              (stored.wardSeats ?? 0) === profile.wardSeats &&
              (stored.prSeats ?? 0) === profile.prSeats;
            return agrees ? (
              <p className="text-body-md font-body text-green">
                Matches the proclaimed delimitation for {stored.code} · category {stored.category}.
              </p>
            ) : (
              <p className="text-body-md font-body text-maroon">
                These do not match the proclaimed delimitation for {stored.code}, which is{' '}
                {stored.councillors} council seats ({stored.wardSeats ?? '—'} ward, {stored.prSeats ?? '—'} PR).
                Re-save this profile to adopt it.
              </p>
            );
          })()}
          {profile.electionDate && (
            <p className="text-body-md font-body text-slate">
              Election day: {new Date(profile.electionDate).toLocaleDateString('en-ZA', { dateStyle: 'long' })}
            </p>
          )}
        </div>
      )}

      {!editing && !profile && !profileQuery.isLoading && (
        <p className="text-body-md font-body text-slate">Not set up yet for this tenant.</p>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="space-y-4 border border-gold/40 bg-white p-4 rounded">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-label-caps font-display uppercase text-slate">Municipality code</span>
              <input
                className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
                value={municipalityCode}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="NW405"
                required
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-label-caps font-display uppercase text-slate">Province</span>
              <input
                className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="North West"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Municipality name</span>
            <input
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={municipalityName}
              onChange={(e) => setMunicipalityName(e.target.value)}
              placeholder="JB Marks Local Municipality"
              required
            />
          </label>

          {/*
            * Read, not entered. See the file header: three free number
            * fields were three chances to disagree with the delimitation.
            */}
          <div className="border border-ink/10 rounded p-3 space-y-2">
            <p className="text-label-caps font-display uppercase text-slate">
              Seats · from the proclaimed delimitation
            </p>
            {baseline ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-label-caps font-display uppercase text-slate">Council</p>
                    <p className="text-headline-md font-display text-ink">{baseline.councillors}</p>
                  </div>
                  <div>
                    <p className="text-label-caps font-display uppercase text-slate">Ward</p>
                    <p className="text-headline-md font-display text-ink">{baseline.wardSeats ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-label-caps font-display uppercase text-slate">PR</p>
                    <p className="text-headline-md font-display text-ink">{baseline.prSeats ?? '—'}</p>
                  </div>
                </div>
                <p className="text-data-mono font-mono text-slate">
                  Category {baseline.category} · {baseline.quotaSchedule === 'SCHEDULE_1' ? 'Schedule 1' : 'Schedule 2'}{' '}
                  · {DELIMITATION_VERSION.id}
                </p>
                {baseline.quotaSchedule === 'SCHEDULE_2' && (
                  <p className="text-body-md font-body text-maroon">{SCHEDULE_2_BASIS}</p>
                )}
              </>
            ) : (
              <p className="text-body-md font-body text-maroon">
                {municipalityCode.trim() === ''
                  ? 'Enter a municipality code to load its seat totals.'
                  : `${municipalityCode.trim().toUpperCase()} is not one of the 258 municipality codes in the proclaimed delimitation. Every municipality contesting on 4 November is in that list — check the code. Saving now records no seat totals, and the seat calculator will have nothing to work from.`}
              </p>
            )}
          </div>

          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Election day</span>
            <input
              type="date"
              className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
              value={electionDate}
              onChange={(e) => setElectionDate(e.target.value)}
            />
          </label>

          <p className="text-body-md font-body text-slate">{BASELINE_AUTHORITY}</p>

          {mutation.isError && (
            <p className="text-body-md text-maroon">
              {mutation.error instanceof Error ? mutation.error.message : 'Save failed.'}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-ink text-paper rounded py-2.5 text-label-caps font-display uppercase disabled:opacity-40"
            >
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 border border-ink/20 rounded text-label-caps font-display uppercase text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
