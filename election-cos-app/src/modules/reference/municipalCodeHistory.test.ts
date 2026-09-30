/**
 * Election Campaign OS — guards on municipal code history
 *
 * The registry's claims come from a supplied manifest. This checks the
 * ones that can be checked against the proclaimed delimitation this build
 * already holds — every retired code absent, every surviving code
 * present, Merafong City sitting in Gauteng as GT484 — so the manifest is
 * corroborated rather than believed.
 *
 * It also holds the module to its own coverage limit. The manifest covers
 * North West. A registry that let "not listed" read as "continuous" would
 * be worse than no registry, so the coverage statement is guarded too.
 */
import { describe, expect, it } from 'vitest';
import {
  CODE_REASSIGNMENTS,
  COVERAGE_BASIS,
  RETIRED_CODES,
  baselineNameFor,
  codeHistoryCoverage,
  codeMeaningAt,
  crossCycleJoinProblem,
  lgeYears,
  nameMatchesCodeForYear,
  predecessorsOf,
} from './municipalCodeHistory';
import { lookupMunicipality } from './municipalRegister';
import { validateResult, type ElectionResult } from '@/modules/ingest/electionResultSchema';

describe('the manifest’s claims, checked against the proclaimed delimitation', () => {
  it('finds every retired code genuinely absent from the 2026 baseline', () => {
    // NW391, NW395, NW401, NW402, NWDMA37. If any of these turned up in
    // the delimitation, the manifest's merger story would be wrong.
    for (const retired of RETIRED_CODES) {
      expect(lookupMunicipality(retired.code), `${retired.code} should not exist in 2026`).toBeNull();
    }
  });

  it('finds every surviving code, and every merge target, present', () => {
    for (const retired of RETIRED_CODES) {
      expect(lookupMunicipality(retired.mergedInto), `${retired.mergedInto} should exist`).not.toBeNull();
    }
    expect(baselineNameFor('NW405')).toBe('JB Marks');
    expect(baselineNameFor('NW397')).toBe('Kagisano-Molopo');
  });

  it('confirms Merafong City is a Gauteng municipality now', () => {
    // The whole NW405 reassignment rests on this. Merafong spent one
    // cycle in North West and is GT484 today.
    const reassignment = CODE_REASSIGNMENTS.find((r) => r.code === 'NW405');
    expect(reassignment?.nowKnownAs).toBe('GT484');
    const merafong = lookupMunicipality('GT484');
    expect(merafong?.name).toBe('Merafong City');
    expect(merafong?.province).toBe('Gauteng');
  });

  it('corrects the three codes a prior report had wrong', () => {
    // The manifest's Allow_Audit sheet flagged Naledi as NW395, Mamusa as
    // NW396 and Lekwa-Teemane as NW398. The delimitation says otherwise,
    // and NW398 does not exist at all.
    expect(baselineNameFor('NW392')).toBe('Naledi');
    expect(baselineNameFor('NW393')).toBe('Mamusa');
    expect(baselineNameFor('NW396')).toBe('Lekwa-Teemane');
    expect(lookupMunicipality('NW398')).toBeNull();
  });
});

describe('what a code meant in a given year', () => {
  it('reasons about the actual election years', () => {
    expect(lgeYears()).toEqual([2000, 2006, 2011, 2016, 2021, 2026]);
  });

  it('reports NW405 as Merafong City in 2006', () => {
    const meaning = codeMeaningAt('NW405', 2006);
    expect(meaning.status).toBe('REASSIGNED');
    expect(meaning.refersTo).toBe('Merafong City');
  });

  it('reports NW405 as not yet existing in 2000 and 2011', () => {
    // Formed from Ventersdorp and Tlokwe, which ran until 2011. Asking
    // for JB Marks' 2011 figures under this code must not return "same".
    for (const year of [2000, 2011]) {
      const meaning = codeMeaningAt('NW405', year);
      expect(meaning.status, `NW405 in ${year}`).toBe('NOT_YET');
      expect(meaning.explanation).toContain('NW401 and NW402');
    }
  });

  it('reports NW405 as itself for the cycles it has been JB Marks', () => {
    for (const year of [2016, 2021, 2026]) {
      expect(codeMeaningAt('NW405', year).status, `NW405 in ${year}`).toBe('SAME');
    }
    expect(crossCycleJoinProblem('NW405', 2021)).toBeNull();
  });

  it('lets a retired code stand for the years it was real', () => {
    expect(codeMeaningAt('NW401', 2011).status).toBe('SAME');
    expect(codeMeaningAt('NW401', 2016).status).toBe('RETIRED');
    expect(codeMeaningAt('NW391', 2006).status).toBe('SAME');
    expect(codeMeaningAt('NW391', 2011).status).toBe('RETIRED');
  });

  it('points at the codes a pre-merger history is actually filed under', () => {
    expect(predecessorsOf('NW405')).toEqual(['NW401', 'NW402']);
    expect(predecessorsOf('nw397')).toEqual(['NW391', 'NW395']);
    expect(predecessorsOf('NW373')).toEqual([]);
  });

  it('explains the join rather than only refusing it', () => {
    const problem = crossCycleJoinProblem('NW405', 2006);
    expect(problem).toContain('Merafong City');
    expect(problem).toContain('GT484');
    expect(problem).toContain('NW401');
    const retired = crossCycleJoinProblem('NW402', 2021);
    expect(retired).toContain('absorbed into NW405');
  });
});

