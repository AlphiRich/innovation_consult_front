/**
 * Election Campaign OS — municipal codes do not mean one thing forever
 * IC-ECOS-BUILD-2026-V2 §8.2.
 *
 * THE FAILURE THIS PREVENTS
 *
 * `NW405` is JB Marks. It is also, in the IEC's 2006 North West results
 * file, **Merafong City** — a different municipality, with 26 wards, that
 * was moved to Gauteng and is now `GT484`. A campaign that pulls "NW405
 * 2006" into a trend line beside NW405 2021 has put a Gauteng
 * municipality's history under JB Marks' name, and nothing about the
 * result will look wrong: the code matches, the province matches, the
 * arithmetic closes.
 *
 * This is the one defect class in this area that verification cannot
 * catch, because both records are correct. Only the join is wrong. So the
 * discontinuities are data, and `validateResult()` consults them.
 *
 * WHERE THIS COMES FROM
 *
 * `NW_07_Repository_Manifest.xlsx`, supplied 30 September 2026 and
 * compiled from the IEC's own 2000–2021 North West results files and the
 * MDB's final 2026 ward layer. Its `Code_Changes` sheet names each
 * discontinuity and the IEC label it is visible in.
 *
 * WHAT IS VERIFIED AND WHAT IS TAKEN ON THE MANIFEST'S WORD
 *
 * Verified here, against the proclaimed delimitation this build already
 * holds: every retired code below is genuinely absent from the 2026
 * baseline, every surviving code is genuinely present, and Merafong City
 * is genuinely `GT484` in Gauteng. `municipalCodeHistory.test.ts` asserts
 * all of that from `circular-1-2025-annexure-a.json` rather than trusting
 * this comment.
 *
 * Taken on the manifest's word: the specific election years, and the
 * per-year ward counts (which are recorded in
 * `docs/nw-repository-manifest-review.md` and deliberately not imported
 * as application data — this build holds none of the 2000–2021 IEC files
 * and cannot check them).
 *
 * COVERAGE IS NORTH WEST ONLY, AND SILENCE MEANS NOTHING
 *
 * The manifest covers one province. A code absent from the registry below
 * has *not* been shown to be continuous — it has not been looked at.
 * `codeHistoryCoverage()` says which provinces have been reviewed so that
 * a caller can tell "no discontinuity" from "no information", and the
 * problem messages say so too. A registry that implied national coverage
 * would be worse than no registry.
 */
import { lookupMunicipality } from './municipalRegister';

export const COVERAGE_BASIS =
  'Municipal code changes have been reviewed for North West only, from a repository manifest compiled off ' +
  'the IEC’s 2000–2021 results files. A code that is not listed as discontinuous has not been shown ' +
  'to be continuous — it has not been examined. Before joining results across election years for any ' +
  'other province, check that province’s codes the same way.';

/** Provinces whose code history has actually been reviewed. */
export const REVIEWED_PROVINCES = ['North West'] as const;

export function codeHistoryCoverage(): readonly string[] {
  return REVIEWED_PROVINCES;
}

/**
 * A code that meant a different municipality in a given election year.
 *
 * `years` is the set of local government election years in which the code
 * carried the other meaning — listed rather than given as a range,
 * because Merafong's spell in North West was a single cycle.
 */
export interface CodeReassignment {
  code: string;
  years: number[];
  /** What the code actually referred to in those years. */
  meantInstead: string;
  /** Where that municipality's history belongs now, if it still exists. */
  nowKnownAs?: string;
  explanation: string;
}

/**
 * A code that has been retired: valid up to and including `lastUsedYear`,
 * absent afterwards.
 */
export interface RetiredCode {
  code: string;
  formerName: string;
  lastUsedYear: number;
  /** The code that absorbed it. */
  mergedInto: string;
  explanation: string;
}

export const CODE_REASSIGNMENTS: CodeReassignment[] = [
  {
    code: 'NW405',
    years: [2006],
    meantInstead: 'Merafong City',
    nowKnownAs: 'GT484',
    explanation:
      'In the IEC’s 2006 North West results, NW405 is Merafong City — 26 wards — which was ' +
      'subsequently moved to Gauteng and is now GT484. NW405 means JB Marks from 2016 onward, formed by ' +
      'merging Ventersdorp (NW401) and Tlokwe (NW402). JB Marks history before 2016 is NW401 plus NW402; ' +
      'the 2006 NW405 rows belong to Gauteng and must be excluded.',
  },
];

export const RETIRED_CODES: RetiredCode[] = [
  {
    code: 'NW391',
    formerName: 'Kagisano',
    lastUsedYear: 2006,
    mergedInto: 'NW397',
    explanation: 'Kagisano merged with Molopo (NW395) to form Kagisano-Molopo (NW397), first seen in 2011.',
  },
  {
    code: 'NW395',
    formerName: 'Molopo',
    lastUsedYear: 2006,
    mergedInto: 'NW397',
    explanation:
      'Molopo merged with Kagisano (NW391) to form Kagisano-Molopo (NW397). For 2000 and 2006, aggregate ' +
      'NW391 and NW395 to get a comparable figure for NW397.',
  },
  {
    code: 'NW401',
    formerName: 'Ventersdorp',
    lastUsedYear: 2011,
    mergedInto: 'NW405',
    explanation: 'Ventersdorp merged with Tlokwe (NW402) to form JB Marks (NW405) from 2016.',
  },
  {
    code: 'NW402',
    formerName: 'Tlokwe / Potchefstroom',
    lastUsedYear: 2011,
    mergedInto: 'NW405',
    explanation: 'Tlokwe merged with Ventersdorp (NW401) to form JB Marks (NW405) from 2016.',
  },
  {
    code: 'NWDMA37',
    formerName: 'Pilanesberg National Park district management area',
    lastUsedYear: 2000,
    mergedInto: 'DC37',
    explanation:
      'A district management area, not a municipality: it carried no wards and appears in the 2000 results ' +
      'only. District management areas were abolished.',
  },
];

