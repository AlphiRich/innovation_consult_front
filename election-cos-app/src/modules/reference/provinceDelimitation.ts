/**
 * Election Campaign OS — the delimitation, province by province
 * IC-ECOS-BUILD-2026-V2 §6.1, §8.2.
 *
 * WHY THIS EXISTS
 *
 * The supplied repository manifest covered North West and listed "the
 * other five provinces" as open work. This is the part of that work that
 * can be done from a primary source already in hand rather than from
 * files nobody has fetched: the proclaimed delimitation
 * (`circular-1-2025-annexure-a.json`) covers all nine provinces, so every
 * province's ward count, council sizes and district structure are already
 * here. They only needed deriving and checking.
 *
 * What it does *not* do is invent the historical results the manifest's
 * pipeline was for. Ward counts for 2026 are here; 2000–2021 results for
 * any province are not, and no amount of restructuring makes them appear.
 * `tools/source-acquisition/sources.json` now carries the endpoints for
 * every province so that work is a download away rather than a research
 * project — see `docs/nw-repository-manifest-review.md`.
 *
 * THE CHECK THAT MAKES THIS WORTH SHIPPING
 *
 * A district municipality's registered voters are the sum of the local
 * municipalities inside it. The annexure carries no column saying which
 * local sits in which district — but the codes do: `NW371` sits in `DC37`,
 * `EC441` in `DC44`, `WC011` in `DC1`. Two digits after the province
 * prefix are the district number.
 *
 * That is an inference, so it is not asserted — it is tested. Deriving
 * district membership from the codes and summing gives **44 independent
 * arithmetic checks**, one per district, over all 206 local
 * municipalities. Every one reconciles to the voter. Two things follow:
 * the code-to-district mapping is right, and the annexure's district rows
 * and local rows are mutually consistent across the whole country. A
 * single mistranscribed voter figure anywhere would break exactly one
 * district and name it.
 *
 * This is the national version of the check session 35 could only make at
 * the level of the whole table.
 *
 * METROS SIT IN NO DISTRICT
 *
 * A category A metro has exclusive authority over its area and belongs to
 * no district council. Its code carries no district digits, so
 * `districtCodeFor()` returns null rather than guessing — and the
 * containment check covers the 206 locals, not the 8 metros.
 */
import { REGISTER_ENTRIES, type MunicipalRegisterEntry } from './municipalRegister';

export const CONTAINMENT_BASIS =
  'Each district municipality’s registered voters are the sum of the local municipalities inside it. ' +
  'The annexure carries no column linking the two, so membership is derived from the municipal code — ' +
  'the two digits after the province prefix are the district number — and then checked by summing. All ' +
  '44 districts reconcile to the voter across all 206 local municipalities, which confirms both the ' +
  'mapping and the table’s internal consistency.';

export const METRO_BASIS =
  'Metropolitan (category A) municipalities have exclusive authority over their areas and sit in no ' +
  'district council. There are eight, and they are excluded from district arithmetic rather than assigned ' +
  'to a district by guesswork.';

/** The nine provinces, as the annexure spells them. */
export const PROVINCES: string[] = [...new Set(REGISTER_ENTRIES.map((m) => m.province))].sort();

/**
 * The district a local municipality belongs to, derived from its code.
 *
 * `NW371` → `DC37`, `EC101` → `DC10`, `WC011` → `DC1`, `KZN212` → `DC21`.
 * Returns null for a metro (no district digits) and for anything that does
 * not match the pattern — never a guess.
 */
export function districtCodeFor(code: string): string | null {
  const match = /^([A-Z]{2,3})(\d{2})\d+$/.exec(code.trim().toUpperCase());
  if (!match) return null;
  // Leading zeros are not carried on the district code: WC011 is in DC1,
  // not DC01.
  const number = String(Number(match[2]));
  return `DC${number}`;
}

export interface DistrictContainment {
  districtCode: string;
  districtName: string;
  province: string;
  /** The district's own figure, as published. */
  publishedRegisteredVoters: number;
  /** The sum of the locals derived as belonging to it. */
  sumOfLocals: number;
  localCodes: string[];
  wards: number;
  reconciles: boolean;
}

