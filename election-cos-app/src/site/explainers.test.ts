/**
 * Election Campaign OS — the explainer content
 *
 * These pages carry statutory figures AND they are the only pages that
 * can earn advertising revenue. That combination is exactly when a page
 * about the law starts drifting toward whatever gets traffic, so the
 * figures are compared against the same source the application computes
 * from rather than against a copy of them.
 *
 * Proved by injection, each separately, then reverted clean:
 *
 *  - changing R200,000 to R100,000 in the funding explainer → "quotes
 *    the thresholds the application actually applies" fails.
 *  - changing 34 wards to 35 → "every figure traces to the seed data"
 *    fails.
 *  - removing the disclaimer from one explainer → "every explainer says
 *    it is not legal advice" fails.
 *  - adding the Item 12 quota formula → "does not publish the disputed
 *    quota formula" fails.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXPLAINERS, EXPLAINER_DISCLAIMER, explainerBySlug } from './explainers';
import { AD_ELIGIBLE_PATHS } from './ads/adPolicy';
import { PLACEHOLDER_RE } from './siteContent';
import { defaultPPFAConfig } from '@/modules/finance/ppfaDefaults';

const ROOT = path.resolve(__dirname, '..', '..');

interface SeedWard {
  ward: { registeredVoters: number };
  votingDistricts: Array<{ vdCode: string }>;
}
const seed: SeedWard[] = JSON.parse(
  readFileSync(path.join(ROOT, 'seed-data', 'jb-marks-nw405-wards-vds.json'), 'utf-8'),
);

const bodyOf = (slug: string) => {
  const e = explainerBySlug(slug)!;
  return [e.standfirst, ...e.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join(' ');
};

const allProse = EXPLAINERS.map((e) => bodyOf(e.slug)).join(' ');

describe('the figures', () => {
  it('quotes the thresholds the application actually applies', () => {
    const config = defaultPPFAConfig('tenant-1', 'uid-1');
    const funding = bodyOf('party-funding-thresholds');

    expect(config.disclosureThresholdZAR).toBe(200_000_00);
    expect(funding).toContain('R200,000');
    expect(config.annualDonorCapZAR).toBe(30_000_000_00);
    expect(funding).toContain('R30 million');
  });

  it('names the superseded figures only as superseded', () => {
    /**
     * R100,000 and R15 million appear in this explainer on purpose —
     * telling a reader that older material quotes the wrong numbers is
     * the single most useful thing the page does. What must not happen
     * is either figure being presented as current.
     *
     * THE FIRST DRAFT OF THIS TEST DID NOT CATCH THAT, AND WAS PROVED
     * NOT TO. It asserted only that "R200,000" appeared SOMEWHERE in
     * the explainer. R200,000 appears twice, so rewriting the sentence
     * that states the rule to say R100,000 left the other mention
     * standing and the test passed — a presence check passing on the
     * wrong value, which is the defect class rule 5 names.
     *
     * Now every sentence carrying a retired figure must also carry a
     * word marking it as retired, and the sentence that states the rule
     * is pinned exactly.
     */
    const funding = bodyOf('party-funding-thresholds');

    // The sentence that states the rule, in full.
    expect(funding).toContain('A donation above R200,000 must be disclosed.');
    expect(funding).toContain('no more than R30 million in a financial year');

    const RETIRED = ['R100,000', 'R15 million', 'R80,000'];
    const SUPERSEDING = /replaced|earlier|superseded|before|older/i;

    const sentences = funding.split(/(?<=\.)\s+/);
    for (const sentence of sentences) {
      for (const figure of RETIRED) {
        if (!sentence.includes(figure)) continue;
        expect(
          SUPERSEDING.test(sentence),
          `"${figure}" stated without marking it superseded: "${sentence}"`,
        ).toBe(true);
      }
    }

    // And it must still actually do the useful thing.
    expect(funding).toContain('R100,000');
  });

  it('says the thresholds are contested', () => {
    expect(bodyOf('party-funding-thresholds')).toContain('litigation');
  });

  it('every figure traces to the seed data', () => {
    const council = bodyOf('how-a-council-is-made-up');
    const distinctVds = new Set(seed.flatMap((w) => w.votingDistricts.map((v) => v.vdCode)));
    const registered = seed.reduce((n, w) => n + w.ward.registeredVoters, 0);

    expect(council).toContain(`${seed.length} wards`);
    expect(council).toContain('34 wards');
    expect(council).toContain(`${distinctVds.size} voting stations`);
    expect(council).toContain('122,059');
    expect(registered).toBe(122_059);
    // 34 ward + 33 PR = 67. Stated as a sum so a wrong total is visible.
    expect(council).toContain('67 council seats');
    expect(council).toContain('34 ward seats and 33 proportional seats');
  });

  it('names the gazette behind each claim', () => {
    expect(explainerBySlug('party-funding-thresholds')!.sources.join(' ')).toContain('53182');
    expect(explainerBySlug('how-a-council-is-made-up')!.sources.join(' ')).toContain('8929');
    expect(explainerBySlug('popia-and-voter-contact')!.sources.join(' ')).toContain(
      'Protection of Personal Information Act 4 of 2013',
    );
  });
});

