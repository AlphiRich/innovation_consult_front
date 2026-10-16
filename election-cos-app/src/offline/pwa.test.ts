/**
 * Election Campaign OS — guards on the PWA shell
 *
 * The load-bearing assertion in this file is that the service worker
 * caches the application and never the data. An edit that adds a broad
 * caching rule would make the app feel faster and would put voter records
 * into a cache this product cannot enumerate, expire on sign-out, or wipe
 * when a phone changes hands. That is a POPIA problem wearing a
 * performance improvement's clothes, so it is tested rather than trusted
 * to a comment.
 *
 * The rest holds the manifest to the design tokens and keeps the font
 * wiring from regressing — it had never been wired at all until session
 * 38, and nothing in the suite noticed for thirty-seven sessions because
 * the two config files agreed with each other.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { tokens } from '@/design/tokens';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const read = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const sw = read('public/sw.js');
const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  lang: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
  shortcuts?: { url: string }[];
};

describe('the service worker caches the app and never the data', () => {
  it('refuses every same-origin API path', () => {
    // /api/** is the sync function behind a Hosting rewrite: same origin,
    // but data.
    expect(sw).toMatch(/url\.pathname\.startsWith\('\/api\/'\)/);
  });

  it('names the data hosts it must never cache', () => {
    for (const host of [
      'firestore.googleapis.com',
      'firebasestorage.googleapis.com',
      'identitytoolkit.googleapis.com',
      'securetoken.googleapis.com',
      'cloudfunctions.net',
    ]) {
      expect(sw, `${host} must be in FORBIDDEN_HOSTS`).toContain(host);
    }
  });

  it('caches nothing cross-origin at all', () => {
    // The host list is belt and braces; the origin check is the rule.
    expect(sw).toMatch(/if \(url\.origin !== self\.location\.origin\) return false;/);
  });

  it('says in its own header that data is not cached', () => {
    expect(sw).toMatch(/caches the application, never the data/i);
    // And says where offline data actually lives, so the next reader does
    // not "fix" the omission.
    expect(sw).toMatch(/Dexie/);
  });

  it('only ever caches GET', () => {
    expect(sw).toMatch(/request\.method !== 'GET'/);
  });

  it('does not precache itself', () => {
    const builder = read('scripts/build-sw.mjs');
    expect(builder).toMatch(/entry\.name === 'sw\.js'/);
  });
});

describe('the offline navigation fallback', () => {
  it('serves the cached shell when the network fails', () => {
    expect(sw).toMatch(/request\.mode === 'navigate'/);
    expect(sw).toMatch(/cache\.match\('\/index\.html'\)/);
  });

  it('precaches index.html first, since every other asset depends on it', () => {
    const builder = read('scripts/build-sw.mjs');
    expect(builder).toMatch(/\['\/index\.html', \.\.\.assets/);
  });

  it('fails its install rather than precaching a partial shell', () => {
    // addAll is atomic. A half-precached shell is a white screen offline,
    // and the old worker staying in charge is the better outcome.
    expect(sw).toMatch(/cache\.addAll\(PRECACHE\)/);
    expect(sw).toMatch(/addAll is atomic/i);
    // Normalised, because the reason spans a wrapped comment line.
    expect(sw.replace(/\s*\/\/\s*/g, ' ')).toMatch(/partially precached shell is a white screen offline/i);
  });
});

describe('updates are offered, never forced', () => {
  it('never reloads without the user choosing it', () => {
    const register = read('src/offline/registerServiceWorker.ts');
    // The only reload is in response to controllerchange, which only
    // happens after SKIP_WAITING, which only the banner sends.
    expect(register).toMatch(/postMessage\('SKIP_WAITING'\)/);
    expect(register).toMatch(/it never reloads on its own/i);
    const banner = read('src/offline/UpdateBanner.tsx');
    expect(banner).toMatch(/applyWaitingUpdate/);
    // "Not now" has to be an answer.
    expect(banner).toMatch(/Not now/);
  });

  it('does not prompt on the very first install', () => {
    // controller === null means the app is becoming available offline for
    // the first time, which is not an update.
    const register = read('src/offline/registerServiceWorker.ts');
    expect(register).toMatch(/navigator\.serviceWorker\.controller/);
    expect(register).toMatch(/that is not\s*\n?\s*\/\/ an update/i);
  });

  it('stays out of the way in development', () => {
    expect(read('src/offline/registerServiceWorker.ts')).toMatch(/import\.meta\.env\.DEV/);
  });
});

