#!/usr/bin/env node
/**
 * Election Campaign OS — NW405 2021 ward-ballot results, CSV to seed JSON
 *
 * Source: `seed-data/sources/jb-marks-nw405-ward-results-2021.csv`, the
 * 2021 LGE ward-ballot outcome for JB Marks Local Municipality, one row
 * per ward, winner and runner-up only.
 *
 * WHY THIS IS A SCRIPT AND NOT A HAND-TYPED CONSTANT
 *
 * Because the five reconciliations below are the reason the dataset is
 * trusted at all, and a hand-typed constant carries the conclusion
 * without the working. Run this and they run with it.
 *
 *   1. Ward wins by party must equal the ward seats in the certified
 *      seat-calculation detail: ANC 24, DA 9, VF+ 1.
 *   2. Ward votes must sum to 51 156 — the ward-ballot valid-vote total
 *      used to derive A = 101 439 in seatCalculator.nw405-2021.test.ts.
 *   3. Ward ids must be the contiguous block 64005001–64005034.
 *   4. Every row's own arithmetic must hold: margin = winner − runner-up,
 *      and the published percentage must match winner / ward votes.
 *
 * All five are independent of each other and of the figures already in
 * `nw405Example.ts`, so agreement is corroboration rather than a second
 * copy of one source.
 *
 * WHAT THIS DATASET IS NOT
 *
 * It carries the winner and the runner-up, and nothing else. In 2021,
 * 5 989 ward-ballot votes — 11.7% — went to parties in neither position,
 * and they are not recoverable from this file. Any per-party ward share
 * computed from it is therefore a share of the top two, not of the ward.
 * `wardResults2021.ts` carries that number so nothing can quietly treat
 * the file as a full result.
 *
 * Usage:
 *   node tools/seed-data/parse-nw405-2021-results.mjs            # write
 *   node tools/seed-data/parse-nw405-2021-results.mjs --check    # verify only
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = path.join(ROOT, 'seed-data', 'sources', 'jb-marks-nw405-ward-results-2021.csv');
const TARGET = path.join(ROOT, 'seed-data', 'nw405-2021-ward-results.json');

/** The certified ward seats, from the IEC Seat Calculation Detail (docs/nw405-seed-data.md). */
const CERTIFIED_WARD_SEATS = { ANC: 24, DA: 9, VFP: 1 };
/** The ward-ballot valid-vote total A's derivation rests on. */
const CERTIFIED_WARD_BALLOT_VOTES = 51_156;

/** Registered party abbreviations, as `nw405Example.ts` spells them. */
const PARTY_IDS = new Map([
  ['AFRICAN NATIONAL CONGRESS', 'ANC'],
  ['DEMOCRATIC ALLIANCE', 'DA'],
  ['VRYHEIDSFRONT PLUS', 'VFP'],
  ['ECONOMIC FREEDOM FIGHTERS', 'EFF'],
  ['PATRIOTIC ALLIANCE', 'PA'],
  ['ABANTU BATHO CONGRESS', 'ABC'],
  ['AFRICAN TRANSFORMATION MOVEMENT', 'ATM'],
  ['BLACK FIRST LAND FIRST', 'BLF'],
  ['FORUM 4 SERVICE DELIVERY', 'F4SD'],
  /**
   * Not a party, and deliberately not folded into one.
   *
   * The strict map above found this: an independent was runner-up in a
   * ward in 2021. It matters because Schedule 1 Item 12 deducts
   * independent ward wins from the quota's denominator (the "C" term), so
   * an independent silently counted as a party would change the quota.
   * Here it was runner-up and won nothing — which is what
   * `nw405Example.ts`'s `independentWardSeats: 0` records, and what the
   * 450 independent ward votes subtracted in A's derivation refer to.
   * Reconciliation 5 below keeps those two statements tied together.
   */
  ['INDEPENDENT', 'INDEPENDENT'],
]);

/** Independents are candidates, not parties. Schedule 1 treats them differently. */
const INDEPENDENT = 'INDEPENDENT';

function partyId(name) {
  const id = PARTY_IDS.get(name.trim().toUpperCase());
  if (!id) throw new Error(`Unmapped party name in the CSV: "${name}". Add it to PARTY_IDS deliberately.`);
  return id;
}

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    if (cells.length !== columns.length) throw new Error(`Row has ${cells.length} cells, expected ${columns.length}: ${line}`);
    return Object.fromEntries(columns.map((c, i) => [c, cells[i]]));
  });
}

