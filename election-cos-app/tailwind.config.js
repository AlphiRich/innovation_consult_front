/**
 * Election-COS1.0 — Tailwind theme
 * IC-ECOS-BUILD-2026-V2 §3.3
 *
 * These values are the single source of design tokens, duplicated (not imported)
 * into src/design/tokens.ts because Tailwind's config loader does not transpile
 * TypeScript. src/design/tokens.test.ts asserts the two stay in sync — do not
 * edit one without the other.
 *
 * Do NOT use the values found in the original Stitch HTML (#040c30, #722226,
 * #1a253a, #c0a062) — they are drift, not intent. See master index D3.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A2246',
        gold: '#B7913F',
        paper: '#F7F4EE',
        maroon: '#7E1F2E',
        teal: '#33427E',
        green: '#2F7E4A',
        slate: '#6A6E7E',
      },
      fontFamily: {
        display: ['"Archivo Narrow"', 'sans-serif'],
        body: ['"Public Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      // Typographic role scale, sourced from the Stitch suite's civic_authority/
      // DESIGN.md "Brand & Style" section — that file's YAML colour palette
      // (#040c30 etc) is retired drift (same list as above), but its
      // documented type scale explicitly cites OUR real brand colours
      // (Ink #1A2246, Amber #B7913F, Paper #F7F4EE) and is brand-neutral,
      // so it's adopted here. Use e.g. `text-label-caps` + `font-display`.
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['32px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '0.02em', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.1em', fontWeight: '700' }],
        'data-mono': ['14px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
