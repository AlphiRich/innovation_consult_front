/**
 * Election Campaign OS — Adobe standard-14 glyph widths
 *
 * Character widths in 1/1000 em for the three base-14 fonts this codebase
 * embeds by reference (Helvetica, Helvetica-Bold, Courier). Every PDF
 * reader is required to have these fonts, so a document using only them
 * needs no font programme embedded — which is why a referral PDF can be
 * built here with no third-party dependency at all.
 *
 * Values are the published Adobe AFM metrics. They exist so `measureText`
 * can wrap a paragraph at a real column width rather than guessing at a
 * character count; without them the layout would either overflow the
 * MediaBox or wrap raggedly.
 *
 * Coverage note: the tables below cover printable ASCII (0x20–0x7E) plus
 * the handful of WinAnsi punctuation marks this product's prose actually
 * uses (en/em dash, curly quotes, middle dot, š for Setswana). Anything
 * else falls back to `FALLBACK_WIDTH`, which makes wrapping slightly
 * imprecise for that line — never incorrect output, just a marginally
 * short or long line. Extend the extras map rather than widening the
 * fallback if that ever matters.
 */

/** ASCII 0x20–0x7E widths, in code order starting at space. */
const HELVETICA_ASCII = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // 0x20-0x2F
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, // 0x30-0x3F
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, // 0x40-0x4F
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, // 0x50-0x5F
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, // 0x60-0x6F
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, // 0x70-0x7E
];

const HELVETICA_BOLD_ASCII = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, // 0x20-0x2F
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, // 0x30-0x3F
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, // 0x40-0x4F
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, // 0x50-0x5F
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, // 0x60-0x6F
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, // 0x70-0x7E
];

/** WinAnsi code point → width, for the non-ASCII marks this product uses. */
const HELVETICA_EXTRAS: Record<number, number> = {
  0x92: 222, // ’ right single quote
  0x93: 333, // “ left double quote
  0x94: 333, // ” right double quote
  0x96: 556, // – en dash
  0x97: 1000, // — em dash
  0x9a: 500, // š
  0xb7: 278, // · middle dot
  0xa0: 278, // no-break space
};

const HELVETICA_BOLD_EXTRAS: Record<number, number> = {
  0x92: 238,
  0x93: 500,
  0x94: 500,
  0x96: 556,
  0x97: 1000,
  0x9a: 556,
  0xb7: 278,
  0xa0: 278,
};

/** Used for any WinAnsi byte not in the tables above. See header note. */
export const FALLBACK_WIDTH = 556;

/** Courier is fixed-pitch: every glyph, including space, is 600/1000. */
export const COURIER_WIDTH = 600;

export type StandardFont = 'regular' | 'bold' | 'mono';

/** Width of one WinAnsi byte in 1/1000 em, for the given font. */
export function glyphWidth(font: StandardFont, byte: number): number {
  if (font === 'mono') return COURIER_WIDTH;
  const ascii = font === 'bold' ? HELVETICA_BOLD_ASCII : HELVETICA_ASCII;
  if (byte >= 0x20 && byte <= 0x7e) return ascii[byte - 0x20];
  const extras = font === 'bold' ? HELVETICA_BOLD_EXTRAS : HELVETICA_EXTRAS;
  return extras[byte] ?? FALLBACK_WIDTH;
}

/** The PDF BaseFont name each of our three roles resolves to. */
export const BASE_FONT_NAME: Record<StandardFont, string> = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  mono: 'Courier',
};
