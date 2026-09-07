/**
 * Election Campaign OS — minimal PDF 1.7 writer
 *
 * Produces a real PDF byte stream. Not an HTML page the browser is asked
 * to print, and not a `.pdf` filename hung on something else — the output
 * of `buildPdf` is a conforming PDF document that any reader opens.
 *
 * Why hand-rolled rather than a library: the only PDF this product emits
 * is a text-only formal referral (§6.4) using the Adobe standard-14 fonts,
 * which every reader already has. That needs a few hundred lines of
 * well-understood file format, and no third-party dependency shipped to
 * every field device on a metered connection. It deliberately does NOT
 * support images — §6.4 keeps incident photographs in Cloud Storage and
 * references them by path, never inlined into a document.
 *
 * DETERMINISM is a design requirement, not an accident. Given the same
 * pages and the same `meta`, `buildPdf` returns byte-identical output:
 * no clock is read, no random /ID is generated (the caller supplies the
 * seed), and no object ordering depends on iteration order of a hash map.
 * The referral workflow relies on this — a document's integrity hash has
 * to be reproducible from the stored record months later.
 *
 * Coordinates are PDF user space: origin bottom-left, y increasing
 * upwards, units of 1/72 inch.
 */
import { BASE_FONT_NAME, glyphWidth, type StandardFont } from './standard14Widths';
import { encodeWinAnsi, toWinAnsiBytes } from './winAnsi';

/** A4 in points (210 × 297 mm). */
export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

export type PdfOp =
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      font: StandardFont;
      size: number;
      /** 0 = black, 1 = white. Defaults to black. */
      grey?: number;
    }
  | {
      kind: 'rule';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      grey?: number;
      lineWidth?: number;
    }
  | {
      kind: 'watermark';
      text: string;
      /** Defaults to a light grey that stays legible without obscuring text. */
      grey?: number;
      size?: number;
    };

export interface PdfPage {
  ops: PdfOp[];
}

export interface PdfMeta {
  title: string;
  author: string;
  subject: string;
  /**
   * Seed for the file's /ID array. Pass something stable and specific to
   * the document's content (the referral workflow passes its content
   * hash) so the same content produces the same file identifier. A
   * timestamp here would destroy determinism.
   */
  idSeed: string;
  /**
   * Optional PDF date string, e.g. "D:20260907120000Z". Omitted entirely
   * when not supplied — an absent /CreationDate is valid, and inventing
   * one from the clock would make output non-reproducible.
   */
  creationDate?: string;
}

// ---------------------------------------------------------------------------
// Text measurement
// ---------------------------------------------------------------------------

/** Rendered width of `text` in points, at `size`, in the given font. */
export function measureText(text: string, font: StandardFont, size: number): number {
  let thousandths = 0;
  for (const byte of toWinAnsiBytes(text)) {
    thousandths += glyphWidth(font, byte);
  }
  return (thousandths * size) / 1000;
}

/**
 * Greedy word wrap at a real column width. A single word longer than
 * `maxWidth` (a long Storage path, say) is hard-split rather than allowed
 * to run off the page.
 */
export function wrapText(text: string, font: StandardFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current === '' ? word : `${current} ${word}`;
      if (measureText(candidate, font, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current !== '') {
        lines.push(current);
        current = '';
      }
      if (measureText(word, font, size) <= maxWidth) {
        current = word;
        continue;
      }
      // Hard-split an over-long token.
      let chunk = '';
      for (const ch of word) {
        if (measureText(chunk + ch, font, size) > maxWidth && chunk !== '') {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      current = chunk;
    }
    lines.push(current);
  }

  return lines;
}

/** True if `text` contains a character WinAnsi cannot represent. */
export function hasUnrepresentableCharacters(text: string): boolean {
  return encodeWinAnsi(text).substituted;
}

// ---------------------------------------------------------------------------
// Byte assembly
// ---------------------------------------------------------------------------

/**
 * Raw byte pass-through for PDF *structure* — dictionaries, operators,
 * newlines. Deliberately NOT `toWinAnsiBytes`, which is a glyph encoder:
 * it has no glyph for LF and would substitute '?' for every line break,
 * producing a file no reader can parse. Glyph encoding belongs only to
 * text that gets drawn, i.e. `literalString`.
 */
function latin1Bytes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) out.push(text.charCodeAt(i) & 0xff);
  return out;
}

class ByteBuilder {
  private readonly bytes: number[] = [];

  get length(): number {
    return this.bytes.length;
  }