/**
 * The codes a municipality's pre-merger history is actually filed under.
 *
 * Asking for JB Marks' 2011 figures by code NW405 returns nothing, which
 * reads as "no data" rather than "look under two other codes".
 */
export const PREDECESSOR_CODES: Record<string, string[]> = {
  NW405: ['NW401', 'NW402'],
  NW397: ['NW391', 'NW395'],
};

export function predecessorsOf(code: string): string[] {
  return PREDECESSOR_CODES[code.trim().toUpperCase()] ?? [];
}

export interface CodeMeaning {
  code: string;
  year: number;
  /**
   * SAME — nothing on record says this code meant anything else.
   * REASSIGNED — it referred to a different municipality that year.
   * RETIRED — it had ceased to exist by that year.
   * NOT_YET — it did not exist yet that year.
   */
  status: 'SAME' | 'REASSIGNED' | 'RETIRED' | 'NOT_YET';
  /** What the code referred to, where this registry knows. */
  refersTo?: string;
  explanation?: string;
}

const SA_LGE_YEARS = [2000, 2006, 2011, 2016, 2021, 2026];

/** The local government election years this registry reasons about. */
export function lgeYears(): number[] {
  return [...SA_LGE_YEARS];
}

export function codeMeaningAt(code: string, year: number): CodeMeaning {
  const upper = code.trim().toUpperCase();

  const reassigned = CODE_REASSIGNMENTS.find((r) => r.code === upper && r.years.includes(year));
  if (reassigned) {
    return {
      code: upper,
      year,
      status: 'REASSIGNED',
      refersTo: reassigned.meantInstead,
      explanation: reassigned.explanation,
    };
  }

  const retired = RETIRED_CODES.find((r) => r.code === upper);
  if (retired) {
    if (year > retired.lastUsedYear) {
      return {
        code: upper,
        year,
        status: 'RETIRED',
        refersTo: retired.formerName,
        explanation: retired.explanation,
      };
    }
    return { code: upper, year, status: 'SAME', refersTo: retired.formerName };
  }

  // A code that exists in the proclaimed baseline but was created by a
  // merger: before that merger it did not refer to anything.
  const predecessors = predecessorsOf(upper);
  if (predecessors.length > 0) {
    const absorbed = RETIRED_CODES.filter((r) => predecessors.includes(r.code));
    const createdAfter = Math.max(...absorbed.map((r) => r.lastUsedYear));
    if (year <= createdAfter && !CODE_REASSIGNMENTS.some((r) => r.code === upper && r.years.includes(year))) {
      return {
        code: upper,
        year,
        status: 'NOT_YET',
        explanation:
          `${upper} was formed by merging ${predecessors.join(' and ')} and did not exist as a ` +
          `municipality in ${year}. Its history for that year is filed under those codes.`,
      };
    }
  }

  return { code: upper, year, status: 'SAME' };
}

/**
 * The sentence to put in front of somebody about to join this code across
 * election years, or null when there is nothing to say.
 */
export function crossCycleJoinProblem(code: string, year: number): string | null {
  const meaning = codeMeaningAt(code, year);
  if (meaning.status === 'SAME') return null;
  if (meaning.status === 'REASSIGNED') {
    const reassignment = CODE_REASSIGNMENTS.find((r) => r.code === meaning.code)!;
    return (
      `In ${year}, ${meaning.code} referred to ${meaning.refersTo}, not to the municipality it names today` +
      (reassignment.nowKnownAs ? ` (now ${reassignment.nowKnownAs})` : '') +
      `. ${meaning.explanation}`
    );
  }
  if (meaning.status === 'RETIRED') {
    const retired = RETIRED_CODES.find((r) => r.code === meaning.code)!;
    return (
      `${meaning.code} (${retired.formerName}) no longer existed in ${year}; it was absorbed into ` +
      `${retired.mergedInto} after ${retired.lastUsedYear}. ${retired.explanation}`
    );
  }
  return meaning.explanation ?? null;
}

/**
 * Is the name on a result consistent with what its code meant that year?
 *
 * A 2006 Merafong City result stored under NW405 is not wrong — that is
 * what the IEC published. Storing it under the name "JB Marks" is. So the
 * check is on the pairing, not on the code alone.
 */
export function nameMatchesCodeForYear(code: string, year: number, municipalityName: string): boolean {
  const meaning = codeMeaningAt(code, year);
  if (meaning.status !== 'REASSIGNED' || !meaning.refersTo) return true;
  const given = municipalityName.trim().toLowerCase();
  const expected = meaning.refersTo.toLowerCase();
  return given.includes(expected) || expected.includes(given);
}

/**
 * The name the proclaimed 2026 baseline gives a code, for the common case
 * of checking a current-cycle record reads right.
 */
export function baselineNameFor(code: string): string | null {
  return lookupMunicipality(code)?.name ?? null;
}
