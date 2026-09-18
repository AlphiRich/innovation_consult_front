/**
 * Election Campaign OS — guards on the IEC municipal register
 *
 * Three jobs.
 *
 * The first is the one that matters most: re-verify the document's own
 * arithmetic here, in the test suite, over the shipped dataset. The
 * extraction script checks it once at extraction time, which protects the
 * extraction and nothing else. Every claim this build now makes about the
 * 15% band rests on those relations holding, so they are recomputed from
 * the JSON on every run — an edited row, a lost page or a hand-patched
 * figure fails here rather than being quoted in a meeting.
 *
 * The second is the corroboration. The NW405 seed was parsed from the
 * North West provincial gazette; Annexure A comes from the IEC. They are
 * different documents from different bodies and they agree to the voter.
 * That is asserted from both files rather than described in a comment.
 *
 * The third: the module has to keep treating the delimitation as
 * authoritative — a tenant that disagrees with it is blocked, a district
 * council never reaches the Schedule 1 calculator, and PR seats are never
 * a second hand-kept copy of councillors minus wards.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BAND_BASIS,
  BASELINE_AUTHORITY,
  DELIMITATION_VERSION,
  REGISTER_ENTRIES,
  REGISTER_SOURCE,
  ROLL_BASIS,
  SCHEDULE_2_BASIS,
  assertSchedule1Applies,
  checkAgainstRegister,
  compareToPublishedBand,
  delimitationFor,
  lookupMunicipality,
  publishedBand,
  quotaScheduleFor,
  wardCountMatchesBaseline,
} from './municipalRegister';
import { allocateSeats } from '@/modules/analytics/seatCalculator';
import { DEVIATION_BASIS } from '@/modules/wards/wardSizeDeviation';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const warded = REGISTER_ENTRIES.filter((m) => m.wards !== undefined);

describe('the document’s own arithmetic, recomputed from the shipped dataset', () => {
  it('covers every municipality in the country, with districts carrying no wards', () => {
    expect(REGISTER_ENTRIES).toHaveLength(258);
    expect(warded).toHaveLength(214);
    expect(REGISTER_ENTRIES.filter((m) => m.category === 'A')).toHaveLength(8);
    expect(REGISTER_ENTRIES.filter((m) => m.category === 'C')).toHaveLength(44);
    // No district has wards, and no metro or local is missing them.
    for (const entry of REGISTER_ENTRIES) {
      expect(entry.wards === undefined).toBe(entry.category === 'C');
    }
    expect(new Set(REGISTER_ENTRIES.map((m) => m.code)).size).toBe(REGISTER_ENTRIES.length);
  });

  it('holds the four derived columns on all 214 warded rows', () => {
    const broken: string[] = [];
    for (const m of warded) {
      const wards = m.wards as number;
      const norm = m.norm as number;
      const deviation = m.deviation as number;
      if (norm !== Math.floor(m.registeredVoters / wards)) broken.push(`${m.code} norm`);
      if (deviation !== Math.floor(norm * 0.15)) broken.push(`${m.code} deviation`);
      if (m.minNorm !== norm - deviation) broken.push(`${m.code} min`);
      if (m.maxNorm !== norm + deviation) broken.push(`${m.code} max`);
      if (wards !== Math.ceil(m.councillors / 2)) broken.push(`${m.code} wards/councillors`);
    }
    // Every claim the build makes about the band rests on this.
    expect(broken).toEqual([]);
  });

  it('totals the same roll twice — once by local, once by district', () => {
    // Every local sits inside exactly one district and no metro does, so
    // the two columns describe the same voters. DC40 is the worked case.
    const sum = (category: string) =>
      REGISTER_ENTRIES.filter((m) => m.category === category).reduce(
        (total, m) => total + m.registeredVoters,
        0,
      );
    expect(sum('C')).toBe(sum('B'));
    const dc40 = lookupMunicipality('DC40');
    const kaunda = ['NW403', 'NW404', 'NW405'].map((c) => lookupMunicipality(c)?.registeredVoters ?? 0);
    expect(dc40?.registeredVoters).toBe(kaunda.reduce((a, b) => a + b, 0));
  });

  it('keeps the count the deviation basis quotes honest', () => {
    // DEVIATION_BASIS says the columns hold on "all 214". If the dataset
    // ever carries a different number of warded rows, that sentence is
    // wrong and this fails rather than the claim quietly drifting.
    expect(DEVIATION_BASIS).toContain(`all ${warded.length} of them`);
  });

  it('records where the document came from and that it was not fetched', () => {
    expect(REGISTER_SOURCE.circular).toBe('IEC Circular 1 of 2025');
    expect(REGISTER_SOURCE.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(REGISTER_SOURCE.notReachable).toMatch(/denies elections\.org\.za at CONNECT/);
  });
});

describe('NW405, checked against the gazette the seed was parsed from', () => {
  const seed = JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'seed-data', 'jb-marks-nw405-wards-vds.json'), 'utf-8'),
  ) as { ward: { wardCode: string; registeredVoters: number } }[];
  const wards = seed.map((entry) => entry.ward);
  const total = wards.reduce((sum, w) => sum + w.registeredVoters, 0);

  it('agrees with the proclaimed baseline to the voter', () => {
    const entry = lookupMunicipality('NW405');
    expect(entry?.name).toBe('JB Marks');
    expect(entry?.province).toBe('North West');
    // The provincial delimitation notice's ward schedules sum to these.
    // The Commission's annexure publishes these. Two halves of one
    // delimitation product, agreeing.
    expect(entry?.wards).toBe(wards.length);
    expect(entry?.registeredVoters).toBe(total);
    // 67 councillors for 34 wards — an odd council, so ward seats are not
    // half of it. The seat calculator's real-world regression uses 67.
    expect(entry?.councillors).toBe(67);
    expect(Math.ceil(67 / 2)).toBe(34);
  });

  it('puts every delimited ward inside the published band', () => {
    const band = publishedBand('NW405');
    expect(band).toEqual({ norm: 3589, minNorm: 3051, maxNorm: 4127, deviation: 538 });
    const comparisons = compareToPublishedBand(wards, band!);
    expect(comparisons.filter((c) => c.position !== 'INSIDE')).toEqual([]);
    // The largest ward sits exactly on the published maximum and the
    // smallest one voter above the minimum — a delimitation drawn to the
    // 15% criterion, working to its ceiling.
    expect(comparisons[comparisons.length - 1].registeredVoters).toBe(4127);
    expect(comparisons[comparisons.length - 1].onBound).toBe(true);
    expect(comparisons[0].registeredVoters).toBe(3052);
    expect(comparisons[0].marginToBound).toBe(1);
  });
});

describe('the band comparison', () => {
  const band = { norm: 1000, minNorm: 850, maxNorm: 1150, deviation: 150 };
  const w = (wardCode: string, registeredVoters: number) => ({ wardCode, registeredVoters });

  it('treats the published bounds as inclusive', () => {
    // The annexure prints integers. A ward carrying exactly Max_Norm is
    // the delimitation itself, not a breach of it.
    const result = compareToPublishedBand([w('A', 850), w('B', 1150)], band);
    expect(result.map((c) => c.position)).toEqual(['INSIDE', 'INSIDE']);
    expect(result.every((c) => c.onBound)).toBe(true);
  });

  it('reports which side a ward falls out on, and by how much', () => {
    const result = compareToPublishedBand([w('A', 849), w('B', 1151), w('C', 1000)], band);
    expect(result.map((c) => [c.wardCode, c.position, c.marginToBound])).toEqual([
      ['A', 'BELOW', 1],
      ['C', 'INSIDE', 150],
      ['B', 'ABOVE', 1],
    ]);
  });
});

describe('the delimitation baseline', () => {
  it('derives PR seats rather than carrying a second copy of them', () => {
    const nw405 = delimitationFor('NW405');
    expect(nw405?.councillors).toBe(67);
    expect(nw405?.wardSeats).toBe(34);
    // 67 - 34. Never stored, never entered, so it cannot drift from the
    // two numbers it is made of.
    expect(nw405?.prSeats).toBe(33);
    expect((nw405?.wardSeats ?? 0) + (nw405?.prSeats ?? 0)).toBe(nw405?.councillors);
  });

  it('holds councillors == wards + PR for every warded municipality', () => {
    const broken = warded
      .map((m) => delimitationFor(m.code))
      .filter((b) => b !== null && (b.wardSeats ?? 0) + (b.prSeats ?? 0) !== b.councillors);
    expect(broken).toEqual([]);
  });

  it('pins itself to a delimitation version and an electoral event', () => {
    expect(DELIMITATION_VERSION.electoralEvent).toBe('LGE-2026-11-04');
    expect(DELIMITATION_VERSION.electionDate).toBe('2026-11-04');
    expect(DELIMITATION_VERSION.id).toBe('IEC-CIRCULAR-1-2025-ANNEXURE-A');
  });

  it('routes categories to the right Schedule of the Act', () => {
    expect(quotaScheduleFor('A')).toBe('SCHEDULE_1');
    expect(quotaScheduleFor('B')).toBe('SCHEDULE_1');
    expect(quotaScheduleFor('C')).toBe('SCHEDULE_2');
    expect(delimitationFor('NW405')?.quotaSchedule).toBe('SCHEDULE_1');
    expect(delimitationFor('BUF')?.quotaSchedule).toBe('SCHEDULE_1');
    expect(delimitationFor('DC40')?.quotaSchedule).toBe('SCHEDULE_2');
    // Every district in the country, not just the worked one.
    for (const entry of REGISTER_ENTRIES.filter((m) => m.category === 'C')) {
      expect(delimitationFor(entry.code)?.quotaSchedule).toBe('SCHEDULE_2');
      expect(delimitationFor(entry.code)?.wardSeats).toBeUndefined();
      expect(delimitationFor(entry.code)?.prSeats).toBeUndefined();
    }
  });

  it('answers whether a loaded ward count is the delimited one', () => {
    expect(wardCountMatchesBaseline('NW405', 34)).toBe(true);
    expect(wardCountMatchesBaseline('NW405', 33)).toBe(false);
    expect(wardCountMatchesBaseline('DC40', 12)).toBeNull();
    expect(wardCountMatchesBaseline('NW999', 34)).toBeNull();
  });
});

describe('the Schedule 2 refusal', () => {
  it('lets metros and locals through', () => {
    expect(() => assertSchedule1Applies('NW405')).not.toThrow();
    expect(() => assertSchedule1Applies('BUF')).not.toThrow();
    // An unnamed municipality is a legitimate what-if.
    expect(() => assertSchedule1Applies('NW999')).not.toThrow();
  });

  it('stops a district council reaching the Schedule 1 calculator', () => {
    // A returned flag would let a caller walk away with a number. This
    // throws, so there is no number to walk away with.
    expect(() => assertSchedule1Applies('DC40')).toThrow(/district council/i);
    expect(() =>
      allocateSeats({
        municipalityCode: 'DC40',
        totalValidVotes: 100_000,
        totalSeats: 40,
        parties: [{ id: 'A', name: 'A', votes: 100_000, wardSeatsWon: 0 }],
      }),
    ).toThrow(/Schedule 2/);
  });

  it('still allocates for the municipality the calculator is built for', () => {
    const result = allocateSeats({
      municipalityCode: 'NW405',
      totalValidVotes: 101_439,
      totalSeats: 67,
      parties: [{ id: 'ANC', name: 'ANC', votes: 101_439, wardSeatsWon: 0 }],
    });
    expect(result.quota).toBe(1515);
  });

  it('labels every allocation with the delimitation it belongs to', () => {
    const current = allocateSeats({
      totalValidVotes: 1000,
      totalSeats: 10,
      parties: [{ id: 'A', name: 'A', votes: 1000, wardSeatsWon: 0 }],
    });
    expect(current.delimitationId).toBe(DELIMITATION_VERSION.id);
    // A historical result must not be labelled with today's boundaries.
    const historical = allocateSeats({
      delimitationId: 'LGE-2021-SUPERSEDED',
      totalValidVotes: 1000,
      totalSeats: 10,
      parties: [{ id: 'A', name: 'A', votes: 1000, wardSeatsWon: 0 }],
    });
    expect(historical.delimitationId).toBe('LGE-2021-SUPERSEDED');
  });
});

describe('checking a tenant against the proclaimed delimitation', () => {
  it('confirms a tenant that matches, and blocks nothing', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 34,
      registeredVoters: 122059,
      totalCouncilSeats: 67,
      prSeats: 33,
    });
    expect(check.alignedToBaseline).toBe(true);
    expect(check.blocking).toEqual([]);
    expect(check.findings.every((f) => f.outcome === 'CONFIRMS')).toBe(true);
    expect(check.rollDrift).toBe(0);
  });

  it('blocks a ward count that is not the delimited one', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 33,
      registeredVoters: 122059,
    });
    const wardCount = check.findings.find((f) => f.code === 'WARD_COUNT');
    expect(wardCount?.outcome).toBe('CONTRADICTS');
    expect(wardCount?.severity).toBe('BLOCKING');
    expect(check.alignedToBaseline).toBe(false);
    // Says what is wrong downstream, not merely that two numbers differ.
    expect(wardCount?.message).toMatch(/coverage, canvassing targets/i);
  });

  it('blocks a council size that is not the MEC’s determination', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 34,
      registeredVoters: 122059,
      totalCouncilSeats: 68,
    });
    const seats = check.findings.find((f) => f.code === 'COUNCIL_SEATS');
    expect(seats?.outcome).toBe('CONTRADICTS');
    expect(seats?.severity).toBe('BLOCKING');
    expect(seats?.message).toMatch(/seat quota divides by this number/i);
  });

  it('blocks a PR seat count that is not councillors minus wards', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 34,
      registeredVoters: 122059,
      totalCouncilSeats: 67,
      prSeats: 34,
    });
    const pr = check.findings.find((f) => f.code === 'PR_SEATS');
    expect(pr?.severity).toBe('BLOCKING');
    // The consequence, which is what makes this worth blocking on.
    expect(pr?.message).toMatch(/rejected at nomination/i);
  });

  it('treats a grown roll as ordinary, never as a discrepancy', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 34,
      registeredVoters: 128162, // +5%
    });
    expect(check.rollDrift).toBeCloseTo(0.05, 4);
    const roll = check.findings.find((f) => f.code === 'REGISTERED_VOTERS');
    expect(roll?.outcome).toBe('DRIFT');
    expect(roll?.severity).toBe('INFO');
    expect(roll?.message).toContain('+5.0%');
    expect(check.blocking).toEqual([]);
    // The delimitation does not move with the roll, and the text says so.
    expect(ROLL_BASIS).toMatch(/do not move with it/i);
  });

  it('blocks a municipality code the delimitation does not carry', () => {
    const check = checkAgainstRegister({ municipalityCode: 'NW999', wardCount: 34, registeredVoters: 1 });
    expect(check.baseline).toBeNull();
    expect(check.band).toBeNull();
    expect(check.findings).toHaveLength(1);
    expect(check.findings[0].severity).toBe('BLOCKING');
    expect(check.alignedToBaseline).toBe(false);
    expect(check.findings[0].message).toContain('258');
  });

  it('refuses to check wards against a district council', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'DC40',
      wardCount: 12,
      registeredVoters: 352259,
      wards: [{ wardCode: 'W1', registeredVoters: 3500 }],
    });
    expect(check.band).toBeNull();
    expect(check.outsideBand).toEqual([]);
    const finding = check.findings.find((f) => f.code === 'DISTRICT_COUNCIL');
    expect(finding?.message).toMatch(/Schedule 2/);
    // And it must not have invented a ward-count comparison against a
    // municipality that has no wards.
    expect(check.findings.some((f) => f.code === 'WARD_COUNT')).toBe(false);
  });

  it('lists wards outside the delimitation band, furthest out first', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 34,
      registeredVoters: 122059,
      wards: [
        { wardCode: 'W1', registeredVoters: 2000 }, // 1,051 below
        { wardCode: 'W2', registeredVoters: 3600 }, // inside
        { wardCode: 'W3', registeredVoters: 4200 }, // 73 above
      ],
    });
    expect(check.outsideBand.map((c) => c.wardCode)).toEqual(['W1', 'W3']);
    expect(check.outsideBand[0].marginToBound).toBe(1051);
    const sizes = check.findings.find((f) => f.code === 'WARD_SIZES');
    expect(sizes?.outcome).toBe('CONTRADICTS');
    // A WARNING, not BLOCKING: this module works off published integers
    // but a roll that has grown since delimitation moves real wards.
    expect(sizes?.severity).toBe('WARNING');
  });

  it('accepts a code however it is capitalised or padded', () => {
    expect(lookupMunicipality(' nw405 ')?.code).toBe('NW405');
    expect(delimitationFor(' nw405 ')?.code).toBe('NW405');
  });
});

describe('what the baseline says about itself', () => {
  it('states the delimitation is authoritative and final for this cycle', () => {
    expect(BASELINE_AUTHORITY).toMatch(/4 November 2026/);
    expect(BASELINE_AUTHORITY).toMatch(/Municipal Demarcation Board/);
    expect(BASELINE_AUTHORITY).toMatch(/MECs for local government/);
    expect(BASELINE_AUTHORITY).toMatch(/final for this cycle/i);
    expect(BASELINE_AUTHORITY).toMatch(/your figures are wrong/i);
  });

  it('never invites an operator to second-guess the delimitation', () => {
    const text = [BASELINE_AUTHORITY, ROLL_BASIS, BAND_BASIS, SCHEDULE_2_BASIS].join(' ');
    // The wording this build used before the baseline was proclaimed
    // treated the figures as a question of vintage. It must not come back.
    expect(text).not.toMatch(/may be superseded|not the 2026|question about which is current/i);
    expect(text).not.toMatch(/\b(unverified|unconfirmed|may be wrong|possibly outdated)\b/i);
  });

  it('puts the band on the delimitation rather than on this product', () => {
    expect(BAND_BASIS).toMatch(/may not vary from the municipal norm/i);
    expect(BAND_BASIS).toMatch(/error in what was captured here/i);
  });

  it('does not describe any of this as a forecast or a projection', () => {
    const text = [BASELINE_AUTHORITY, ROLL_BASIS, BAND_BASIS].join(' ');
    expect(text).not.toMatch(/\b(forecast|predict|projection)\b/i);
  });
});
