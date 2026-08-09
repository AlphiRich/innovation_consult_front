/**
 * Election-COS1.0 — Vote Calculator (MMP seat allocation)
 * IC-ECOS-BUILD-2026-V2 §8.2. Standalone what-if tool — no DAL/session
 * dependency, since it's a scenario calculator, not a live-data view.
 * Allocation logic (allocateSeats) is fully implemented, property-tested,
 * and real-data-verified in seatCalculator.ts — this page is the UI
 * around it, opening on the real NW405 2021 result (nw405Example.ts) as
 * starter data instead of a blank form.
 *
 * Reference: the Stitch suite's "Civic Authority" (retired shell — master
 * index §3.2) "Hung Council: Strategic Coalition Modeler" screen —
 * stat-tile layout and a "Coalition Builder" side panel are structurally
 * reused (both are generic, useful UI patterns), but its navy/gold
 * retired palette, its "Civic Authority" branding, and its printed
 * formula ("Q = (V/S) + 1", i.e. a plain Droop-adjacent quota) are NOT
 * adopted — that formula is exactly the one session 8 disproved against
 * a real IEC report; see seatCalculator.ts's header. The Coalition
 * Builder itself is real, derived arithmetic (sum of selected parties'
 * seats vs. a majority threshold), not fabricated data.
 */
import { useMemo, useState } from 'react';
import { allocateSeats } from './seatCalculator';
import { NW405_2021_EXAMPLE } from './nw405Example';
import { PartyRowsEditor, type PartyRow } from './PartyRowsEditor';

