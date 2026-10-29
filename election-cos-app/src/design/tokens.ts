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
    /**
     * Border and rule colour for the public site (`--ec-line` in the
     * design canvas). A warm stone that reads as a ruled line on paper.
     *
     * The application uses `border-ink/10` for the same job, which is
     * right against white cards on a paper field. The site puts white
     * cards on paper too, but at a scale where a tinted ink border goes
     * grey and cold; this keeps the warmth. Borders only — never text:
     * it is 1.5:1 on paper and fails every contrast rule for type.
     */
    line: '#DCD6C8',
  },
  font: {
    display: '"Archivo Narrow", sans-serif',
    /**
     * The public site's display face. Archivo, NOT Archivo Narrow.
     *
     * The application compresses headings because a war-room screen is
     * dense and every column counts. A marketing page is the opposite
     * problem: a 56px narrow heading reads as a poster, not a civic
     * document. The canvas specifies plain Archivo throughout, so the
     * site gets its own family rather than restyling the application.
     */
    siteDisplay: 'Archivo, sans-serif',
    body: '"Public Sans", sans-serif',
    mono: '"IBM Plex Mono", monospace',
  },
  // Typographic role scale — see tailwind.config.js for the matching
  // `text-*` utility sizes (e.g. `text-label-caps`). Source: Stitch suite
  // civic_authority/DESIGN.md "Brand & Style" §Typography (brand-neutral;
  // that file's colour palette is retired drift, its type scale isn't).
  typeRoles: ['display-lg', 'display-lg-mobile', 'headline-md', 'body-lg', 'body-md', 'label-caps', 'data-mono'],
  /**
   * The public site's scale, separate from the application's.
   *
   * `check-type-scale.mjs` refuses `text-xl` and `text-[17px]` alike, so
   * every size the canvas uses needs a name. They are listed here and in
   * tailwind.config.js, and `tokens.test.ts` holds the two together.
   *
   * Phone sizes are not separate roles: a heading drops by picking a
   * smaller role at the default breakpoint and stepping up at `md:`,
   * which is how the canvas's "48/34" notation reads.
   */
  siteTypeRoles: [
    'site-hero',
    'site-display',
    'site-h1',
    'site-h2',
    'site-h3',
    'site-h4',
    'site-h5',
    'site-h6',
    'site-lead',
    'site-body',
    'site-base',
    'site-sm',
    'site-caption',
    'site-micro',
    'site-nano',
  ],
} as const;

export type Tokens = typeof tokens;
