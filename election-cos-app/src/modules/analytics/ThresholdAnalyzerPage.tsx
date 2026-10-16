/**
 * Election Campaign OS — Threshold Analyzer (ELECTORAL vote threshold)
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
import { Card, Field, PageHeader, Pill, Table, Td, Th } from '@/components/ui';

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
      <PageHeader
        slug="/analytics/thresholds"
        title="Threshold Analyzer"
        description="Electoral 1% qualification threshold (Municipal Structures Act Schedule 1) — not the PPFA funding thresholds at Settings → PPFA Thresholds. This figure is a working assumption, not independently confirmed against a primary source — see docs/unverified-source-documents.md."
      />

      <Card className="space-y-4">
        {/* Was a bare <label> wrapping the input: nothing associated. */}
        <div className="max-w-xs">
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
        </div>

        <PartyRowsEditor rows={rows} onChange={setRows} showWardSeats={false} />
      </Card>

      {/*
       * The shared Table, which brings `tabular-nums` with it — the votes
       * and percentage columns were proportional figures in a column
       * before, which defeats the only reason to put them in one.
       *
       * Bare, not wrapped in a Card: that is how WardsPage renders the
       * build's other table, and Card has no zero-padding mode — passing
       * `p-0` would race its own `p-4` in the stylesheet, where the winner
       * is decided by Tailwind's emission order rather than by what is
       * written here.
       */}
      <Table caption="Each party's share of the total valid votes, and whether it clears the 1% qualification threshold">
          <thead>
            <tr>
              <Th>Party</Th>
              <Th numeric>Votes</Th>
              <Th numeric>% of total</Th>
              <Th>Qualifies</Th>
              <Th numeric>Votes to qualify</Th>
            </tr>
          </thead>
          <tbody>
            {[...analysis]
              .sort((a, b) => b.pct - a.pct)
              .map((p) => (
                <tr key={p.id}>
                  <Td className="text-ink">{p.name || '(unnamed)'}</Td>
                  <Td numeric mono>
                    {p.votes.toLocaleString('en-ZA')}
                  </Td>
                  <Td numeric mono>
                    {p.pct.toFixed(2)}%
                  </Td>
                  {/*
                   * Centred with flex rather than `text-center`, because a
                   * text-align class passed through Td's className would
                   * race Td's own text-left in the stylesheet and the
                   * winner depends on Tailwind's emission order, not on
                   * the order written here.
                   */}
                  <Td>
                    <span className="flex justify-center">
                      <Pill className={p.meets ? 'bg-green/10 text-green' : 'bg-maroon/10 text-maroon'}>
                        {p.meets ? 'Yes' : 'No'}
                      </Pill>
                    </span>
                  </Td>
                  <Td numeric mono>
                    {p.meets ? '—' : p.shortfall.toLocaleString('en-ZA')}
                  </Td>
                </tr>
              ))}
          </tbody>
      </Table>
    </div>
  );
}
