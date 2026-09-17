/**
 * Election Campaign OS — the document pipeline
 *
 * Two renderers reading one model, so two failure modes matter: a file
 * that is not actually the format it claims to be, and a divergence
 * between the two copies of the same document.
 *
 * The .docx tests unzip the archive and parse every part, because a Word
 * file that opens in a text editor and looks like XML is not evidence of
 * anything — Word declines to open a package with one unescaped ampersand
 * in it, and does so without saying which part is at fault.
 */
import { describe, expect, it } from 'vitest';
import { buildZip, crc32, type ZipEntry } from '@/lib/docx/zip';
import { documentFileStem, STATUS_BANNER, type PrintDocument } from './model';
import { renderDocumentDocx } from './docxRenderer';
import { renderDocumentPdf } from './pdfRenderer';

const decoder = new TextDecoder('latin1');
const encoder = new TextEncoder();

/* -------------------------------------------------------------------- */
/* A ZIP reader, for the tests only                                     */
/* -------------------------------------------------------------------- */

function u16(b: Uint8Array, at: number): number {
  return b[at] | (b[at + 1] << 8);
}
function u32(b: Uint8Array, at: number): number {
  return (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
}

/** Walks the local file headers. Only valid for stored (method 0) entries. */
function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  let at = 0;
  while (at + 4 <= bytes.length && u32(bytes, at) === 0x04034b50) {
    expect(u16(bytes, at + 8)).toBe(0); // stored, not deflated
    const size = u32(bytes, at + 18);
    const nameLength = u16(bytes, at + 26);
    const extraLength = u16(bytes, at + 28);
    const nameAt = at + 30;
    const dataAt = nameAt + nameLength + extraLength;
    const name = new TextDecoder().decode(bytes.subarray(nameAt, nameAt + nameLength));
    const data = bytes.subarray(dataAt, dataAt + size);
    expect(u32(bytes, at + 14)).toBe(crc32(data));
    out.set(name, data);
    at = dataAt + size;
  }
  expect(u32(bytes, at)).toBe(0x02014b50); // central directory follows
  return out;
}

function parseXml(text: string, label = 'xml'): Document {
  const parsed = new DOMParser().parseFromString(text, 'application/xml');
  const error = parsed.querySelector('parsererror');
  expect(error?.textContent ?? null, label).toBeNull();
  return parsed;
}

/* -------------------------------------------------------------------- */

const SAMPLE: PrintDocument = {
  title: 'Sample Document',
  subtitle: 'For the renderer tests',
  meta: {
    organisation: 'Ward 12 Campaign Office — Tlokwe',
    version: '1.0',
    audience: 'Canvasser copy',
    status: 'DRAFT_PENDING_REVIEW',
    reference: 'IC-ECOS-TEST-01',
  },
  blocks: [
    { kind: 'heading', level: 1, text: 'A heading' },
    { kind: 'para', text: 'Rock & roll, "quoted", <angled> — and an em dash.' },
    { kind: 'steps', items: ['First step', 'Second step'] },
    { kind: 'bullets', items: ['A bullet'] },
    { kind: 'callout', text: 'Something that matters.' },
    { kind: 'field', label: 'Reference', value: 'IC-ECOS-TEST-01' },
    { kind: 'mono', text: 'a1b2c3' },
    { kind: 'rule' },
    { kind: 'pageBreak' },
    { kind: 'heading', level: 2, text: 'After the break' },
  ],
};

describe('the zip writer', () => {
  const entries: ZipEntry[] = [
    { path: 'a.xml', data: encoder.encode('<a/>') },
    { path: 'dir/b.xml', data: encoder.encode('<b>hello</b>') },
  ];

  it('round-trips through an independent reader', () => {
    const read = readZip(buildZip(entries));
    expect([...read.keys()]).toEqual(['a.xml', 'dir/b.xml']);
    expect(new TextDecoder().decode(read.get('dir/b.xml')!)).toBe('<b>hello</b>');
  });

  it('computes a CRC that matches the known vector for "123456789"', () => {
    // CRC-32/ISO-HDLC check value, from the format's own specification.
    expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926);
  });

  it('is byte-for-byte deterministic', () => {
    expect(Array.from(buildZip(entries))).toEqual(Array.from(buildZip(entries)));
  });
});

