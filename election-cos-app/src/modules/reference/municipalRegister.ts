/**
 * Election Campaign OS — the proclaimed delimitation baseline
 * IC-ECOS-BUILD-2026-V2 §6.1, §8.2.
 *
 * WHAT THIS IS
 *
 * Annexure A to IEC Circular 1 of 2025 — "Number of Voters, Councillors,
 * Wards" — extracted by `tools/annexure/extract-annexure-a.py` into
 * `src/data/iec/circular-1-2025-annexure-a.json`. Two hundred and
 * fifty-eight municipalities: every metro, local and district in South
 * Africa, with the number of councillors the MEC determined and, for the
 * 214 that have wards, the ward count and the delimitation band.
 *
 * THIS IS THE SOURCE OF TRUTH, NOT A CROSS-CHECK
 *
 * It is the culmination of the delimitation cycle for the 4 November 2026
 * local government election: the Municipal Demarcation Board delimited the
 * wards, the provincial MECs for local government determined the number
 * of councillors, and this annexure is the Electoral Commission's
 * consolidation of that product — the structure against which ward and PR
 * candidates are nominated and against which seats will be allocated.
 *
 * It is final for this cycle. Nothing in this build treats a
 * municipality's ward count or council size as an open question, offers
 * an operator a way to override it, or carries a second copy of it that
 * could drift. Where a tenant's own figures disagree with the baseline,
 * the tenant's figures are wrong and the application says so.
 *
 * WHAT THE DOCUMENT CONTAINS, AND THEREFORE WHAT THIS MODULE SERVES
 *
 * Municipality-level structure: category, councillors, wards, the
 * registered-voter total the delimitation was drawn against, and the
 * band. Ward-by-ward voter splits and voting-district schedules are not
 * columns in it — those are in each province's MDB delimitation notice,
 * which is where this build's NW405 ward and VD records already come
 * from (`docs/nw405-seed-data.md`). The two fit together: the annexure
 * fixes how many wards a municipality has, the provincial notice says
 * where they are. `wardCountMatchesBaseline()` is the join between them.
 *
 * CATEGORY IS NOT DECORATION
 *
 * A category C district council is not a small category B. It has no
 * wards, and its seats are allocated under Schedule 2 of the Municipal
 * Structures Act, not the Schedule 1 Item 12 formula this build's seat
 * calculator implements. Running the Schedule 1 calculator on a district
 * would produce a confident, wrong answer, so `quotaScheduleFor()` names
 * the family and `assertSchedule1Applies()` refuses. That refusal is
 * structural rather than documentary on purpose — the same class of
 * defect as the Item 16 overhang gap this project has already met once.
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

/**
 * The delimitation version every seat calculation in this build is pinned
 * to.
 *
 * Ward boundaries and council sizes are not static across cycles, so a
 * seat figure that does not name the delimitation it was computed against
 * is not reproducible. A 2021 result belongs to the 2021 delimitation; a
 * 2026 projection belongs to this one.
 */
export const DELIMITATION_VERSION = {
  id: 'IEC-CIRCULAR-1-2025-ANNEXURE-A',
  description: 'Annexure A to IEC Circular 1 of 2025 — Number of Voters, Councillors, Wards',
  electoralEvent: 'LGE-2026-11-04',
  /** See docs/iec-election-timetable-2026.md. */
  electionDate: '2026-11-04',
  receivedOn: '2026-09-18',
} as const;

export const BASELINE_AUTHORITY =
  'The ward counts and council sizes here are the proclaimed delimitation for the local government ' +
  'election of 4 November 2026: wards delimited by the Municipal Demarcation Board, councillor numbers ' +
  'determined by the provincial MECs for local government, and consolidated by the Electoral Commission ' +
  'in Annexure A to Circular 1 of 2025. Ward and PR candidates are nominated against this structure and ' +
  'seats will be allocated against it. It is final for this cycle and this application treats it as ' +
  'authoritative: where your own figures disagree with it, your figures are wrong.';

export const ROLL_BASIS =
  'The registered-voter figure is the roll the delimitation was drawn against. The roll itself keeps ' +
  'growing — every registration weekend adds to it — so a municipality carrying more voters today than ' +
  'the annexure records is the ordinary case and not a discrepancy. The number of wards and the number of ' +
  'councillors do not move with it.';

