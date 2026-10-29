/**
 * Election Campaign OS — the advertising policy
 *
 * The instruction: consent-gated adverts on explainer pages only, with
 * political and election advertising categories blocked. These hold the
 * two halves this repository can enforce, and pin the third as a
 * specification so it cannot be quietly dropped.
 *
 * Proved by injection, each separately, then reverted clean:
 *
 *  - returning `allowed: true` before the consent check → "no consent,
 *    no advert, on every eligible page" fails.
 *  - switching the path check from the allowlist to a `startsWith`
 *    prefix → "the eligible list is literal, not a prefix" fails.
 *  - dropping `normalisePath` → "a trailing slash is not a way around
 *    the allowlist" fails.
 *  - allowing a null client id → "refuses to serve until the account is
 *    configured" fails.
 *  - adding '/compliance' to the eligible list → both "never on a page
 *    that sells or collects" and the forbidden-list test fail.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AD_CLIENT_ID,
  AD_ELIGIBLE_PATHS,
  AD_FORBIDDEN_PATHS,
  REQUIRED_BLOCKED_CATEGORIES,
  adDecision,
  normalisePath,
} from './adPolicy';
import { EXPLAINERS } from '../explainers';

const SRC = path.resolve(__dirname, '..', '..');

const decide = (pathname: string, hasConsent: boolean, clientId: string | null = 'ca-pub-test') =>
  adDecision({ pathname, hasConsent, clientId });

describe('consent gates every advert', () => {
  it('no consent, no advert, on every eligible page', () => {
    for (const p of AD_ELIGIBLE_PATHS) {
      const d = decide(p, false);
      expect(d.allowed, `${p} without consent`).toBe(false);
      expect(d.refusal).toBe('NO_CONSENT');
    }
  });

  it('allows only on an eligible page WITH consent', () => {
    for (const p of AD_ELIGIBLE_PATHS) {
      expect(decide(p, true).allowed, `${p} with consent`).toBe(true);
    }
  });

  it('refuses to serve until the account is configured', () => {
    /**
     * The category blocks are an ad-network console setting this code
     * cannot apply. A half-configured account is the one state in which
     * they might not be in force, so an unset client id refuses rather
     * than serving uncategorised inventory.
     */
    const d = decide('/explainers', true, null);
    expect(d.allowed).toBe(false);
    expect(d.refusal).toBe('NOT_CONFIGURED');
  });

  it('ships with no client id, so nothing can serve by accident', () => {
    // Filling this in is a deliberate act that should fail this test and
    // make somebody confirm the console blocks are in place first.
    expect(AD_CLIENT_ID).toBeNull();
    expect(adDecision({ pathname: '/explainers', hasConsent: true }).allowed).toBe(false);
  });
});

