/**
 * Election Campaign OS — column mappings for published results files
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * One entry per publication format. An operator writes one while looking
 * at the file; every file in that format afterwards ingests without
 * anybody looking again.
 *
 * HOW TO ADD ONE
 *
 *  1. Run the ingest against the file. With no mapping it stops and
 *     prints every column heading the file carries.
 *  2. Add an entry below naming which of those headings hold the party
 *     code, the party name, the PR votes and the ward seats won.
 *  3. `requiredHeaders` is how this mapping is recognised. Pick headings
 *     that together identify the format — not one generic one like
 *     `Party`, which half the IEC's files carry.
 *  4. Ingest again, then compare the result against the published figures
 *     and sign it off.
 *
 * WHY THIS SHIPS NEARLY EMPTY
 *
 * Because nobody here has seen an IEC results file. The build environment
 * denies elections.org.za at CONNECT, so the columns cannot be read and
 * would have to be guessed. A registry of six plausible mappings nobody
 * has tested is worse than one honest entry: it would match a file by
 * accident, map the wrong column onto votes, and produce a result that
 * validated.
 *
 * The one entry below is the format this build *has* seen — the IEC "Seat
 * Calculation Detail" report for JB Marks 2021, transcribed by hand in
 * session 8 (`docs/nw405-seed-data.md`) and now the fixture that proves
 * the ingester end to end.
 */
import type { ColumnMapping } from './ingestResult';

/**
 * The IEC "Seat Calculation Detail" report, as a delimited export.
 *
 * The report itself is a PDF; these are the column headings of the table
 * printed on it, which is what an operator transcribing or exporting it
 * would reproduce. Marked as what it is: a mapping written against a
 * document this build holds, not against a download nobody has made.
 */
export const SEAT_CALCULATION_DETAIL: ColumnMapping = {
  id: 'iec-seat-calculation-detail',
  description:
    'IEC "Seat Calculation Detail" report table, as transcribed or exported to a delimited file. Written ' +
    'against the JB Marks 2021 report held in this build (docs/nw405-seed-data.md). Not verified against a ' +
    'file downloaded from elections.org.za — see the header.',
  partyId: 'Party Abbreviation',
  partyName: 'Party Name',
  votes: 'Valid Votes',
  wardSeatsWon: 'Ward Seats',
  requiredHeaders: ['Party Abbreviation', 'Party Name', 'Valid Votes', 'Ward Seats'],
};

export const MAPPINGS: ColumnMapping[] = [SEAT_CALCULATION_DETAIL];

export const MAPPING_REGISTRY_BASIS =
  'One mapping per publication format, written by a person looking at the file. Nothing is matched by ' +
  'column-name similarity: a file whose format is not mapped reports its columns and stops, rather than ' +
  'reading a percentage column as a vote count. Adding a mapping is a two-minute job; a wrong one is a ' +
  'result that validates and is false.';
