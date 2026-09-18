/**
 * Election Campaign OS — turning a published results file into a record
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * WHY THIS IS MAPPING-DRIVEN RATHER THAN FORMAT-AWARE
 *
 * The obvious design is a parser that knows the IEC's column names. This
 * build cannot write one honestly: the session that built this could not
 * reach elections.org.za — the environment denies it at CONNECT — so
 * nobody here has seen a results file. A parser hardcoding
 * `PARTY_NAME,VALID_VOTES,WARD_SEATS` would be a guess wearing the shape
 * of knowledge, and the first real file would either fail loudly (lucky)
 * or map the wrong column onto votes (not).
 *
 * So the columns are declared, once, per file format, in a `ColumnMapping`
 * an operator writes while looking at the file. `mappings.ts` holds them.
 * The ingester reports what columns it actually found, which is what makes
 * writing the mapping a two-minute job rather than a guess.
 *
 * This is slower than a format-aware parser on the first file and
 * identical on every file after. It is also the only version that can be
 * built without the file in front of you, and the only one that survives
 * the IEC changing a column heading.
 *
 * WHAT IT REFUSES
 *
 *  - To ingest without a mapping. An unmapped file reports its columns and
 *    stops.
 *  - To guess a column by name similarity. `VOTES` and `VOTES_PCT` are one
 *    keystroke apart and mean entirely different things.
 *  - To store a record that fails `validateResult`. Arithmetic that does
 *    not hold is not a warning.
 *  - To mark anything CONFIRMED. Parsing is not checking; a person
 *    compares the record against the published source and signs it.
 */
import {
  canStore,
  validateResult,
  type ElectionResult,
  type ResultParty,
  type ResultProblem,
} from './electionResultSchema';

export interface ColumnMapping {
  /** Identifies the publication format this mapping was written for. */
  id: string;
  /** What the operator was looking at when they wrote it. */
  description: string;
  /** Exact header text for the party abbreviation column. */
  partyId: string;
  partyName: string;
  votes: string;
  wardSeatsWon: string;
  /**
   * Header text that must all be present for this mapping to apply. Lets
   * `chooseMapping` pick between formats without guessing.
   */
  requiredHeaders: string[];
}

export interface ResultMeta {
  municipalityCode: string;
  municipalityName: string;
  electionYear: number;
  totalSeats: number;
  totalValidVotes: number;
  independentWardSeats?: number;
  noPRListWardSeats?: number;
  sourceDescription: string;
  sourceReference?: string;
  sourceSha256?: string;
  ingestedAt: string;
}

export type IngestOutcome = 'INGESTED' | 'NO_MAPPING' | 'EMPTY_FILE' | 'ROWS_REJECTED' | 'INVALID_RESULT';

export interface RowProblem {
  /** 1-based, counting the header as row 1, so it matches a spreadsheet. */
  row: number;
  message: string;
}

export interface IngestReport {
  outcome: IngestOutcome;
  /** Every header the file actually carried, in order. */
  headersFound: string[];
  mappingUsed: string | null;
  rowsRead: number;
  rowsAccepted: number;
  rowProblems: RowProblem[];
  /** Present only when the outcome is INGESTED. */
  result: ElectionResult | null;
  problems: ResultProblem[];
  /** A sentence for the operator saying what to do next. */
  message: string;
}

/**
 * Split one line of a delimited file, honouring double quotes.
 *
 * Hand-rolled for the same reason the PDF and DOCX writers are: a party
 * name containing a comma — "Forum 4 Service Delivery, Gauteng" — is
 * exactly the row that would silently shift every column right of it.
 */
export function splitDelimited(line: string, delimiter = ','): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1; // an escaped quote inside a quoted field
      } else {
        inQuotes = !inQuotes;
      }
      // A lone quote toggles rather than throwing: a published file with
      // one stray quote should still yield its other ten thousand rows.
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Read a number as published.
 *
 * Thousands separators and whitespace are stripped; anything else is a
 * refusal rather than a coercion. `Number('12 345')` is NaN and
 * `Number('')` is 0, and the second of those is how a blank cell becomes
 * a party with no votes.
 */
