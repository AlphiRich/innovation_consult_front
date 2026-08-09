/**
 * Election-COS1.0 — Threshold Analyzer (ELECTORAL vote threshold)
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * NAMING DISCIPLINE (§3.2): this is the ELECTORAL vote-threshold tool —
 * "does this party clear the 1% qualification threshold for PR seats"
 * (Schedule 1 Step 2, see electoralThreshold.ts). /settings/ppfa-thresholds
 * is the unrelated STATUTORY FUNDING settings screen (PPFA donation
 * disclosure/cap thresholds). They must never share a label, icon, or
 * breadcrumb — do not merge them, and do not let "threshold" alone decide
 * where a change belongs.
 *
 * Standalone what-if tool, same as SeatCalculatorPage.tsx (no DAL/session
 * dependency) — opens on the real NW405 2021 result.
 */
import { useMemo, useState } from 'react';
import { NW405_2021_EXAMPLE } from './nw405Example';
import { PartyRowsEditor, type PartyRow } from './PartyRowsEditor';
import { meetsQualificationThreshold, pctOfTotal, votesNeededForThreshold } from './electoralThreshold';

export function ThresholdAnalyzerPage() {
  const [totalValidVotes, setTotalValidVotes] = useState(NW405_2021_EXAMPLE.totalValidVotes);
  const [rows, setRows] = useState<PartyRow[]>(NW405_2021_EXAMPLE.parties);

  const analysis = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        pct: pctOfTotal(r.votes, totalValidVotes),
        meets: meetsQualificationThreshold(r.votes, totalValidVotes),
        shortfall: votesNeededForThreshold(r.votes, totalValidVotes),
      })),
    [rows, totalValidVotes],
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/analytics/thresholds</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Threshold Analyzer</h1>
        <p className="text-body-md font-body text-slate mt-1">
          Electoral 1% qualification threshold (Municipal Structures Act Schedule 1) — not the PPFA funding
          thresholds at Settings → PPFA Thresholds. This figure is a working assumption, not independently confirmed
          against a primary source — see docs/unverified-source-documents.md.
        </p>
      </div>

      <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-4">
        <label className="space-y-1 block max-w-xs">
          <span className="text-label-caps font-display uppercase text-slate">Total valid votes</span>
          <input
            type="number"
            min="0"
            className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
            value={totalValidVotes}
            onChange={(e) => setTotalValidVotes(Number(e.target.value) || 0)}
          />
        </label>

        <PartyRowsEditor rows={rows} onChange={setRows} showWardSeats={false} />
      </div>

      <div className="bg-white border border-ink/10 rounded-lg overflow-x-auto">
        <table className="w-full text-body-md font-body">
          <thead>
            <tr className="border-b border-ink/10 text-label-caps font-display uppercase text-slate">
              <th className="text-left p-3">Party</th>
              <th className="text-right p-3">Votes</th>
              <th className="text-right p-3">% of total</th>
              <th className="text-center p-3">Qualifies</th>
              <th className="text-right p-3">Votes to qualify</th>
            </tr>
          </thead>
          <tbody>
            {[...analysis].sort((a, b) => b.pct - a.pct).map((p) => (
              <tr key={p.id} className="border-b border-ink/5 last:border-0">
                <td className="p-3 text-ink">{p.name || '(unnamed)'}</td>
                <td className="p-3 text-right text-data-mono font-mono">{p.votes.toLocaleString('en-ZA')}</td>
                <td className="p-3 text-right text-data-mono font-mono">{p.pct.toFixed(2)}%</td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-1 rounded text-label-caps font-display uppercase ${
                      p.meets ? 'bg-green/10 text-green' : 'bg-maroon/10 text-maroon'
                    }`}
                  >
                    {p.meets ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="p-3 text-right text-data-mono font-mono">
                  {p.meets ? '—' : p.shortfall.toLocaleString('en-ZA')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
