/**
 * Election Campaign OS — War Room / Command Center
 * IC-ECOS-BUILD-2026-V2 §7.4, §8.1. Reads exactly two things: the single
 * pre-aggregated counters doc (dal.warRoomCounters, maintained by
 * functions/src/warRoomCounters.ts's Firestore triggers — never a live
 * listener on voters/incidents/diaryEntries) and the Wards collection
 * (small, bounded reference data — same call WardsPage.tsx already makes)
 * for a registered-voters denominator.
 *
 * Reference: the Stitch suite's `lge_war_room_local_head` screen — its
 * title literally is "War Room" / nav label "Command Center", matching
 * this route exactly. Its fuller dashboard (Active Volunteers, Campaign
 * Velocity/VPM, a High Activity Zone ranking, a live Field Diary feed,
 * an Official Directives repository) is NOT built here — none of that
 * has a real, traceable data source in this codebase yet (no volunteer
 * presence tracking, no per-VD velocity metric, no tenant-wide "recent
 * diary entries" query). Building placeholders for those would be the
 * same mistake already avoided elsewhere (fake phone encryption, a fake
 * referral-PDF button) — real stat tiles from real counters, honestly
 * short of the full mockup, beats a wider dashboard with invented numbers.
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import { SENTIMENT_META, SENTIMENT_ORDER } from '@/modules/voters/sentiment';
import { STATUS_LABEL, STATUS_ORDER } from '@/modules/incidents/incidentMeta';
import { isOpen } from '@/modules/incidents/incidentWorkflow';
import { CONTACT_STATUS_LABEL } from '@/modules/voters/canvassQueue';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { totalsFor } from '@/modules/wards/wardStats';
import { reconcileSeed } from '@/modules/wards/seedReconciliation';

const QUICK_LINKS = [
  { to: '/voters', label: 'Voter Roll' },
  { to: '/wards', label: 'Ward Mapping' },
  { to: '/diary', label: 'Field Diary' },
  { to: '/incidents', label: 'Incidents' },
] as const;

export function WarRoomPage() {
  const session = useSession();

  const countersQuery = useQuery({
    queryKey: ['warRoomCounters', session?.tenantId],
    queryFn: () => dal.warRoomCounters.get(session!),
    enabled: Boolean(session),
  });

  const wardsQuery = useQuery({
    queryKey: ['wards', session?.tenantId],
    queryFn: () => dal.wards.listAll(session!),
    enabled: Boolean(session),
  });

  // The expected ward count lives in Municipality Config. A dashboard
  // reporting "33 wards seeded" with no sign that 34 were expected is the
  // silent-short-seed defect SOP-03 exists to catch, repeated on the one
  // screen a campaign looks at every morning.
  const profileQuery = useQuery({
    queryKey: ['municipalityProfile', session?.tenantId],
    queryFn: () => dal.municipalityProfile.get(session!),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/war-room</p>
        <h1 className="text-headline-md font-display text-ink mt-1">War Room</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const counters = countersQuery.data;
  const registeredVoters = wardsQuery.data ? totalsFor(wardsQuery.data).registeredVoters : 0;
  // Share of the roll this campaign holds a record for. NOT canvassing
  // coverage — SOP-05's figure is doors worked over doors workable, and
  // two different numbers both called "coverage" is how a war room ends
  // up quoting the wrong one at a press conference.
  const rollSharePct =
    counters && registeredVoters > 0 ? Math.min(100, Math.round((counters.totalVoters / registeredVoters) * 100)) : null;
  const seed = wardsQuery.data ? reconcileSeed(wardsQuery.data, profileQuery.data ?? null) : null;
  const doorsWorked = counters
    ? counters.householdsByContactStatus.CONTACTED +
      counters.householdsByContactStatus.NO_ANSWER +
      counters.householdsByContactStatus.INACCESSIBLE
    : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/war-room</p>
        <h1 className="text-headline-md font-display text-ink mt-1">War Room</h1>
      </div>

      {(countersQuery.isLoading || wardsQuery.isLoading) && (
        <p className="text-body-md font-body text-slate">Loading…</p>
      )}

      {counters?.updatedAt === null && !countersQuery.isLoading && (
        <p className="text-body-md font-body text-slate border-l-4 border-gold bg-paper p-3">
          No counter data yet — these tiles populate once the Cloud Function triggers
          (functions/src/warRoomCounters.ts) are deployed against a live project and voters/incidents/diary entries
          start being written. See BUILD-STATUS.md.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-ink text-paper rounded p-4">
          <p className="text-label-caps font-display uppercase text-gold">Voters captured</p>
          <p className="text-display-lg-mobile font-display">{(counters?.totalVoters ?? 0).toLocaleString('en-ZA')}</p>
          {rollSharePct !== null && (
            <p className="text-data-mono font-mono text-paper/70 mt-1">
              {rollSharePct}% of {registeredVoters.toLocaleString('en-ZA')} registered
            </p>
          )}
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-label-caps font-display uppercase text-slate">Doors worked</p>
          <p className="text-display-lg-mobile font-display text-ink">{doorsWorked.toLocaleString('en-ZA')}</p>
          <p className="text-data-mono font-mono text-slate mt-1">
            from door records · {(counters?.totalHouseholdsVisited ?? 0).toLocaleString('en-ZA')} self-reported
          </p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-label-caps font-display uppercase text-slate">Wards seeded</p>
          <p className="text-display-lg-mobile font-display text-ink">
            {wardsQuery.data?.length ?? 0}
            {seed?.expectedWardCount ? (
              <span className="text-body-md font-body text-slate"> / {seed.expectedWardCount}</span>
            ) : null}
          </p>
          {seed && !seed.reconciled && (
            <p className="text-body-md font-body text-maroon mt-1">Seed check needs attention</p>
          )}
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-label-caps font-display uppercase text-slate">Open incidents</p>
          {/* isOpen() is the workflow module's own definition — the same
              one the incident list uses. It was duplicated inline here. */}
          <p className="text-display-lg-mobile font-display text-ink">
            {STATUS_ORDER.filter(isOpen).reduce((sum, s) => sum + (counters?.incidentsByStatus[s] ?? 0), 0)}
          </p>
        </div>
      </div>

      <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
        <h2 className="text-label-caps font-display uppercase text-slate">Doors by state</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CONTACT_STATUS_LABEL) as (keyof typeof CONTACT_STATUS_LABEL)[]).map((status) => (
            <span
              key={status}
              className="px-3 py-1.5 rounded border border-ink/20 text-label-caps font-display uppercase text-ink"
            >
              {CONTACT_STATUS_LABEL[status]}:{' '}
              {(counters?.householdsByContactStatus[status] ?? 0).toLocaleString('en-ZA')}
            </span>
          ))}
        </div>
        <p className="text-body-md font-body text-slate">
          Counted from the door records themselves. The self-reported figure beside &ldquo;Doors worked&rdquo; is
          summed from canvassers&rsquo; own diary entries and is a different measurement — the two will differ, and
          neither is a correction of the other.
        </p>
      </div>

      <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
        <h2 className="text-label-caps font-display uppercase text-slate">Sentiment breakdown</h2>
        <div className="flex flex-wrap gap-2">
          {SENTIMENT_ORDER.map((tier) => (
            <span
              key={tier}
              className={`px-3 py-1.5 rounded border text-label-caps font-display uppercase ${TONE_PILL_CLASSES[SENTIMENT_META[tier].tone]}`}
            >
              {SENTIMENT_META[tier].label}: {(counters?.sentimentBreakdown[tier] ?? 0).toLocaleString('en-ZA')}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
        <h2 className="text-label-caps font-display uppercase text-slate">Incidents by status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <span
              key={s}
              className="px-3 py-1.5 rounded border border-ink/20 text-label-caps font-display uppercase text-ink"
            >
              {STATUS_LABEL[s]}: {(counters?.incidentsByStatus[s] ?? 0).toLocaleString('en-ZA')}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="px-4 py-2 bg-gold text-ink rounded text-label-caps font-display uppercase"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
