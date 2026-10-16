#!/usr/bin/env node
/**
 * Election Campaign OS — type-scale guard
 * IC-ECOS-BUILD-2026-V2 §2.2.
 *
 * WHY THIS EXISTS
 *
 * `check-no-hex.mjs` has guarded colour since session 2: nothing may use a
 * raw hex, only design tokens. Nothing guarded the *type* scale, and in
 * session 44 — migrating the pages onto the shared primitives — that
 * turned out to have cost something real.
 *
 * Five files were setting their own sizes with Tailwind's default scale
 * instead of the product's tokens. `tailwind.config.js` extends rather
 * than replaces `fontSize`, so `text-sm` and `text-2xl` keep working and
 * nothing complained. The consequence was that the Gatherings advisory —
 * the one screen that quotes an Act and a Constitutional Court judgment —
 * and the Election Timetable, a page of statutory deadlines, both rendered
 * their body copy at `text-sm`, 14px, against the 16px every other screen
 * uses. Small print on the two pages where small print is exactly the
 * wrong signal, and no test could see it because every test passed.
 *
 * A source scan rather than an ESLint rule, for the same reason as the hex
 * guard: these live inside JSX `className` strings and template literals,
 * where `no-restricted-syntax` does not reliably reach them.
 *
 * WHAT IS A VIOLATION
 *
 * Any Tailwind default font-size utility — text-xs … text-9xl — in product
 * source. The product's own sizes (text-body-md, text-headline-md,
 * text-label-caps, text-data-mono, text-body-lg, text-display-lg,
 * text-display-lg-mobile) are the only ones allowed, because they are the
 * only ones that carry the line height, tracking and weight the scale was
 * designed with.
 *
 * Deliberately NOT flagged: `text-ink`, `text-slate` and the other colour
 * utilities, which share the `text-` prefix and are not sizes; responsive
 * and state prefixes are matched, so `sm:text-sm` and `hover:text-lg` are
 * caught too.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');

/**
 * Tailwind's built-in font-size utilities. Kept explicit rather than as a
 * loose `text-\w+` pattern, so adding a token to tailwind.config.js does
 * not require touching this file, and so a colour utility can never be
 * mistaken for a size.
 */
const DEFAULT_SIZES = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
];

// A size may be prefixed by any number of variants (sm:, md:, hover:,
// focus:, dark:, group-hover: …). The leading boundary stops `text-lg`
// matching inside a longer token name such as `text-display-lg`.
const SIZE_RE = new RegExp(
  `(?<![\\w-])(?:[a-z-]+(?:\\[[^\\]]*\\])?:)*text-(?:${DEFAULT_SIZES.join('|')})(?![\\w-])`,
  'g',
);

// Arbitrary font sizes — text-[13px], text-[0.9rem] — bypass the scale
// just as completely as a default utility does.
const ARBITRARY_RE = /(?<![\w-])(?:[a-z-]+:)*text-\[[0-9][^\]]*\]/g;

const SCAN_EXT = new Set(['.ts', '.tsx', '.css']);

/**
 * Comments are blanked, not deleted, so line numbers in the report still
 * point at the real line.
 *
 * This is not neatness. The guard's first run flagged three files — and
 * two of the hits were this file's own header and the explanatory comments
 * the migration had just added to the pages it fixed, which name the
 * classes they removed. A guard that fails on the sentence explaining it
 * cannot be left switched on, so it gets turned off, and then it guards
 * nothing. The font guard was corrected for this same reason in session
 * 38; this is the second time the defect class has shown up, which is why
 * it is now written down in the discipline skill.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

const ALLOW_LIST = new Set([
  // Nothing yet. A file added here needs a reason in this comment, not
  // just an entry — an exemption nobody can explain is how the thing this
  // guard exists to prevent comes back.
]);

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

    const text = stripComments(readFileSync(full, 'utf-8'));
    text.split('\n').forEach((line, i) => {
      for (const re of [SIZE_RE, ARBITRARY_RE]) {
        for (const m of line.matchAll(re)) {
          violations.push(`${path.relative(root, full)}:${i + 1}: "${m[0]}"`);
        }
      }
    });
  }
}

walk(SRC);

if (violations.length > 0) {
  console.error("✗ check:type-scale failed — Tailwind's default font sizes used instead of the tokens:\n");
  for (const v of violations) console.error('  ' + v);
  console.error(
    '\nUse the product scale from tailwind.config.js: text-display-lg,\n' +
      'text-display-lg-mobile, text-headline-md, text-body-lg, text-body-md,\n' +
      'text-label-caps, text-data-mono. They carry the line height, tracking\n' +
      'and weight the scale was designed with; text-sm and friends do not.',
  );
  process.exit(1);
}

console.log('✓ check:type-scale passed — only the product type scale is used');
