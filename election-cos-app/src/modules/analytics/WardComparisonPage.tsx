/**
 * Election Campaign OS — Ward Comparison & Scenario
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * WHAT THIS SCREEN REPLACES
 *
 * A standalone `ward_sentiment_comparison_dashboard.html`, and the
 * master-build dashboards reviewed in session 38. Those were handsome and
 * their figures were invented — including a grouped bar chart captioned
 * "Certified Schedule 1 Ward vs PR Seats for NW405" whose every value was
 * wrong (it gave the ANC 18 ward seats and the EFF 4; the certified result
 * is 24 and 0), ward voter counts for wards that have different ones, and
 * a "Flip Risk Index" of 82.4% for a ward that is not among the ten
 * closest. See docs/asset-control-sheet.md §34.
 *
 * So this screen is built on the opposite principle: every figure on it is
 * either read from a reconciled file, read from a counter the product
 * maintains, or computed from those two by a function with a test. There
 * is no fourth category.
 *
 * THE THREE COLUMNS, AND WHAT EACH ONE IS
 *
 *  1. **2021** — the certified ward-ballot result. Fact.
 *  2. **Captured** — sentiment from doors this campaign actually knocked
 *     on, with n. Not a poll, not weighted, not a sample of the ward. It
 *     is the campaign's own record of its own conversations, and the
 *     screen says so in the column head rather than in a footnote.
 *  3. **Scenario** — what Schedule 1 does to (1) under a swing the user
 *     types in. The user supplies the hypothesis; the product supplies the
 *     statute.
 *
 * Keeping those three apart on one screen is the entire design. Merging
 * them — letting captured sentiment set the scenario swing — is the one
 * thing this screen must never do, because it would turn a convenience
 * sample into a forecast and put a number in a campaign manager's mouth
 * that nothing here can stand behind.
 */
