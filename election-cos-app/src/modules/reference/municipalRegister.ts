/**
 * Election Campaign OS — the IEC's own figures for every municipality
 * IC-ECOS-BUILD-2026-V2 §6.1, §8.2.
 *
 * WHAT THIS IS
 *
 * Annexure A to IEC Circular 1 of 2025 — "Number of Voters, Councillors,
 * Wards" — extracted by `tools/annexure/extract-annexure-a.py` into
 * `src/data/iec/circular-1-2025-annexure-a.json`. Two hundred and
 * fifty-eight rows: every metro, local and district municipality in
 * South Africa, with its registered voters as at 2024, the councillors
 * the MEC determined, and (for the 214 that have wards) the ward count
 * and the band the IEC publishes around the municipal average.
 *
 * WHY IT MATTERS MORE THAN ITS SIZE SUGGESTS
 *
 * Until this arrived, every external number in this build was either
 * hand-transcribed from one municipality's gazette or unsourced. The
 * acquisition registry ships four rows all marked UNCONFIRMED because
 * the build environment denies elections.org.za at CONNECT and nothing
 * could be fetched. This document did not have to be fetched — it was
 * handed over — and it is the first primary IEC source the build holds
 * that covers more than one municipality.
 *
 * It settles two things that were open:
 *
 *  1. The 15% band. `wardSizeDeviation.ts` had been comparing wards
 *     against ±15% of the municipal average on the authority of a
 *     planning note nobody could source, and said so in its own basis
 *     text. Annexure A publishes Norm, Min_Norm, Max_Norm and
 *     15%_Deviation as columns, and the extraction verifies that
 *     `norm == voters // wards`, `deviation == floor(norm * 0.15)` and
 *     `min`/`max == norm -/+ deviation` for all 214 warded rows without
 *     one exception. The band is the IEC's arithmetic, not a borrowed
 *     guess.
 *
 *  2. NW405's municipal totals. The seed was parsed from the North West
 *     provincial gazette (Provincial Notice 1300 of 2025) and sums to
 *     122,059 registered voters across 34 wards. Annexure A, produced by
 *     a different body from a different source, gives NW405 exactly
 *     122,059 voters, 34 wards and 67 councillors. Two documents
 *     agreeing to the voter is the corroboration the register's entry
 *     33.2 asked for.
 *
 * WHAT IT IS NOT
 *
 * It is not the 2026 register and it is not the 2026 determination. The
 * voter column is headed RegVoters_2024; the councillor column is the
 * MEC's 2024 determination; the document was produced in February 2025.
 * A municipality's roll moves every week and an MEC may re-determine
 * before the election. So a disagreement between this table and a
 * tenant's own figures is a question, never a contradiction — and
 * nothing in this module blocks anything. `VINTAGE_BASIS` says so, and
 * `municipalRegister.test.ts` fails if that sentence goes missing.
 */
import register from '@/data/iec/circular-1-2025-annexure-a.json';

export interface MunicipalRegisterEntry {
  province: string;
  /** A (metro), B (local) or C (district). Districts have no wards. */
  category: string;
  /** 'NW405', 'BUF', 'DC40'. */
  code: string;
  name: string;
  registeredVoters: number;
  councillors: number;
  wards?: number;
  norm?: number;
  minNorm?: number;
  maxNorm?: number;
  deviation?: number;
}

export interface MunicipalRegisterSource {
  title: string;
  circular: string;
  documentCreated: string;
  documentModified: string;
  pages: number;
  sha256: string;
  bytes: number;
  acquiredBy: string;
  notReachable: string;
}

interface RegisterFile {
  source: MunicipalRegisterSource;
  derivation: Record<string, string>;
  counts: Record<string, number | string>;
  municipalities: MunicipalRegisterEntry[];
}

const FILE = register as unknown as RegisterFile;

export const REGISTER_SOURCE: MunicipalRegisterSource = FILE.source;
export const REGISTER_ENTRIES: MunicipalRegisterEntry[] = FILE.municipalities;

export const VINTAGE_BASIS =
  'These are the IEC’s figures as at 2024, published in Annexure A to Circular 1 of 2025. They are not ' +
  'the 2026 register and not the 2026 determination: a roll moves every week, and an MEC may determine a ' +
  'different number of councillors before the election. Treat a disagreement with your own figures as a ' +
  'question about which is current, not as a finding that either is wrong. Nothing here blocks anything.';

export const BAND_BASIS =
  'The band is the IEC’s own, not this product’s. Annexure A prints a Norm (registered voters ' +
  'divided by wards, rounded down), a 15% deviation, and a minimum and maximum either side of it. Those ' +
  'four columns hold together exactly for all 214 warded municipalities in the table, which is why this ' +
  'build now quotes the band instead of asserting one. The statutory provision behind the 15% is not ' +
  'quoted here — the circular does not cite one, and this build has not read the Act.';

