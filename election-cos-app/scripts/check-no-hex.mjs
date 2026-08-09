#!/usr/bin/env node
/**
 * Election-COS1.0 — hex-literal guard
 * IC-ECOS-BUILD-2026-V2 §2.2: "Nothing may import a raw hex colour; only
 * design tokens." ESLint's no-restricted-syntax struggles to reliably catch
 * hex strings buried in JSX className template literals and Tailwind
 * arbitrary-value classes (`bg-[#123456]`), so this is a source-text scan
 * run in CI (`npm run check:hex`) rather than a custom ESLint rule.
 *
 * Allow-listed files are the single source(s) of truth for colour.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');

const ALLOW_LIST = new Set([
  path.join(SRC, 'design', 'tokens.ts'),
  path.join(SRC, 'design', 'tokens.test.ts'),
]);

const HEX_RE = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g;
const SCAN_EXT = new Set(['.ts', '.tsx', '.css']);

/** @type {string[]} */
const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(full);
      continue;
    }
    if (!SCAN_EXT.has(path.extname(full))) continue;
    if (ALLOW_LIST.has(full)) continue;
    if (full.endsWith('.test.ts') || full.endsWith('.test.tsx')) continue;

    const text = readFileSync(full, 'utf-8');
    const matches = text.match(HEX_RE);
    if (matches) {
      for (const m of matches) {
        violations.push(`${path.relative(root, full)}: found raw hex literal "${m}"`);
      }
    }
  }
}

walk(SRC);

if (violations.length > 0) {
  console.error('✗ check:hex failed — raw hex colours found outside src/design/tokens.ts:\n');
  for (const v of violations) console.error('  ' + v);
  console.error('\nUse tokens from src/design/tokens.ts (or the matching Tailwind class) instead.');
  process.exit(1);
}

console.log('✓ check:hex passed — no raw hex colours outside src/design/tokens.ts');
