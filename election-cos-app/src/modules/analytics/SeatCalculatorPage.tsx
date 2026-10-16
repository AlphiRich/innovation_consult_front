/**
 * Election Campaign OS — Vote Calculator (MMP seat allocation)
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
import { BarMeter, Card, Field, PageHeader, SectionLabel, StatTile, Table, Td, Th } from '@/components/ui';

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
      <PageHeader
        slug="/analytics/seat-calculator"
        title="Vote Calculator"
        description="MMP seat allocation (Municipal Structures Act Schedule 1). Opens on the real JB Marks (NW405) 2021 result — edit any field to model a different scenario."
      />

      {/* Four bare <label> wrappers before this — nothing associated, on
          the screen a campaign uses to model its own council. */}
      <Card className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Total seats">
            {(props) => (
              <input
                {...props}
                type="number"
                min="1"
                value={totalSeats}
                onChange={(e) => setTotalSeats(Number(e.target.value) || 1)}
              />
            )}
          </Field>
          <Field label="Total valid votes">
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                value={totalValidVotes}
                onChange={(e) => setTotalValidVotes(Number(e.target.value) || 0)}
              />
            )}
          </Field>
          <Field label="Independent ward seats">
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                value={independentWardSeats}
                onChange={(e) => setIndependentWardSeats(Number(e.target.value) || 0)}
              />
            )}
          </Field>
          <Field label="No-PR-list ward seats">
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                value={noPRListWardSeats}
                onChange={(e) => setNoPRListWardSeats(Number(e.target.value) || 0)}
              />
            )}
          </Field>
        </div>

        <PartyRowsEditor rows={rows} onChange={setRows} showWardSeats />
      </Card>

      {result.error && (
        <p className="text-body-md font-body text-maroon border-l-4 border-maroon bg-white p-3">{result.error}</p>
      )}

      {result.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Quota" value={result.data.quota.toLocaleString('en-ZA')} />
            <StatTile label="Council size (final)" value={result.data.councilSizeFinal} />
            <StatTile emphasis label="Seats allocated" value={result.data.totalSeatsAllocated} />
            {/*
             * Hand-rolled, and staying that way: this tile goes maroon
             * when seats are tied and unresolved, and StatTile has one
             * emphasis (ink/gold) and no alarm state. Inventing a second
             * emphasis on the way past a single call site is the wrong
             * place to decide what alarm looks like across the product.
             */}
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
              {/* Maroon, which SectionLabel's `tone` does not offer —
                  kept as markup rather than adding a third tone for one
                  call site. */}
              <h2 className="text-label-caps font-display uppercase text-maroon">
                Tied — needs manual resolution
              </h2>
              {result.data.tieFlags.map((tie, i) => (
                <p key={i} className="text-body-md font-body text-ink">
                  {tie.seatsContested} seat{tie.seatsContested === 1 ? '' : 's'} contested at remainder {tie.remainder}{' '}
                  between: {tie.partyIds.join(', ')}. Not auto-resolved — see build spec §8.2.
                </p>
              ))}
            </div>
          )}

          {/* The shared Table, which brings tabular-nums: six columns of
              figures compared across parties is the whole point of this
              screen, and proportional digits defeat it. */}
          <Table caption="Seats allocated to each party, with ward, PR and overhang seats, and coalition selection">
            <thead>
              <tr>
                <Th>Party</Th>
                <Th numeric>Votes</Th>
                <Th numeric>Ward seats</Th>
                <Th numeric>PR seats</Th>
                <Th numeric>Overhang</Th>
                <Th numeric>Total seats</Th>
                <Th>Coalition</Th>
              </tr>
            </thead>
            <tbody>
              {[...result.data.parties]
                .sort((a, b) => b.totalSeats - a.totalSeats)
                .map((p) => (
                  <tr key={p.id}>
                    <Td className="text-ink">{p.name}</Td>
                    <Td numeric mono>
                      {p.votes.toLocaleString('en-ZA')}
                    </Td>
                    <Td numeric mono>
                      {p.wardSeatsWon}
                    </Td>
                    <Td numeric mono>
                      {p.prSeats}
                    </Td>
                    <Td numeric mono>
                      {p.overhangSeats || '—'}
                    </Td>
                    <Td numeric mono className="font-semibold">
                      {p.totalSeats}
                    </Td>
                    <Td>
                      <span className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={coalition.has(p.id)}
                          onChange={() => toggleCoalitionMember(p.id)}
                          aria-label={`Add ${p.name} to coalition`}
                          className="h-5 w-5"
                        />
                      </span>
                    </Td>
                  </tr>
                ))}
            </tbody>
          </Table>

          <Card className="space-y-2">
            <SectionLabel as="h2">Coalition builder</SectionLabel>
            <p className="text-display-lg-mobile font-display text-ink">
              {coalitionSeats} <span className="text-body-md font-body text-slate">/ {majorityThreshold} for a majority</span>
            </p>
            <BarMeter
              value={coalitionSeats}
              max={result.data.councilSizeFinal}
              tone={hasMajority ? 'bg-green' : 'bg-gold'}
              label={`Selected coalition holds ${coalitionSeats} of ${result.data.councilSizeFinal} seats; ${majorityThreshold} are needed for a majority`}
            />
            <p className="text-body-md font-body text-ink">
              {coalition.size === 0
                ? 'Tick parties above to build a coalition.'
                : hasMajority
                  ? `Majority secured — ${coalitionSeats - majorityThreshold} seat${coalitionSeats - majorityThreshold === 1 ? '' : 's'} to spare.`
                  : `Short by ${majorityThreshold - coalitionSeats} seat${majorityThreshold - coalitionSeats === 1 ? '' : 's'}.`}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
