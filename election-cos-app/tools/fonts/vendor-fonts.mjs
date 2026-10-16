#!/usr/bin/env node
/**
 * Election Campaign OS — vendor the brand typefaces
 * IC-ECOS-BUILD-2026-V2 §2.2, §3.3.
 *
 * WHAT THIS FIXES
 *
 * `tailwind.config.js` and `src/design/tokens.ts` have declared Archivo
 * Narrow, Public Sans and IBM Plex Mono since session 1, and
 * `tokens.test.ts` has asserted the two files agree about them. Nothing
 * ever loaded them. There was no `<link>` in `index.html` and no
 * `@import` in `src/index.css`, so every `font-display`, `font-body` and
 * `font-mono` class in the product fell through to the browser's generic
 * sans-serif and monospace. The whole type scale — the 0.1em tracked
 * label-caps, the tight display sizes — was being rendered in the wrong
 * typefaces for thirty-seven sessions, and a test suite that checked two
 * config files against each other could not see it.
 *
 * WHY SELF-HOSTED AND NOT A CDN LINK
 *
 * Two reasons, both load-bearing for this product.
 *
 * Offline. This is a field application for canvassers on cheap Android
 * handsets in areas with poor coverage. A `fonts.googleapis.com`
 * stylesheet is a blocking request that fails exactly when the app is
 * most needed, and the service worker cannot precache a cross-origin
 * stylesheet it is not allowed to read.
 *
 * Privacy. A font CDN sees an IP address and a referer on every page
 * load. This application holds voter records under POPIA; adding a
 * third-party beacon to every screen in it is not a trade worth making
 * for 300KB.
 *
 * WHAT IT FETCHES
 *
 * Google Fonts' own CSS, read with a browser user-agent so the modern
 * woff2 faces are served, then the `latin` and `latin-ext` subsets only.
 * latin-ext matters here: Afrikaans place and surnames carry ë, ê, ô and
 * î, and dropping it would render them in a fallback face mid-word.
 * Cyrillic, Greek and Vietnamese subsets are skipped.
 *
 * The licence is the SIL Open Font License for all three families, which
 * permits redistribution; `public/fonts/OFL.txt` records that.
 *
 * USAGE
 *
 *   node tools/fonts/vendor-fonts.mjs          # fetch and write
 *   node tools/fonts/vendor-fonts.mjs --check  # verify what is on disk
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'fonts');
const CSS_OUT = path.join(ROOT, 'src', 'fonts.css');

const FAMILIES =
  'family=Archivo+Narrow:wght@400;600;700' +
  '&family=Public+Sans:wght@400;500;600;700' +
  '&family=IBM+Plex+Mono:wght@400;500';

const CSS_URL = `https://fonts.googleapis.com/css2?${FAMILIES}&display=swap`;

// A browser UA, or Google serves the ancient truetype faces.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** Subsets kept. See the header for why latin-ext is not optional here. */
const KEEP_SUBSETS = ['latin', 'latin-ext'];

const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  if (!existsSync(OUT_DIR)) {
    console.error('public/fonts does not exist. Run without --check to fetch.');
    process.exit(1);
  }
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.woff2'));
  const bytes = files.reduce((sum, f) => sum + statSync(path.join(OUT_DIR, f)).size, 0);
  if (files.length === 0) {
    console.error('public/fonts contains no .woff2 files.');
    process.exit(1);
  }
  if (!existsSync(CSS_OUT)) {
    console.error('src/fonts.css is missing; the faces on disk are not referenced by anything.');
    process.exit(1);
  }
  console.log(`ok — ${files.length} woff2 faces, ${(bytes / 1024).toFixed(0)}KB, referenced by src/fonts.css`);
  process.exit(0);
}

const response = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
if (!response.ok) {
  console.error(`Google Fonts CSS returned ${response.status}. Nothing written.`);
  process.exit(1);
}
const css = await response.text();

