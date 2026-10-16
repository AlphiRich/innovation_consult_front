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
import { BasisNote, Button, Card, DataLine, Field, PageHeader, SectionLabel } from '@/components/ui';

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
      <PageHeader
        slug="/settings/municipality"
        title="Municipality Config"
        action={
          !editing ? (
            <Button onClick={openForm} className="whitespace-nowrap">
              {profile ? 'Edit' : '+ Set up'}
            </Button>
          ) : undefined
        }
      />

      {!editing && profile && (
        <Card className="space-y-1">
          <p className="text-headline-md font-display text-ink">{profile.municipalityName}</p>
          <DataLine>
            {profile.municipalityCode} · {profile.province}
          </DataLine>
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
        </Card>
      )}

      {!editing && !profile && !profileQuery.isLoading && (
        <p className="text-body-md font-body text-slate">Not set up yet for this tenant.</p>
      )}

      {editing && (
        <form onSubmit={handleSubmit}>
         <Card tone="accent" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* The code field is monospaced because it is a code, and it
                is the field everything else on this form derives from. */}
            <Field label="Municipality code" required mono hint="For example NW405.">
              {(props) => (
                <input {...props} value={municipalityCode} onChange={(e) => onCodeChange(e.target.value)} required />
              )}
            </Field>
            <Field label="Province" hint="Filled in from the code where the baseline carries it.">
              {(props) => (
                <input {...props} value={province} onChange={(e) => setProvince(e.target.value)} />
              )}
            </Field>
          </div>

          <Field label="Municipality name" required hint="Filled in from the code where the baseline carries it.">
            {(props) => (
              <input
                {...props}
                value={municipalityName}
                onChange={(e) => setMunicipalityName(e.target.value)}
                required
              />
            )}
          </Field>

          {/*
            * Read, not entered. See the file header: three free number
            * fields were three chances to disagree with the delimitation.
            */}
          <div className="border border-ink/10 rounded p-3 space-y-2">
            <SectionLabel as="h2">Seats · from the proclaimed delimitation</SectionLabel>
            {baseline ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                <DataLine>
                  Category {baseline.category} · {baseline.quotaSchedule === 'SCHEDULE_1' ? 'Schedule 1' : 'Schedule 2'}{' '}
                  · {DELIMITATION_VERSION.id}
                </DataLine>
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

          <Field label="Election day">
            {(props) => (
              <input
                {...props}
                type="date"
                value={electionDate}
                onChange={(e) => setElectionDate(e.target.value)}
              />
            )}
          </Field>

          <BasisNote>{BASELINE_AUTHORITY}</BasisNote>

          {mutation.isError && (
            <p className="text-body-md font-body text-maroon">
              {mutation.error instanceof Error ? mutation.error.message : 'Save failed.'}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" variant="secondary" disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
         </Card>
        </form>
      )}
    </div>
  );
}
