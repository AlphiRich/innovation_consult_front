import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

// Session 16. The tests above guard the seed *values*. They cannot catch a
// superseded figure typed into prose on a screen — which is exactly how the
// ecos-v2 fork failed: its seed defaulted to the correct R200,000 /
// R30,000,000 while its settings index described the module as "Political
// Party Funding Act limits (R100,000 threshold, R15M annual ceiling)", so
// the retired figures were what an admin actually read
// (docs/ecos-v2-fork-review.md §4d). This closes that gap on the surfaces
// that describe PPFA to a user.
describe('no PPFA surface quotes a superseded figure', () => {
  const SURFACES = [
    'src/modules/settings/SettingsPage.tsx',
    'src/modules/settings/PPFAThresholdsPage.tsx',
    'src/modules/finance/FinancePage.tsx',
    'src/modules/finance/DonationForm.tsx',
    'src/modules/finance/DonorDetail.tsx',
  ];

  // The retired regime: R100,000 disclosure / R15,000,000 cap / R80,000
  // warning, in the shapes a person would actually type them.
  const SUPERSEDED = [
    /R\s?100[ ,]?000/i,
    /R\s?15[ ,]?000[ ,]?000/i,
    /R\s?15\s?m\b/i,
    /R\s?80[ ,]?000/i,
  ];

  for (const surface of SURFACES) {
    it(`${surface} quotes no superseded PPFA figure`, () => {
      const source = readFileSync(resolve(process.cwd(), surface), 'utf8');
      for (const pattern of SUPERSEDED) {
        expect(source, `${surface} matched ${pattern}`).not.toMatch(pattern);
      }
    });
  }
});
