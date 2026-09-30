/**
 * Election Campaign OS — guards on the province-by-province delimitation
 *
 * The centre of this file is the district containment check. District
 * membership is derived from the municipal code, which is an inference, so
 * it is not asserted anywhere — it is proved by consequence: derive
 * membership for all 206 local municipalities, sum each district, and
 * compare against the district figure the annexure publishes. Forty-four
 * independent reconciliations, every one to the voter.
 *
 * That single test does two jobs. It confirms the code-to-district mapping
 * is right, and it confirms the annexure's district rows and local rows
 * agree across the whole country. A mistranscribed voter figure anywhere
 * in the file breaks exactly one district and names it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CONTAINMENT_BASIS,
  METRO_BASIS,
  PROVINCES,
  allProvinceSummaries,
  districtCodeFor,
  districtContainment,
  municipalitiesIn,
  provinceSummary,
  unmappedLocals,
} from './provinceDelimitation';
import { REGISTER_ENTRIES } from './municipalRegister';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

describe('district membership, derived from the codes', () => {
  it('maps a local code to its district', () => {
    expect(districtCodeFor('NW371')).toBe('DC37');
    expect(districtCodeFor('NW405')).toBe('DC40');
    expect(districtCodeFor('EC101')).toBe('DC10');
    expect(districtCodeFor('EC441')).toBe('DC44');
    expect(districtCodeFor('KZN212')).toBe('DC21');
    expect(districtCodeFor('LIM331')).toBe('DC33');
    // Leading zero dropped: WC011 sits in DC1, not DC01.
    expect(districtCodeFor('WC011')).toBe('DC1');
    expect(districtCodeFor('NC061')).toBe('DC6');
  });

  it('returns null for a metro rather than guessing', () => {
    // A metro has exclusive authority and sits in no district. Its code
    // carries no district digits.
    for (const metro of REGISTER_ENTRIES.filter((m) => m.category === 'A')) {
      expect(districtCodeFor(metro.code), metro.code).toBeNull();
    }
    expect(districtCodeFor('CPT')).toBeNull();
    expect(districtCodeFor('')).toBeNull();
    expect(districtCodeFor('not-a-code')).toBeNull();
  });

  it('leaves no local municipality unaccounted for', () => {
    expect(unmappedLocals()).toEqual([]);
  });
});

describe('the national containment check', () => {
  const containment = districtContainment();

  it('covers all 44 districts, each with at least one local', () => {
    expect(containment).toHaveLength(44);
    expect(containment.filter((d) => d.localCodes.length === 0)).toEqual([]);
    // Every local is in exactly one district: the members across all 44
    // must add back up to 206.
    expect(containment.reduce((sum, d) => sum + d.localCodes.length, 0)).toBe(
      REGISTER_ENTRIES.filter((m) => m.category === 'B').length,
    );
  });

  it('reconciles every district against the locals inside it', () => {
    // The assertion this module exists for. Listed rather than counted so
    // a failure names the district and both figures.
    const failures = containment
      .filter((d) => !d.reconciles)
      .map((d) => `${d.districtCode}: published ${d.publishedRegisteredVoters}, locals ${d.sumOfLocals}`);
    expect(failures).toEqual([]);
  });

  it('reconciles the worked district the build already knew', () => {
    const dc40 = containment.find((d) => d.districtCode === 'DC40');
    expect(dc40?.districtName).toBe('Dr Kenneth Kaunda');
    expect(dc40?.localCodes).toEqual(['NW403', 'NW404', 'NW405']);
    expect(dc40?.publishedRegisteredVoters).toBe(352259);
    expect(dc40?.sumOfLocals).toBe(352259);
    // 39 + 11 + 34.
    expect(dc40?.wards).toBe(84);
  });

  it('never attributes a metro to a district', () => {
    const metroCodes = new Set(REGISTER_ENTRIES.filter((m) => m.category === 'A').map((m) => m.code));
    for (const district of containment) {
      for (const code of district.localCodes) {
        expect(metroCodes.has(code), `${code} is a metro in ${district.districtCode}`).toBe(false);
      }
    }
  });
});

describe('the province summaries', () => {
  const summaries = allProvinceSummaries();

  it('covers the nine provinces', () => {
    expect(PROVINCES).toEqual([
      'Eastern Cape',
      'Free State',
      'Gauteng',
      'KwaZulu-Natal',
      'Limpopo',
      'Mpumalanga',
      'North West',
      'Northern Cape',
      'Western Cape',
    ]);
    expect(summaries).toHaveLength(9);
  });

  it('adds back up to the national figures', () => {
    const total = (pick: (s: (typeof summaries)[number]) => number) =>
      summaries.reduce((sum, s) => sum + pick(s), 0);
    expect(total((s) => s.metros)).toBe(8);
    expect(total((s) => s.locals)).toBe(206);
    expect(total((s) => s.districts)).toBe(44);
    expect(total((s) => s.wards)).toBe(4488);
    expect(total((s) => s.councillors)).toBe(8831);
    expect(total((s) => s.registeredVoters)).toBe(27723675);
  });

  it('holds councillors == wards + PR in every province', () => {
    for (const summary of summaries) {
      expect(summary.wards + summary.prSeats, summary.province).toBe(summary.councillors);
    }
  });

  it('gives North West the figures the MDB layer independently confirmed', () => {
    const nw = provinceSummary('North West');
    expect(nw?.metros).toBe(0);
    expect(nw?.locals).toBe(18);
    expect(nw?.districts).toBe(4);
    expect(nw?.wards).toBe(402);
  });

  it('records the four provinces with no metropolitan municipality', () => {
    const withoutMetros = summaries.filter((s) => s.metros === 0).map((s) => s.province);
    expect(withoutMetros).toEqual(['Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']);
  });

  it('counts registered voters once, not twice', () => {
    // District rows repeat their locals' voters. A province summary that
    // included them would roughly double the roll.
    const gauteng = provinceSummary('Gauteng');
    const districtVoters = municipalitiesIn('Gauteng')
      .filter((m) => m.category === 'C')
      .reduce((sum, m) => sum + m.registeredVoters, 0);
    expect(districtVoters).toBeGreaterThan(0);
    expect(gauteng?.registeredVoters).toBe(6541978);
    expect(gauteng?.registeredVoters).toBeLessThan(6541978 + districtVoters);
  });

  it('accepts a province however it is cased, and rejects one that is not there', () => {
    expect(provinceSummary('  north west ')?.province).toBe('North West');
    expect(provinceSummary('Gauteng Province')).toBeNull();
  });
});

describe('what the containment check says about itself', () => {
  it('states that membership is derived and then checked', () => {
    expect(CONTAINMENT_BASIS).toMatch(/derived from the municipal code/i);
    expect(CONTAINMENT_BASIS).toMatch(/All 44 districts reconcile/);
    expect(CONTAINMENT_BASIS).toMatch(/206 local municipalities/);
  });

  it('keeps the figures it quotes true', () => {
    // The basis text names counts. If the data changes underneath it, the
    // sentence is wrong and this fails.
    expect(REGISTER_ENTRIES.filter((m) => m.category === 'C')).toHaveLength(44);
    expect(REGISTER_ENTRIES.filter((m) => m.category === 'B')).toHaveLength(206);
    expect(METRO_BASIS).toMatch(/There are eight/);
    expect(REGISTER_ENTRIES.filter((m) => m.category === 'A')).toHaveLength(8);
  });
});

describe('the published table cannot drift from the data', () => {
  it('matches every figure in docs/national-delimitation-baseline.md', () => {
    // The doc is a deliverable: somebody will quote it in a meeting. So
    // the rows are parsed back and compared against the computed
    // summaries, rather than being a transcription that rots.
    const doc = readFileSync(path.join(REPO_ROOT, 'docs', 'national-delimitation-baseline.md'), 'utf8');
    const num = (cell: string) => Number(cell.replace(/[,\s*]/g, ''));

    const mismatches: string[] = [];
    for (const summary of allProvinceSummaries()) {
      const row = doc
        .split('\n')
        .find((line) => line.startsWith(`| ${summary.province} |`));
      if (!row) {
        mismatches.push(`${summary.province}: no row in the doc`);
        continue;
      }
      const cells = row.split('|').map((c) => c.trim());
      // | Province | Metros | Locals | Districts | Wards | Council | PR | Voters |
      const expected = [
        summary.metros,
        summary.locals,
        summary.districts,
        summary.wards,
        summary.councillors,
        summary.prSeats,
        summary.registeredVoters,
      ];
      expected.forEach((value, index) => {
        const printed = num(cells[index + 2]);
        if (printed !== value) {
          mismatches.push(`${summary.province} column ${index + 2}: doc ${printed}, data ${value}`);
        }
      });
    }
    expect(mismatches).toEqual([]);
  });

  it('matches the national row too', () => {
    const doc = readFileSync(path.join(REPO_ROOT, 'docs', 'national-delimitation-baseline.md'), 'utf8');
    for (const figure of ['**8**', '**206**', '**44**', '**4,488**', '**8,831**', '**4,343**', '**27,723,675**']) {
      expect(doc, `national row is missing ${figure}`).toContain(figure);
    }
    const summaries = allProvinceSummaries();
    expect(summaries.reduce((s, p) => s + p.prSeats, 0)).toBe(4343);
    // District council seats are reported separately and must not be
    // folded into the council-seat column.
    expect(summaries.reduce((s, p) => s + p.districtCouncillors, 0)).toBe(1701);
    expect(doc).toContain('1,701');
  });
});