// Each @font-face block is preceded by a `/* subset */` comment.
const blocks = [];
const blockPattern = /\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
let match;
while ((match = blockPattern.exec(css)) !== null) {
  blocks.push({ subset: match[1], body: match[2] });
}

if (blocks.length === 0) {
  console.error('Could not parse any @font-face blocks out of the stylesheet. Nothing written.');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const kept = [];
let downloaded = 0;
let totalBytes = 0;

for (const block of blocks) {
  if (!KEEP_SUBSETS.includes(block.subset)) continue;

  const family = /font-family:\s*'([^']+)'/.exec(block.body)?.[1];
  const weight = /font-weight:\s*(\d+)/.exec(block.body)?.[1];
  const style = /font-style:\s*(\w+)/.exec(block.body)?.[1] ?? 'normal';
  const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block.body)?.[1];
  if (!family || !weight || !url) continue;

  const slug = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}-${style}-${block.subset}.woff2`;
  const target = path.join(OUT_DIR, slug);

  const file = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!file.ok) {
    console.error(`FAILED ${slug}: ${url} returned ${file.status}. Nothing else written.`);
    process.exit(1);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  // A woff2 file begins with 'wOF2'. Anything else is an error page.
  if (bytes.subarray(0, 4).toString('latin1') !== 'wOF2') {
    console.error(`FAILED ${slug}: response is not a woff2 file. Nothing else written.`);
    process.exit(1);
  }
  writeFileSync(target, bytes);
  downloaded += 1;
  totalBytes += bytes.length;

  const unicodeRange = /unicode-range:\s*([^;]+);/.exec(block.body)?.[1]?.trim();
  kept.push({ family, weight, style, subset: block.subset, slug, unicodeRange });
}

if (downloaded === 0) {
  console.error('No faces matched the kept subsets. Nothing written.');
  process.exit(1);
}

const header = `/**
 * Election Campaign OS — brand typefaces, self-hosted.
 *
 * GENERATED by tools/fonts/vendor-fonts.mjs. Do not edit by hand; re-run
 * the tool instead.
 *
 * Self-hosted rather than linked from fonts.googleapis.com so the app
 * renders correctly offline and so no third-party sees a request on every
 * page load of an application holding voter records. See the tool's header.
 *
 * Archivo Narrow, Public Sans and IBM Plex Mono are all under the SIL Open
 * Font License 1.1 — see public/fonts/OFL.txt.
 *
 * font-display: swap — text is readable in a fallback face immediately and
 * reflows when the real one arrives. On a slow connection a canvasser sees
 * the data rather than a blank screen.
 */
`;

const faces = kept
  .map(
    (face) => `/* ${face.family} ${face.weight} ${face.subset} */
@font-face {
  font-family: '${face.family}';
  font-style: ${face.style};
  font-weight: ${face.weight};
  font-display: swap;
  src: url('/fonts/${face.slug}') format('woff2');${
    face.unicodeRange ? `\n  unicode-range: ${face.unicodeRange};` : ''
  }
}`,
  )
  .join('\n\n');

writeFileSync(CSS_OUT, `${header}\n${faces}\n`);

writeFileSync(
  path.join(OUT_DIR, 'OFL.txt'),
  `Archivo Narrow, Public Sans and IBM Plex Mono are licensed under the
SIL Open Font License, Version 1.1, which permits redistribution of the
font files bundled here.

Full licence text: https://openfontlicense.org/

Retrieved from Google Fonts by tools/fonts/vendor-fonts.mjs.
Families: Archivo Narrow, Public Sans, IBM Plex Mono.
Subsets: ${KEEP_SUBSETS.join(', ')}.
`,
);

console.log(`${downloaded} faces written to public/fonts (${(totalBytes / 1024).toFixed(0)}KB).`);
console.log(`src/fonts.css written with ${kept.length} @font-face rules.`);
for (const face of kept) console.log(`  ${face.family.padEnd(16)} ${face.weight} ${face.subset}`);
