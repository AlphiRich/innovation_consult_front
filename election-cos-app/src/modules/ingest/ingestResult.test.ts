/**
 * Election Campaign OS — guards on results ingestion
 *
 * The fixture is the real thing. `NW405_2021_EXAMPLE` was transcribed by
 * hand in session 8 from an IEC "Seat Calculation Detail" report and has
 * been the seat calculator's starter data ever since; these tests build a
 * delimited file from it, ingest it, and assert the record that comes out
 * is the record that went in. An ingester proven against invented data
 * proves nothing about the data it will actually meet.
 *
 * The rest guard the refusals, which are the point: no mapping means no
 * read, a percentage column is never mistaken for a vote count, arithmetic
 * that does not hold is not a warning, and nothing arrives confirmed.
 */
import { describe, expect, it } from 'vitest';
import { NW405_2021_EXAMPLE } from '@/modules/analytics/nw405Example';
import { allocateSeats } from '@/modules/analytics/seatCalculator';
import {
  canStore,
  NOT_SENTIMENT_BASIS,
  RESULT_USES,
  validateResult,
  VOTE_SUM_TOLERANCE,
  type ElectionResult,
} from './electionResultSchema';
import {
  chooseMapping,
  ingestResultFile,
  parsePublishedNumber,
  splitDelimited,
  type ColumnMapping,
} from './ingestResult';
import { MAPPINGS, MAPPING_REGISTRY_BASIS, SEAT_CALCULATION_DETAIL } from './mappings';

const META = {
  municipalityCode: 'NW405',
  municipalityName: 'JB Marks Local Municipality',
  electionYear: 2021,
  totalSeats: NW405_2021_EXAMPLE.totalSeats,
  totalValidVotes: NW405_2021_EXAMPLE.totalValidVotes,
  sourceDescription: 'IEC Seat Calculation Detail report, JB Marks 2021',
  sourceReference: 'NW405.pdf',
  ingestedAt: '2026-09-18T09:00:00.000Z',
};

/** The real example, written back out in the format the mapping expects. */
function fixtureFile(): string {
  const header = 'Party Abbreviation,Party Name,Valid Votes,Ward Seats';
  const rows = NW405_2021_EXAMPLE.parties.map(
    (p) => `${p.id},"${p.name}",${p.votes.toLocaleString('en-ZA')},${p.wardSeatsWon}`,
  );
  return [header, ...rows].join('\n');
}

describe('reading a delimited line', () => {
  it('keeps a comma inside a quoted party name', () => {
    // The row that would otherwise shift every column right of it.
    expect(splitDelimited('F4SD,"Forum 4 Service Delivery, Gauteng",204,0')).toEqual([
      'F4SD',
      'Forum 4 Service Delivery, Gauteng',
      '204',
      '0',
    ]);
  });

  it('handles an escaped quote', () => {
    expect(splitDelimited('X,"The ""People\'s"" Party",10,0')[1]).toBe('The "People\'s" Party');
  });

  it('keeps empty trailing fields', () => {
    expect(splitDelimited('A,B,,')).toEqual(['A', 'B', '', '']);
  });
});

describe('reading a published number', () => {
  it('accepts the separators a published table uses', () => {
    expect(parsePublishedNumber('48 911')).toBe(48911);
    expect(parsePublishedNumber('48,911')).toBe(48911);
    expect(parsePublishedNumber('\u00a012\u00a0345 ')).toBe(12345);
  });

  it('refuses rather than coercing', () => {
    // Number('') is 0 and Number('n/a') is NaN. The first is how a blank
    // cell becomes a party with no votes, which validates and is false.
    expect(parsePublishedNumber('')).toBeNull();
    expect(parsePublishedNumber('n/a')).toBeNull();
    expect(parsePublishedNumber('48.9%')).toBeNull();
    expect(parsePublishedNumber('—')).toBeNull();
  });
});