describe('explainer pages only', () => {
  it('never on a page that sells, explains limits, or collects', () => {
    /**
     * Consent is deliberately TRUE in every case here. A consented
     * visitor on a non-explainer page must still be refused, or the
     * policy is "ads after consent" rather than "ads on explainers
     * after consent".
     */
    for (const p of AD_FORBIDDEN_PATHS) {
      const d = decide(p, true);
      expect(d.allowed, `${p} with consent`).toBe(false);
      expect(d.refusal).toBe('PAGE_NOT_ELIGIBLE');
    }
  });

  it('the eligible and forbidden lists cannot overlap', () => {
    const overlap = AD_ELIGIBLE_PATHS.filter((p) => AD_FORBIDDEN_PATHS.includes(p));
    expect(overlap).toEqual([]);
  });

  it('covers every route the site actually serves', () => {
    // A route in neither list is one nobody decided about. The default
    // is refusal, so this is not a hole — but an undecided page is still
    // worth failing on, because the decision is the control.
    const siteRoutes = ['/', '/casework-tracker', '/compliance', '/packages', '/contact'];
    for (const r of siteRoutes) {
      expect(
        AD_ELIGIBLE_PATHS.includes(r) || AD_FORBIDDEN_PATHS.includes(r),
        `${r} is in neither list`,
      ).toBe(true);
    }
  });

  it('the eligible list is literal, not a prefix', () => {
    /**
     * A prefix match would extend advertising to every future page under
     * /explainers/ automatically, including ones nobody reviewed. The
     * review is the control, so adding a page must be a deliberate edit.
     */
    expect(decide('/explainers/something-nobody-reviewed', true).allowed).toBe(false);
    expect(decide('/explainers/party-funding-thresholds/extra', true).allowed).toBe(false);
  });

  it('lists exactly the explainers that exist, and no others', () => {
    // Guards both directions: an article with no entry here never earns
    // revenue, and an entry with no article is a path that would accept
    // an advert on a page that does not exist.
    const articlePaths = EXPLAINERS.map((e) => e.path).sort();
    const eligibleArticles = AD_ELIGIBLE_PATHS.filter((p) => p !== '/explainers').sort();
    expect(eligibleArticles).toEqual(articlePaths);
  });

  it('a trailing slash or query string is not a way around the allowlist', () => {
    expect(normalisePath('/compliance/')).toBe('/compliance');
    expect(normalisePath('/compliance?utm_source=x')).toBe('/compliance');
    expect(normalisePath('/COMPLIANCE')).toBe('/compliance');

    for (const variant of ['/compliance/', '/compliance?utm=x', '/COMPLIANCE', '/compliance#top']) {
      expect(decide(variant, true).allowed, variant).toBe(false);
    }
    // And the same normalisation must not accidentally block a real one.
    expect(decide('/explainers/', true).allowed).toBe(true);
    expect(decide('/explainers?utm_source=google', true).allowed).toBe(true);
  });
});

describe('political and election advertising', () => {
  it('names the categories that must be blocked on the account', () => {
    // This repository cannot apply these — they are an ad-network
    // console setting. Pinning them means the specification cannot be
    // quietly dropped, and §42 records it as an owner action.
    const required = REQUIRED_BLOCKED_CATEGORIES.map((c) => c.toLowerCase()).join(' | ');
    expect(required).toContain('politics');
    expect(required).toContain('elections');
    expect(required).toContain('political advocacy');
    expect(required).toContain('political fundraising');
  });
});

describe('the application never carries ad code', () => {
  /**
   * The strongest guarantee here, and the one most likely to be undone
   * by a later edit that means no harm. The war room's page context IS
   * voter data, and a voter's political opinion is special personal
   * information under POPIA s 26 — a third-party ad tag on those screens
   * is a s 31(2) disclosure on a basis nobody has established.
   *
   * Scans source text rather than trusting the directory layout.
   */
  const AD_MARKERS = ['adsbygoogle', 'googlesyndication', 'pagead', 'data-ad-slot'];

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules') continue;
        out.push(...sourceFiles(full));
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(full);
      }
    }
    return out;
  }

  /**
   * Comments are blanked before asserting absence. This defect class has
   * appeared repeatedly on this project — a guard that trips on the
   * sentence explaining it gets switched off, and then it guards
   * nothing. Line count is preserved so a failure still points at a real
   * line.
   */
  function stripComments(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
  }

  it('has no ad identifier anywhere outside src/site/ads', () => {
    const allowed = path.join(SRC, 'site', 'ads');
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      if (file.startsWith(allowed)) continue;
      const body = stripComments(readFileSync(file, 'utf-8'));
      for (const marker of AD_MARKERS) {
        if (body.includes(marker)) {
          offenders.push(`${path.relative(SRC, file)} contains "${marker}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps ad code out of the application entry entirely', () => {
    // `src/app/**`, `src/modules/**` and `src/dal/**` are the
    // authenticated product. Named separately from the sweep above so a
    // failure says which rule was broken.
    for (const area of ['app', 'modules', 'dal', 'offline', 'auth']) {
      for (const file of sourceFiles(path.join(SRC, area))) {
        const body = stripComments(readFileSync(file, 'utf-8'));
        for (const marker of AD_MARKERS) {
          expect(body.includes(marker), `${path.relative(SRC, file)} / ${marker}`).toBe(false);
        }
      }
    }
  });
});
