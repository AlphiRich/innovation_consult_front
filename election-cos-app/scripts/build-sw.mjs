#!/usr/bin/env node
/**
 * Election Campaign OS — inject the real precache list into the service worker
 * IC-ECOS-BUILD-2026-V2 §7.1.
 *
 * Vite copies `public/sw.js` into `dist/` verbatim, placeholders and all.
 * This rewrites that copy with the hashed filenames the build actually
 * produced, plus a build id derived from their contents.
 *
 * WHY THE LIST IS GENERATED AND NOT WRITTEN BY HAND
 *
 * Vite content-hashes every asset, so `index-G1A9kTvN.js` changes name on
 * almost every build. A hand-written precache list would be wrong after
 * the first one, and the failure is silent: `cache.addAll` throws on the
 * missing file, the install fails, the old worker stays, and the app
 * simply never goes offline. Nothing in the UI says so.
 *
 * WHY THE BUILD ID IS A CONTENT HASH
 *
 * The cache name contains it, and `activate` deletes every other
 * `ecos-shell-*` cache. Using a timestamp would evict and re-download the
 * whole shell on every deploy even when nothing changed — on a metered
 * connection in the field, that is the difference between an instant open
 * and a 1MB download. Hashing the asset list means an unchanged build
 * keeps its cache.
 *
 * It exits non-zero if anything is missing, because a service worker that
 * silently precaches nothing is worse than no service worker: the product
 * claims to work offline and does not.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SW = path.join(DIST, 'sw.js');

if (!existsSync(SW)) {
  console.error('dist/sw.js is absent — did vite build run, and is public/sw.js still there?');
  process.exit(1);
}

/** Everything under dist that belongs to the application shell. */
const PRECACHE_EXTENSIONS = ['.js', '.css', '.woff2', '.png', '.svg', '.webmanifest'];

const assets = [];
const walk = (dir, prefix = '') => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const webPath = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(full, webPath);
      continue;
    }
    if (entry.name === 'sw.js') continue; // a worker must not precache itself
    if (!PRECACHE_EXTENSIONS.includes(path.extname(entry.name))) continue;
    assets.push({ webPath, bytes: statSync(full).size, full });
  }
};
walk(DIST);

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html is absent. Nothing written.');
  process.exit(1);
}

// index.html first: it is the offline navigation fallback, and the one
// entry whose absence would make every other cached asset useless.
const precache = ['/index.html', ...assets.map((a) => a.webPath).sort()];

const hash = createHash('sha256');
for (const asset of [{ full: path.join(DIST, 'index.html') }, ...assets]) {
  hash.update(readFileSync(asset.full));
}
const buildId = hash.digest('hex').slice(0, 12);

let source = readFileSync(SW, 'utf8');

if (!source.includes('__PRECACHE_MANIFEST__') || !source.includes('__BUILD_ID__')) {
  console.error('dist/sw.js has no placeholders to replace. Was it already processed, or was it edited?');
  process.exit(1);
}

source = source
  .replace("'__PRECACHE_MANIFEST__'", JSON.stringify(precache, null, 2))
  .replace('__BUILD_ID__', buildId);

writeFileSync(SW, source);

const totalBytes = assets.reduce((sum, a) => sum + a.bytes, 0);
console.log(
  `service worker: ${precache.length} assets precached (${(totalBytes / 1024).toFixed(0)}KB), build ${buildId}`,
);
