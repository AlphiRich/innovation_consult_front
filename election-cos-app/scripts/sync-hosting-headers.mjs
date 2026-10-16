#!/usr/bin/env node
/**
 * Election Campaign OS — write the Hosting headers into firebase.json
 * from their single declaration in src/config/securityHeaders.ts.
 *
 * firebase.json cannot import a module, so this generates that block
 * instead of anyone hand-copying it. `--check` verifies the two agree
 * and is wired into check:all; with no flag it rewrites the block.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = path.join(ROOT, 'firebase.json');

const { GLOBAL_HEADERS, CACHE_RULES } = await import(
  // vite-node is not available to a plain node script, so the constants
  // are read from the TypeScript source by evaluating it as a module
  // through a tiny transform. Simpler: the file is plain enough that
  // tsx/esbuild is unnecessary — see loadConstants below.
  './load-security-headers.mjs'
);

function buildHeaders() {
  const headers = [
    {
      source: '**',
      headers: Object.entries(GLOBAL_HEADERS).map(([key, value]) => ({ key, value })),
    },
  ];
  for (const rule of CACHE_RULES) {
    headers.push({
      source: rule.source,
      headers: [{ key: 'Cache-Control', value: rule.value }],
    });
  }
  return headers;
}

const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
const wanted = buildHeaders();
const current = config.hosting.headers;
const same = JSON.stringify(current) === JSON.stringify(wanted);

if (process.argv.includes('--check')) {
  if (same) {
    console.log('✓ check:headers passed — firebase.json matches src/config/securityHeaders.ts');
    process.exit(0);
  }
  console.error('✗ check:headers failed — firebase.json has drifted from src/config/securityHeaders.ts\n');
  console.error('  Run: node scripts/sync-hosting-headers.mjs\n');
  process.exit(1);
}

config.hosting.headers = wanted;
writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
console.log(same ? 'firebase.json already up to date.' : 'firebase.json headers updated.');
