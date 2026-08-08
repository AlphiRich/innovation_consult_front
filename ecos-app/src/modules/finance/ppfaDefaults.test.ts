import { describe, expect, it } from 'vitest';
import { defaultPPFAConfig } from './ppfaDefaults';

// IC-ECOS-BUILD-2026-V2 §0 rule 4 / §3.5: guards against the superseded
// R100,000 / R15,000,000 / R80,000 regime resurfacing anywhere in seed data.
describe('defaultPPFAConfig', () => {
  const config = defaultPPFAConfig('tenant-1', 'uid-1');

  it('uses the current gazetted disclosure threshold (R200,000, integer cents)', () => {
    expect(config.disclosureThresholdZAR).toBe(200_000_00);
  });

  it('uses the current gazetted annual donor cap (R30,000,000, integer cents)', () => {
    expect(config.annualDonorCapZAR).toBe(30_000_000_00);
  });

  it('derives an R160,000 warning threshold (80% of R200,000), not the superseded R80,000', () => {
    const warningZAR = config.disclosureThresholdZAR * config.warningPercentage;
    expect(warningZAR).toBe(160_000_00);
  });

  it('never equals a superseded threshold value', () => {
    expect(config.disclosureThresholdZAR).not.toBe(100_000_00);
    expect(config.annualDonorCapZAR).not.toBe(15_000_000_00);
  });

  it('cites the gazette', () => {
    expect(config.sourceCitation).toContain('53182');
  });
});
