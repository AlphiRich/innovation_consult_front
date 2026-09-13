/**
 * Election Campaign OS — PrintDocument → Word (.docx)
 *
 * WordprocessingML, written directly. Same reasoning as the PDF writer:
 * the only Word files this product emits are its own documents, so a
 * few hundred lines of a documented format beats a dependency shipped to
 * every build.
 *
 * Deterministic, like everything else here — stored ZIP entries and fixed
 * timestamps, so the same document is the same bytes.
 *
 * FIDELITY, STATED HONESTLY
 *
 * Word is an editable format, not a fixed one, and this writer does not
 * pretend otherwise. The letterhead is reproduced as a real page header
 * and footer — the gradient bar as a three-cell bordered table, the logo
 * slot and contact block in a two-column table, the services line and
 * copyright in the footer — so it repeats on every page and survives
 * editing. What is *not* attempted is layered watermarking or absolute
 * positioning, which Word's model does not carry cleanly; the PDF is the
 * fixed-layout copy and the Word file is the editable one. Colour and
 * structure carry over; pixel fidelity does not.
 */
import { buildZip, type ZipEntry } from '@/lib/docx/zip';
import { COPYRIGHT_LINE, PRODUCT_NAME } from '@/lib/legalText';
import {
  BRAND_FONT,
  BRAND_TAGLINE,
  CONTACT_BLOCK,
  COVER_MARKER,
  GRADIENT_STOPS,
  HAIRLINE,
  LOGO_SLOT,
  MUTED_INK,
  SERVICES_LINE,
} from '@/modules/manual/letterhead';
import { STATUS_BANNER, type Block, type PrintDocument } from './model';

const enc = new TextEncoder();
const part = (path: string, xml: string): ZipEntry => ({ path, data: enc.encode(xml) });

/** XML text escaping. Word is unforgiving about a bare ampersand. */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const hex = (colour: string) => colour.replace('#', '').toUpperCase();

/**
 * ELEMENT ORDER IS NOT COSMETIC
 *
 * WordprocessingML property containers are schema *sequences*, not bags.
 * `<w:color>` after `<w:sz>`, or `<w:pBdr>` after `<w:spacing>`, is a
 * validation failure, and Word's response to one is to declare the whole
 * document unreadable without saying which element was out of place.
 *
 * The orders enforced below, from the ECMA-376 content models:
 *   CT_RPr  … rFonts, b, color, sz, szCs …
 *   CT_PPr  … pBdr, spacing, ind, jc, outlineLvl …
 *   CT_Tbl  … tblPr, tblGrid, tr+           (tblGrid is required)
 *
 * `docxSchemaOrder` in `document.test.ts` asserts each of these, because
 * this is precisely the class of defect that renders fine in a text editor
 * and fails only in the one application that matters.
 */

interface RunOpts {
  bold?: boolean;
  size?: number; // points
  colour?: string; // hex with #
  mono?: boolean;
}

function run(text: string, o: RunOpts = {}): string {
  const half = Math.round((o.size ?? 10) * 2);
  const font = o.mono ? 'Consolas' : BRAND_FONT;
  const rPr =
    `<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>` +
    (o.bold ? '<w:b/>' : '') +
    (o.colour ? `<w:color w:val="${hex(o.colour)}"/>` : '') +
    `<w:sz w:val="${half}"/><w:szCs w:val="${half}"/>`;
  return `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

interface ParaOpts extends RunOpts {
  spaceBefore?: number; // twentieths of a point
  spaceAfter?: number;
  indent?: number;
  /** Left bar, for callouts. */
  bar?: string;
  outline?: number;
  align?: 'right';
}

function para(text: string, o: ParaOpts = {}): string {
  const pPr =
    '<w:pPr>' +
    (o.bar ? `<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${hex(o.bar)}"/></w:pBdr>` : '') +
    `<w:spacing w:before="${o.spaceBefore ?? 0}" w:after="${o.spaceAfter ?? 120}"/>` +
    (o.indent ? `<w:ind w:left="${o.indent}"/>` : '') +
    (o.align ? `<w:jc w:val="${o.align}"/>` : '') +
    (o.outline !== undefined ? `<w:outlineLvl w:val="${o.outline}"/>` : '') +
    '</w:pPr>';
  return `<w:p>${pPr}${text ? run(text, o) : ''}</w:p>`;
}

