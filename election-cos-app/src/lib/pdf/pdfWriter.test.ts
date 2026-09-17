import { describe, expect, it } from 'vitest';
import { A4_HEIGHT, A4_WIDTH, buildPdf, hasUnrepresentableCharacters, measureText, wrapText } from './pdfWriter';
import { encodeWinAnsi, SUBSTITUTE } from './winAnsi';
import { COURIER_WIDTH, glyphWidth } from './standard14Widths';

const decoder = new TextDecoder('latin1');
const asText = (bytes: Uint8Array) => decoder.decode(bytes);

describe('standard-14 width tables', () => {
  it('covers every printable ASCII code point for both Helvetica faces', () => {
    for (let byte = 0x20; byte <= 0x7e; byte += 1) {
      expect(glyphWidth('regular', byte), `regular 0x${byte.toString(16)}`).toBeGreaterThan(0);
      expect(glyphWidth('bold', byte), `bold 0x${byte.toString(16)}`).toBeGreaterThan(0);
    }
  });

  it('uses the published Adobe metrics at a few known points', () => {
    expect(glyphWidth('regular', 0x20)).toBe(278); // space
    expect(glyphWidth('regular', 'W'.charCodeAt(0))).toBe(944);
    expect(glyphWidth('regular', 'i'.charCodeAt(0))).toBe(222);
    expect(glyphWidth('bold', 'W'.charCodeAt(0))).toBe(944);
    expect(glyphWidth('bold', 'i'.charCodeAt(0))).toBe(278);
  });

  it('treats Courier as fixed-pitch', () => {
    expect(glyphWidth('mono', 'i'.charCodeAt(0))).toBe(COURIER_WIDTH);
    expect(glyphWidth('mono', 'W'.charCodeAt(0))).toBe(COURIER_WIDTH);
  });
});

describe('WinAnsi encoding', () => {
  it('maps typographic punctuation into the 0x80-0x9F block', () => {
    expect(encodeWinAnsi('—').bytes).toEqual([0x97]);
    expect(encodeWinAnsi('’').bytes).toEqual([0x92]);
    expect(encodeWinAnsi('·').bytes).toEqual([0xb7]);
  });

  it('substitutes visibly rather than dropping unrepresentable characters', () => {
    const result = encodeWinAnsi('水');
    expect(result.bytes).toEqual([SUBSTITUTE]);
    expect(result.substituted).toBe(true);
    expect(hasUnrepresentableCharacters('Ward 12 — 水')).toBe(true);
    expect(hasUnrepresentableCharacters('Ward 12 — Potchefstroom')).toBe(false);
  });
});

describe('measureText / wrapText', () => {
  it('measures a proportional font proportionally', () => {
    // "WWWW" is far wider than "iiii" in Helvetica; a fixed-pitch guess
    // would call them equal, which is the bug real metrics exist to avoid.
    expect(measureText('WWWW', 'regular', 10)).toBeGreaterThan(measureText('iiii', 'regular', 10) * 3);
  });

  it('scales linearly with point size', () => {
    expect(measureText('Referral', 'regular', 20)).toBeCloseTo(measureText('Referral', 'regular', 10) * 2, 6);
  });

  it('wraps every line inside the column width', () => {
    const text =
      'Persistent sewage overflow at the corner of Church and Kruis Street affecting ' +
      'the surrounding households and the adjacent primary school grounds.';
    const lines = wrapText(text, 'regular', 10, 200);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measureText(line, 'regular', 10)).toBeLessThanOrEqual(200);
    }
    expect(lines.join(' ')).toBe(text);
  });

  it('hard-splits a token longer than the column instead of overflowing', () => {
    const path = 'tenants/tenant-nw405/incidents/8f2c1a9e-4d55-4f6b-9c31-7a0e5b2d8811/photo-0001.jpg';
    const lines = wrapText(path, 'mono', 9, 120);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measureText(line, 'mono', 9)).toBeLessThanOrEqual(120);
    }
    expect(lines.join('')).toBe(path);
  });

  it('preserves explicit blank lines between paragraphs', () => {
    expect(wrapText('one\n\ntwo', 'regular', 10, 500)).toEqual(['one', '', 'two']);
  });
});

