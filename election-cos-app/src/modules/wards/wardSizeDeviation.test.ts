/**
 * Election Campaign OS — guards on the ward-size check
 *
 * Two jobs. The arithmetic has to be right, and the module has to keep
 * saying that its threshold is borrowed rather than verified — the same
 * discipline `prList.ts` applies to the party list-length cap.
 *
 * The last block runs the check against the real seed and asserts the
 * figures the module's own header quotes, so a comment describing the
 * reference municipality cannot drift away from the data it describes.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Ward } from '@/dal/ports/wards';
import {
  analyseWardSizes,
  DEFAULT_DEVIATION_ALLOWANCE,
  DEVIATION_BASIS,
  formatDeviation,
  WORKLOAD_BASIS,
} from './wardSizeDeviation';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const ward = (wardCode: string, registeredVoters: number, over: Partial<Ward> = {}): Ward => ({
  id: wardCode,
  tenantId: 't',
  wardCode,
  municipalityCode: 'NW405',
  name: wardCode,
  registeredVoters,
  vdCodes: [],
  createdAt: '',
  updatedAt: '',
  updatedBy: 'u',
  deletedAt: null,
  schemaVersion: 1,
  ...over,
});

describe('the arithmetic', () => {
  it('measures each ward against the municipal average', () => {
    const report = analyseWardSizes([ward('W1', 800), ward('W2', 1000), ward('W3', 1200)]);
    expect(report.mean).toBe(1000);
    expect(report.totalRegisteredVoters).toBe(3000);
    expect(report.wards.map((w) => w.wardCode)).toEqual(['W1', 'W2', 'W3']);
    expect(report.wards[0].deviation).toBeCloseTo(-0.2, 10);
    expect(report.wards[1].deviation).toBe(0);
    expect(report.wards[2].deviation).toBeCloseTo(0.2, 10);
  });

  it('flags only what falls outside the allowance', () => {
    const report = analyseWardSizes([ward('W1', 800), ward('W2', 1000), ward('W3', 1200)]);
    expect(report.outliers.map((w) => w.wardCode).sort()).toEqual(['W1', 'W3']);
    // Widen it and the same data is unremarkable — the threshold is a
    // parameter, not a property of the wards.
    expect(analyseWardSizes([ward('W1', 800), ward('W2', 1000), ward('W3', 1200)], 0.25).outliers).toEqual([]);
  });

  it('treats the boundary as inside, not outside', () => {
    // Exactly on the allowance is within it. A ward drawn precisely to
    // the norm's limit is compliant, and reporting it would tell a
    // campaign its correct demarcation is wrong.
    const report = analyseWardSizes([ward('W1', 850), ward('W2', 1000), ward('W3', 1150)]);
    expect(report.mean).toBe(1000);
    expect(report.outliers).toEqual([]);
  });

  it('orders outliers by how far out they are', () => {
    const report = analyseWardSizes([ward('W1', 100), ward('W2', 1000), ward('W3', 1400), ward('W4', 1500)]);
    expect(report.outliers[0].wardCode).toBe('W1');
  });

  it('ignores suppressed wards entirely', () => {
    const report = analyseWardSizes([
      ward('W1', 1000),
      ward('W2', 1000),
      ward('W3', 99999, { deletedAt: '2026-01-01' }),
    ]);
    expect(report.wardCount).toBe(2);
    expect(report.mean).toBe(1000);
    expect(report.outliers).toEqual([]);
  });

  it('says nothing at all about a seed with no voters recorded', () => {
    // Every ward is 0% from a mean of 0. Calling all of them outliers
    // would be noise on a seed nobody has filled in yet.
    const report = analyseWardSizes([ward('W1', 0), ward('W2', 0)]);
    expect(report.mean).toBe(0);
    expect(report.outliers).toEqual([]);
    expect(report.emptyWards).toEqual(['W1', 'W2']);
    expect(formatDeviation(0, 0)).toBe('—');
  });

  it('handles no wards without dividing by zero', () => {
    const report = analyseWardSizes([]);
    expect(report.mean).toBe(0);
    expect(report.wardCount).toBe(0);
    expect(report.outliers).toEqual([]);
  });

  it('names a ward carrying no voters, and shows how far it drags the average', () => {
    // One empty ward among two normal ones pulls the mean down far enough
    // that all three read as outliers. That is arithmetically right and
    // operationally right — a zero ward is a serious seed problem — and
    // `emptyWards` says which one to fix rather than leaving a reader to
    // work it out from three deviation figures.
    const report = analyseWardSizes([ward('W1', 1000), ward('W2', 1000), ward('W3', 0)]);
    expect(report.emptyWards).toEqual(['W3']);
    expect(report.outliers.map((w) => w.wardCode).sort()).toEqual(['W1', 'W2', 'W3']);
    expect(report.outliers[0].wardCode).toBe('W3');
  });

  it('reports totals that appear on more than one ward', () => {
    const report = analyseWardSizes([ward('W1', 1000), ward('W2', 1000), ward('W3', 1000), ward('W4', 900)]);
    expect(report.repeatedTotals).toEqual([{ registeredVoters: 1000, wardCodes: ['W1', 'W2', 'W3'] }]);
  });

  it('formats a deviation readably', () => {
    expect(formatDeviation(0.124, 1000)).toBe('+12.4%');
    expect(formatDeviation(-0.15, 1000)).toBe('-15.0%');
  });
});

describe('what the threshold says about itself', () => {
  it('names the document it now comes from', () => {
    expect(DEFAULT_DEVIATION_ALLOWANCE).toBe(0.15);
    // Session 35: promoted from "taken from a supplied note" to a
    // citation, because Annexure A publishes the band as columns and
    // every warded row in it satisfies the arithmetic.
    expect(DEVIATION_BASIS).toMatch(/Annexure A to Circular 1 of 2025/);
    expect(DEVIATION_BASIS).toMatch(/Nothing here blocks anything/i);
  });

  it('still refuses to claim the statute it has not read', () => {
    // The circular cites no provision, so neither does this. A basis that
    // said "as required by the Municipal Structures Act" would be the
    // overclaim the promotion above is one step away from.
    expect(DEVIATION_BASIS).toMatch(/not quoted here/i);
    expect(DEVIATION_BASIS).not.toMatch(/\b(required by law|the Act requires|in terms of section)\b/i);
  });

  it('explains why the number matters operationally, not only as a check', () => {
    expect(WORKLOAD_BASIS).toMatch(/needs more canvassers/i);
  });
});

describe('against the real gazette seed', () => {
  const seed = JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'seed-data', 'jb-marks-nw405-wards-vds.json'), 'utf-8'),
  ) as { ward: { wardCode: string; registeredVoters: number } }[];
  const wards = seed.map((entry) => ward(entry.ward.wardCode, entry.ward.registeredVoters));
  const report = analyseWardSizes(wards);

  it('matches the figures the module header quotes', () => {
    // Computed here rather than trusted: a comment describing the
    // reference municipality must not drift from the data it describes.
    expect(report.wardCount).toBe(34);
    expect(Math.round(report.mean)).toBe(3590);
    expect(report.wards[0].registeredVoters).toBe(3052);
    expect(report.wards[report.wards.length - 1].registeredVoters).toBe(4127);
  });

  it('passes the 15% control metric, with both extremes very close to the bound', () => {
    expect(report.outliers).toEqual([]);
    // 0.5 voters inside the lower bound and 1.5 inside the upper. Stated
    // as arithmetic, with no conclusion drawn about why — see the header.
    const lower = report.mean * (1 - DEFAULT_DEVIATION_ALLOWANCE);
    const upper = report.mean * (1 + DEFAULT_DEVIATION_ALLOWANCE);
    expect(report.wards[0].registeredVoters - lower).toBeLessThan(1);
    expect(upper - report.wards[report.wards.length - 1].registeredVoters).toBeLessThan(2);
  });

  it('surfaces the repeated ward totals in that seed', () => {
    // Three wards on 4,121 and two on 3,380. Not an error, and not
    // something any other check in the build would mention.
    expect(report.repeatedTotals).toEqual([
      { registeredVoters: 4121, wardCodes: ['NW405-W2', 'NW405-W23', 'NW405-W3'] },
      { registeredVoters: 3380, wardCodes: ['NW405-W15', 'NW405-W28'] },
    ]);
  });
});

describe('the split-station figures quoted around the build', () => {
  it('match the seed they describe', () => {
    // SPLIT_VD_BASIS and the inScope() comment in firestore.rules both
    // quote these counts. Session 32 shipped them as "24 of 95", read off
    // a failure message produced while the seed was deliberately
    // truncated for an injection test. Computed here so they cannot drift
    // again.
    const seed = JSON.parse(
      readFileSync(path.join(REPO_ROOT, 'seed-data', 'jb-marks-nw405-wards-vds.json'), 'utf-8'),
    ) as { votingDistricts: { vdCode: string }[] }[];
    const perCode = new Map<string, number>();
    for (const entry of seed) {
      for (const vd of entry.votingDistricts) perCode.set(vd.vdCode, (perCode.get(vd.vdCode) ?? 0) + 1);
    }
    const split = [...perCode.values()].filter((n) => n > 1).length;
    const across = Math.max(...perCode.values());

    expect(perCode.size).toBe(108);
    expect(split).toBe(26);
    expect(across).toBe(3);

    const basis = readFileSync(path.join(REPO_ROOT, 'src/modules/settings/staffProvisioning.ts'), 'utf8');
    expect(basis).toContain(`${split} of the ${perCode.size}`);
    const rules = readFileSync(path.join(REPO_ROOT, 'firestore.rules'), 'utf8');
    expect(rules).toContain(`${split} of NW405's ${perCode.size} station codes`);
  });
});