/**
 * Every district, with the locals derived as sitting inside it.
 *
 * Districts are returned even when nothing maps to them, so a district
 * with no members shows as a failure rather than being absent.
 */
export function districtContainment(): DistrictContainment[] {
  const districts = REGISTER_ENTRIES.filter((m) => m.category === 'C');
  const byDistrict = new Map<string, MunicipalRegisterEntry[]>();
  for (const local of REGISTER_ENTRIES.filter((m) => m.category === 'B')) {
    const code = districtCodeFor(local.code);
    if (code === null) continue;
    byDistrict.set(code, [...(byDistrict.get(code) ?? []), local]);
  }

  return districts
    .map((district) => {
      const members = byDistrict.get(district.code) ?? [];
      const sumOfLocals = members.reduce((sum, m) => sum + m.registeredVoters, 0);
      return {
        districtCode: district.code,
        districtName: district.name,
        province: district.province,
        publishedRegisteredVoters: district.registeredVoters,
        sumOfLocals,
        localCodes: members.map((m) => m.code).sort(),
        wards: members.reduce((sum, m) => sum + (m.wards ?? 0), 0),
        reconciles: members.length > 0 && sumOfLocals === district.registeredVoters,
      };
    })
    .sort((a, b) => a.districtCode.localeCompare(b.districtCode));
}

/** Local municipalities whose code maps to no district in the annexure. */
export function unmappedLocals(): string[] {
  const districtCodes = new Set(REGISTER_ENTRIES.filter((m) => m.category === 'C').map((m) => m.code));
  return REGISTER_ENTRIES.filter((m) => m.category === 'B')
    .filter((m) => {
      const code = districtCodeFor(m.code);
      return code === null || !districtCodes.has(code);
    })
    .map((m) => m.code);
}

export interface ProvinceDelimitation {
  province: string;
  /** Category A. Zero in four provinces. */
  metros: number;
  /** Category B. */
  locals: number;
  /** Category C. */
  districts: number;
  /** Ward seats across metros and locals. Districts have none. */
  wards: number;
  /** Council seats across metros and locals, excluding district councils. */
  councillors: number;
  /** PR seats: councillors less wards. */
  prSeats: number;
  /**
   * Registered voters across metros and locals only. District rows repeat
   * their locals' voters, so including them would double count.
   */
  registeredVoters: number;
  /** Council seats on the district councils, reported separately. */
  districtCouncillors: number;
}

export function provinceSummary(province: string): ProvinceDelimitation | null {
  const wanted = province.trim().toLowerCase();
  const entries = REGISTER_ENTRIES.filter((m) => m.province.toLowerCase() === wanted);
  if (entries.length === 0) return null;

  const direct = entries.filter((m) => m.category === 'A' || m.category === 'B');
  const wards = direct.reduce((sum, m) => sum + (m.wards ?? 0), 0);
  const councillors = direct.reduce((sum, m) => sum + m.councillors, 0);

  return {
    province: entries[0].province,
    metros: entries.filter((m) => m.category === 'A').length,
    locals: entries.filter((m) => m.category === 'B').length,
    districts: entries.filter((m) => m.category === 'C').length,
    wards,
    councillors,
    prSeats: councillors - wards,
    registeredVoters: direct.reduce((sum, m) => sum + m.registeredVoters, 0),
    districtCouncillors: entries
      .filter((m) => m.category === 'C')
      .reduce((sum, m) => sum + m.councillors, 0),
  };
}

export function allProvinceSummaries(): ProvinceDelimitation[] {
  return PROVINCES.map((province) => provinceSummary(province) as ProvinceDelimitation);
}

/** Every municipality in a province, metros and locals first. */
export function municipalitiesIn(province: string): MunicipalRegisterEntry[] {
  const wanted = province.trim().toLowerCase();
  return REGISTER_ENTRIES.filter((m) => m.province.toLowerCase() === wanted).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.code.localeCompare(b.code);
  });
}