const BY_CODE = new Map<string, MunicipalRegisterEntry>(FILE.municipalities.map((m) => [m.code, m]));

/** The register row for a municipality code, or null if it carries none. */
export function lookupMunicipality(code: string): MunicipalRegisterEntry | null {
  return BY_CODE.get(code.trim().toUpperCase()) ?? null;
}

export interface PublishedBand {
  /** Registered voters per ward, rounded down, as the table prints it. */
  norm: number;
  minNorm: number;
  maxNorm: number;
  deviation: number;
}

/**
 * The published band for a municipality, or null where the table has
 * none — a district council, or a code that is not in the table.
 */
export function publishedBand(code: string): PublishedBand | null {
  const entry = lookupMunicipality(code);
  if (!entry || entry.norm === undefined) return null;
  return {
    norm: entry.norm,
    minNorm: entry.minNorm as number,
    maxNorm: entry.maxNorm as number,
    deviation: entry.deviation as number,
  };
}

export interface BandComparison {
  wardCode: string;
  registeredVoters: number;
  /** Below the published minimum, above the published maximum, or inside. */
  position: 'BELOW' | 'INSIDE' | 'ABOVE';
  /** Voters between this ward and the bound it is nearest to. Never negative. */
  marginToBound: number;
  /** True where the ward sits exactly on the published minimum or maximum. */
  onBound: boolean;
}

/**
 * Compare each ward against the IEC's published band.
 *
 * The bounds are inclusive: a ward carrying exactly Max_Norm voters is
 * inside the band, not outside it. The IEC prints integers, and treating
 * its own ceiling as a breach would flag the demarcation it published.
 */
export function compareToPublishedBand(
  wards: { wardCode: string; registeredVoters: number }[],
  band: PublishedBand,
): BandComparison[] {
  return wards
    .map((ward) => {
      const value = ward.registeredVoters;
      const position: BandComparison['position'] =
        value < band.minNorm ? 'BELOW' : value > band.maxNorm ? 'ABOVE' : 'INSIDE';
      const marginToBound =
        position === 'BELOW'
          ? band.minNorm - value
          : position === 'ABOVE'
            ? value - band.maxNorm
            : Math.min(value - band.minNorm, band.maxNorm - value);
      return {
        wardCode: ward.wardCode,
        registeredVoters: value,
        position,
        marginToBound,
        onBound: value === band.minNorm || value === band.maxNorm,
      };
    })
    .sort((a, b) => a.registeredVoters - b.registeredVoters);
}

export type RegisterFindingCode =
  | 'NOT_IN_REGISTER'
  | 'NO_WARDS_IN_REGISTER'
  | 'WARD_COUNT'
  | 'COUNCIL_SEATS'
  | 'REGISTERED_VOTERS'
  | 'WARD_SIZES';

export interface RegisterFinding {
  code: RegisterFindingCode;
  /**
   * CONFIRMS means the tenant's figure and the IEC's agree. DISAGREES
   * means they do not, which is a question about vintage before it is
   * anything else. UNKNOWN means the table cannot speak to it.
   */
  outcome: 'CONFIRMS' | 'DISAGREES' | 'UNKNOWN';
  message: string;
}

export interface RegisterCheckInput {
  municipalityCode: string;
  /** From the tenant's own ward records. */
  wardCount: number;
  registeredVoters: number;
  /** From Municipality Config, where one has been entered. */
  totalCouncilSeats?: number;
  wards?: { wardCode: string; registeredVoters: number }[];
}

export interface RegisterCheck {
  entry: MunicipalRegisterEntry | null;
  band: PublishedBand | null;
  findings: RegisterFinding[];
  /** Wards outside the published band, furthest out first. Empty without a band. */
  outsideBand: BandComparison[];
  /**
   * How far the tenant's roll has moved from the 2024 figure, as a signed
   * fraction. Null where the table has no figure to compare against.
   */
  rollDrift: number | null;
}

const fmt = (n: number) => n.toLocaleString('en-ZA');

/**
 * Check a tenant's municipality against the IEC's published figures.
 *
 * Deliberately produces findings for agreement as well as disagreement.
 * `reconcileSeed()` compares a tenant against itself and can only ever
 * report consistency; this is the first check in the build that can say
 * "an outside body publishes the same number", and that is worth showing
 * rather than only reporting when something is wrong.
 */
