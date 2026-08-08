/**
 * Election Campaign OS — Tailwind theme
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
    },
  },
  plugins: [],
};
