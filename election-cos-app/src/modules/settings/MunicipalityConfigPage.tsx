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
 * NOT wired into `/analytics/seat-calculator` this session — that page
 * is a standalone what-if tool that already opens on a real worked
 * example; pulling its defaults from here instead is a reasonable
 * follow-up, not forced into this pass.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { MunicipalityProfileDraft } from '@/dal/ports/municipalityProfile';

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
  const [totalCouncilSeats, setTotalCouncilSeats] = useState('');
  const [wardSeats, setWardSeats] = useState('');
  const [prSeats, setPrSeats] = useState('');
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

  function openForm() {
    setMunicipalityCode(profile?.municipalityCode ?? '');
    setMunicipalityName(profile?.municipalityName ?? '');
    setProvince(profile?.province ?? '');
    setTotalCouncilSeats(String(profile?.totalCouncilSeats ?? ''));
    setWardSeats(String(profile?.wardSeats ?? ''));
    setPrSeats(String(profile?.prSeats ?? ''));
    setElectionDate(profile?.electionDate?.slice(0, 10) ?? '2026-11-04');
    setEditing(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!municipalityCode.trim() || !municipalityName.trim()) return;
    mutation.mutate({
      id: 'municipality',
      tenantId: session!.tenantId,
      municipalityCode: municipalityCode.trim(),
      municipalityName: municipalityName.trim(),
      province: province.trim(),
      totalCouncilSeats: Number(totalCouncilSeats) || 0,
      wardSeats: Number(wardSeats) || 0,
      prSeats: Number(prSeats) || 0,
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
                onChange={(e) => setMunicipalityCode(e.target.value)}
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

          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1 block">
              <span className="text-label-caps font-display uppercase text-slate">Total seats</span>
              <input
                type="number"
                min="0"
                className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
                value={totalCouncilSeats}
                onChange={(e) => setTotalCouncilSeats(e.target.value)}
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-label-caps font-display uppercase text-slate">Ward seats</span>
              <input
                type="number"
                min="0"
                className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
                value={wardSeats}
                onChange={(e) => setWardSeats(e.target.value)}
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-label-caps font-display uppercase text-slate">PR seats</span>
              <input
                type="number"
                min="0"
                className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body"
                value={prSeats}
                onChange={(e) => setPrSeats(e.target.value)}
              />
            </label>
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