export function checkAgainstRegister(input: RegisterCheckInput): RegisterCheck {
  const entry = lookupMunicipality(input.municipalityCode);
  const findings: RegisterFinding[] = [];

  if (!entry) {
    return {
      entry: null,
      band: null,
      outsideBand: [],
      rollDrift: null,
      findings: [
        {
          code: 'NOT_IN_REGISTER',
          outcome: 'UNKNOWN',
          message:
            `${input.municipalityCode} is not one of the ${FILE.municipalities.length} codes in Annexure A. ` +
            'Either the code is entered differently here than the IEC writes it, or this is a municipality ' +
            'the table does not cover. Nothing below could be checked against it.',
        },
      ],
    };
  }

  if (entry.wards === undefined) {
    findings.push({
      code: 'NO_WARDS_IN_REGISTER',
      outcome: 'UNKNOWN',
      message:
        `${entry.code} (${entry.name}) is a district council in Annexure A, and district councils have no ` +
        'wards. Ward figures here cannot be checked against it.',
    });
  } else if (entry.wards === input.wardCount) {
    findings.push({
      code: 'WARD_COUNT',
      outcome: 'CONFIRMS',
      message: `${fmt(input.wardCount)} wards loaded, and the IEC publishes ${fmt(entry.wards)} for ${entry.code}.`,
    });
  } else {
    findings.push({
      code: 'WARD_COUNT',
      outcome: 'DISAGREES',
      message:
        `${fmt(input.wardCount)} wards are loaded here; Annexure A gives ${entry.code} ` +
        `${fmt(entry.wards)}. Check the demarcation notice you seeded from is the current one.`,
    });
  }

  if (input.totalCouncilSeats !== undefined) {
    if (input.totalCouncilSeats === entry.councillors) {
      findings.push({
        code: 'COUNCIL_SEATS',
        outcome: 'CONFIRMS',
        message:
          `${fmt(entry.councillors)} council seats in Municipality Config, and the same number in the MEC’s ` +
          'determination as published by the IEC.',
      });
    } else {
      findings.push({
        code: 'COUNCIL_SEATS',
        outcome: 'DISAGREES',
        message:
          `Municipality Config carries ${fmt(input.totalCouncilSeats)} council seats; the MEC’s ` +
          `determination in Annexure A gives ${entry.code} ${fmt(entry.councillors)}. The seat calculator ` +
          'divides by this number, so the difference changes every projection it produces.',
      });
    }
  }

  const rollDrift =
    entry.registeredVoters > 0
      ? (input.registeredVoters - entry.registeredVoters) / entry.registeredVoters
      : null;

  if (input.registeredVoters === entry.registeredVoters) {
    findings.push({
      code: 'REGISTERED_VOTERS',
      outcome: 'CONFIRMS',
      message:
        `${fmt(input.registeredVoters)} registered voters loaded, matching Annexure A’s 2024 figure for ` +
        `${entry.code} exactly.`,
    });
  } else {
    findings.push({
      code: 'REGISTERED_VOTERS',
      outcome: 'DISAGREES',
      message:
        `${fmt(input.registeredVoters)} registered voters are loaded here against Annexure A’s 2024 ` +
        `figure of ${fmt(entry.registeredVoters)}` +
        (rollDrift === null ? '' : ` — a difference of ${(rollDrift * 100).toFixed(1)}%`) +
        '. A roll moves between registration weekends, so a small difference is expected and a large one ' +
        'is worth tracing.',
    });
  }

  const band = publishedBand(entry.code);
  let outsideBand: BandComparison[] = [];
  if (band && input.wards && input.wards.length > 0) {
    const comparisons = compareToPublishedBand(input.wards, band);
    outsideBand = comparisons
      .filter((c) => c.position !== 'INSIDE')
      .sort((a, b) => b.marginToBound - a.marginToBound);
    if (outsideBand.length === 0) {
      const onBound = comparisons.filter((c) => c.onBound).map((c) => c.wardCode);
      findings.push({
        code: 'WARD_SIZES',
        outcome: 'CONFIRMS',
        message:
          `All ${comparisons.length} wards fall inside the IEC’s published band of ${fmt(band.minNorm)} to ` +
          `${fmt(band.maxNorm)} voters` +
          (onBound.length > 0 ? `, with ${onBound.join(', ')} sitting exactly on a bound` : '') +
          '.',
      });
    } else {
      findings.push({
        code: 'WARD_SIZES',
        outcome: 'DISAGREES',
        message:
          `${outsideBand.length} of ${comparisons.length} wards fall outside the IEC’s published band of ` +
          `${fmt(band.minNorm)} to ${fmt(band.maxNorm)} voters. Check those wards against the demarcation ` +
          'notice before planning canvassing rounds around them.',
      });
    }
  }

  return { entry, band, findings, outsideBand, rollDrift };
}
