/**
 * Election Campaign OS — the public site's claims
 *
 * A marketing page is where a wrong number does the most damage,
 * because it is the one surface a buyer reads before anybody has signed
 * anything. These hold the site to the same standard as the calculator.
 *
 * Proved by injection: changing 108 to 110, changing R200,000 to
 * R100,000, and inventing an answer over a bracketed placeholder each
 * fail exactly one test here. Reverted clean.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CASEWORK_FAQ,
  CONSENT_VERSION,
  INFORMATION_OFFICER,
  CLAIM_ROWS,
  EXAMPLE_CASE,
  FUNDING_POINTS,
  FUNDING_SOURCE,
  PACKAGES,
  PILLARS,
  PLACEHOLDER_RE,
  REFERENCE_FIGURES,
  REFERENCE_FOOTNOTE,
  SITE,
  whatsAppHref,
} from './siteContent';
import { defaultPPFAConfig } from '@/modules/finance/ppfaDefaults';

const ROOT = path.resolve(__dirname, '..', '..');

interface SeedWard {
  ward: { registeredVoters: number };
  votingDistricts: Array<{ vdCode: string }>;
}
const seed: SeedWard[] = JSON.parse(
  readFileSync(path.join(ROOT, 'seed-data', 'jb-marks-nw405-wards-vds.json'), 'utf-8'),
);

const figure = (label: string) => REFERENCE_FIGURES.find((f) => f.label === label)!.value;

describe('the reference figures on the home page', () => {
  it('states the ward count the seed data actually holds', () => {
    expect(figure('Wards')).toBe(String(seed.length));
    expect(figure('Wards')).toBe('34');
  });

  it('counts DISTINCT voting districts, not seed rows', () => {
    // The seed holds 135 rows for 108 codes, because a station split
    // across a ward boundary is listed once per ward. Publishing the row
    // count would overstate the municipality's stations by a quarter.
    const distinct = new Set(seed.flatMap((w) => w.votingDistricts.map((v) => v.vdCode)));
    const rows = seed.reduce((n, w) => n + w.votingDistricts.length, 0);

    expect(rows).toBeGreaterThan(distinct.size);
    expect(figure('Voting stations')).toBe(String(distinct.size));
    expect(figure('Voting stations')).toBe('108');
  });

  it('states the registered-voter total the seed sums to', () => {
    // Compared as a number, not as a formatted string. `en-ZA` groups
    // with a non-breaking space and the page groups with a comma, so a
    // locale comparison here tests the separator rather than the figure
    // — and the separator is a typographic choice, not a claim.
    const total = seed.reduce((n, w) => n + w.ward.registeredVoters, 0);
    expect(Number(figure('Registered voters').replace(/\D/g, ''))).toBe(total);
    expect(figure('Registered voters')).toBe('122,059');
  });

  it('names the gazette those figures reconcile to', () => {
    // A figure without its source is the thing this whole register
    // exists to stop. docs/nw405-seed-data.md is where it comes from.
    expect(REFERENCE_FOOTNOTE).toContain('8929');
    expect(REFERENCE_FOOTNOTE).toContain('18 November 2025');
    expect(REFERENCE_FOOTNOTE).not.toMatch(PLACEHOLDER_RE);
  });
});

describe('the party-funding thresholds', () => {
  it('quotes the figures the application actually uses', () => {
    const config = defaultPPFAConfig('tenant-1', 'uid-1');
    const points = FUNDING_POINTS.join(' ');

    expect(config.disclosureThresholdZAR).toBe(200_000_00);
    expect(points).toContain('R200,000');
    expect(config.annualDonorCapZAR).toBe(30_000_000_00);
    expect(points).toContain('R30 million');
  });

  it('carries no superseded threshold anywhere on the site', () => {
    // Twice now a superseded figure has reached this project in prose
    // while the seed values were right — the ecos-v2 fork (§4d) and the
    // App Code Build Stack (§37.3). A sales page is the easiest place
    // for it to happen a third time.
    const prose = [...FUNDING_POINTS, FUNDING_SOURCE, ...CLAIM_ROWS.map((r) => r.does)].join(' ');
    expect(prose).not.toContain('R100,000');
    expect(prose).not.toContain('R15 million');
    expect(prose).not.toContain('R15,000,000');
  });

  it('cites the gazette and says the thresholds are contested', () => {
    expect(FUNDING_SOURCE).toContain('53182');
    expect(FUNDING_SOURCE).toContain('under court challenge');
  });
});

describe('what the site will not do', () => {
  it('keeps every unsupplied fact as a visible placeholder', () => {
    /**
     * The canvas marks facts still to supply in square brackets. They
     * stay bracketed until somebody supplies them: an invented
     * onboarding timeline or Information Officer on a compliance page
     * would be exactly the fabrication rule 2 forbids, dressed as copy.
     *
     * This pins the EXACT set, not merely that some placeholder
     * survives. The first draft asserted `stillOpen.length > 0`, and
     * proved nothing — injecting "You do, entirely and for ever." over
     * the data-ownership answer left three other placeholders standing
     * and the test passed. Filling one in should now require editing
     * this list, which is the whole point of the list.
     */
    const open = {
      'FAQ · onboarding': CASEWORK_FAQ[1].a,
      'FAQ · data ownership': CASEWORK_FAQ[2].a,
      'FAQ · handover': CASEWORK_FAQ[3].a,
      'claims · sixth row': CLAIM_ROWS[5].does,
      'claims · T-01 reference': CLAIM_ROWS[0].ref,
      'claims · T-06 reference': CLAIM_ROWS[5].ref,
      'information officer': INFORMATION_OFFICER,
      'street address': SITE.address,
      'B-BBEE note': SITE.bbbee,
      'fourth mailbox': SITE.mailboxes[3],
      'consent wording version': CONSENT_VERSION,
    };

    for (const [what, text] of Object.entries(open)) {
      expect(text, `${what} should still be a placeholder`).toMatch(PLACEHOLDER_RE);
    }
  });

  it('labels every example as invented, on every surface it appears', () => {
    // No real resident's complaint, and no real ward, goes on a sales
    // page. The canvas is explicit about this and so is the register.
    expect(EXAMPLE_CASE.disclaimer.toLowerCase()).toContain('invented');
    expect(EXAMPLE_CASE.where.toLowerCase()).toContain('example');
    expect(EXAMPLE_CASE.office.toLowerCase()).toContain('ward 07');
  });

  it('names no party anywhere', () => {
    /**
     * Neutrality is the product's whole commercial position: the same
     * modules and terms for everyone. A party name in the copy — even
     * as an example — would break it.
     *
     * Whole words only. The first draft of this used a bare substring
     * and failed on `[B-BBEE STATUTORY COMPLIANCE NOTE]`, because
     * "COMPLIANCE" contains "ANC" — the same shape of mistake as a
     * guard that trips on the comment explaining it. "EFF" inside
     * "EFFECTIVE" is the same trap waiting. Placeholders are dropped
     * first for the same reason: they are uppercase by convention and
     * are not copy.
     */
    const copy = JSON.stringify({ PILLARS, PACKAGES, CLAIM_ROWS, CASEWORK_FAQ, SITE }).replace(
      new RegExp(PLACEHOLDER_RE.source, 'g'),
      ' ',
    );

    for (const party of ['ANC', 'DA', 'EFF', 'VF', 'PA', 'Democratic Alliance', 'ActionSA']) {
      expect(copy, `party name "${party}" in site copy`).not.toMatch(
        new RegExp(`\\b${party}\\b`),
      );
    }
  });

  it('claims nothing as built that the register has not built', () => {
    // Every pillar is marked built. Each must name its own proof, so a
    // claim and its evidence travel together.
    for (const p of PILLARS) {
      expect(p.status).toBe('built');
      expect(p.proof.trim().length).toBeGreaterThan(10);
      expect(p.proof).not.toMatch(PLACEHOLDER_RE);
    }
  });
});

describe('the one published price list', () => {
  it('prices a ward the same for a party and an independent', () => {
    // "One published price list" is the fourth line of the neutrality
    // pledge. This is that line, checkable.
    const independent = PACKAGES.find((p) => p.buyer.includes('Independent'))!;
    const smallParty = PACKAGES.find((p) => p.buyer.includes('Small party'))!;
    expect(independent.price).toBe(smallParty.price);
    expect(independent.price).toBe('R1,800');
  });

  it('agrees with the Casework Tracker page on its own price', () => {
    const tracker = PACKAGES.find((p) => p.pkg.includes('Casework'))!;
    expect(tracker.price).toBe('R2,500');
    expect(CASEWORK_FAQ[0].a).toContain('R2,500');
  });
});

describe('the WhatsApp route', () => {
  it('encodes the subject rather than pasting it into the URL', () => {
    const href = whatsAppHref('Casework Tracker enquiry');
    expect(href).toBe('https://wa.me/27824497310?text=Casework%20Tracker%20enquiry');
    expect(href).not.toContain(' ');
  });
});