describe('the Word renderer', () => {
  const parts = readZip(renderDocumentDocx(SAMPLE));

  it('writes every part a Word package needs', () => {
    expect([...parts.keys()].sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/_rels/document.xml.rels',
      'word/document.xml',
      'word/footer1.xml',
      'word/header1.xml',
    ]);
  });

  it('produces well-formed XML in every part', () => {
    for (const [path, data] of parts) {
      const root = parseXml(new TextDecoder().decode(data), path).documentElement;
      expect(root.nodeName, path).not.toBe('parsererror');
    }
  });

  it('escapes text that would otherwise break the package', () => {
    const body = new TextDecoder().decode(parts.get('word/document.xml')!);
    expect(body).toContain('Rock &amp; roll');
    expect(body).toContain('&lt;angled&gt;');
    expect(body).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;|#)/);
  });

  it('references the header and footer it actually ships', () => {
    const body = new TextDecoder().decode(parts.get('word/document.xml')!);
    const rels = new TextDecoder().decode(parts.get('word/_rels/document.xml.rels')!);
    for (const id of ['rId10', 'rId11']) {
      expect(body).toContain(`r:id="${id}"`);
      expect(rels).toContain(`Id="${id}"`);
    }
    expect(rels).toContain('Target="header1.xml"');
    expect(rels).toContain('Target="footer1.xml"');
  });

  it('declares a content type for every part that needs an override', () => {
    const types = new TextDecoder().decode(parts.get('[Content_Types].xml')!);
    for (const part of ['/word/document.xml', '/word/header1.xml', '/word/footer1.xml']) {
      expect(types).toContain(`PartName="${part}"`);
    }
  });

  it('is byte-for-byte deterministic', () => {
    expect(Array.from(renderDocumentDocx(SAMPLE))).toEqual(Array.from(renderDocumentDocx(SAMPLE)));
  });
});

/**
 * WordprocessingML property containers are schema *sequences*. An element
 * in the wrong position is a validation failure, and Word's response is to
 * declare the file unreadable without naming the element — which is the
 * only symptom, since the XML itself stays perfectly well-formed. Nothing
 * else in this suite can see that, so it is checked directly against the
 * ECMA-376 content models.
 */
describe('docxSchemaOrder', () => {
  const parts = readZip(renderDocumentDocx(SAMPLE));
  const xml = [...parts.entries()]
    .filter(([path]) => path.startsWith('word/') && !path.includes('_rels'))
    .map(([, data]) => new TextDecoder().decode(data))
    .join('');

  /** Positions of each named child within one container occurrence. */
  function order(container: string, names: string[]): number[][] {
    const found: number[][] = [];
    const blocks = xml.match(new RegExp(`<${container}>[\\s\\S]*?</${container}>`, 'g')) ?? [];
    for (const block of blocks) {
      found.push(names.map((name) => block.indexOf(`<${name}`)));
    }
    return found;
  }

  function assertAscending(container: string, names: string[]): void {
    const occurrences = order(container, names);
    expect(occurrences.length, `no <${container}> found`).toBeGreaterThan(0);
    for (const positions of occurrences) {
      const present = positions.filter((at) => at >= 0);
      const sorted = [...present].sort((a, b) => a - b);
      expect(present, `${container}: ${names.join(' < ')}`).toEqual(sorted);
    }
  }

  it('orders run properties rFonts < b < color < sz < szCs', () => {
    assertAscending('w:rPr', ['w:rFonts', 'w:b', 'w:color', 'w:sz', 'w:szCs']);
  });

  it('orders paragraph properties pBdr < spacing < ind < jc < outlineLvl < rPr', () => {
    assertAscending('w:pPr', ['w:pBdr', 'w:spacing', 'w:ind', 'w:jc', 'w:outlineLvl', 'w:rPr']);
  });

  it('orders table properties tblW < tblBorders', () => {
    assertAscending('w:tblPr', ['w:tblW', 'w:tblBorders']);
  });

  it('orders cell properties tcW < shd', () => {
    assertAscending('w:tcPr', ['w:tcW', 'w:shd']);
  });

  it('gives every table the tblGrid the schema requires, with one column per cell', () => {
    const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? [];
    expect(tables.length).toBeGreaterThan(0);
    for (const tbl of tables) {
      expect(tbl).toContain('<w:tblGrid>');
      expect(tbl.indexOf('<w:tblGrid>')).toBeGreaterThan(tbl.indexOf('</w:tblPr>'));
      expect(tbl.indexOf('<w:tblGrid>')).toBeLessThan(tbl.indexOf('<w:tr>'));
      expect((tbl.match(/<w:gridCol /g) ?? []).length).toBe((tbl.match(/<w:tc>/g) ?? []).length);
    }
  });

  it('never leaves two tables touching, which Word would merge into one', () => {
    expect(xml).not.toContain('</w:tbl><w:tbl>');
  });

  it('puts the header and footer references first in the section properties', () => {
    const sect = /<w:sectPr>[\s\S]*?<\/w:sectPr>/.exec(xml)![0];
    expect(sect.indexOf('<w:headerReference')).toBeLessThan(sect.indexOf('<w:pgSz'));
    expect(sect.indexOf('<w:footerReference')).toBeLessThan(sect.indexOf('<w:pgSz'));
    expect(sect.indexOf('<w:pgSz')).toBeLessThan(sect.indexOf('<w:pgMar'));
  });

  it('ends the body with a paragraph, not a table, before the section properties', () => {
    const body = /<w:body>([\s\S]*)<w:sectPr>/.exec(
      new TextDecoder().decode(parts.get('word/document.xml')!),
    )![1];
    expect(body.trimEnd().endsWith('</w:p>')).toBe(true);
  });
});

