/**
 * Election Campaign OS — design tokens
 * IC-ECOS-BUILD-2026-V2 §3.3
 *
 * This is the ONLY place colour, type, and spacing constants are defined for
 * application code. Components must import `tokens` or use the matching
 * Tailwind classes (see tailwind.config.js, which duplicates these values
 * because Tailwind cannot load .ts config) — never a raw hex literal.
 *
 * `npm run check:hex` fails CI on any hex literal outside this file and
 * tailwind.config.js. `tokens.test.ts` asserts this file and the Tailwind
 * theme stay in sync.
 *
 * Three conflicting palettes existed in the source material (canonical
 * review C4). This resolves them per master index D3 (default accepted,
 * no override received).
 */
export const tokens = {
  color: {
    ink: '#1A2246', // primary navy
    gold: '#B7913F', // accent
    paper: '#F7F4EE', // background
    maroon: '#7E1F2E',
    teal: '#33427E',
    green: '#2F7E4A',
    slate: '#6A6E7E',
  },
  font: {
    display: '"Archivo Narrow", sans-serif',
    body: '"Public Sans", sans-serif',
    mono: '"IBM Plex Mono", monospace',
  },
  // Typographic role scale — see tailwind.config.js for the matching
  // `text-*` utility sizes (e.g. `text-label-caps`). Source: Stitch suite
  // civic_authority/DESIGN.md "Brand & Style" §Typography (brand-neutral;
  // that file's colour palette is retired drift, its type scale isn't).
  typeRoles: ['display-lg', 'display-lg-mobile', 'headline-md', 'body-lg', 'body-md', 'label-caps', 'data-mono'],
} as const;

export type Tokens = typeof tokens;