import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import {
  BasisNote,
  Card,
  Field,
  PageHeader,
  SectionLabel,
  StatTile,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { NW405_2021_EXAMPLE } from './nw405Example';
import {
  NW405_WARD_RESULTS_2021,
  WARD_CORRESPONDENCE_CAVEAT,
  marginPoints,
} from './wardResults2021';
import { majorityPosition, projectCouncil, seatChange, type Swing } from './wardScenario';
import { summarizeSentiment } from './sentimentSummary';

/** Polling day, as proclaimed. */
const ELECTION_DATE = new Date('2026-11-04T00:00:00Z');

/**
 * The ward code the counters are keyed by, for a 2021 IEC ward id.
 *
 * The seed wards in this build are keyed `NW405-W1`…`NW405-W34`; the 2021
 * result file is keyed by IEC id `64005001`…`64005034`. They are matched
 * by ward number, which is a correspondence across two delimitations and
 * not an identity — `WARD_CORRESPONDENCE_CAVEAT` is printed on the screen
 * rather than kept in this comment, because the person reading the table
 * is the one who needs to know.
 */
const counterWardCode = (wardNumber: number) => `NW405-W${wardNumber}`;

const PARTIES = NW405_2021_EXAMPLE.parties.filter((p) => p.votes >= 2_000);

const pts = (n: number) => `${n >= 0 ? '' : '−'}${Math.abs(n).toFixed(1)}`;
const int = (n: number) => n.toLocaleString('en-ZA');

export function WardComparisonPage() {
  const session = useSession();
  const [swing, setSwing] = useState<Swing>({});
  const [turnoutVotes, setTurnoutVotes] = useState<number>(NW405_2021_EXAMPLE.totalValidVotes);

  const projection = useMemo(
    () => projectCouncil({ swing, projectedValidVotes: turnoutVotes }),
    [swing, turnoutVotes],
  );
  const majority = majorityPosition(projection);
  const changes = seatChange(projection);

  /**
   * One pre-aggregated counter document per ward — §7.4 holds, because
   * nothing here scans the voters collection. 34 document reads is the
   * cost of a comparison across 34 wards, and it is a cost that does not
   * grow with the size of the roll.
   */
  const sentimentQueries = useQueries({
    queries: NW405_WARD_RESULTS_2021.wards.map((ward) => ({
      queryKey: ['wardCounters', session?.tenantId, counterWardCode(ward.wardNumber)],
      queryFn: () => dal.warRoomCounters.getForWard(session!, counterWardCode(ward.wardNumber)),
      enabled: Boolean(session),
    })),
  });

  const daysToPoll = Math.ceil((ELECTION_DATE.getTime() - Date.now()) / 86_400_000);

  const rows = useMemo(() => {
    return projection.wards
      .map((projected, index) => {
        const certified = NW405_WARD_RESULTS_2021.wards[index];
        const query = sentimentQueries[index];
        return {
          projected,
          certified,
          sentiment: query?.data ? summarizeSentiment(query.data) : null,
          /**
           * Found by running it: when the counter read fails, the cell sat
           * on the loading ellipsis for ever. A screen that cannot
           * distinguish "still fetching" from "could not fetch" invites
           * the reader to assume the ward has no canvass data, which is a
           * different and wronger thing than saying nothing is known.
           */
          sentimentFailed: Boolean(query?.isError),
        };
      })
      .sort((a, b) => a.projected.swingToFlip - b.projected.swingToFlip);
  }, [projection, sentimentQueries]);

  const setPartySwing = (partyId: string, value: number) =>
    setSwing((previous) => ({ ...previous, [partyId]: value }));

  return (
    <div className="space-y-6">
      <PageHeader slug="/analytics/ward-comparison" title="Ward Comparison & Scenario" />

      <BasisNote>
        Ward results are the certified 2021 ward ballot for NW405, reconciled five ways against the
        IEC Seat Calculation Detail (<span className="font-mono">tools/seed-data/parse-nw405-2021-results.mjs</span>).
        Seats are allocated by Schedule 1 Item 12 and Item 16. Sentiment is this campaign&rsquo;s own
        canvass record, not a poll. <strong>Nothing on this screen is a forecast</strong> — the swing
        is yours to set, and every projected figure is a consequence of it.
      </BasisNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Days to polling day"
          value={daysToPoll > 0 ? daysToPoll : 0}
          sub="4 November 2026"
          emphasis
        />
        <StatTile label="Quota (Item 12)" value={int(projection.allocation.quota)} sub="⌊A / (B − C − D)⌋ + 1" />
        <StatTile
          label="Council size"
          value={projection.allocation.councilSizeFinal}
          sub={`${majority.seatsForMajority} for a majority`}
        />
        <StatTile
          label="Wards changing hands"
          value={projection.flipped.length}
          sub={projection.flipped.length === 0 ? 'at this swing' : projection.flipped.map((w) => w.wardNumber).join(', ')}
        />
      </div>

      {/* ------------------------------------------------------ scenario */}
      <Card>
        <SectionLabel as="h2">Scenario</SectionLabel>
        <p className="text-body-md font-body text-slate mt-1">
          Set a swing in percentage points of the valid vote. A positive figure is a gain. These are
          your assumptions, not the product&rsquo;s: it has no model of voter intention and will not
          supply one.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {PARTIES.map((party) => (
            <Field key={party.id} label={`${party.id} swing (points)`} mono>
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="0.5"
                  value={swing[party.id] ?? 0}
                  onChange={(e) => setPartySwing(party.id, Number(e.target.value))}
                />
              )}
            </Field>
          ))}
          <Field
            label="Valid votes assumed"
            mono
            hint={`2021 was ${int(NW405_2021_EXAMPLE.totalValidVotes)}.`}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                step="1000"
                value={turnoutVotes}
                onChange={(e) => setTurnoutVotes(Math.max(0, Number(e.target.value)))}
              />
            )}
          </Field>
        </div>

        {projection.netSwing !== 0 && (
          <p className="text-body-md font-body text-maroon mt-3">
            These swings sum to {pts(projection.netSwing)} points rather than zero. That is left as
            you set it — the PR projection renormalises, so the arithmetic holds, but the hypothesis
            is unbalanced and worth knowing about.
          </p>
        )}
      </Card>

      {/* --------------------------------------------------- seat change */}
      <Card>
        <SectionLabel as="h2">Council under this scenario</SectionLabel>
        <Table caption="Seats in 2021 against seats under the swing set above.">
          <thead>
            <tr>
              <Th>Party</Th>
              <Th numeric>2021</Th>
              <Th numeric>Ward</Th>
              <Th numeric>PR</Th>
              <Th numeric>Projected</Th>
              <Th numeric>Change</Th>
            </tr>
          </thead>
          <tbody>
            {changes.map((party) => {
              const detail = projection.allocation.parties.find((p) => p.id === party.id);
              return (
                <tr key={party.id}>
                  <Td>
                    {party.id}
                    <span className="text-slate"> · {party.name}</span>
                  </Td>
                  <Td numeric>{party.from}</Td>
                  <Td numeric>{detail?.wardSeatsWon ?? 0}</Td>
                  <Td numeric>{detail?.prSeats ?? 0}</Td>
                  <Td numeric>{party.to}</Td>
                  <Td numeric>
                    <span className={party.change > 0 ? 'text-green' : party.change < 0 ? 'text-maroon' : 'text-slate'}>
                      {party.change > 0 ? `+${party.change}` : party.change === 0 ? '—' : party.change}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        <p className="text-body-md font-body text-slate mt-3">
          {majority.leader && majority.hasMajority
            ? `${majority.leader.id} holds ${majority.leader.seats} of ${projection.allocation.councilSizeFinal} — a majority.`
            : `No party reaches ${majority.seatsForMajority} of ${projection.allocation.councilSizeFinal}. On these figures the council is hung.`}
          {projection.allocation.pendingSeats > 0 &&
            ` ${projection.allocation.pendingSeats} seat(s) are withheld pending a tie that Schedule 1 does not resolve automatically.`}
        </p>
      </Card>

      {/* --------------------------------------------------- ward table */}
      <Card>
        <SectionLabel as="h2">Wards, closest first</SectionLabel>
        <p className="text-body-md font-body text-slate mt-1">
          &ldquo;Swing to turn&rdquo; is the two-party swing that would have changed the 2021 result —
          a property of a certified count, not a probability. {WARD_CORRESPONDENCE_CAVEAT}
        </p>

        <Table caption="Each ward's 2021 result, the swing that would turn it, this campaign's captured sentiment, and the projected holder.">
          <thead>
            <tr>
              <Th>Ward</Th>
              <Th>2021 holder</Th>
              <Th>Challenger</Th>
              <Th numeric>Margin</Th>
              <Th numeric>Swing to turn</Th>
              <Th numeric>Canvassed</Th>
              <Th numeric>Net sentiment</Th>
              <Th>Projected</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ projected, certified, sentiment, sentimentFailed }) => (
              <tr key={projected.wardId} className={projected.flips ? 'bg-paper' : undefined}>
                <Td>
                  {projected.wardNumber}
                  <span className="text-slate font-mono"> · {certified.wardId}</span>
                </Td>
                <Td>{projected.heldBy}</Td>
                <Td>{projected.challenger}</Td>
                <Td numeric>{pts(marginPoints(certified))}</Td>
                <Td numeric>{pts(projected.swingToFlip)}</Td>
                <Td numeric>
                  {sentimentFailed ? (
                    <span className="text-maroon" title="The ward counter could not be read">
                      unavailable
                    </span>
                  ) : sentiment === null ? (
                    <span className="text-slate">…</span>
                  ) : sentiment.totalVoters === 0 ? (
                    <span className="text-slate" title="No voter records captured in this ward yet">
                      none yet
                    </span>
                  ) : (
                    int(sentiment.totalVoters)
                  )}
                </Td>
                <Td numeric>
                  {sentimentFailed || sentiment === null || sentiment.totalVoters === 0 ? (
                    <span className="text-slate">—</span>
                  ) : (
                    <span className={sentiment.netSentimentIndex >= 0 ? 'text-green' : 'text-maroon'}>
                      {pts(sentiment.netSentimentIndex)}
                    </span>
                  )}
                </Td>
                <Td>
                  {projected.flips ? (
                    <span className="text-maroon">{projected.projectedWinner} gain</span>
                  ) : (
                    <span className="text-slate">{projected.projectedWinner} hold</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* -------------------------------------------------- what is left out */}
      <Card>
        <SectionLabel as="h2">What this screen does not know</SectionLabel>
        <ul className="text-body-md font-body text-slate mt-2 space-y-2 list-disc pl-5">
          <li>
            The 2021 ward file holds the winner and the runner-up only.{' '}
            {int(projection.unmodelledWardVotes)} ward votes — 11.7% of the ballot — went to parties
            in neither position and are not modelled in any ward projection above.
          </li>
          <li>
            <strong>Canvass sentiment is not a poll.</strong> It counts the doors this campaign chose
            to knock on. It is not a random sample of the ward, it is not weighted, and it is not an
            input to the projection. Reading a net sentiment figure as a vote share would be wrong.
          </li>
          <li>
            Ward boundaries are matched by IEC code across two delimitations. The 2026 delimitation
            gives NW405 34 wards under the same codes, but the same code is not a promise of the same
            boundary.
          </li>
          <li>
            The projection assumes a uniform swing — a party gaining three points gains them in every
            ward, regardless of where it started. That is a crude model, and a legible one.
          </li>
        </ul>
      </Card>
    </div>
  );
}
