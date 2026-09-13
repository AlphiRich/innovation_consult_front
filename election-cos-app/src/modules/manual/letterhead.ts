/**
 * Election Campaign OS — the Innovation Consult letterhead
 *
 * PROVENANCE, STATED PLAINLY
 *
 * The uploaded asset (`Company logo and letterhead designs.html`) is a
 * chat transcript describing a corporate identity system, not the system
 * itself. The design canvas it refers to (`Letterhead Options.dc.html`)
 * and the fourteen exported Word files were not in the upload, and the
 * only SVGs in that file are the chat client's own 16px interface icons.
 *
 * So this implements the design *language* the transcript describes, and
 * does not pretend to reproduce artwork it was never given:
 *
 *   - the burgundy → gold → navy gradient bar;
 *   - logo top-left, contact block top-right;
 *   - a services line in the footer;
 *   - Poppins as the intended face;
 *   - a § seal marker on the legal-compliance suite.
 *
 * What is deliberately absent is **the IC logo itself**. There is no
 * artwork here, and `LOGO_SLOT` renders the company name in its place. A
 * drawn-from-description logo would be a different mark wearing the
 * company's name, which is worse than an honest gap. Supply the real
 * asset and it drops into one place.
 *
 * COLOURS COME FROM THE TOKENS, NOT FROM THE TRANSCRIPT
 *
 * "Burgundy → gold → navy" is already this product's palette: maroon,
 * gold, ink in `src/design/tokens.ts`. Using the tokens keeps the manual
 * and the application the same brand, and keeps `check:hex` satisfied —
 * no hex literal appears here.
 *
 * POPPINS IS NOT EMBEDDED
 *
 * The PDF writer uses the Adobe standard-14 faces, which every reader
 * has, and embeds no font programme. Poppins is therefore named for the
 * Word output (where the reader's machine resolves it, falling back
 * cleanly) and approximated by Helvetica in the PDF. Embedding Poppins
 * would mean shipping a licensed font binary — a licensing decision, not
 * a formatting one.
 */
import { tokens } from '@/design/tokens';
import { COMPANY_LEGAL_NAME, COMPANY_REG_NUMBER, COMPANY_TAGLINE, COMPANY_TRADING_AS } from '@/lib/legalText';

/** The three-stop bar, in order. Burgundy, gold, navy. */
export const GRADIENT_STOPS = [tokens.color.maroon, tokens.color.gold, tokens.color.ink] as const;

/** Named for Word; the PDF falls back to its standard-14 equivalent. */
export const BRAND_FONT = 'Poppins';
export const BRAND_FONT_FALLBACK = 'Helvetica, Arial, sans-serif';

/**
 * Stands in for the IC logo until the real artwork is supplied. It is the
 * company name set in the display face, not an invented mark.
 */
export const LOGO_SLOT = COMPANY_LEGAL_NAME;

export const CONTACT_BLOCK = [
  COMPANY_TRADING_AS,
  `Reg. ${COMPANY_REG_NUMBER}`,
  'innovationconsult.co.za',
];

/**
 * Footer services line. Kept short and factual — this appears on every
 * page of every document the company issues, so a claim here is a claim
 * made a great many times.
 */
export const SERVICES_LINE =
  'Campaign operations · Electoral analysis · Programme & portfolio management';

export const BRAND_TAGLINE = COMPANY_TAGLINE;

/** Secondary text — contact block, muted prose, footer. */
export const MUTED_INK = tokens.color.slate;

/**
 * Mix a token colour towards white. Derived, so `check:hex` stays true:
 * there is still exactly one place a colour is *chosen*.
 */
function towardsWhite(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Hairline rules between sections. Slate at 78% towards paper-white. */
export const HAIRLINE = towardsWhite(tokens.color.slate, 0.78);

/** Marker glyphs the transcript assigns per cover type. */
export const COVER_MARKER = {
  SOP: '§',
  LEGAL: '§',
  MANUAL: '§',
} as const;