describe('the name on the record has to match what the code meant', () => {
  it('accepts a 2006 NW405 result that calls itself Merafong City', () => {
    expect(nameMatchesCodeForYear('NW405', 2006, 'Merafong City')).toBe(true);
    expect(nameMatchesCodeForYear('NW405', 2006, 'Merafong City Local Municipality')).toBe(true);
  });

  it('rejects one that calls itself JB Marks', () => {
    expect(nameMatchesCodeForYear('NW405', 2006, 'JB Marks')).toBe(false);
  });

  it('has nothing to say about a year the code was itself', () => {
    expect(nameMatchesCodeForYear('NW405', 2021, 'JB Marks')).toBe(true);
    expect(nameMatchesCodeForYear('NW405', 2021, 'anything at all')).toBe(true);
  });
});

describe('validateResult consults the code history', () => {
  const result = (over: Partial<ElectionResult> = {}): ElectionResult => ({
    id: 'x',
    municipalityCode: 'NW405',
    municipalityName: 'JB Marks',
    electionYear: 2021,
    totalSeats: 67,
    totalValidVotes: 1000,
    independentWardSeats: 0,
    noPRListWardSeats: 0,
    parties: [{ id: 'A', name: 'A', votes: 1000, wardSeatsWon: 0 }],
    provenance: { sourceDescription: 'test', ingestedAt: '2026-09-30T00:00:00Z', status: 'UNCONFIRMED' },
    uses: ['SEAT_CALCULATOR_INPUT'],
    ...over,
  });

  it('passes a current-cycle result', () => {
    expect(validateResult(result())).toEqual([]);
  });

  it('blocks a 2006 Merafong result filed under the JB Marks name', () => {
    const problems = validateResult(result({ electionYear: 2006, municipalityName: 'JB Marks' }));
    const problem = problems.find((p) => p.code === 'CODE_MEANT_ANOTHER_MUNICIPALITY');
    expect(problem?.severity).toBe('BLOCKING');
    expect(problem?.message).toContain('Merafong City');
    // Names the consequence, not just the mismatch.
    expect(problem?.message).toMatch(/would appear in this municipality’s own history/i);
  });

  it('allows the same result correctly labelled, but still warns', () => {
    const problems = validateResult(result({ electionYear: 2006, municipalityName: 'Merafong City' }));
    const problem = problems.find((p) => p.code === 'CODE_MEANT_ANOTHER_MUNICIPALITY');
    expect(problem?.severity).toBe('WARNING');
    expect(problem?.message).toMatch(/do not chart it beside later results/i);
    expect(problems.some((p) => p.severity === 'BLOCKING')).toBe(false);
  });

  it('blocks a result under a code that had been retired by then', () => {
    const problems = validateResult(
      result({ municipalityCode: 'NW402', municipalityName: 'Tlokwe', electionYear: 2021 }),
    );
    const problem = problems.find((p) => p.code === 'RETIRED_MUNICIPALITY_CODE');
    expect(problem?.severity).toBe('BLOCKING');
    expect(problem?.message).toContain('NW405');
  });

  it('blocks a JB Marks result dated before JB Marks existed', () => {
    const problems = validateResult(result({ electionYear: 2011 }));
    const problem = problems.find((p) => p.code === 'RETIRED_MUNICIPALITY_CODE');
    expect(problem?.severity).toBe('BLOCKING');
    expect(problem?.message).toContain('did not exist as a municipality in 2011');
  });
});

describe('coverage is stated, not implied', () => {
  it('names the one province that has been reviewed', () => {
    expect(codeHistoryCoverage()).toEqual(['North West']);
  });

  it('says plainly that an unlisted code has not been shown to be continuous', () => {
    expect(COVERAGE_BASIS).toMatch(/North West only/i);
    expect(COVERAGE_BASIS).toMatch(/has not been shown to be continuous/i);
    expect(COVERAGE_BASIS).toMatch(/it has not been examined/i);
  });

  it('returns SAME for an unreviewed province without claiming it is safe', () => {
    // A Gauteng code reads SAME because nothing is on record, not because
    // it was checked — which is exactly what COVERAGE_BASIS exists to say.
    expect(codeMeaningAt('GT484', 2006).status).toBe('SAME');
    expect(codeHistoryCoverage()).not.toContain('Gauteng');
  });
});
