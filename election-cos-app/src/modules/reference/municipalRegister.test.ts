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
 * The third is the usual one: the module has to keep saying what its
 * figures are and are not — 2024, not 2026; a question, not a
 * contradiction.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BAND_BASIS,
  REGISTER_ENTRIES,
  REGISTER_SOURCE,
  VINTAGE_BASIS,
  checkAgainstRegister,
  compareToPublishedBand,
  lookupMunicipality,
  publishedBand,
} from './municipalRegister';
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
    // This is the assertion the 15% citation rests on. If it ever fails,
    // DEVIATION_BASIS is overclaiming and has to go back to "borrowed".
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

  it('agrees with the IEC to the voter, from a different document', () => {
    const entry = lookupMunicipality('NW405');
    expect(entry?.name).toBe('JB Marks');
    expect(entry?.province).toBe('North West');
    // The gazette parser produced these. The IEC published these. Neither
    // was derived from the other.
    expect(entry?.wards).toBe(wards.length);
    expect(entry?.registeredVoters).toBe(total);
    // 67 councillors for 34 wards — an odd council, so ward seats are not
    // half of it. The seat calculator's real-world regression uses 67.
    expect(entry?.councillors).toBe(67);
    expect(Math.ceil(67 / 2)).toBe(34);
  });

  it('puts every gazetted ward inside the IEC’s published band', () => {
    const band = publishedBand('NW405');
    expect(band).toEqual({ norm: 3589, minNorm: 3051, maxNorm: 4127, deviation: 538 });
    const comparisons = compareToPublishedBand(wards, band!);
    expect(comparisons.filter((c) => c.position !== 'INSIDE')).toEqual([]);
    // The largest ward sits exactly on the published maximum and the
    // smallest one voter above the published minimum. Reported as
    // arithmetic; no conclusion drawn about how the lines were drawn.
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
    // The IEC prints integers. A ward carrying exactly Max_Norm is the
    // demarcation the IEC published, not a breach of it.
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

describe('checking a tenant against the register', () => {
  const wards = [
    { wardCode: 'W1', registeredVoters: 3500 },
    { wardCode: 'W2', registeredVoters: 3600 },
  ];

  it('says so plainly when the IEC publishes the same figures', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 34,
      registeredVoters: 122059,
      totalCouncilSeats: 67,
    });
    expect(check.findings.every((f) => f.outcome === 'CONFIRMS')).toBe(true);
    expect(check.findings.map((f) => f.code).sort()).toEqual([
      'COUNCIL_SEATS',
      'REGISTERED_VOTERS',
      'WARD_COUNT',
    ]);
    expect(check.rollDrift).toBe(0);
  });

  it('names the consequence when the council size disagrees', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 34,
      registeredVoters: 122059,
      totalCouncilSeats: 68,
    });
    const seats = check.findings.find((f) => f.code === 'COUNCIL_SEATS');
    expect(seats?.outcome).toBe('DISAGREES');
    // Not "these differ" — what breaks because they differ.
    expect(seats?.message).toMatch(/seat calculator divides by this number/i);
  });

  it('quantifies how far a roll has moved rather than only flagging it', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 34,
      registeredVoters: 128162, // +5%
    });
    expect(check.rollDrift).toBeCloseTo(0.05, 4);
    const roll = check.findings.find((f) => f.code === 'REGISTERED_VOTERS');
    expect(roll?.outcome).toBe('DISAGREES');
    expect(roll?.message).toContain('5.0%');
    expect(roll?.message).toMatch(/a roll moves between registration weekends/i);
  });

  it('reports a code the table does not carry without pretending to check it', () => {
    const check = checkAgainstRegister({ municipalityCode: 'NW999', wardCount: 34, registeredVoters: 1 });
    expect(check.entry).toBeNull();
    expect(check.band).toBeNull();
    expect(check.findings).toHaveLength(1);
    expect(check.findings[0].outcome).toBe('UNKNOWN');
    expect(check.findings[0].message).toContain('258');
  });

  it('refuses to check wards against a district council', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'DC40',
      wardCount: 12,
      registeredVoters: 352259,
      wards,
    });
    expect(check.band).toBeNull();
    expect(check.outsideBand).toEqual([]);
    const finding = check.findings.find((f) => f.code === 'NO_WARDS_IN_REGISTER');
    expect(finding?.outcome).toBe('UNKNOWN');
    // And it must not have invented a ward-count comparison against a
    // municipality that has no wards to compare with.
    expect(check.findings.some((f) => f.code === 'WARD_COUNT')).toBe(false);
  });

  it('lists wards outside the published band, furthest out first', () => {
    const check = checkAgainstRegister({
      municipalityCode: 'NW405',
      wardCount: 3,
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
    expect(sizes?.outcome).toBe('DISAGREES');
    expect(sizes?.message).toContain('2 of 3 wards');
  });

  it('accepts a code however it is capitalised or padded', () => {
    expect(lookupMunicipality(' nw405 ')?.code).toBe('NW405');
  });
});

describe('what the register says about itself', () => {
  it('is 2024, and never presented as 2026', () => {
    expect(VINTAGE_BASIS).toMatch(/not the 2026 register/i);
    expect(VINTAGE_BASIS).toMatch(/Nothing here blocks anything/i);
    expect(VINTAGE_BASIS).toMatch(/question about which is current/i);
  });

  it('claims the IEC’s arithmetic and not the statute behind it', () => {
    expect(BAND_BASIS).toMatch(/214 warded municipalities/);
    expect(BAND_BASIS).toMatch(/statutory provision behind the 15% is not quoted here/i);
    expect(BAND_BASIS).not.toMatch(/\b(required by law|the Act requires|in terms of section)\b/i);
  });

  it('does not describe any of this as a forecast or a projection', () => {
    const text = [VINTAGE_BASIS, BAND_BASIS].join(' ');
    expect(text).not.toMatch(/\b(forecast|predict|projection)\b/i);
  });
});