export function SeatCalculatorPage() {
  const [totalSeats, setTotalSeats] = useState(NW405_2021_EXAMPLE.totalSeats);
  const [totalValidVotes, setTotalValidVotes] = useState(NW405_2021_EXAMPLE.totalValidVotes);
  const [independentWardSeats, setIndependentWardSeats] = useState(NW405_2021_EXAMPLE.independentWardSeats);
  const [noPRListWardSeats, setNoPRListWardSeats] = useState(NW405_2021_EXAMPLE.noPRListWardSeats);
  const [rows, setRows] = useState<PartyRow[]>(NW405_2021_EXAMPLE.parties);
  const [coalition, setCoalition] = useState<Set<string>>(new Set());

  const result = useMemo(() => {
    try {
      return {
        data: allocateSeats({
          totalSeats,
          totalValidVotes,
          independentWardSeats,
          noPRListWardSeats,
          parties: rows.map((r) => ({ id: r.id, name: r.name || r.id, votes: r.votes, wardSeatsWon: r.wardSeatsWon })),
        }),
        error: null,
      };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Invalid input' };
    }
  }, [totalSeats, totalValidVotes, independentWardSeats, noPRListWardSeats, rows]);

  const majorityThreshold = result.data ? Math.floor(result.data.councilSizeFinal / 2) + 1 : 0;
  const coalitionSeats = result.data
    ? result.data.parties.filter((p) => coalition.has(p.id)).reduce((sum, p) => sum + p.totalSeats, 0)
    : 0;
  const hasMajority = coalitionSeats >= majorityThreshold;

  function toggleCoalitionMember(id: string) {
    setCoalition((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/analytics/seat-calculator</p>
        <h1 className="text-headline-md font-display text-ink mt-1">Vote Calculator</h1>
        <p className="text-body-md font-body text-slate mt-1">
          MMP seat allocation (Municipal Structures Act Schedule 1). Opens on the real JB Marks (NW405) 2021 result —
          edit any field to model a different scenario.
        </p>
      </div>

      <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Total seats</span>
            <input
              type="number"
              min="1"
              className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
              value={totalSeats}
              onChange={(e) => setTotalSeats(Number(e.target.value) || 1)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Total valid votes</span>
            <input
              type="number"
              min="0"
              className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
              value={totalValidVotes}
              onChange={(e) => setTotalValidVotes(Number(e.target.value) || 0)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">Independent ward seats</span>
            <input
              type="number"
              min="0"
              className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
              value={independentWardSeats}
              onChange={(e) => setIndependentWardSeats(Number(e.target.value) || 0)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-label-caps font-display uppercase text-slate">No-PR-list ward seats</span>
            <input
              type="number"
              min="0"
              className="w-full border border-ink/20 rounded px-2 py-1.5 text-body-md font-body"
              value={noPRListWardSeats}
              onChange={(e) => setNoPRListWardSeats(Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <PartyRowsEditor rows={rows} onChange={setRows} showWardSeats />
      </div>

      {result.error && (
        <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">{result.error}</p>
      )}

      {result.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-label-caps font-display uppercase text-slate">Quota</p>
              <p className="text-display-lg-mobile font-display text-ink">{result.data.quota.toLocaleString('en-ZA')}</p>
            </div>
            <div className="bg-white border border-ink/10 rounded p-4">
              <p className="text-label-caps font-display uppercase text-slate">Council size (final)</p>
              <p className="text-display-lg-mobile font-display text-ink">{result.data.councilSizeFinal}</p>
            </div>
            <div className="bg-ink text-paper rounded p-4">
              <p className="text-label-caps font-display uppercase text-gold">Seats allocated</p>
              <p className="text-display-lg-mobile font-display">{result.data.totalSeatsAllocated}</p>
            </div>
            <div className={`rounded p-4 ${result.data.pendingSeats > 0 ? 'bg-maroon text-white' : 'bg-white border border-ink/10'}`}>
              <p className={`text-label-caps font-display uppercase ${result.data.pendingSeats > 0 ? 'text-white/80' : 'text-slate'}`}>
                Pending (tied) seats
              </p>
              <p className={`text-display-lg-mobile font-display ${result.data.pendingSeats > 0 ? '' : 'text-ink'}`}>
                {result.data.pendingSeats}
              </p>
            </div>
          </div>

          {result.data.tieFlags.length > 0 && (
            <div className="bg-white border-l-4 border-maroon rounded p-4 space-y-1">
              <p className="text-label-caps font-display uppercase text-maroon">Tied — needs manual resolution</p>
              {result.data.tieFlags.map((tie, i) => (
                <p key={i} className="text-body-md font-body text-ink">
                  {tie.seatsContested} seat{tie.seatsContested === 1 ? '' : 's'} contested at remainder {tie.remainder}{' '}
                  between: {tie.partyIds.join(', ')}. Not auto-resolved — see build spec §8.2.
                </p>
              ))}
            </div>
          )}

          <div className="bg-white border border-ink/10 rounded-lg overflow-x-auto">
            <table className="w-full text-body-md font-body">
              <thead>
                <tr className="border-b border-ink/10 text-label-caps font-display uppercase text-slate">
                  <th className="text-left p-3">Party</th>
                  <th className="text-right p-3">Votes</th>
                  <th className="text-right p-3">Ward seats</th>
                  <th className="text-right p-3">PR seats</th>
                  <th className="text-right p-3">Overhang</th>
                  <th className="text-right p-3">Total seats</th>
                  <th className="text-center p-3">Coalition</th>
                </tr>
              </thead>
              <tbody>
                {[...result.data.parties]
                  .sort((a, b) => b.totalSeats - a.totalSeats)
                  .map((p) => (
                    <tr key={p.id} className="border-b border-ink/5 last:border-0">
                      <td className="p-3 text-ink">{p.name}</td>
                      <td className="p-3 text-right text-data-mono font-mono">{p.votes.toLocaleString('en-ZA')}</td>
                      <td className="p-3 text-right text-data-mono font-mono">{p.wardSeatsWon}</td>
                      <td className="p-3 text-right text-data-mono font-mono">{p.prSeats}</td>
                      <td className="p-3 text-right text-data-mono font-mono">{p.overhangSeats || '—'}</td>
                      <td className="p-3 text-right text-data-mono font-mono font-semibold">{p.totalSeats}</td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={coalition.has(p.id)}
                          onChange={() => toggleCoalitionMember(p.id)}
                          aria-label={`Add ${p.name} to coalition`}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
            <h2 className="text-label-caps font-display uppercase text-slate">Coalition builder</h2>
            <p className="text-display-lg-mobile font-display text-ink">
              {coalitionSeats} <span className="text-body-md font-body text-slate">/ {majorityThreshold} for a majority</span>
            </p>
            <div className="w-full bg-paper rounded h-2 overflow-hidden">
              <div
                className={`h-full ${hasMajority ? 'bg-green' : 'bg-gold'}`}
                style={{ width: `${Math.min(100, (coalitionSeats / Math.max(1, result.data.councilSizeFinal)) * 100)}%` }}
              />
            </div>
            <p className="text-body-md font-body text-ink">
              {coalition.size === 0
                ? 'Tick parties above to build a coalition.'
                : hasMajority
                  ? `Majority secured — ${coalitionSeats - majorityThreshold} seat${coalitionSeats - majorityThreshold === 1 ? '' : 's'} to spare.`
                  : `Short by ${majorityThreshold - coalitionSeats} seat${majorityThreshold - coalitionSeats === 1 ? '' : 's'}.`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