  /** Append PDF structure text (keywords, dictionaries, delimiters). */
  push(text: string): void {
    for (const byte of latin1Bytes(text)) this.bytes.push(byte);
  }

  pushBytes(bytes: number[]): void {
    for (const byte of bytes) this.bytes.push(byte);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

/** Escape a string for a PDF literal-string token, on already-encoded bytes. */
function escapeLiteralBytes(bytes: number[]): number[] {
  const out: number[] = [];
  for (const byte of bytes) {
    if (byte === 0x28 /* ( */ || byte === 0x29 /* ) */ || byte === 0x5c /* \ */) {
      out.push(0x5c);
    }
    out.push(byte);
  }
  return out;
}

function literalString(text: string): number[] {
  return [0x28, ...escapeLiteralBytes(toWinAnsiBytes(text)), 0x29];
}

/**
 * A PDF *text string* for the document information dictionary, written as
 * a UTF-16BE hex string with a byte-order mark.
 *
 * This is NOT the same encoding as text drawn on the page. Content-stream
 * strings select glyphs through the font's /Encoding (WinAnsi here), while
 * metadata strings are interpreted as PDFDocEncoding unless they carry the
 * BOM — and PDFDocEncoding disagrees with WinAnsi exactly across the
 * 0x80–0x9F block, which is where the em dash and curly quotes live. A
 * referral titled "Ward 12 Campaign Office — Tlokwe" showed up in the
 * reader's title bar as "Office Š Tlokwe" until this was split out.
 */
function utf16TextString(text: string): number[] {
  const hex: string[] = ['feff'];
  for (let i = 0; i < text.length; i += 1) {
    hex.push(text.charCodeAt(i).toString(16).padStart(4, '0'));
  }
  const body = hex.join('');
  const out = [0x3c]; // '<'
  for (let i = 0; i < body.length; i += 1) out.push(body.charCodeAt(i));
  out.push(0x3e); // '>'
  return out;
}

function formatNumber(n: number): string {
  // PDF accepts plain decimal reals; trim to 4dp and drop trailing zeros so
  // output stays compact and stable across platforms.
  const fixed = n.toFixed(4).replace(/\.?0+$/, '');
  return fixed === '' || fixed === '-' ? '0' : fixed;
}

/**
 * A deterministic 32-hex-digit identifier derived from `seed`. This fills
 * the /ID array, whose only job is to let a reader tell two files apart —
 * it is NOT a security or integrity property, and this codebase never
 * presents it as one. The referral's actual integrity hash is a SHA-256
 * computed elsewhere (see referralDocument.ts).
 */
function deterministicId(seed: string): string {
  // FNV-1a over four offset basis values, giving 128 bits.
  const bases = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
  return bases
    .map((basis, index) => {
      let hash = basis >>> 0;
      for (let i = 0; i < seed.length; i += 1) {
        hash ^= seed.charCodeAt(i) + index;
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
      return hash.toString(16).padStart(8, '0');
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Content streams
// ---------------------------------------------------------------------------

const FONT_RESOURCE: Record<StandardFont, string> = {
  regular: 'F1',
  bold: 'F2',
  mono: 'F3',
};

const WATERMARK_DEFAULT_GREY = 0.86;
const WATERMARK_DEFAULT_SIZE = 96;

function contentStreamBytes(page: PdfPage): number[] {
  const out: number[] = [];
  const emit = (text: string) => out.push(...latin1Bytes(text));

  for (const op of page.ops) {
    if (op.kind === 'rule') {
      const grey = op.grey ?? 0.75;
      emit(
        `q ${formatNumber(grey)} G ${formatNumber(op.lineWidth ?? 0.6)} w ` +
          `${formatNumber(op.x1)} ${formatNumber(op.y1)} m ${formatNumber(op.x2)} ${formatNumber(op.y2)} l S Q\n`,
      );
      continue;
    }

    if (op.kind === 'watermark') {
      const grey = op.grey ?? WATERMARK_DEFAULT_GREY;
      const size = op.size ?? WATERMARK_DEFAULT_SIZE;
      // 45° rotation: [cos sin -sin cos tx ty]. Placed so the baseline
      // runs diagonally across the middle of the page.
      const c = 0.7071;
      const width = measureText(op.text, 'bold', size);
      const tx = A4_WIDTH / 2 - (width / 2) * c;
      const ty = A4_HEIGHT / 2 - (width / 2) * c;
      emit(`q ${formatNumber(grey)} g BT /${FONT_RESOURCE.bold} ${formatNumber(size)} Tf `);
      emit(`${c} ${c} ${-c} ${c} ${formatNumber(tx)} ${formatNumber(ty)} Tm `);
      out.push(...literalString(op.text));
      emit(' Tj ET Q\n');
      continue;
    }

    const grey = op.grey ?? 0;
    emit(`q ${formatNumber(grey)} g BT /${FONT_RESOURCE[op.font]} ${formatNumber(op.size)} Tf `);
    emit(`1 0 0 1 ${formatNumber(op.x)} ${formatNumber(op.y)} Tm `);
    out.push(...literalString(op.text));
    emit(' Tj ET Q\n');
  }

  return out;
}

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------

/**
 * Build a complete PDF file.
 *
 * Object layout is fixed and index-addressed rather than map-ordered:
 *   1        Catalog
 *   2        Pages
 *   3        Info
 *   4,5,6    Font: Helvetica, Helvetica-Bold, Courier
 *   7..      Page / Contents pairs, in page order
 */
export function buildPdf(pages: PdfPage[], meta: PdfMeta): Uint8Array {
  if (pages.length === 0) {
    throw new Error('buildPdf: refusing to write a PDF with no pages.');
  }

  const FIRST_PAGE_OBJ = 7;
  const pageObjNum = (i: number) => FIRST_PAGE_OBJ + i * 2;
  const contentObjNum = (i: number) => FIRST_PAGE_OBJ + i * 2 + 1;
  const objectCount = FIRST_PAGE_OBJ - 1 + pages.length * 2;

  const out = new ByteBuilder();
  // Byte offset of each object, indexed by object number.
  const offsets: number[] = new Array(objectCount + 1).fill(0);

  const beginObject = (num: number) => {
    offsets[num] = out.length;
    out.push(`${num} 0 obj\n`);
  };
  const endObject = () => out.push('endobj\n');

  out.push('%PDF-1.7\n');
  // Binary comment marking the file as containing 8-bit data, per the spec's
  // recommendation so transfer tools don't treat it as text.
  out.pushBytes([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);

  // 1 — Catalog
  beginObject(1);
  out.push('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObject();

  // 2 — Pages
  beginObject(2);
  const kids = pages.map((_, i) => `${pageObjNum(i)} 0 R`).join(' ');
  out.push(`<< /Type /Pages /Count ${pages.length} /Kids [ ${kids} ] >>\n`);
  endObject();

  // 3 — Info
  beginObject(3);
  out.push('<< /Title ');
  out.pushBytes(utf16TextString(meta.title));
  out.push(' /Author ');
  out.pushBytes(utf16TextString(meta.author));
  out.push(' /Subject ');
  out.pushBytes(utf16TextString(meta.subject));
  out.push(' /Producer ');
  out.pushBytes(utf16TextString('Election Campaign OS'));
  if (meta.creationDate) {
    // Dates are an ASCII-only format; a BOM here would break parsers.
    out.push(' /CreationDate ');
    out.pushBytes(literalString(meta.creationDate));
  }
  out.push(' >>\n');
  endObject();

  // 4,5,6 — Fonts
  const fontOrder: StandardFont[] = ['regular', 'bold', 'mono'];
  fontOrder.forEach((font, i) => {
    beginObject(4 + i);
    out.push(
      `<< /Type /Font /Subtype /Type1 /BaseFont /${BASE_FONT_NAME[font]} /Encoding /WinAnsiEncoding >>\n`,
    );
    endObject();
  });

  // Pages and their content streams
  pages.forEach((page, i) => {
    beginObject(pageObjNum(i));
    out.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${formatNumber(A4_WIDTH)} ${formatNumber(A4_HEIGHT)} ] ` +
        '/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> ' +
        `/Contents ${contentObjNum(i)} 0 R >>\n`,
    );
    endObject();

    const stream = contentStreamBytes(page);
    beginObject(contentObjNum(i));
    out.push(`<< /Length ${stream.length} >>\nstream\n`);
    out.pushBytes(stream);
    out.push('endstream\n');
    endObject();
  });

  // Cross-reference table
  const xrefOffset = out.length;
  out.push(`xref\n0 ${objectCount + 1}\n`);
  out.push('0000000000 65535 f \n');
  for (let num = 1; num <= objectCount; num += 1) {
    out.push(`${String(offsets[num]).padStart(10, '0')} 00000 n \n`);
  }

  const id = deterministicId(meta.idSeed);
  out.push(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 3 0 R /ID [ <${id}> <${id}> ] >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  return out.toUint8Array();
}