const NO_BORDERS =
  '<w:tblBorders><w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>' +
  '<w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/></w:tblBorders>';

/** A borderless table. `cells` is one entry per column: width and content. */
function table(cells: { width: number; fill?: string; content: string }[], trPr = ''): string {
  const total = cells.reduce((sum, c) => sum + c.width, 0);
  const grid = cells.map((c) => `<w:gridCol w:w="${c.width}"/>`).join('');
  const body = cells
    .map(
      (c) =>
        `<w:tc><w:tcPr><w:tcW w:w="${c.width}" w:type="dxa"/>` +
        (c.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${hex(c.fill)}"/>` : '') +
        `</w:tcPr>${c.content}</w:tc>`,
    )
    .join('');
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>${NO_BORDERS}</w:tblPr>` +
    `<w:tblGrid>${grid}</w:tblGrid>` +
    `<w:tr>${trPr}${body}</w:tr></w:tbl>`
  );
}

const EMPTY_CELL = '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';

/**
 * A paragraph of almost no height. Two tables that touch are merged into
 * one by Word, so every table this file emits is followed by something —
 * and a full-height empty paragraph in a page header is a visible gap.
 * `w:rPr` inside `w:pPr` sets the paragraph mark's own size, and belongs
 * after `w:outlineLvl` in the sequence.
 */
const SPACER =
  '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>' +
  '<w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>';

/** The gradient bar: one row, three shaded cells, no borders. */
function gradientBar(): string {
  return table(
    GRADIENT_STOPS.map((stop) => ({ width: Math.round(9360 / GRADIENT_STOPS.length), fill: stop, content: EMPTY_CELL })),
    '<w:trPr><w:trHeight w:val="90"/></w:trPr>',
  );
}

function headerXml(): string {
  const contact = CONTACT_BLOCK.map((line) =>
    para(line, { size: 7, colour: MUTED_INK, spaceAfter: 0, align: 'right' }),
  ).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    gradientBar() +
    SPACER +
    table([
      { width: 5200, content: para(LOGO_SLOT, { bold: true, size: 11, spaceBefore: 80, spaceAfter: 0 }) },
      { width: 4160, content: contact },
    ]) +
    para('', { spaceAfter: 120 }) +
    '</w:hdr>'
  );
}

/**
 * A Word field. The page number is not a value to be written in — Word
 * computes it — so the footer carries the instruction and a cached result
 * that any reader replaces on repagination.
 */
function fieldRun(instruction: string, cached: string, o: RunOpts): string {
  const rPr = `<w:rPr><w:rFonts w:ascii="${BRAND_FONT}" w:hAnsi="${BRAND_FONT}"/>` +
    (o.colour ? `<w:color w:val="${hex(o.colour)}"/>` : '') +
    `<w:sz w:val="${Math.round((o.size ?? 10) * 2)}"/><w:szCs w:val="${Math.round((o.size ?? 10) * 2)}"/></w:rPr>`;
  return (
    `<w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r>${rPr}<w:instrText xml:space="preserve"> ${instruction} </w:instrText></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="separate"/></w:r>` +
    `<w:r>${rPr}<w:t>${esc(cached)}</w:t></w:r>` +
    `<w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>`
  );
}

function footerXml(reference: string, version: string): string {
  const line = (text: string) => para(text, { size: 7, colour: MUTED_INK, spaceAfter: 0 });
  const small: RunOpts = { size: 7, colour: MUTED_INK };
  const pageNumber =
    '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="right"/></w:pPr>' +
    run('Page ', small) +
    fieldRun('PAGE', '1', small) +
    run(' of ', small) +
    fieldRun('NUMPAGES', '1', small) +
    '</w:p>';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    line(SERVICES_LINE) +
    line(`${COPYRIGHT_LINE} · ${BRAND_TAGLINE} · ${reference} v${version}`) +
    pageNumber +
    '</w:ftr>'
  );
}

function blockXml(block: Block): string {
  switch (block.kind) {
    case 'title':
      return para(block.text, { bold: true, size: 23, spaceAfter: 80, outline: 0 });
    case 'subtitle':
      return para(block.text, { size: 12.5, colour: MUTED_INK, spaceAfter: 200 });
    case 'heading':
      return para(block.text, {
        bold: true,
        size: block.level === 1 ? 15 : block.level === 2 ? 11.5 : 10.5,
        spaceBefore: block.level === 1 ? 320 : 220,
        spaceAfter: 100,
        colour: block.level === 1 ? GRADIENT_STOPS[2] : undefined,
        outline: block.level,
      });
    case 'para':
      return para(block.text, { size: 10, colour: block.muted ? MUTED_INK : undefined });
    case 'steps':
      return block.items
        .map((item, i) => para(`${i + 1}.  ${item}`, { size: 10, indent: 360, spaceAfter: 80 }))
        .join('');
    case 'bullets':
      return block.items.map((item) => para(`·  ${item}`, { size: 10, indent: 360, spaceAfter: 80 })).join('');
    case 'callout':
      return para(block.text, {
        size: 8.5,
        indent: 220,
        bar: GRADIENT_STOPS[0],
        spaceBefore: 120,
        spaceAfter: 160,
      });
    case 'field':
      // A table, then an empty paragraph: two adjacent tables in Word's
      // model merge into one, and the cover is a run of these.
      return (
        table([
          {
            width: 2600,
            content: para(block.label, { bold: true, size: 10, colour: MUTED_INK, spaceAfter: 40 }),
          },
          { width: 6760, content: para(block.value, { size: 10, spaceAfter: 40 }) },
        ]) + SPACER
      );
    case 'mono':
      return para(block.text, { size: 9, mono: true });
    case 'rule':
      return (
        `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="${hex(HAIRLINE)}"/></w:pBdr>` +
        '<w:spacing w:before="120" w:after="160"/></w:pPr></w:p>'
      );
    case 'pageBreak':
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }
}

export function renderDocumentDocx(doc: PrintDocument): Uint8Array {
  const banner = STATUS_BANNER[doc.meta.status];

  const cover = [
    para(`${COVER_MARKER.MANUAL}  ${PRODUCT_NAME}`, { size: 12.5, colour: MUTED_INK, spaceBefore: 600 }),
    blockXml({ kind: 'title', text: doc.title }),
    doc.subtitle ? blockXml({ kind: 'subtitle', text: doc.subtitle }) : '',
    blockXml({ kind: 'rule' }),
    blockXml({ kind: 'field', label: 'Prepared for', value: doc.meta.organisation }),
    doc.meta.audience ? blockXml({ kind: 'field', label: 'Audience', value: doc.meta.audience }) : '',
    blockXml({ kind: 'field', label: 'Reference', value: doc.meta.reference }),
    blockXml({ kind: 'field', label: 'Version', value: doc.meta.version }),
    banner ? blockXml({ kind: 'callout', text: banner }) : '',
    blockXml({ kind: 'pageBreak' }),
  ].join('');

  // The trailing spacer is structural, not cosmetic: a body that ends in a
  // table rather than a paragraph is invalid, and whether it does depends
  // on the last block of whichever document is being rendered.
  const body = doc.blocks.map(blockXml).join('') + SPACER;

  const sectPr =
    '<w:sectPr>' +
    '<w:headerReference w:type="default" r:id="rId10"/>' +
    '<w:footerReference w:type="default" r:id="rId11"/>' +
    '<w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1985" w:right="1134" w:bottom="1560" w:left="1134" w:header="567" w:footer="680" w:gutter="0"/>' +
    '</w:sectPr>';

  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<w:body>${cover}${body}${sectPr}</w:body></w:document>`;

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
    '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
    '</Types>';

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  const docRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' +
    '<Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
    '</Relationships>';

  return buildZip([
    part('[Content_Types].xml', contentTypes),
    part('_rels/.rels', rootRels),
    part('word/document.xml', document),
    part('word/_rels/document.xml.rels', docRels),
    part('word/header1.xml', headerXml()),
    part('word/footer1.xml', footerXml(doc.meta.reference, doc.meta.version)),
  ]);
}
