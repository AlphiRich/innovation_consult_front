/**
 * Guard: the headers Hosting actually serves are the headers declared.
 *
 * `firebase.json` cannot import a module, so `scripts/sync-hosting-headers.mjs`
 * generates that block and `--check` fails if the two drift. These tests
 * cover what the generator cannot: that the policy itself still says what
 * it is supposed to say.
 *
 * Every assertion here is a property somebody could plausibly weaken
 * while "fixing" something — and each one, weakened, is a real exposure
 * in a product holding a voter roll.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  AUTH_IFRAME_HOST,
  CACHE_RULES,
  CONTENT_SECURITY_POLICY,
  GLOBAL_HEADERS,
} from './securityHeaders';

const ROOT = path.resolve(__dirname, '..', '..');
const firebaseJson = JSON.parse(readFileSync(path.join(ROOT, 'firebase.json'), 'utf8'));

function directive(name: string): string {
  const found = CONTENT_SECURITY_POLICY.split('; ').find((d) => d === name || d.startsWith(`${name} `));
  return found ?? '';
}

describe('the content security policy', () => {
  it('never allows inline or evaluated script', () => {
    // The build has no inline scripts — verified against dist/index.html,
    // which emits one <script type="module" src=…> and nothing else. This
    // is the single most load-bearing line in the policy.
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
    expect(directive('script-src')).not.toContain("'unsafe-eval'");
    expect(directive('default-src')).toBe("default-src 'self'");
  });

  it('allows inline style, and nothing else unsafe', () => {
    // Three components set style attributes with runtime values —
    // BarMeter's width, SchematicMap's alpha, the household map's height.
    // An attribute cannot be hashed or nonced, so this is the one
    // concession. It permits style injection, not code execution.
    expect(directive('style-src')).toContain("'unsafe-inline'");
    const unsafeElsewhere = CONTENT_SECURITY_POLICY.split('; ')
      .filter((d) => !d.startsWith('style-src'))
      .filter((d) => d.includes("'unsafe-"));
    expect(unsafeElsewhere).toEqual([]);
  });

  it('does not set the deprecated X-XSS-Protection header', () => {
    // Session 31 flagged this in the Cloudflare Worker that was reviewed:
    // deprecated, ignored by current Chrome and Firefox, and its
    // filtering mode has itself been a source of vulnerabilities.
    expect(Object.keys(GLOBAL_HEADERS)).not.toContain('X-XSS-Protection');
  });

  it('refuses to be framed, two ways', () => {
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(GLOBAL_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('locks down the escape hatches', () => {
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(directive('base-uri')).toBe("base-uri 'self'");
    expect(directive('form-action')).toBe("form-action 'self'");
  });

  it('never allows a localhost origin', () => {
    // A production bundle that could reach an emulator is a production
    // bundle reading from a database nobody secured.
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/127\.0\.0\.1|localhost/);
  });

  it('keeps the referrer inside the origin', () => {
    // Routes carry ward and voting-district codes. This is the header
    // version of the <meta name="referrer"> in index.html, and it
    // reaches responses a meta tag cannot.
    expect(GLOBAL_HEADERS['Referrer-Policy']).toBe('same-origin');
  });

  it('sets HSTS for a year, without preload', () => {
    const hsts = GLOBAL_HEADERS['Strict-Transport-Security'];
    expect(hsts).toContain('max-age=31536000');
    // `preload` is baked into browsers and is slow and painful to
    // reverse. It should be a separate, deliberate decision.
    expect(hsts).not.toContain('preload');
  });
});

describe('cache rules', () => {
  it('never lets the service worker be cached', () => {
    // A cached service worker is a device frozen on an old build, in an
    // offline-first application whose users are in the field.
    const sw = CACHE_RULES.find((r) => r.source === '/sw.js');
    expect(sw?.value).toContain('no-store');
  });

  it('only marks fingerprinted paths immutable', () => {
    for (const rule of CACHE_RULES) {
      if (!rule.value.includes('immutable')) continue;
      expect(['/assets/**', '/fonts/**']).toContain(rule.source);
    }
  });
});

describe('firebase.json', () => {
  it('carries every declared header', () => {
    const block = firebaseJson.hosting.headers?.find((h: { source: string }) => h.source === '**');
    expect(block, 'firebase.json must have a `**` headers block').toBeTruthy();
    const served = Object.fromEntries(
      block.headers.map((h: { key: string; value: string }) => [h.key, h.value]),
    );
    expect(served).toEqual(GLOBAL_HEADERS);
  });

  it('carries every cache rule', () => {
    for (const rule of CACHE_RULES) {
      const block = firebaseJson.hosting.headers?.find(
        (h: { source: string }) => h.source === rule.source,
      );
      expect(block, `no headers block for ${rule.source}`).toBeTruthy();
      expect(block.headers[0]).toEqual({ key: 'Cache-Control', value: rule.value });
    }
  });

  /**
   * Session 37. The CSP's frame-src named
   * `election2026-campaignms7-0.firebaseapp.com` for as long as that was
   * the project. When `.firebaserc` moved to `electioncos1-0`, nothing
   * failed — not a type, not a lint, not a test. The app would have
   * deployed, loaded, and then silently refused to sign anyone in,
   * because Firebase Auth's iframe was blocked by our own policy.
   *
   * So the auth host is held to the project id rather than to a memory
   * of it. Proved by injection: putting the old project back into
   * AUTH_IFRAME_HOST fails this test, then reverted clean.
   */
  it('frames the auth iframe for the project this repo actually deploys to', () => {
    const rc = JSON.parse(readFileSync(path.join(ROOT, '.firebaserc'), 'utf-8'));
    const project = rc.projects.default;

    expect(AUTH_IFRAME_HOST).toBe(`https://${project}.firebaseapp.com`);
    expect(CONTENT_SECURITY_POLICY).toContain(`frame-src 'self'`);
    expect(CONTENT_SECURITY_POLICY).toContain(AUTH_IFRAME_HOST);

    // And the generated header, not just the constant it came from.
    const global = firebaseJson.hosting.headers.find((h: { source: string }) => h.source === '**');
    const csp = global.headers.find(
      (x: { key: string }) => x.key === 'Content-Security-Policy',
    ).value;
    expect(csp).toContain(`https://${project}.firebaseapp.com`);
  });

  it('deploys to a named hosting target rather than whatever the default site is', () => {
    // `firebase deploy --only hosting:app` is meaningless without this,
    // and a bare default-site deploy is how the wrong site gets written
    // to once a second one exists.
    const rc = JSON.parse(readFileSync(path.join(ROOT, '.firebaserc'), 'utf-8'));
    const target = firebaseJson.hosting.target;

    expect(target, 'firebase.json hosting needs a target').toBe('app');
    const sites = rc.targets?.[rc.projects.default]?.hosting?.[target];
    expect(sites, `.firebaserc must map hosting target ${target}`).toBeTruthy();
    expect(sites).toContain(rc.projects.default);
  });

  it('still rewrites /api/** to the function, ahead of the SPA catch-all', () => {
    // The sync endpoint is same-origin at /api/** behind this rewrite,
    // which is what lets connect-src stay 'self' for it and the service
    // worker treat it as same-origin and never cache it. A separate
    // api. subdomain would undo both.
    const rewrites = firebaseJson.hosting.rewrites;
    const api = rewrites.findIndex((r: { source: string }) => r.source === '/api/**');
    const spa = rewrites.findIndex((r: { source: string }) => r.source === '**');
    expect(api).toBeGreaterThanOrEqual(0);
    expect(api).toBeLessThan(spa);
  });
});