describe('the PDF renderer', () => {
  const bytes = renderDocumentPdf(SAMPLE);
  const raw = decoder.decode(bytes);

  it('is a real PDF with a page tree', () => {
    expect(raw.startsWith('%PDF-1.7\n')).toBe(true);
    expect(raw.endsWith('%%EOF\n')).toBe(true);
    expect(Number(/\/Count (\d+)/.exec(raw)![1])).toBeGreaterThan(1);
  });

  it('numbers every page against the real total', () => {
    const count = Number(/\/Count (\d+)/.exec(raw)![1]);
    expect(raw).toContain(`(Page 1 of ${count}) Tj`);
    expect(raw).toContain(`(Page ${count} of ${count}) Tj`);
  });

  it('puts the letterhead on every page, not only the cover', () => {
    const contact = (raw.match(/\(innovationconsult\.co\.za\) Tj/g) ?? []).length;
    expect(contact).toBe(Number(/\/Count (\d+)/.exec(raw)![1]));
  });

  it('is byte-for-byte deterministic', () => {
    expect(Array.from(renderDocumentPdf(SAMPLE))).toEqual(Array.from(renderDocumentPdf(SAMPLE)));
  });
});

describe('the two formats agree', () => {
  const pdf = decoder.decode(renderDocumentPdf(SAMPLE));
  const docx = new TextDecoder().decode(readZip(renderDocumentDocx(SAMPLE)).get('word/document.xml')!);

  it('carries the status banner in both, or in neither', () => {
    // Word-by-word rather than by substring: the PDF wraps the banner
    // across lines and encodes its em dash as a WinAnsi byte, so a naive
    // `toContain` of the raw sentence would pass only by accident.
    const banner = STATUS_BANNER[SAMPLE.meta.status];
    expect(banner).not.toBe('');
    for (const word of ['PENDING', 'ATTORNEY', 'attorney', 'relied']) {
      expect(pdf, word).toContain(word);
      expect(docx, word).toContain(word);
    }
  });

  it('carries the same cover fields in both', () => {
    for (const value of ['IC-ECOS-TEST-01', 'Canvasser copy', 'Sample Document']) {
      expect(pdf).toContain(value);
      expect(docx).toContain(value);
    }
  });

  it('gives both files the same stem', () => {
    expect(documentFileStem(SAMPLE)).toBe('ic-ecos-test-01-canvasser-copy-v1-0');
  });
});
