/**
 * Election Campaign OS — the shape of an ingested election result
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * WHY THIS EXISTS
 *
 * This build holds exactly one municipal election result: JB Marks 2021,
 * hand-transcribed in session 8 from an IEC "Seat Calculation Detail"
 * report, hardcoded in `nw405Example.ts` as the seat calculator's starter
 * data. It is real and independently verifiable, and it is the only one —
 * a second municipality, or the same one in 2016, means somebody
 * transcribes a PDF by hand again.
 *
 * This is the contract that makes a second one an ingest rather than a
 * transcription. `ingestResult.ts` produces it; the seat calculator and
 * the threshold analyser consume it; `nw405Example.ts` is re-expressed in
 * it so the schema is proven against a result somebody has actually
 * checked, not invented to fit a file nobody has seen.
 *
 * PROVENANCE IS PART OF THE RECORD, NOT A COMMENT
 *
 * A vote total with no source is a number somebody typed. Every record
 * carries where it came from, what was fetched, and whether a person has
 * confirmed it — the same `CONFIRMED`/`UNCONFIRMED` distinction the
 * acquisition registry uses, for the same reason. A campaign quoting a
 * 2016 figure in a meeting needs to be able to answer "from what?".
 *
 * WHAT THIS IS NOT FOR
 *
 * Sentiment. Past results are not sentiment and must never be blended
 * into it — SOP-08 exists to keep those apart, and the register records
 * that refusal (entry 33.1). The two legitimate uses are seat-calculator
 * inputs a person chooses, and reconciliation against ward reference
 * data. Both are stated on `ResultUse`, and `electionResultSchema.test.ts`
 * fails if a third is quietly added.
 */

/** What a result may be used for in this product. Deliberately closed. */
export type ResultUse =
  /** Starting figures on the seat calculator, chosen by a person. */
  | 'SEAT_CALCULATOR_INPUT'
  /** Cross-checking ward and voting-district reference data. */
  | 'REFERENCE_RECONCILIATION';

export const RESULT_USES: ResultUse[] = ['SEAT_CALCULATOR_INPUT', 'REFERENCE_RECONCILIATION'];

export const NOT_SENTIMENT_BASIS =
  'A past election result is not sentiment and is never combined with it. Sentiment in this platform is ' +
  'the sum of doorstep conversations, with no sampling frame and no weighting (SOP-08). A result is ' +
  'history: useful as a starting figure a person chooses on the seat calculator, and as a cross-check ' +
  'against ward reference data. It is not a forecast and this platform does not make one.';