describe('buildPdf', () => {
  const page = {
    ops: [
      { kind: 'text' as const, x: 56, y: 780, text: 'SERVICE DELIVERY REFERRAL', font: 'bold' as const, size: 14 },
      { kind: 'rule' as const, x1: 56, y1: 770, x2: 539, y2: 770 },
      { kind: 'text' as const, x: 56, y: 750, text: 'Reference: NW405/2026/8f2c1a9e', font: 'mono' as const, size: 9 },
    ],
  };
  const meta = {
    title: 'Service delivery referral',
    author: 'Innovation Consult (Pty) Ltd',
    subject: 'Incident referral',
    idSeed: 'abc123',
  };

  it('emits a well-formed PDF header, xref and trailer', () => {
    const text = asText(buildPdf([page], meta));
    expect(text.startsWith('%PDF-1.7\n')).toBe(true);
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('/Type /Pages');
    expect(text).toContain('xref\n');
    expect(text).toContain('trailer\n');
    expect(text.endsWith('%%EOF\n')).toBe(true);
  });

  it('points startxref at the actual byte offset of the xref table', () => {
    const bytes = buildPdf([page], meta);
    const text = asText(bytes);
    const startxref = Number(/startxref\n(\d+)\n/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
  });

  it('records a correct byte offset for every object in the xref table', () => {
    const text = asText(buildPdf([page, page], meta));
    const xrefBody = text.slice(text.indexOf('xref\n'));
    const entries = [...xrefBody.matchAll(/^(\d{10}) \d{5} n $/gm)].map((m) => Number(m[1]));
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach((offset, index) => {
      expect(text.slice(offset), `object ${index + 1}`).toMatch(new RegExp(`^${index + 1} 0 obj\n`));
    });
  });

  it('declares a /Length equal to the real content-stream byte count', () => {
    const bytes = buildPdf([page], meta);
    const text = asText(bytes);
    for (const match of text.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const declared = Number(match[1]);
      const start = match.index! + match[0].length;
      expect(text.slice(start + declared, start + declared + 10)).toBe('endstream\n');
    }
  });

  it('is byte-for-byte deterministic', () => {
    expect(Array.from(buildPdf([page], meta))).toEqual(Array.from(buildPdf([page], meta)));
  });

  it('reads no clock — identical input never carries a /CreationDate', () => {
    expect(asText(buildPdf([page], meta))).not.toContain('/CreationDate');
    expect(asText(buildPdf([page], { ...meta, creationDate: 'D:20260907120000Z' }))).toContain(
      '/CreationDate (D:20260907120000Z)',
    );
  });

  it('writes metadata as UTF-16BE so punctuation survives into the title bar', () => {
    // Content-stream text and metadata text use different encodings; a
    // WinAnsi em dash in /Title renders as a stray S-caron in readers.
    const text = asText(buildPdf([page], { ...meta, title: 'Referral — NW405' }));
    const utf16 = 'feff' + [...'Referral — NW405'].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
    expect(text).toContain(`/Title <${utf16}>`);
    expect(text).toContain('/Producer <feff');
  });

  it('gives different content different file identifiers', () => {
    const a = /\/ID \[ <([0-9a-f]{32})>/.exec(asText(buildPdf([page], meta)))![1];
    const b = /\/ID \[ <([0-9a-f]{32})>/.exec(asText(buildPdf([page], { ...meta, idSeed: 'different' })))![1];
    expect(a).not.toBe(b);
  });

  it('escapes parentheses and backslashes in text so the stream stays parseable', () => {
    const tricky = {
      ops: [{ kind: 'text' as const, x: 10, y: 10, text: 'Ward 12 (NW405) \\ block', font: 'regular' as const, size: 10 }],
    };
    expect(asText(buildPdf([tricky], meta))).toContain('(Ward 12 \\(NW405\\) \\\\ block) Tj');
  });

  it('writes one page object per page, with an A4 MediaBox', () => {
    const text = asText(buildPdf([page, page, page], meta));
    expect(text).toContain('/Count 3');
    expect([...text.matchAll(/\/Type \/Page\b(?!s)/g)].length).toBe(3);
    expect(text).toContain(`/MediaBox [ 0 0 ${A4_WIDTH} ${A4_HEIGHT} ]`);
  });

  it('refuses to write a document with no pages', () => {
    expect(() => buildPdf([], meta)).toThrow(/no pages/);
  });

  it('renders a watermark as rotated text rather than an image', () => {
    const watermarked = { ops: [{ kind: 'watermark' as const, text: 'DRAFT' }, ...page.ops] };
    const text = asText(buildPdf([watermarked], meta));
    expect(text).toContain('(DRAFT) Tj');
    expect(text).toMatch(/0\.7071 0\.7071 -0\.7071 0\.7071/);
    // No image XObjects anywhere — §6.4 keeps photographs in Storage.
    expect(text).not.toContain('/XObject');
    expect(text).not.toContain('/Image');
  });
});