describe('ingesting the real 2021 result', () => {
  const report = ingestResultFile(fixtureFile(), META, MAPPINGS);

  it('reads every party and loses none', () => {
    expect(report.outcome).toBe('INGESTED');
    expect(report.rowsAccepted).toBe(NW405_2021_EXAMPLE.parties.length);
    expect(report.rowProblems).toEqual([]);
    expect(report.mappingUsed).toBe(SEAT_CALCULATION_DETAIL.id);
  });

  it('reproduces the figures exactly', () => {
    const result = report.result!;
    expect(result.parties).toHaveLength(NW405_2021_EXAMPLE.parties.length);
    for (const expected of NW405_2021_EXAMPLE.parties) {
      const actual = result.parties.find((p) => p.id === expected.id);
      expect(actual, expected.id).toBeTruthy();
      expect(actual!.votes, expected.id).toBe(expected.votes);
      expect(actual!.wardSeatsWon, expected.id).toBe(expected.wardSeatsWon);
      expect(actual!.name, expected.id).toBe(expected.name);
    }
  });

  it('feeds the seat calculator and reproduces the published allocation', () => {
    // The end-to-end claim: a file goes in, and what comes out allocates
    // to the same council the IEC's own report printed.
    const fromIngest = allocateSeats({
      totalValidVotes: report.result!.totalValidVotes,
      totalSeats: report.result!.totalSeats,
      parties: report.result!.parties,
    });
    const fromExample = allocateSeats({
      totalValidVotes: NW405_2021_EXAMPLE.totalValidVotes,
      totalSeats: NW405_2021_EXAMPLE.totalSeats,
      parties: NW405_2021_EXAMPLE.parties,
    });
    expect(fromIngest.quota).toBe(fromExample.quota);
    expect(fromIngest.councilSizeFinal).toBe(fromExample.councilSizeFinal);
    expect(fromIngest.parties.map((p) => [p.id, p.totalSeats])).toEqual(
      fromExample.parties.map((p) => [p.id, p.totalSeats]),
    );
  });

  it('arrives unconfirmed, whatever the arithmetic says', () => {
    // Parsing is not checking. A person compares the record against the
    // published source and signs it.
    expect(report.result!.provenance.status).toBe('UNCONFIRMED');
    expect(report.result!.provenance.confirmedBy).toBeUndefined();
    expect(report.message).toMatch(/recorded as unconfirmed/i);
  });

  it('carries its provenance rather than a comment about it', () => {
    expect(report.result!.provenance.sourceDescription).toBe(META.sourceDescription);
    expect(report.result!.provenance.sourceReference).toBe('NW405.pdf');
    expect(report.result!.provenance.ingestedAt).toBe(META.ingestedAt);
  });
});

describe('what the ingester refuses', () => {
  it('reads nothing from a file it has no mapping for, and says what it found', () => {
    const unknown = 'PartyCode,PartyDesc,PRVotes,Seats\nANC,African National Congress,48911,24';
    const report = ingestResultFile(unknown, META, MAPPINGS);
    expect(report.outcome).toBe('NO_MAPPING');
    expect(report.result).toBeNull();
    expect(report.rowsAccepted).toBe(0);
    // The columns are reported, because that is what makes writing the
    // mapping a two-minute job instead of a guess.
    expect(report.headersFound).toEqual(['PartyCode', 'PartyDesc', 'PRVotes', 'Seats']);
  });

  it('never matches a mapping on partial header overlap', () => {
    // A file sharing one heading with a mapping is not that format.
    expect(chooseMapping(['Party Name', 'Turnout'], MAPPINGS)).toBeNull();
    expect(chooseMapping(SEAT_CALCULATION_DETAIL.requiredHeaders, MAPPINGS)).toBe(SEAT_CALCULATION_DETAIL);
  });

  it('will not read a percentage column as a vote count', () => {
    // The mapping names an exact heading. A file whose votes column holds
    // percentages under a different heading does not match at all; one
    // holding percentages under the right heading is rejected row by row
    // because "48.9%" is not a number.
    const percentages =
      'Party Abbreviation,Party Name,Valid Votes,Ward Seats\nANC,African National Congress,48.2%,24';
    const report = ingestResultFile(percentages, META, MAPPINGS);
    expect(report.outcome).toBe('ROWS_REJECTED');
    expect(report.result).toBeNull();
    expect(report.rowProblems[0].message).toMatch(/not a number/i);
  });

  it('refuses a file with no rows under its header', () => {
    const report = ingestResultFile('Party Abbreviation,Party Name,Valid Votes,Ward Seats', META, MAPPINGS);
    expect(report.outcome).toBe('EMPTY_FILE');
    expect(report.message).toMatch(/did not download properly/i);
  });

  it('numbers a problem row the way a spreadsheet does', () => {
    const file =
      'Party Abbreviation,Party Name,Valid Votes,Ward Seats\n' +
      'ANC,African National Congress,48911,24\n' +
      'DA,Democratic Alliance,n/a,9';
    const report = ingestResultFile(file, META, MAPPINGS);
    expect(report.rowProblems[0].row).toBe(3);
  });

  it('stores nothing when the arithmetic does not hold', () => {
    // Votes a long way short of the published total: a column was dropped
    // or a row was lost, and a total that stops describing its rows is
    // the failure this refuses to pass on.
    const short =
      'Party Abbreviation,Party Name,Valid Votes,Ward Seats\nANC,African National Congress,100,0';
    const report = ingestResultFile(short, META, MAPPINGS);
    expect(report.outcome).toBe('INVALID_RESULT');
    expect(report.result).toBeNull();
    expect(report.problems.map((p) => p.code)).toContain('VOTES_DO_NOT_SUM');
    expect(report.message).toMatch(/not a result with a warning on it/i);
  });
});

