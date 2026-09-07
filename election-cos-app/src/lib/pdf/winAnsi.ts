/**
 * Election Campaign OS — WinAnsiEncoding text conversion
 *
 * PDF's standard-14 fonts are single-byte encoded. This maps a JavaScript
 * (UTF-16) string onto WinAnsiEncoding bytes so text written into a
 * content stream renders as intended.
 *
 * WinAnsi is Latin-1 for 0xA0–0xFF, ASCII for 0x20–0x7E, and a table of
 * typographic punctuation in 0x80–0x9F where Latin-1 has control codes.
 * `TYPOGRAPHIC` is that table, restricted to the marks this product's
 * prose actually produces.
 *
 * Unmappable characters become `SUBSTITUTE`. That substitution is
 * deliberately visible ('?') rather than silent deletion: a referral is a
 * document a municipality reads, and a dropped character in a description
 * of a service-delivery fault could change its meaning without anyone
 * noticing. `encodeWinAnsi` also reports whether it substituted, so a
 * caller can surface it.
 */

export const SUBSTITUTE = 0x3f; // '?'

/** Code points that live in WinAnsi's 0x80–0x9F block. */
const TYPOGRAPHIC: Record<string, number> = {
  '€': 0x80, // €
  '‚': 0x82, // ‚
  'ƒ': 0x83, // ƒ
  '„': 0x84, // „
  '…': 0x85, // …
  '†': 0x86, // †
  '‡': 0x87, // ‡
  'ˆ': 0x88, // ˆ
  '‰': 0x89, // ‰
  'Š': 0x8a, // Š
  '‹': 0x8b, // ‹
  'Œ': 0x8c, // Œ
  'Ž': 0x8e, // Ž
  '‘': 0x91, // ‘
  '’': 0x92, // ’
  '“': 0x93, // “
  '”': 0x94, // ”
  '•': 0x95, // •
  '–': 0x96, // –
  '—': 0x97, // —
  '˜': 0x98, // ˜
  '™': 0x99, // ™
  'š': 0x9a, // š
  '›': 0x9b, // ›
  'œ': 0x9c, // œ
  'ž': 0x9e, // ž
  'Ÿ': 0x9f, // Ÿ
};

export interface WinAnsiResult {
  bytes: number[];
  /** True if any character could not be represented and became '?'. */
  substituted: boolean;
}

export function encodeWinAnsi(text: string): WinAnsiResult {
  const bytes: number[] = [];
  let substituted = false;

  for (const ch of text) {
    const mapped = TYPOGRAPHIC[ch];
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }
    const code = ch.codePointAt(0)!;
    // Latin-1 range maps one-to-one, minus the C1 control block WinAnsi
    // reuses for the table above.
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      bytes.push(code);
      continue;
    }
    if (code === 0x09) {
      // A literal tab has no glyph; render it as a space rather than '?'.
      bytes.push(0x20);
      continue;
    }
    bytes.push(SUBSTITUTE);
    substituted = true;
  }

  return { bytes, substituted };
}

/** Convenience wrapper for callers that only need the bytes. */
export function toWinAnsiBytes(text: string): number[] {
  return encodeWinAnsi(text).bytes;
}