function build() {
  const rows = parseCsv(readFileSync(SOURCE, 'utf8'));
  const failures = [];

  const wards = rows.map((row) => {
    const wardId = row.Ward.trim().split(/\s+/).pop();
    const winnerVotes = Number(row.WinnerVotes);
    const runnerUpVotes = Number(row.RunnerUpVotes);
    const wardVotes = Number(row.TotalWardVotes);

    // Reconciliation 4, per row.
    if (winnerVotes - runnerUpVotes !== Number(row.Margin)) {
      failures.push(`${wardId}: margin ${row.Margin} is not ${winnerVotes} − ${runnerUpVotes}`);
    }
    const computedPct = Math.round((winnerVotes / wardVotes) * 1000) / 10;
    if (Math.abs(computedPct - Number(row.WinnerPct)) > 0.11) {
      failures.push(`${wardId}: published ${row.WinnerPct}% but ${winnerVotes}/${wardVotes} is ${computedPct}%`);
    }
    if (runnerUpVotes > winnerVotes) {
      failures.push(`${wardId}: runner-up ${runnerUpVotes} exceeds winner ${winnerVotes}`);
    }
    if (winnerVotes + runnerUpVotes > wardVotes) {
      failures.push(`${wardId}: winner + runner-up exceeds the ward's own total`);
    }

    return {
      wardId,
      wardNumber: Number(row.WardNum),
      winnerPartyId: partyId(row.Winner),
      winnerVotes,
      runnerUpPartyId: partyId(row.RunnerUp),
      runnerUpVotes,
      wardVotes,
    };
  });

  // Reconciliation 3.
  const expectedIds = Array.from({ length: 34 }, (_, i) => `640050${String(i + 1).padStart(2, '0')}`);
  const actualIds = wards.map((w) => w.wardId);
  if (actualIds.join(',') !== expectedIds.join(',')) {
    failures.push(`ward ids are not the contiguous block 64005001–64005034`);
  }

  // Reconciliation 1.
  const wins = {};
  for (const w of wards) wins[w.winnerPartyId] = (wins[w.winnerPartyId] ?? 0) + 1;
  for (const [party, seats] of Object.entries(CERTIFIED_WARD_SEATS)) {
    if (wins[party] !== seats) failures.push(`${party} wins ${wins[party] ?? 0} wards here, certified detail says ${seats}`);
  }
  const unexpected = Object.keys(wins).filter((p) => !(p in CERTIFIED_WARD_SEATS));
  if (unexpected.length) failures.push(`party won a ward that the certified detail gives no ward seats: ${unexpected.join(', ')}`);

  // Reconciliation 5: independents won no ward, which is what
  // nw405Example.ts's `independentWardSeats: 0` asserts. If this ever
  // fails, the quota's denominator in that example is wrong too.
  const independentWins = wards.filter((w) => w.winnerPartyId === INDEPENDENT).length;
  if (independentWins !== 0) {
    failures.push(`${independentWins} ward(s) won by an independent, but nw405Example.ts sets independentWardSeats: 0`);
  }

  // Reconciliation 2.
  const wardBallotVotes = wards.reduce((sum, w) => sum + w.wardVotes, 0);
  if (wardBallotVotes !== CERTIFIED_WARD_BALLOT_VOTES) {
    failures.push(`ward votes sum to ${wardBallotVotes}, A's derivation uses ${CERTIFIED_WARD_BALLOT_VOTES}`);
  }

  const independentRunnerUpWards = wards.filter((w) => w.runnerUpPartyId === INDEPENDENT).map((w) => w.wardId);

  const topTwoVotes = wards.reduce((sum, w) => sum + w.winnerVotes + w.runnerUpVotes, 0);

  return {
    failures,
    dataset: {
      $comment:
        'Generated by tools/seed-data/parse-nw405-2021-results.mjs from seed-data/sources/. ' +
        'Do not hand-edit: the script carries the five reconciliations that make this trustworthy.',
      municipalityCode: 'NW405',
      delimitationId: 'LGE-2021-SUPERSEDED',
      electionDate: '2021-11-01',
      ballot: 'WARD',
      wardBallotVotes,
      votesNotInTopTwo: wardBallotVotes - topTwoVotes,
      independentWardSeats: 0,
      independentRunnerUpWards,
      wards,
    },
  };
}

const { failures, dataset } = build();
const check = process.argv.includes('--check');

if (failures.length) {
  console.error('NW405 2021 ward results — reconciliation FAILED:\n');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('\nThe dataset was not written. A figure that does not reconcile does not get seeded.');
  process.exit(1);
}

const json = `${JSON.stringify(dataset, null, 2)}\n`;

if (check) {
  const onDisk = readFileSync(TARGET, 'utf8');
  if (onDisk !== json) {
    console.error(`${path.relative(ROOT, TARGET)} is out of step with the CSV. Re-run without --check.`);
    process.exit(1);
  }
  console.log(`NW405 2021 ward results: 34 wards, all five reconciliations pass, JSON matches the source.`);
} else {
  writeFileSync(TARGET, json);
  console.log(
    `Wrote ${path.relative(ROOT, TARGET)} — 34 wards, ${dataset.wardBallotVotes.toLocaleString('en-ZA')} ward votes, ` +
      `${dataset.votesNotInTopTwo.toLocaleString('en-ZA')} outside the top two. All five reconciliations pass.`,
  );
}
