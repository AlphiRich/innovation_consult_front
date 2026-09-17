/**
 * Election Campaign OS — guards on the disclosure register
 *
 * A register is a document about money. The failure that matters is not a
 * wrong label, it is a rand that is in the collection and not in the
 * table — because the table has a total at the top of it, and a total
 * that silently excludes something is worse than no total.
 *
 * So the load-bearing tests here are the ones about what the register
 * refuses to drop: a donation whose donor record cannot be read, and a
 * donor whose flag says the money may not have been theirs to give.
 */
import { describe, expect, it } from 'vitest';
import type { Donation } from '@/dal/ports/donations';
import type { Donor } from '@/dal/ports/donors';
import type { PPFAConfig } from '@/dal/ports/ppfaConfig';
import { defaultPPFAConfig } from './ppfaDefaults';
import { buildDisclosureRegister } from './disclosureRegister';

const NOW = new Date('2026-09-15T00:00:00.000Z');

const config = (over: Partial<PPFAConfig> = {}): PPFAConfig => ({
  id: 'cfg-1',
  createdAt: NOW.toISOString(),
  ...defaultPPFAConfig('tenant-1', 'uid-1'),
  ...over,
});

const donor = (over: Partial<Donor> = {}): Donor => ({
  id: 'donor-1',
  tenantId: 'tenant-1',
  donorType: 'NATURAL_PERSON',
  displayName: 'M. Sithole',
  isForeign: false,
  createdAt: '2026-04-02T00:00:00.000Z',
  updatedAt: '2026-04-02T00:00:00.000Z',
  updatedBy: 'uid-1',
  ...over,
});

const donation = (over: Partial<Donation> = {}): Donation => ({
  id: crypto.randomUUID(),
  tenantId: 'tenant-1',
  donorId: 'donor-1',
  amountZAR: 100_000_00,
  receivedAt: '2026-06-01T00:00:00.000Z',
  financialYear: '2026/27',
  quarter: 1,
  inKind: false,
  recordedBy: 'uid-1',
  ...over,
});

