/**
 * Election Campaign OS — guards on the aggregation strategy
 *
 * The defect these exist to prevent is the one they were written after:
 * a configuration field that is offered, stored as evidence, printed back
 * to the operator — and read by nothing. `aggregationRule` was that for
 * three sessions. The first test below is the whole point: the configured
 * rule has to change the answer, or it is not a rule.
 *
 * The second theme is that a screen computing one reading of an open
 * statutory question must not hide the other. Q1 is unresolved. A finance
 * officer who can see only the configured reading cannot tell whether the
 * answer would move them across a threshold.
 */
import { describe, expect, it } from 'vitest';
import type { Donation } from '@/dal/ports/donations';
import type { PPFAConfig } from '@/dal/ports/ppfaConfig';
import { defaultPPFAConfig } from './ppfaDefaults';
import { exposureForDonor, otherRule, Q1_UNRESOLVED, RULE_BASIS } from './donorExposure';

const NOW = new Date('2026-09-15T00:00:00.000Z'); // FY 2026/27 with an April start

const config = (over: Partial<PPFAConfig> = {}): PPFAConfig => ({
  id: 'cfg-1',
  createdAt: NOW.toISOString(),
  ...defaultPPFAConfig('tenant-1', 'uid-1'),
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

/** Three gifts of R80,000: R240,000 cumulative, nothing over R200,000 alone. */
const SPLIT = [
  donation({ amountZAR: 80_000_00 }),
  donation({ amountZAR: 80_000_00 }),
  donation({ amountZAR: 80_000_00 }),
];

describe('the configured aggregation rule', () => {
  it('changes which figure is tested against the threshold', () => {
    const cumulative = exposureForDonor(SPLIT, config({ aggregationRule: 'CUMULATIVE_PER_DONOR_PER_YEAR' }), NOW);
    const perDonation = exposureForDonor(SPLIT, config({ aggregationRule: 'PER_DONATION' }), NOW);

    expect(cumulative.governingAmountZAR).toBe(240_000_00);
    expect(cumulative.level).toBe('DISCLOSURE_REQUIRED');

    expect(perDonation.governingAmountZAR).toBe(80_000_00);
    expect(perDonation.level).toBeNull();
  });

  it('reports both readings whichever one governs', () => {
    for (const rule of ['CUMULATIVE_PER_DONOR_PER_YEAR', 'PER_DONATION'] as const) {
      const exposure = exposureForDonor(SPLIT, config({ aggregationRule: rule }), NOW);
      expect(exposure.cumulativeZAR).toBe(240_000_00);
      expect(exposure.largestSingleZAR).toBe(80_000_00);
    }
  });

  it('says so when answering Q1 the other way would change the answer', () => {
    expect(exposureForDonor(SPLIT, config(), NOW).rulesDisagree).toBe(true);
    expect(exposureForDonor(SPLIT, config(), NOW).levelUnderOtherRule).toBeNull();
  });

  it('does not cry disagreement when the two readings agree', () => {
    // One gift, well over the threshold: both readings test the same
    // number and reach the same level.
    const single = [donation({ amountZAR: 500_000_00 })];
    const exposure = exposureForDonor(single, config(), NOW);
    expect(exposure.level).toBe('DISCLOSURE_REQUIRED');
    expect(exposure.levelUnderOtherRule).toBe('DISCLOSURE_REQUIRED');
    expect(exposure.rulesDisagree).toBe(false);
  });

  it('has a plain-language basis for each rule, and they differ', () => {
    expect(RULE_BASIS.CUMULATIVE_PER_DONOR_PER_YEAR).not.toBe(RULE_BASIS.PER_DONATION);
    expect(RULE_BASIS.CUMULATIVE_PER_DONOR_PER_YEAR).toMatch(/added together/i);
    expect(RULE_BASIS.PER_DONATION).toMatch(/on its own/i);
  });

  it('flips to the other rule and back', () => {
    expect(otherRule('PER_DONATION')).toBe('CUMULATIVE_PER_DONOR_PER_YEAR');
    expect(otherRule('CUMULATIVE_PER_DONOR_PER_YEAR')).toBe('PER_DONATION');
  });
});

describe('the financial year', () => {
  it('counts only donations stored against the current year', () => {
    const exposure = exposureForDonor(
      [donation({ amountZAR: 300_000_00, financialYear: '2025/26' }), donation({ amountZAR: 50_000_00 })],
      config(),
      NOW,
    );
    expect(exposure.financialYear).toBe('2026/27');
    expect(exposure.cumulativeZAR).toBe(50_000_00);
    expect(exposure.donationsInYear).toHaveLength(1);
  });

  it('follows the configured start month rather than assuming April', () => {
    // A March start puts 15 September 2026 in 2026/27 as well, but a
    // November start puts it in 2025/26 — the point is that the config
    // decides, because §6.8.1 Q2 is open too.
    expect(exposureForDonor([], config({ financialYearStartMonth: 11 }), NOW).financialYear).toBe('2025/26');
  });

  it('is an honest zero for a donor with nothing this year', () => {
    const exposure = exposureForDonor([], config(), NOW);
    expect(exposure.cumulativeZAR).toBe(0);
    expect(exposure.largestSingleZAR).toBe(0);
    expect(exposure.level).toBeNull();
    expect(exposure.rulesDisagree).toBe(false);
  });
});

describe('what is still undisclosed', () => {
  it('lists the donations in the year with no disclosure recorded', () => {
    const exposure = exposureForDonor(
      [
        donation({ amountZAR: 10_000_00, disclosedAt: '2026-07-01T00:00:00.000Z', iecReference: 'IEC-1' }),
        donation({ amountZAR: 20_000_00 }),
      ],
      config(),
      NOW,
    );
    expect(exposure.undisclosed).toHaveLength(1);
    expect(exposure.undisclosed[0].amountZAR).toBe(20_000_00);
  });
});

describe('the open question is stated, not buried', () => {
  it('names Q1 as unresolved and pending review', () => {
    expect(Q1_UNRESOLVED).toMatch(/unresolved/i);
    expect(Q1_UNRESOLVED).toMatch(/pending attorney review/i);
    expect(Q1_UNRESOLVED).toMatch(/does not settle the question/i);
  });

  it('never claims the configuration answers it', () => {
    expect(Q1_UNRESOLVED).not.toMatch(/\bthe Act requires\b/i);
    expect(Q1_UNRESOLVED).not.toMatch(/\b(confirmed|settled|resolved) by (counsel|the IEC)\b/i);
  });
});