export const BAND_BASIS =
  'A ward’s registered voters may not vary from the municipal norm — the roll divided by the number of ' +
  'wards — by more than 15%. The delimitation was drawn to that criterion and Annexure A publishes the ' +
  'resulting norm, minimum and maximum for every warded municipality. A seeded ward outside the band ' +
  'therefore indicates an error in what was captured here, not in the delimitation.';

const BY_CODE = new Map<string, MunicipalRegisterEntry>(FILE.municipalities.map((m) => [m.code, m]));

/** The register row for a municipality code, or null if it carries none. */
export function lookupMunicipality(code: string): MunicipalRegisterEntry | null {
  return BY_CODE.get(code.trim().toUpperCase()) ?? null;
}

export type MunicipalCategory = 'A' | 'B' | 'C';

/**
 * Which Schedule of the Municipal Structures Act allocates this
 * municipality's seats.
 *
 * Metros and locals: Schedule 1, Item 12 — the quota formula
 * `seatCalculator.ts` implements. Districts: Schedule 2, a different
 * family with no independent-councillor term, which this build does not
 * implement.
 */
export type QuotaSchedule = 'SCHEDULE_1' | 'SCHEDULE_2';

export function quotaScheduleFor(category: string): QuotaSchedule {
  return category === 'C' ? 'SCHEDULE_2' : 'SCHEDULE_1';
}

export const SCHEDULE_2_BASIS =
  'District (category C) councils allocate seats under Schedule 2 of the Municipal Structures Act, which ' +
  'is a different formula family from the Schedule 1 Item 12 quota this calculator implements. Running ' +
  'this calculator on a district council would produce a confident and wrong answer, so it refuses ' +
  'instead. Schedule 2 is not implemented in this build.';

export interface DelimitationBaseline {
  version: typeof DELIMITATION_VERSION;
  code: string;
  name: string;
  province: string;
  category: MunicipalCategory;
  quotaSchedule: QuotaSchedule;
  /** Total council seats, as determined by the MEC. */
  councillors: number;
  /** Ward seats. Undefined for a district council, which has no wards. */
  wardSeats?: number;
  /**
   * PR seats — always derived as councillors minus ward seats, never
   * stored and never entered. Two hand-kept copies of this number is how
   * a PR list is drawn to the wrong length.
   *
   * Undefined for a district council: its composition is part-elected and
   * part-delegated under Schedule 2, and this build does not model it.
   */
  prSeats?: number;
  /** The roll the delimitation was drawn against. */
  registeredVoters: number;
  /** Registered voters per ward, as published. Undefined for a district. */
  norm?: number;
  minNorm?: number;
  maxNorm?: number;
  deviation?: number;
}

/**
 * The proclaimed baseline for a municipality, or null where the annexure
 * carries no such code.
 */
export function delimitationFor(code: string): DelimitationBaseline | null {
  const entry = lookupMunicipality(code);
  if (!entry) return null;
  const category = entry.category as MunicipalCategory;
  const wardSeats = entry.wards;
  return {
    version: DELIMITATION_VERSION,
    code: entry.code,
    name: entry.name,
    province: entry.province,
    category,
    quotaSchedule: quotaScheduleFor(category),
    councillors: entry.councillors,
    wardSeats,
    prSeats: wardSeats === undefined ? undefined : entry.councillors - wardSeats,
    registeredVoters: entry.registeredVoters,
    norm: entry.norm,
    minNorm: entry.minNorm,
    maxNorm: entry.maxNorm,
    deviation: entry.deviation,
  };
}

/**
 * Throw unless the Schedule 1 seat calculator may be run against this
 * municipality.
 *
 * Deliberately a throw rather than a returned flag: a caller that ignores
 * a flag still gets a number, and a wrong seat projection for a district
 * council is exactly the kind of confident output this product exists not
 * to produce. An unknown code is allowed through — a what-if scenario for
 * a municipality nobody has named is a legitimate use of the calculator.
 */