describe('validating a result', () => {
  const base = (): ElectionResult => ({
    id: 'NW405-2021',
    municipalityCode: 'NW405',
    municipalityName: 'JB Marks Local Municipality',
    electionYear: 2021,
    totalSeats: 67,
    totalValidVotes: 101_439,
    independentWardSeats: 0,
    noPRListWardSeats: 0,
    parties: NW405_2021_EXAMPLE.parties.map((p) => ({ ...p })),
    provenance: {
      sourceDescription: 'IEC Seat Calculation Detail report',
      ingestedAt: '2026-09-18T09:00:00.000Z',
      status: 'UNCONFIRMED',
    },
    uses: ['SEAT_CALCULATOR_INPUT'],
  });

  it('passes the real result', () => {
    const problems = validateResult(base());
    expect(problems.filter((p) => p.severity === 'BLOCKING')).toEqual([]);
    expect(canStore(problems)).toBe(true);
  });

  it('tolerates the small gap a published table carries', () => {
    // Real results routinely leave a few votes unaccounted for. A gap
    // inside the tolerance is not a finding; one outside it is.
    const nearly = base();
    nearly.totalValidVotes = Math.round(
      nearly.parties.reduce((s, p) => s + p.votes, 0) * (1 + VOTE_SUM_TOLERANCE / 2),
    );
    expect(canStore(validateResult(nearly))).toBe(true);
  });

  it('refuses a duplicate party', () => {
    const doubled = base();
    doubled.parties.push({ ...doubled.parties[0] });
    expect(validateResult(doubled).map((p) => p.code)).toContain('DUPLICATE_PARTY');
  });

  it('refuses more ward seats than the council has', () => {
    const impossible = base();
    impossible.totalSeats = 10;
    expect(validateResult(impossible).map((p) => p.code)).toContain('SEATS_EXCEED_COUNCIL');
  });

  it('refuses a result with no stated source', () => {
    const anonymous = base();
    anonymous.provenance.sourceDescription = '   ';
    expect(validateResult(anonymous).map((p) => p.code)).toContain('MISSING_PROVENANCE');
  });

  it('refuses a confirmation nobody signed', () => {
    const unsigned = base();
    unsigned.provenance.status = 'CONFIRMED';
    const problems = validateResult(unsigned);
    expect(problems.map((p) => p.code)).toContain('CONFIRMED_WITHOUT_SIGNATORY');
    expect(problems.find((p) => p.code === 'CONFIRMED_WITHOUT_SIGNATORY')!.message).toMatch(
      /confirmation is a person, not a flag/i,
    );
  });

  it('refuses a stored result that does not say what it is for', () => {
    const purposeless = base();
    purposeless.uses = [];
    expect(validateResult(purposeless).map((p) => p.code)).toContain('NO_DECLARED_USE');
  });

  it('refuses an implausible election year', () => {
    const future = base();
    future.electionYear = 2099;
    expect(validateResult(future).map((p) => p.code)).toContain('YEAR_IMPLAUSIBLE');
  });
});

describe('what an ingested result may be used for', () => {
  it('is a closed list, and sentiment is not on it', () => {
    // SOP-08 keeps doorstep sentiment and published results apart. A
    // third use added quietly here is how they would get blended.
    expect(RESULT_USES).toEqual(['SEAT_CALCULATOR_INPUT', 'REFERENCE_RECONCILIATION']);
    expect(NOT_SENTIMENT_BASIS).toMatch(/never combined with it/i);
    expect(NOT_SENTIMENT_BASIS).toMatch(/is not a forecast/i);
    for (const use of RESULT_USES) {
      expect(use).not.toMatch(/sentiment|forecast|projection/i);
    }
  });
});

describe('the mapping registry', () => {
  it('ships only formats somebody has actually looked at', () => {
    expect(MAPPINGS).toHaveLength(1);
    expect(MAPPINGS[0].id).toBe('iec-seat-calculation-detail');
    // The one entry is honest that it was written against a document this
    // build holds, not a download nobody has made.
    expect(MAPPINGS[0].description).toMatch(/Not verified against a file downloaded/i);
  });

  it('gives every mapping enough headers to identify a format', () => {
    for (const mapping of MAPPINGS) {
      expect(mapping.requiredHeaders.length, mapping.id).toBeGreaterThan(1);
      for (const column of [mapping.partyId, mapping.partyName, mapping.votes, mapping.wardSeatsWon]) {
        expect(mapping.requiredHeaders, `${mapping.id} must require ${column}`).toContain(column);
      }
    }
  });

  it('says why it is nearly empty rather than looking unfinished', () => {
    expect(MAPPING_REGISTRY_BASIS).toMatch(/reports its columns and stops/i);
    expect(MAPPING_REGISTRY_BASIS).toMatch(/a wrong one is a result that validates and is false/i);
  });

  it('has no duplicate ids', () => {
    const ids = MAPPINGS.map((m: ColumnMapping) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