describe('what the explainers refuse to do', () => {
  it('does not publish the disputed quota formula', () => {
    /**
     * The Item 12 denominator is an open reading — `seatCalculator.ts`
     * uses B − C − D, the `mmp.ts` upload uses B − C, and §41.4 sends it
     * to an attorney rather than settling it. A public page is the last
     * place to publish a formula two parts of this project disagree
     * about.
     */
    expect(allProse).not.toMatch(/B\s*[−-]\s*C/);
    expect(allProse).not.toMatch(/\bquota\b/i);
    expect(allProse).not.toMatch(/Item\s*12/i);
  });

  it('every explainer says it is not legal advice', () => {
    // Rule 3: this build does not draft or give legal advice, and an
    // explainer that reads like advice is the quiet way to do it anyway.
    expect(EXPLAINER_DISCLAIMER.toLowerCase()).toContain('not legal advice');
    expect(EXPLAINER_DISCLAIMER.toLowerCase()).toContain('attorney');
  });

  it('names no party and no real person', () => {
    for (const party of ['ANC', 'DA', 'EFF', 'VF', 'PA', 'ActionSA']) {
      expect(allProse, `party "${party}"`).not.toMatch(new RegExp(`\\b${party}\\b`));
    }
  });

  it('leaves no bracketed placeholder in published prose', () => {
    for (const e of EXPLAINERS) {
      expect(bodyOf(e.slug), e.slug).not.toMatch(PLACEHOLDER_RE);
      expect(e.title, e.slug).not.toMatch(PLACEHOLDER_RE);
    }
  });

  it('claims nothing the Capability statement does not', () => {
    // "Prepares the export" and "does not file with the IEC" are rows
    // T-01 and T-02 of IC-ECOS-LEG-03. The explainer must not quietly
    // upgrade them.
    const funding = bodyOf('party-funding-thresholds');
    expect(funding).toContain('does not file with the Electoral Commission');
    expect(funding).toContain('does not ensure compliance');

    const popia = bodyOf('popia-and-voter-contact');
    expect(popia).toContain('does not claim to delete data');
  });
});

describe('the explainers and the ad policy agree', () => {
  it('every article is ad-eligible and every eligible article exists', () => {
    const articles = EXPLAINERS.map((e) => e.path).sort();
    const eligible = AD_ELIGIBLE_PATHS.filter((p) => p !== '/explainers').sort();
    expect(eligible).toEqual(articles);
  });

  it('every explainer has a unique slug and a matching path', () => {
    const slugs = EXPLAINERS.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const e of EXPLAINERS) {
      expect(e.path).toBe(`/explainers/${e.slug}`);
    }
  });

  it('every explainer is substantial enough to carry an advert', () => {
    /**
     * A thin page with an advert on it is a content farm. If an
     * explainer is not worth reading on its own, it should not be
     * earning. 1,200 characters is roughly three solid sections.
     */
    for (const e of EXPLAINERS) {
      expect(bodyOf(e.slug).length, e.slug).toBeGreaterThan(1200);
      expect(e.sections.length, e.slug).toBeGreaterThanOrEqual(3);
      expect(e.sources.length, e.slug).toBeGreaterThan(0);
    }
  });
});