describe('the manifest', () => {
  it('is installable: name, start_url, display and icons', () => {
    expect(manifest.name).toBe('Election Campaign OS');
    expect(manifest.short_name).toBe('EC OS');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('en-ZA');
  });

  it('uses the design tokens rather than a second palette', () => {
    expect(manifest.theme_color).toBe(tokens.color.ink);
    expect(manifest.background_color).toBe(tokens.color.paper);
  });

  it('carries the icon sizes Android and iOS actually require', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    // Without a maskable icon Android draws the square inside its circle
    // mask, cropping the mark.
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('ships every icon file it declares', () => {
    for (const icon of manifest.icons) {
      const file = path.join(REPO_ROOT, 'public', icon.src.replace(/^\//, ''));
      expect(existsSync(file), `${icon.src} is declared but not present`).toBe(true);
    }
    expect(existsSync(path.join(REPO_ROOT, 'public', 'apple-touch-icon.png'))).toBe(true);
  });
});

describe('the brand typefaces are actually loaded', () => {
  // They were declared in two config files and loaded by neither from
  // session 1 to session 38. Everything rendered in the browser's generic
  // sans-serif, and tokens.test.ts could not see it because it only
  // compared the two configs to each other.
  const fontsCss = read('src/fonts.css');
  const indexCss = read('src/index.css');

  it('imports the generated face declarations', () => {
    // Comments stripped first. An earlier version of this guard matched
    // the import inside `/* @import './fonts.css'; */` and passed while
    // the fonts were switched off — which is the exact defect it exists
    // to catch.
    const active = indexCss.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(active).toMatch(/@import '\.\/fonts\.css';/);
    // Before Tailwind's base layer, or the utilities apply faces that are
    // not registered yet.
    expect(active.indexOf('@import')).toBeLessThan(active.indexOf('@tailwind base'));
  });

  it('declares every family the Tailwind config names', () => {
    for (const family of ['Archivo Narrow', 'Public Sans', 'IBM Plex Mono']) {
      expect(fontsCss, `${family} has no @font-face`).toContain(`font-family: '${family}'`);
    }
  });

  it('ships the files those declarations point at', () => {
    const referenced = [...fontsCss.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((m) => m[1]);
    expect(referenced.length).toBeGreaterThan(0);
    const present = new Set(readdirSync(path.join(REPO_ROOT, 'public', 'fonts')));
    for (const file of referenced) {
      expect(present.has(file), `${file} is referenced but not vendored`).toBe(true);
    }
  });

  it('keeps latin-ext, which Afrikaans names need', () => {
    // ë, ê, ô, î appear in real place and surnames here. Dropping the
    // subset renders them in a fallback face mid-word.
    expect(fontsCss).toMatch(/latin-ext/);
  });

  it('is self-hosted, with no CDN request left in the HTML', () => {
    const html = read('index.html');
    expect(html).not.toMatch(/fonts\.googleapis\.com/);
    expect(html).not.toMatch(/fonts\.gstatic\.com/);
    expect(fontsCss).not.toMatch(/https:\/\/fonts\./);
  });

  it('swaps rather than blocking the first paint', () => {
    expect(fontsCss).toMatch(/font-display: swap/);
  });
});

describe('the document head', () => {
  const html = read('index.html');

  it('links the manifest and sets the theme colour from the tokens', () => {
    expect(html).toMatch(/rel="manifest" href="\/manifest\.webmanifest"/);
    expect(html).toContain(`content="${tokens.color.ink}"`);
  });

  it('does not leak a route carrying ward codes to third parties', () => {
    expect(html).toMatch(/name="referrer" content="same-origin"/);
  });

  it('keeps a campaign tool out of search results', () => {
    expect(html).toMatch(/noindex/);
  });

  it('explains itself when scripting is off', () => {
    expect(html).toMatch(/<noscript>/);
  });
});
