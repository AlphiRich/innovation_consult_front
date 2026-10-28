/**
 * Guard: the application's public domain cannot drift.
 *
 * The domain is declared once in `publicDomain.ts` and used in a file
 * outside this package — the corporate landing page at the repository
 * root, which is plain HTML and cannot import it. These tests are what
 * keep the two honest, plus a tripwire against the superseded phase-0
 * names coming back.
 *
 * Proved by injection when written: changing APP_DOMAIN without changing
 * index.html fails the first test; putting
 * `app.electioncampaignos.co.za` back into index.html fails the
 * supersession test; adding a second APP_URL assignment fails the
 * single-source test. Reverted clean.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  APP_DOMAIN,
  APP_ORIGIN,
  CORPORATE_DOMAIN,
  HOSTING_ORIGIN,
  SUPERSEDED_DOMAINS,
} from './publicDomain';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LANDING_PAGE = path.join(REPO_ROOT, 'index.html');

function landingPage(): string {
  return readFileSync(LANDING_PAGE, 'utf-8');
}

/**
 * Comments are blanked so a sentence *about* a domain is not mistaken for
 * a use of one. Third time this defect class has been handled in this
 * repository — see the type-scale guard and the font guard — so it is
 * done up front rather than after the guard flags its own documentation.
 */
function withoutComments(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

describe('the application domain', () => {
  it('is a well-formed .co.za hostname with no scheme or path', () => {
    expect(APP_DOMAIN).toMatch(/^[a-z0-9][a-z0-9.-]*\.co\.za$/);
    expect(APP_DOMAIN).not.toContain('/');
    expect(APP_ORIGIN).toBe(`https://${APP_DOMAIN}`);
    // A trailing slash here would produce a double slash in the probe URL.
    expect(APP_ORIGIN.endsWith('/')).toBe(false);
    expect(HOSTING_ORIGIN.endsWith('/')).toBe(false);
  });

  it('is the origin the landing page launches', () => {
    const code = withoutComments(landingPage());
    const match = /var\s+APP_URL\s*=\s*"([^"]+)"/.exec(code);
    expect(match, 'index.html must declare var APP_URL').not.toBeNull();
    expect(match![1]).toBe(APP_ORIGIN);
  });

  it('keeps the Hosting origin as the landing page fallback', () => {
    // The fallback is what stops a successful deploy still reading
    // "Launching soon" while .co.za DNS propagates.
    const code = withoutComments(landingPage());
    const match = /var\s+FALLBACK_URL\s*=\s*"([^"]+)"/.exec(code);
    expect(match, 'index.html must declare var FALLBACK_URL').not.toBeNull();
    expect(match![1]).toBe(HOSTING_ORIGIN);
  });

  it('appears in exactly one assignment on the landing page', () => {
    const code = withoutComments(landingPage());
    expect((code.match(/var\s+APP_URL\s*=/g) ?? []).length).toBe(1);
    expect((code.match(/var\s+FALLBACK_URL\s*=/g) ?? []).length).toBe(1);
  });

  it('does not reuse a superseded name', () => {
    const code = withoutComments(landingPage());
    for (const dead of SUPERSEDED_DOMAINS) {
      // Two kinds of entry live in this list and the message must not
      // claim the wrong one: the phase-0 names were planned and never
      // registered, while `electioscos.co.za` was the live APP_DOMAIN
      // until 28 Oct 2026. Both are dead; only one was ever imaginary.
      expect(code, `${dead} is a superseded domain and must not be a live target`).not.toContain(
        dead,
      );
      expect(APP_DOMAIN).not.toBe(dead);
    }
  });

  it('is not the corporate domain', () => {
    // Two identity systems, same as the two colour palettes: Innovation
    // Consult publishes from one domain, the product is served from
    // another. Collapsing them would put a campaign's voter roll behind
    // the company's marketing site.
    expect(APP_DOMAIN).not.toBe(CORPORATE_DOMAIN);
    expect(APP_DOMAIN.endsWith(`.${CORPORATE_DOMAIN}`)).toBe(false);
  });
});
