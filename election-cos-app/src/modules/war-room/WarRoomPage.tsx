/**
 * Election-COS1.0 — War Room / Command Center
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
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { totalsFor } from '@/modules/wards/wardStats';

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
  const coveragePct =
    counters && registeredVoters > 0 ? Math.min(100, Math.round((counters.totalVoters / registeredVoters) * 100)) : null;

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
          {coveragePct !== null && (
            <p className="text-data-mono font-mono text-paper/70 mt-1">
              {coveragePct}% of {registeredVoters.toLocaleString('en-ZA')} registered
            </p>
          )}
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-label-caps font-display uppercase text-slate">Households canvassed</p>
          <p className="text-display-lg-mobile font-display text-ink">
            {(counters?.totalHouseholdsVisited ?? 0).toLocaleString('en-ZA')}
          </p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-label-caps font-display uppercase text-slate">Wards seeded</p>
          <p className="text-display-lg-mobile font-display text-ink">{wardsQuery.data?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-ink/10 rounded p-4">
          <p className="text-label-caps font-display uppercase text-slate">Open incidents</p>
          <p className="text-display-lg-mobile font-display text-ink">
            {STATUS_ORDER.filter((s) => s !== 'RESOLVED' && s !== 'CLOSED').reduce(
              (sum, s) => sum + (counters?.incidentsByStatus[s] ?? 0),
              0,
            )}
          </p>
        </div>
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