describe('the disclosure register', () => {
  it('groups a year across donors, largest first', () => {
    const donors = [donor(), donor({ id: 'donor-2', displayName: 'Ubuntu Holdings' })];
    const donations = [
      donation({ amountZAR: 50_000_00 }),
      donation({ donorId: 'donor-2', amountZAR: 300_000_00 }),
      donation({ donorId: 'donor-2', amountZAR: 25_000_00 }),
    ];
    const register = buildDisclosureRegister(donors, donations, config(), NOW);

    expect(register.financialYear).toBe('2026/27');
    expect(register.rows.map((r) => r.donor.id)).toEqual(['donor-2', 'donor-1']);
    expect(register.rows[0].exposure.cumulativeZAR).toBe(325_000_00);
    expect(register.totalZAR).toBe(375_000_00);
  });

  it('names the donors the configured rule puts at or above the threshold', () => {
    const donors = [donor(), donor({ id: 'donor-2', displayName: 'Ubuntu Holdings' })];
    const donations = [
      donation({ amountZAR: 50_000_00 }),
      donation({ donorId: 'donor-2', amountZAR: 300_000_00 }),
    ];
    const register = buildDisclosureRegister(donors, donations, config(), NOW);
    expect(register.needingDisclosure.map((r) => r.donor.id)).toEqual(['donor-2']);
  });

  it('answers differently when the tenant configures the other rule', () => {
    // R240,000 in three R80,000 gifts: over the line cumulatively, under
    // it per donation. A register that ignored the config would say the
    // same thing twice.
    const donations = [
      donation({ amountZAR: 80_000_00 }),
      donation({ amountZAR: 80_000_00 }),
      donation({ amountZAR: 80_000_00 }),
    ];
    const cumulative = buildDisclosureRegister([donor()], donations, config(), NOW);
    const perDonation = buildDisclosureRegister(
      [donor()],
      donations,
      config({ aggregationRule: 'PER_DONATION' }),
      NOW,
    );

    expect(cumulative.needingDisclosure).toHaveLength(1);
    expect(perDonation.needingDisclosure).toHaveLength(0);
    expect(cumulative.ruleSensitive).toHaveLength(1);
    expect(perDonation.ruleSensitive).toHaveLength(1);
  });

  /* ------------------------------------------------------------------ */
  /* The two things a register must never drop                          */
  /* ------------------------------------------------------------------ */

  it('keeps money whose donor record cannot be read, and counts it in the total', () => {
    const donations = [donation({ amountZAR: 40_000_00 }), donation({ donorId: 'ghost', amountZAR: 900_000_00 })];
    const register = buildDisclosureRegister([donor()], donations, config(), NOW);

    expect(register.orphaned).toHaveLength(1);
    expect(register.orphaned[0].amountZAR).toBe(900_000_00);
    // Not in the table, because it belongs to nobody in it…
    expect(register.rows).toHaveLength(1);
    // …and still in the total, because it is in the collection.
    expect(register.totalZAR).toBe(940_000_00);
  });

  it('flags foreign and anonymous donors with money in the year', () => {
    const donors = [
      donor({ id: 'd-foreign', displayName: 'Overseas Friends', donorType: 'FOREIGN', isForeign: true }),
      donor({ id: 'd-anon', displayName: 'Anonymous — Ward 4 rally', donorType: 'ANONYMOUS' }),
      donor({ id: 'd-flagged', displayName: 'Local Co', isForeign: true }),
      donor({ id: 'd-plain', displayName: 'M. Sithole' }),
    ];
    const donations = donors.map((d) => donation({ donorId: d.id, amountZAR: 10_000_00 }));
    const register = buildDisclosureRegister(donors, donations, config(), NOW);

    expect(register.restricted.map((r) => r.donor.id).sort()).toEqual(['d-anon', 'd-flagged', 'd-foreign']);
    // The flag follows the donor type AND the standalone boolean — a
    // juristic donor ticked foreign is flagged like a FOREIGN one.
    expect(register.rows.find((r) => r.donor.id === 'd-plain')!.restricted).toBe(false);
  });

  /* ------------------------------------------------------------------ */

  it('counts what has not been marked disclosed', () => {
    const donations = [
      donation({ amountZAR: 10_000_00, disclosedAt: '2026-07-01T00:00:00.000Z', iecReference: 'IEC-1' }),
      donation({ amountZAR: 20_000_00 }),
      donation({ donorId: 'ghost', amountZAR: 5_000_00 }),
    ];
    const register = buildDisclosureRegister([donor()], donations, config(), NOW);
    expect(register.undisclosedCount).toBe(2);
  });

  it('is an honest empty register rather than a nil return', () => {
    const register = buildDisclosureRegister([donor()], [], config(), NOW);
    expect(register.rows).toHaveLength(0);
    expect(register.totalZAR).toBe(0);
    expect(register.financialYear).toBe('2026/27');
  });

  it('keeps last year out of this year, total included', () => {
    // The caller reads one year; anything else that reaches this is a
    // caller bug. The total at the top must be the sum of what the rows
    // below show, or it is not a total of anything.
    const register = buildDisclosureRegister(
      [donor()],
      [donation({ amountZAR: 500_000_00, financialYear: '2025/26' }), donation({ amountZAR: 30_000_00 })],
      config(),
      NOW,
    );
    expect(register.rows[0].exposure.cumulativeZAR).toBe(30_000_00);
    expect(register.totalZAR).toBe(30_000_00);
    expect(register.undisclosedCount).toBe(1);
    expect(register.needingDisclosure).toHaveLength(0);
  });

  it('adds up to what it shows', () => {
    // The register's own arithmetic: the total is the rows plus the
    // orphans, with nothing else in it.
    const donations = [
      donation({ amountZAR: 40_000_00 }),
      donation({ donorId: 'donor-2', amountZAR: 120_000_00 }),
      donation({ donorId: 'ghost', amountZAR: 7_500_00 }),
    ];
    const register = buildDisclosureRegister(
      [donor(), donor({ id: 'donor-2', displayName: 'Ubuntu Holdings' })],
      donations,
      config(),
      NOW,
    );
    const rowSum = register.rows.reduce((sum, r) => sum + r.exposure.cumulativeZAR, 0);
    const orphanSum = register.orphaned.reduce((sum, d) => sum + d.amountZAR, 0);
    expect(rowSum + orphanSum).toBe(register.totalZAR);
  });
});