export interface ResultProvenance {
  /** Where it came from, in words a person can act on. */
  sourceDescription: string;
  /** The URL or document reference it was taken from, if there is one. */
  sourceReference?: string;
  /** SHA-256 of the file ingested, where one was ingested. */
  sourceSha256?: string;
  /** ISO 8601. When this record entered the product. */
  ingestedAt: string;
  /**
   * CONFIRMED means a person compared this record against the published
   * source and signed it off. UNCONFIRMED means it parsed and validated
   * but nobody has looked. Arithmetic passing is not the same as being
   * right, and the difference belongs on the record.
   */
  status: 'CONFIRMED' | 'UNCONFIRMED';
  /** Who confirmed it, and when. Required once status is CONFIRMED. */
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface ResultParty {
  /** Party abbreviation as published, e.g. 'ANC'. */
  id: string;
  name: string;
  /** PR ballot votes. Never a percentage, never a rounded figure. */
  votes: number;
  wardSeatsWon: number;
}

export interface ElectionResult {
  /** `{municipalityCode}-{electionYear}`, e.g. 'NW405-2021'. */
  id: string;
  municipalityCode: string;
  municipalityName: string;
  /** Four-digit year of the local government election. */
  electionYear: number;
  /** Nominal council size before any overhang expansion. */
  totalSeats: number;
  totalValidVotes: number;
  independentWardSeats: number;
  noPRListWardSeats: number;
  parties: ResultParty[];
  provenance: ResultProvenance;
  /** What this record may be used for. Never empty. */
  uses: ResultUse[];
}

export type ResultProblemCode =
  | 'NO_PARTIES'
  | 'VOTES_DO_NOT_SUM'
  | 'NEGATIVE_FIGURE'
  | 'DUPLICATE_PARTY'
  | 'SEATS_EXCEED_COUNCIL'
  | 'WARD_SEATS_EXCEED_TOTAL'
  | 'YEAR_IMPLAUSIBLE'
  | 'MISSING_PROVENANCE'
  | 'CONFIRMED_WITHOUT_SIGNATORY'
  | 'NO_DECLARED_USE';

export interface ResultProblem {
  code: ResultProblemCode;
  /** BLOCKING stops the record being stored. WARNING is shown and does not. */
  severity: 'BLOCKING' | 'WARNING';
  message: string;
}

/**
 * How far party votes may fall short of the published total before it is
 * a problem rather than rounding.
 *
 * Published results routinely carry a handful of votes the party table
 * does not account for — a party polling below the reporting cut-off, a
 * late adjustment. A gap of a few votes in a hundred thousand is normal;
 * a gap of thousands means a column was dropped on the way in, which is
 * the failure this tolerance exists to leave visible.
 */
export const VOTE_SUM_TOLERANCE = 0.005; // 0.5%

export const VOTE_SUM_BASIS =
  'Party votes are expected to account for the published total to within half a percent. A larger gap is ' +
  'reported rather than absorbed: it usually means a column was dropped or a party row was lost on the way ' +
  'in, and a total that no longer describes the rows beneath it is the one failure this ingest cannot ' +
  'survive.';

export function validateResult(result: ElectionResult, now: Date = new Date()): ResultProblem[] {
  const problems: ResultProblem[] = [];
  const blocking = (code: ResultProblemCode, message: string) =>
    problems.push({ code, severity: 'BLOCKING', message });
  const warning = (code: ResultProblemCode, message: string) =>
    problems.push({ code, severity: 'WARNING', message });

  if (result.parties.length === 0) {
    blocking('NO_PARTIES', 'The result carries no parties at all. Nothing can be allocated from it.');
  }

  const negatives = [
    ['total valid votes', result.totalValidVotes],
    ['council seats', result.totalSeats],
    ['independent ward seats', result.independentWardSeats],
    ['ward seats with no PR list', result.noPRListWardSeats],
  ].filter(([, value]) => (value as number) < 0);
  for (const [label] of negatives) {
    blocking('NEGATIVE_FIGURE', `${label} cannot be negative.`);
  }
  for (const party of result.parties) {
    if (party.votes < 0 || party.wardSeatsWon < 0) {
      blocking('NEGATIVE_FIGURE', `${party.id} has a negative vote or seat figure.`);
    }
  }

  const seen = new Set<string>();
  for (const party of result.parties) {
    if (seen.has(party.id)) {
      blocking('DUPLICATE_PARTY', `${party.id} appears more than once. One of the rows is not what it says.`);
    }
    seen.add(party.id);
  }

  const partyVotes = result.parties.reduce((sum, p) => sum + p.votes, 0);
  if (result.totalValidVotes > 0) {
    const gap = Math.abs(result.totalValidVotes - partyVotes) / result.totalValidVotes;
    if (gap > VOTE_SUM_TOLERANCE) {
      blocking(
        'VOTES_DO_NOT_SUM',
        `Party votes total ${partyVotes.toLocaleString('en-ZA')} against a published ` +
          `${result.totalValidVotes.toLocaleString('en-ZA')} — a gap of ${(gap * 100).toFixed(1)}%. ` +
          VOTE_SUM_BASIS,
      );
    }
  }

  const wardSeats =
    result.parties.reduce((sum, p) => sum + p.wardSeatsWon, 0) +
    result.independentWardSeats +
    result.noPRListWardSeats;
  if (result.totalSeats > 0 && wardSeats > result.totalSeats) {
    blocking(
      'SEATS_EXCEED_COUNCIL',
      `${wardSeats} ward seats were won in a council of ${result.totalSeats}. One of the two figures is wrong.`,
    );
  }
  // A ward-seat count above half the council is not impossible, but in a
  // mixed-member council it is unusual enough to be worth a look.
  if (result.totalSeats > 0 && wardSeats > result.totalSeats / 2 + 1) {
    warning(
      'WARD_SEATS_EXCEED_TOTAL',
      `${wardSeats} of ${result.totalSeats} seats are ward seats. In a council split roughly half and half ` +
        'that is high — check the ward column was not read as something else.',
    );
  }

  const year = now.getFullYear();
  if (result.electionYear < 1994 || result.electionYear > year + 1) {
    blocking('YEAR_IMPLAUSIBLE', `${result.electionYear} is not a plausible South African election year.`);
  }

  if (!result.provenance?.sourceDescription?.trim()) {
    blocking('MISSING_PROVENANCE', 'A result with no stated source is a number somebody typed.');
  }
  if (result.provenance?.status === 'CONFIRMED' && !result.provenance.confirmedBy?.trim()) {
    blocking(
      'CONFIRMED_WITHOUT_SIGNATORY',
      'A record marked confirmed has to say who confirmed it. Confirmation is a person, not a flag.',
    );
  }

  if (!result.uses || result.uses.length === 0) {
    blocking('NO_DECLARED_USE', 'A stored result has to say what it may be used for.');
  }

  return problems;
}

export function canStore(problems: ResultProblem[]): boolean {
  return !problems.some((p) => p.severity === 'BLOCKING');
}