export function parsePublishedNumber(raw: string): number | null {
  // \u00a0 spelt out: a published table separates thousands with a
  // non-breaking space, and a literal one in this file is invisible to
  // the next reader and trips the lint rule that exists to say so.
  const cleaned = raw.replace(/[\s,\u00a0]/g, '');
  if (cleaned === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** The mapping whose required headers are all present, or null. */
export function chooseMapping(headers: string[], mappings: ColumnMapping[]): ColumnMapping | null {
  const present = new Set(headers.map((h) => h.trim()));
  return (
    mappings.find((mapping) => mapping.requiredHeaders.every((header) => present.has(header))) ?? null
  );
}

function report(partial: Partial<IngestReport> & { outcome: IngestOutcome; message: string }): IngestReport {
  return {
    headersFound: [],
    mappingUsed: null,
    rowsRead: 0,
    rowsAccepted: 0,
    rowProblems: [],
    result: null,
    problems: [],
    ...partial,
  };
}

export function ingestResultFile(
  text: string,
  meta: ResultMeta,
  mappings: ColumnMapping[],
  delimiter = ',',
): IngestReport {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');

  if (lines.length < 2) {
    return report({
      outcome: 'EMPTY_FILE',
      message:
        'The file has no rows beneath its header. That is a file that did not download properly, not an ' +
        'election nobody voted in.',
    });
  }

  const headers = splitDelimited(lines[0], delimiter);
  const mapping = chooseMapping(headers, mappings);

  if (!mapping) {
    return report({
      outcome: 'NO_MAPPING',
      headersFound: headers,
      message:
        'No column mapping matches this file, so nothing was read from it. The columns it carries are ' +
        `listed above — add a mapping in mappings.ts naming which of them hold the party code, the party ` +
        'name, the votes and the ward seats. Nothing is guessed by column name: "VOTES" and "VOTES_PCT" ' +
        'are one keystroke apart and mean different things.',
    });
  }

  const index = (header: string) => headers.findIndex((h) => h.trim() === header);
  const columns = {
    partyId: index(mapping.partyId),
    partyName: index(mapping.partyName),
    votes: index(mapping.votes),
    wardSeatsWon: index(mapping.wardSeatsWon),
  };

  const parties: ResultParty[] = [];
  const rowProblems: RowProblem[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1; // header is row 1
    const fields = splitDelimited(lines[i], delimiter);
    const cell = (at: number) => (at >= 0 && at < fields.length ? fields[at] : '');

    const partyId = cell(columns.partyId);
    const partyName = cell(columns.partyName);
    const votes = parsePublishedNumber(cell(columns.votes));
    const wardSeats = parsePublishedNumber(cell(columns.wardSeatsWon));

    if (partyId === '' && partyName === '') {
      rowProblems.push({ row: rowNumber, message: 'No party on this row; skipped.' });
      continue;
    }
    if (votes === null) {
      rowProblems.push({
        row: rowNumber,
        message: `${partyId || partyName}: votes column read as ${JSON.stringify(cell(columns.votes))}, ` +
          'which is not a number. Row not counted.',
      });
      continue;
    }
    if (wardSeats === null) {
      rowProblems.push({
        row: rowNumber,
        message: `${partyId || partyName}: ward seats read as ${JSON.stringify(cell(columns.wardSeatsWon))}, ` +
          'which is not a number. Row not counted.',
      });
      continue;
    }

    parties.push({
      id: partyId || partyName,
      name: partyName || partyId,
      votes,
      wardSeatsWon: wardSeats,
    });
  }

  const rowsRead = lines.length - 1;

  if (parties.length === 0) {
    return report({
      outcome: 'ROWS_REJECTED',
      headersFound: headers,
      mappingUsed: mapping.id,
      rowsRead,
      rowProblems,
      message:
        `The mapping matched but not one of the ${rowsRead} rows produced a party. The columns are named ` +
        'right and hold something else — check the mapping against the file before trying again.',
    });
  }

  const result: ElectionResult = {
    id: `${meta.municipalityCode}-${meta.electionYear}`,
    municipalityCode: meta.municipalityCode,
    municipalityName: meta.municipalityName,
    electionYear: meta.electionYear,
    totalSeats: meta.totalSeats,
    totalValidVotes: meta.totalValidVotes,
    independentWardSeats: meta.independentWardSeats ?? 0,
    noPRListWardSeats: meta.noPRListWardSeats ?? 0,
    parties,
    provenance: {
      sourceDescription: meta.sourceDescription,
      sourceReference: meta.sourceReference,
      sourceSha256: meta.sourceSha256,
      ingestedAt: meta.ingestedAt,
      // Never CONFIRMED on ingest. Parsing is not checking.
      status: 'UNCONFIRMED',
    },
    uses: ['SEAT_CALCULATOR_INPUT', 'REFERENCE_RECONCILIATION'],
  };

  const problems = validateResult(result);

  if (!canStore(problems)) {
    return report({
      outcome: 'INVALID_RESULT',
      headersFound: headers,
      mappingUsed: mapping.id,
      rowsRead,
      rowsAccepted: parties.length,
      rowProblems,
      problems,
      message:
        'The rows parsed but the result does not hold together — see the problems above. Nothing was ' +
        'stored. A result whose arithmetic fails is not a result with a warning on it.',
    });
  }

  return report({
    outcome: 'INGESTED',
    headersFound: headers,
    mappingUsed: mapping.id,
    rowsRead,
    rowsAccepted: parties.length,
    rowProblems,
    result,
    problems,
    message:
      `${parties.length} of ${rowsRead} rows read into a result for ${meta.municipalityName} ` +
      `${meta.electionYear}. It is recorded as unconfirmed: compare it against the published source and ` +
      'sign it off before anybody quotes a figure from it.',
  });
}