export function assertSchedule1Applies(code: string): void {
  const baseline = delimitationFor(code);
  if (baseline && baseline.quotaSchedule !== 'SCHEDULE_1') {
    throw new Error(
      `${baseline.code} (${baseline.name}) is a category ${baseline.category} district council. ` +
        SCHEDULE_2_BASIS,
    );
  }
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
 * Compare each ward against the published band.
 *
 * The bounds are inclusive: a ward carrying exactly Max_Norm voters is
 * inside the band. The annexure prints integers, and treating the
 * published ceiling as a breach would flag the delimitation itself.
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

/** Does a tenant's loaded ward count match the proclaimed delimitation? */
export function wardCountMatchesBaseline(code: string, wardCount: number): boolean | null {
  const baseline = delimitationFor(code);
  if (!baseline || baseline.wardSeats === undefined) return null;
  return baseline.wardSeats === wardCount;
}

export type RegisterFindingCode =
  | 'NOT_IN_REGISTER'
  | 'DISTRICT_COUNCIL'
  | 'WARD_COUNT'
  | 'COUNCIL_SEATS'
  | 'PR_SEATS'
  | 'REGISTERED_VOTERS'
  | 'WARD_SIZES';

export interface RegisterFinding {
  code: RegisterFindingCode;
  /**
   * CONFIRMS — the tenant's figure matches the proclaimed baseline.
   * CONTRADICTS — it does not, and the baseline is the one that is right.
   * DRIFT — a figure that is expected to move, reported for information.
   * UNKNOWN — the baseline cannot speak to it.
   */
  outcome: 'CONFIRMS' | 'CONTRADICTS' | 'DRIFT' | 'UNKNOWN';
  /**
   * BLOCKING means campaign output computed from this would be wrong.
   * Reserved for figures the delimitation fixes: ward count and council
   * size. A roll difference is never blocking.
   */
  severity: 'BLOCKING' | 'WARNING' | 'INFO';
  message: string;
}

export interface RegisterCheckInput {
  municipalityCode: string;
  /** From the tenant's own ward records. */
  wardCount: number;
  registeredVoters: number;
  /** From Municipality Config, where one has been entered. */
  totalCouncilSeats?: number;
  /** From Municipality Config. Should always be councillors minus wards. */
  prSeats?: number;
  wards?: { wardCode: string; registeredVoters: number }[];
}

export interface RegisterCheck {
  baseline: DelimitationBaseline | null;
  entry: MunicipalRegisterEntry | null;
  band: PublishedBand | null;
  findings: RegisterFinding[];
  /** Findings that make campaign output wrong. Empty is the goal state. */
  blocking: RegisterFinding[];
  /** True when nothing contradicts the proclaimed baseline. */
  alignedToBaseline: boolean;
  /** Wards outside the published band, furthest out first. Empty without a band. */
  outsideBand: BandComparison[];
  /**
   * How far the tenant's roll has grown past the delimitation roll, as a
   * signed fraction. Null where there is no figure to compare against.
   */
  rollDrift: number | null;
}

const fmt = (n: number) => n.toLocaleString('en-ZA');

/**
 * Check a tenant's municipality against the proclaimed delimitation.
 *
 * Reports agreement as well as disagreement. `reconcileSeed()` compares a
 * tenant against itself and can only ever report internal consistency;
 * this says whether what has been captured matches the structure the
 * election will actually be run on.
 */
export function checkAgainstRegister(input: RegisterCheckInput): RegisterCheck {
  const entry = lookupMunicipality(input.municipalityCode);
  const baseline = entry ? delimitationFor(entry.code) : null;
  const findings: RegisterFinding[] = [];

  const done = (): RegisterCheck => {
    const blocking = findings.filter((f) => f.severity === 'BLOCKING');
    return {
      baseline,
      entry,
      band: entry ? publishedBand(entry.code) : null,
      findings,
      blocking,
      alignedToBaseline: blocking.length === 0,
      outsideBand,
      rollDrift,
    };
  };

  let outsideBand: BandComparison[] = [];
  let rollDrift: number | null = null;

  if (!entry || !baseline) {
    findings.push({
      code: 'NOT_IN_REGISTER',
      outcome: 'UNKNOWN',
      severity: 'BLOCKING',
      message:
        `${input.municipalityCode} is not one of the ${FILE.municipalities.length} municipality codes in the ` +
        'proclaimed delimitation. Every municipality contesting on 4 November is in that list, so this is a ' +
        'code entered differently here than the Commission writes it. Correct it in Municipality Config ' +
        'before anything is computed from it.',
    });
    return done();
  }

  if (baseline.wardSeats === undefined) {
    findings.push({
      code: 'DISTRICT_COUNCIL',
      outcome: 'UNKNOWN',
      severity: 'WARNING',
      message:
        `${baseline.code} (${baseline.name}) is a category C district council. It has no wards, and its ` +
        'seats are allocated under Schedule 2. ' +
        SCHEDULE_2_BASIS,
    });
  } else if (baseline.wardSeats === input.wardCount) {
    findings.push({
      code: 'WARD_COUNT',
      outcome: 'CONFIRMS',
      severity: 'INFO',
      message:
        `${fmt(input.wardCount)} wards loaded, matching the ${fmt(baseline.wardSeats)} wards delimited for ` +
        `${baseline.code} for this election.`,
    });
  } else {
    findings.push({
      code: 'WARD_COUNT',
      outcome: 'CONTRADICTS',
      severity: 'BLOCKING',
      message:
        `${fmt(input.wardCount)} wards are loaded here. ${baseline.code} has ${fmt(baseline.wardSeats)} ` +
        'wards for this election. Every ward-level figure in this application — coverage, canvassing ' +
        'targets, the ward seats fed to the seat calculator — is computed over the wards that are loaded, ' +
        'so all of them are wrong until this matches.',
    });
  }

  if (input.totalCouncilSeats !== undefined) {
    if (input.totalCouncilSeats === baseline.councillors) {
      findings.push({
        code: 'COUNCIL_SEATS',
        outcome: 'CONFIRMS',
        severity: 'INFO',
        message:
          `${fmt(baseline.councillors)} council seats, matching the MEC’s determination for ` +
          `${baseline.code}.`,
      });
    } else {
      findings.push({
        code: 'COUNCIL_SEATS',
        outcome: 'CONTRADICTS',
        severity: 'BLOCKING',
        message:
          `Municipality Config carries ${fmt(input.totalCouncilSeats)} council seats. The MEC determined ` +
          `${fmt(baseline.councillors)} for ${baseline.code}. The seat quota divides by this number, so ` +
          'every projection this application produces is wrong until it matches.',
      });
    }
  }

  if (input.prSeats !== undefined && baseline.prSeats !== undefined && input.prSeats !== baseline.prSeats) {
    findings.push({
      code: 'PR_SEATS',
      outcome: 'CONTRADICTS',
      severity: 'BLOCKING',
      message:
        `${fmt(input.prSeats)} PR seats are recorded against ${fmt(baseline.councillors)} council seats and ` +
        `${fmt(baseline.wardSeats as number)} wards, which leaves ${fmt(baseline.prSeats)}. A PR list drawn ` +
        'to the wrong length is rejected at nomination.',
    });
  }

  rollDrift =
    baseline.registeredVoters > 0
      ? (input.registeredVoters - baseline.registeredVoters) / baseline.registeredVoters
      : null;

  if (input.registeredVoters === baseline.registeredVoters) {
    findings.push({
      code: 'REGISTERED_VOTERS',
      outcome: 'CONFIRMS',
      severity: 'INFO',
      message:
        `${fmt(input.registeredVoters)} registered voters loaded, matching the roll the delimitation was ` +
        `drawn against for ${baseline.code} exactly.`,
    });
  } else {
    findings.push({
      code: 'REGISTERED_VOTERS',
      outcome: 'DRIFT',
      severity: 'INFO',
      message:
        `${fmt(input.registeredVoters)} registered voters are loaded here; the delimitation was drawn ` +
        `against ${fmt(baseline.registeredVoters)}` +
        (rollDrift === null ? '' : ` (${rollDrift >= 0 ? '+' : ''}${(rollDrift * 100).toFixed(1)}%)`) +
        '. ' +
        ROLL_BASIS,
    });
  }

  const band = publishedBand(baseline.code);
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
        severity: 'INFO',
        message:
          `All ${comparisons.length} wards fall inside the delimitation band of ${fmt(band.minNorm)} to ` +
          `${fmt(band.maxNorm)} voters` +
          (onBound.length > 0 ? `, with ${onBound.join(', ')} sitting exactly on a bound` : '') +
          '.',
      });
    } else {
      findings.push({
        code: 'WARD_SIZES',
        outcome: 'CONTRADICTS',
        severity: 'WARNING',
        message:
          `${outsideBand.length} of ${comparisons.length} wards fall outside the delimitation band of ` +
          `${fmt(band.minNorm)} to ${fmt(band.maxNorm)} voters. Check what was captured for those wards ` +
          'against the provincial delimitation notice.',
      });
    }
  }

  return done();
}
