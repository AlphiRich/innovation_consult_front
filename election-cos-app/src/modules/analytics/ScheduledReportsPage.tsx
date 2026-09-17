/**
 * Election Campaign OS — Sentiment Summary Report
 * IC-ECOS-BUILD-2026-V2 §8.1, §8.3, §3.2 (retained deliberately, not
 * scope creep). Reads the same pre-aggregated warRoomCounters doc as
 * WarRoomPage.tsx — one doc read, never a live collection scan (§7.4).
 *
 * Reference: two Stitch report-mockup screens ("30-Day Ward Sentiment
 * Summary," "Ward 18: Strategic Sentiment") — both show a rich per-ward
 * ranking (top/at-risk wards, a heatmap, drill-down friction points) and
 * both carry a fabricated signatory ("Marcus Thorne, Chief of
 * Intelligence Operations" / "Dir. Marcus Thorne, Principal Strategic
 * Advisor" — two different titles and two different fictional company
 * names, "Innovation Consult" vs "Global Strategy Group," across the two
 * mockups, which is itself a tell these are placeholder content, not a
 * real org chart). None of that is reproduced here: no invented person is
 * named as having authored or certified anything this build generates,
 * and no per-ward ranking is shown, because this build only maintains a
 * TENANT-WIDE sentiment counter — a per-ward version would need the
 * counters doc restructured with a ward dimension and the Cloud Function
 * triggers updated to write to it, which is real, buildable follow-up
 * work, not done this session.
 *
 * Also NOT built, despite "Automated Reporting" being this route's
 * working title in earlier sessions: true cron-based scheduling (no
 * Cloud Scheduler function exists), distribution lists / email delivery
 * (no notification infrastructure exists), and a branded/watermarked PDF
 * export (tools/docgen/ does this for legal documents but is a Node-only
 * script, not wired into the app). What's real: an on-demand summary of
 * real counter data, exportable as CSV.
 */
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import { SENTIMENT_META, SENTIMENT_ORDER } from '@/modules/voters/sentiment';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { summarizeSentiment } from './sentimentSummary';

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ScheduledReportsPage() {
  const session = useSession();

  const countersQuery = useQuery({
    queryKey: ['warRoomCounters', session?.tenantId],
    queryFn: () => dal.warRoomCounters.get(session!),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/analytics/scheduled-reports</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Sentiment Summary Report</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const counters = countersQuery.data;
  const summary = counters ? summarizeSentiment(counters) : null;

  function handleExport() {
    if (!summary || !counters) return;
    const generatedAt = new Date().toISOString();
    downloadCsv(`sentiment-summary-${session!.tenantId}-${generatedAt.slice(0, 10)}.csv`, [
      ['Election Campaign OS — Sentiment Summary Report'],
      ['Tenant', session!.tenantId],
      ['Generated', generatedAt],
      [],
      ['Metric', 'Value'],
      ['Total voters captured', summary.totalVoters],
      ['Net sentiment index', summary.netSentimentIndex],
      ['Support %', summary.supportPct],
      ['Opposition %', summary.oppositionPct],
      ['Undecided %', summary.undecidedPct],
      [],
      ['Sentiment tier', 'Count'],
      ...SENTIMENT_ORDER.map((tier) => [SENTIMENT_META[tier].label, counters.sentimentBreakdown[tier]]),
    ]);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps font-display uppercase text-slate">/analytics/scheduled-reports</p>
          <h1 className="text-headline-md font-display text-ink mt-1">Sentiment Summary Report</h1>
          <p className="text-body-md font-body text-slate mt-1">
            Tenant-wide, on-demand — generated now from the same counters War Room reads, not on a schedule. See this
            page's header comment for what "Automated Reporting" would still need to be fully real.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!summary}
          className="bg-gold text-ink rounded px-4 py-2 text-label-caps font-display uppercase whitespace-nowrap disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {countersQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-ink text-paper rounded p-4">
              <p className="text-label-caps font-display uppercase text-gold">Net sentiment index</p>
              <p className="text-display-lg-mobile font-display">
                {summary.netSentimentIndex > 0 ? '+' : ''}
                {summary.netSentimentIndex}
              </p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-label-caps font-display uppercase text-slate">Support</p>
              <p className="text-display-lg-mobile font-display text-ink">{summary.supportPct}%</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-label-caps font-display uppercase text-slate">Opposition</p>
              <p className="text-display-lg-mobile font-display text-ink">{summary.oppositionPct}%</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-label-caps font-display uppercase text-slate">Total voters captured</p>
              <p className="text-display-lg-mobile font-display text-ink">{summary.totalVoters.toLocaleString('en-ZA')}</p>
            </div>
          </div>

          <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
            <h2 className="text-label-caps font-display uppercase text-slate">Breakdown by tier</h2>
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

          {summary.totalVoters === 0 && (
            <p className="text-body-md font-body text-slate border-l-4 border-gold bg-paper p-3">
              No voters captured yet — this report populates once voters are added and the Cloud Function counter
              triggers are deployed against a live project. See BUILD-STATUS.md.
            </p>
          )}
        </>
      )}
    </div>
  );
}
