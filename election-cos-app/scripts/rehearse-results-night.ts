/**
 * Election Campaign OS — results-night rehearsal
 *
 * WHY THIS EXISTS
 *
 * Polling day is 4 November 2026. The path from a published IEC results
 * file to a seat calculation on a screen has never been run end to end in
 * one go — the pieces are each tested, which is not the same thing. The
 * night of a count is the worst possible time to discover that the two
 * ends do not meet.
 *
 * So this runs the whole path, today, on data whose answer is already
 * known: acquire → map → ingest → validate → allocate → reconcile. It
 * drives the real modules, not copies of them. If it prints the certified
 * 2021 council, every link in the chain works.
 *
 * ON THE NIGHT
 *
 *     npm run rehearse -- --file <the-new-export.csv> --seats 67 \
 *       --votes <A> --municipality NW405 --expect none
 *
 * The only thing that changes is the input. If a new file has different
 * column headings the ingester stops and prints the headings it found,
 * which is the cue to add a mapping to `src/modules/ingest/mappings.ts` —
 * not to edit this script.
 *
 * WHAT IT REFUSES
 *
 * A BLOCKING problem stops it, and it exits non-zero. That is the whole
 * point: a figure that does not validate must not reach a screen a
 * campaign makes decisions from, and a rehearsal that reports success on
 * a broken file would be worse than no rehearsal.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ingestResultFile } from '@/modules/ingest/ingestResult';
import { MAPPINGS } from '@/modules/ingest/mappings';
import { allocateSeats } from '@/modules/analytics/seatCalculator';
import { NW405_2021_EXAMPLE, NW405_2021_DELIMITATION } from '@/modules/analytics/nw405Example';

const ROOT = path.resolve(import.meta.dirname ?? '.', '..');

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const file = arg('file', 'seed-data/sources/nw405-2021-seat-calculation-detail.csv')!;
const seats = Number(arg('seats', String(NW405_2021_EXAMPLE.totalSeats)));
const votes = Number(arg('votes', String(NW405_2021_EXAMPLE.totalValidVotes)));
const municipality = arg('municipality', 'NW405')!;
const year = Number(arg('year', '2021'));
const expect = arg('expect', 'nw405-2021');

const step = (n: number, label: string) => console.log(`\n${n}. ${label}\n${'─'.repeat(58)}`);
const fail = (why: string): never => {
  console.error(`\n✗ STOPPED — ${why}\n`);
  process.exit(1);
};

console.log('\nElection Campaign OS — results-night rehearsal');
console.log(`   municipality ${municipality} · year ${year} · B=${seats} · A=${votes.toLocaleString('en-ZA')}`);

// ------------------------------------------------------------- 1. read
step(1, 'READ');
let text: string;
// An absolute path is used as given. Joining it to ROOT unconditionally
// made every run on a file outside the repo fail with "cannot read",
// which on the night would read as a corrupt export rather than as a
// path mistake — and in rehearsal it made two refusal tests pass for
// entirely the wrong reason.
const resolved = path.isAbsolute(file) ? file : path.join(ROOT, file);
try {
  text = readFileSync(resolved, 'utf8');
} catch {
  fail(`cannot read ${resolved}`);
}
const sha = createHash('sha256').update(text!).digest('hex');
console.log(`   ${file}`);
console.log(`   ${Buffer.byteLength(text!)} bytes · sha256 ${sha.slice(0, 32)}…`);

// --------------------------------------------------- 2. map and ingest
step(2, 'MAP + INGEST');
const report = ingestResultFile(text!, {
  municipalityCode: municipality,
  municipalityName: municipality,
  electionYear: year,
  totalSeats: seats,
  totalValidVotes: votes,
  sourceDescription: `Rehearsal run against ${path.basename(file)}`,
  sourceReference: file,
  sourceSha256: sha,
  ingestedAt: new Date().toISOString(),
}, MAPPINGS);

console.log(`   headers found : ${report.headersFound.join(' | ')}`);
console.log(`   mapping used  : ${report.mappingUsed ?? '(none matched)'}`);
console.log(`   rows          : ${report.rowsAccepted} accepted of ${report.rowsRead} read`);
for (const p of report.rowProblems) console.log(`   row ${p.row}: ${p.message}`);
console.log(`   outcome       : ${report.outcome}`);
console.log(`   ${report.message}`);

if (report.outcome !== 'INGESTED' || !report.result) {
  if (report.outcome === 'NO_MAPPING') {
    console.error('\n   No mapping matched. Add one to src/modules/ingest/mappings.ts naming which');
    console.error('   of the headings above hold the party code, name, votes and ward seats.');
  }
  fail(`ingest outcome was ${report.outcome}`);
}

// ------------------------------------------------------- 3. validate
step(3, 'VALIDATE');
const blocking = report.problems.filter((p) => p.severity === 'BLOCKING');
const warnings = report.problems.filter((p) => p.severity === 'WARNING');
for (const p of blocking) console.log(`   BLOCKING  ${p.code}: ${p.message}`);
for (const p of warnings) console.log(`   warning   ${p.code}: ${p.message}`);
if (blocking.length) fail(`${blocking.length} blocking problem(s) — this figure does not reach a screen`);
console.log(`   ${warnings.length === 0 ? 'clean' : `${warnings.length} warning(s), none blocking`}`);
console.log(`   provenance    : ${report.result.provenance.status} — ${report.result.provenance.sourceDescription}`);

// ------------------------------------------------------ 4. allocate
step(4, 'ALLOCATE (Schedule 1 Items 12, 13, 16)');
const allocation = allocateSeats({
  totalValidVotes: report.result.totalValidVotes,
  totalSeats: report.result.totalSeats,
  independentWardSeats: report.result.independentWardSeats,
  noPRListWardSeats: report.result.noPRListWardSeats,
  parties: report.result.parties,
  delimitationId: year === 2021 ? NW405_2021_DELIMITATION : undefined,
});

console.log(`   quota         : ${allocation.quota.toLocaleString('en-ZA')}`);
console.log(`   council        : ${allocation.councilSizeFinal}  (allocated ${allocation.totalSeatsAllocated}, pending ${allocation.pendingSeats})`);
console.log(`   delimitation  : ${allocation.delimitationId}`);
console.log('');
console.log('   party   votes     ward   PR   total');
for (const p of [...allocation.parties].sort((a, b) => b.totalSeats - a.totalSeats)) {
  console.log(
    `   ${p.id.padEnd(6)} ${String(p.votes).padStart(7)}   ${String(p.wardSeatsWon).padStart(4)} ${String(p.prSeats).padStart(4)} ${String(p.totalSeats).padStart(7)}`,
  );
}
for (const t of allocation.tieFlags) {
  console.log(`   TIE: ${t.partyIds.join(', ')} at remainder ${t.remainder}, ${t.seatsContested} seat(s) withheld`);
}

// ----------------------------------------------------- 5. reconcile
step(5, 'RECONCILE');
if (expect === 'none') {
  console.log('   No expectation supplied (--expect none). Nothing to reconcile against.');
  console.log('   On the night this is normal: the certified figure is what you are producing.');
} else {
  const certified: Record<string, number> = { ANC: 33, DA: 17, VFP: 9, EFF: 6, PA: 2 };
  const got = Object.fromEntries(allocation.parties.filter((p) => p.totalSeats > 0).map((p) => [p.id.toUpperCase(), p.totalSeats]));
  const mismatches = Object.entries(certified).filter(([id, n]) => got[id] !== n);

  console.log(`   against the certified 2021 result (quota 1 515; ANC 33 · DA 17 · VF+ 9 · EFF 6 · PA 2)`);
  if (allocation.quota !== 1515) mismatches.push(['quota', 1515]);
  if (mismatches.length) {
    for (const [id, n] of mismatches) console.log(`   MISMATCH ${id}: expected ${n}, got ${id === 'quota' ? allocation.quota : got[id] ?? 0}`);
    fail(`${mismatches.length} figure(s) do not reconcile`);
  }
  console.log('   every figure matches.');
}

console.log(`\n✓ The whole path runs: read → map → ingest → validate → allocate → reconcile.\n`);
