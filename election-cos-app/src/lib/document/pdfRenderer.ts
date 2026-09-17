/**
 * Election Campaign OS — PrintDocument → PDF, on the letterhead
 *
 * Generic over the document model, so the manual and the legal set render
 * through one path. Uses `src/lib/pdf/` — real bytes, A4, real Helvetica
 * metrics, deterministic.
 *
 * The letterhead is drawn rather than placed: a burgundy → gold → navy
 * bar as three filled segments, the logo slot top-left, contact block
 * top-right, services line and copyright in the footer. There is no
 * bitmap and no embedded font, which is what keeps a manual a few tens of
 * kilobytes instead of a few megabytes — it is read on field phones.
 */
import {
  A4_HEIGHT,
  A4_WIDTH,
  buildPdf,
  hexToRgb,
  measureText,
  wrapText,
  type PdfOp,
  type PdfPage,
  type Rgb,
} from '@/lib/pdf/pdfWriter';
import { COMPANY_LEGAL_NAME, COPYRIGHT_LINE, PRODUCT_NAME } from '@/lib/legalText';
import {
  BRAND_TAGLINE,
  CONTACT_BLOCK,
  COVER_MARKER,
  GRADIENT_STOPS,
  LOGO_SLOT,
  SERVICES_LINE,
} from '@/modules/manual/letterhead';
import { STATUS_BANNER, type Block, type PrintDocument } from './model';

const MARGIN_X = 56;
const TOP_Y = A4_HEIGHT - 104;
const BOTTOM_Y = 84;
const WIDTH = A4_WIDTH - MARGIN_X * 2;

const SIZE = {
  cover: 23,
  coverSub: 12.5,
  h1: 15,
  h2: 11.5,
  h3: 10.5,
  body: 10,
  small: 8.5,
  mono: 9,
  footer: 7,
  logo: 11,
  contact: 7,
};

function letterheadOps(): PdfOp[] {
  const ops: PdfOp[] = [];
  const barY = A4_HEIGHT - 30;
  const segment = WIDTH / GRADIENT_STOPS.length;

  // The gradient as three heavy rules. A real gradient needs a shading
  // dictionary; three stops read the same at 6pt and keep the writer small.
  GRADIENT_STOPS.forEach((stop, i) => {
    ops.push({
      kind: 'rule',
      x1: MARGIN_X + i * segment,
      y1: barY,
      x2: MARGIN_X + (i + 1) * segment,
      y2: barY,
      rgb: hexToRgb(stop),
      lineWidth: 6,
    });
  });

  ops.push({ kind: 'text', x: MARGIN_X, y: barY - 22, text: LOGO_SLOT, font: 'bold', size: SIZE.logo });

  CONTACT_BLOCK.forEach((line, i) => {
    const width = measureText(line, 'regular', SIZE.contact);
    ops.push({
      kind: 'text',
      x: A4_WIDTH - MARGIN_X - width,
      y: barY - 16 - i * (SIZE.contact * 1.45),
      text: line,
      font: 'regular',
      size: SIZE.contact,
      grey: 0.4,
    });
  });

  return ops;
}

class Flow {
  private pages: PdfOp[][] = [[]];
  private y = TOP_Y;

  private get current(): PdfOp[] {
    return this.pages[this.pages.length - 1];
  }

  break(): void {
    this.pages.push([]);
    this.y = TOP_Y;
  }

  private ensure(height: number): void {
    if (this.y - height >= BOTTOM_Y) return;
    this.break();
  }

  gap(h: number): void {
    this.ensure(h);
    this.y -= h;
  }

  text(
    text: string,
    font: 'regular' | 'bold' | 'mono',
    size: number,
    x = MARGIN_X,
    grey?: number,
    rgb?: Rgb,
  ): void {
    const height = size * 1.35;
    this.ensure(height);
    this.y -= height;
    this.current.push({ kind: 'text', x, y: this.y, text, font, size, grey, rgb });
  }

  paragraph(
    text: string,
    indent = 0,
    size = SIZE.body,
    font: 'regular' | 'bold' | 'mono' = 'regular',
    grey?: number,
  ): void {
    for (const line of wrapText(text, font, size, WIDTH - indent)) {
      if (line === '') this.gap(size * 0.5);
      else this.text(line, font, size, MARGIN_X + indent, grey);
    }
  }

  listItem(marker: string, text: string, size = SIZE.body): void {
    const markerWidth = Math.max(20, measureText(marker, 'bold', size) + 8);
    const lines = wrapText(text, 'regular', size, WIDTH - markerWidth);
    const height = size * 1.35;
    this.ensure(height * lines.length);
    lines.forEach((line, i) => {
      this.y -= height;
      if (i === 0) {
        this.current.push({ kind: 'text', x: MARGIN_X, y: this.y, text: marker, font: 'bold', size, grey: 0.35 });
      }
      this.current.push({ kind: 'text', x: MARGIN_X + markerWidth, y: this.y, text: line, font: 'regular', size });
    });
  }

  field(label: string, value: string): void {
    const labelWidth = 130;
    const lines = wrapText(value, 'regular', SIZE.body, WIDTH - labelWidth);
    const height = SIZE.body * 1.35;
    this.ensure(height * lines.length);
    lines.forEach((line, i) => {
      this.y -= height;
      if (i === 0) {
        this.current.push({
          kind: 'text',
          x: MARGIN_X,
          y: this.y,
          text: label,
          font: 'bold',
          size: SIZE.body,
          grey: 0.35,
        });
      }
      this.current.push({
        kind: 'text',
        x: MARGIN_X + labelWidth,
        y: this.y,
        text: line,
        font: 'regular',
        size: SIZE.body,
      });
    });
  }

  callout(text: string): void {
    this.gap(5);
    const lines = wrapText(text, 'regular', SIZE.small, WIDTH - 26);
    const height = SIZE.small * 1.4;
    this.ensure(height * lines.length + 8);
    const top = this.y;
    lines.forEach((line, i) => {
      this.y -= height;
      if (i === 0) {
        this.current.push({
          kind: 'text',
          x: MARGIN_X + 6,
          y: this.y,
          text: '!',
          font: 'bold',
          size: SIZE.small,
          rgb: hexToRgb(GRADIENT_STOPS[0]),
        });
      }
      this.current.push({
        kind: 'text',
        x: MARGIN_X + 26,
        y: this.y,
        text: line,
        font: 'regular',
        size: SIZE.small,
      });
    });
    this.current.push({
      kind: 'rule',
      x1: MARGIN_X + 1,
      y1: top - 2,
      x2: MARGIN_X + 1,
      y2: this.y - 3,
      rgb: hexToRgb(GRADIENT_STOPS[0]),
      lineWidth: 2.5,
    });
    this.gap(5);
  }

  rule(grey = 0.75): void {
    this.gap(6);
    this.ensure(1);
    this.current.push({ kind: 'rule', x1: MARGIN_X, y1: this.y, x2: A4_WIDTH - MARGIN_X, y2: this.y, grey });
    this.gap(5);
  }

  finish(): PdfOp[][] {
    return this.pages;
  }
}

function renderBlock(flow: Flow, block: Block): void {
  switch (block.kind) {
    case 'title':
      flow.text(block.text, 'bold', SIZE.cover);
      break;
    case 'subtitle':
      flow.gap(4);
      flow.text(block.text, 'regular', SIZE.coverSub, MARGIN_X, 0.3);
      break;
    case 'heading':
      flow.gap(block.level === 1 ? 12 : 8);
      flow.text(
        block.text,
        'bold',
        block.level === 1 ? SIZE.h1 : block.level === 2 ? SIZE.h2 : SIZE.h3,
        MARGIN_X,
        block.level === 1 ? undefined : 0.15,
        // Navy for an area heading, matching the Word output. Below that,
        // weight and size carry the hierarchy — three colours of heading
        // reads as decoration rather than structure.
        block.level === 1 ? hexToRgb(GRADIENT_STOPS[2]) : undefined,
      );
      flow.gap(3);
      break;
    case 'para':
      flow.paragraph(block.text, 0, SIZE.body, 'regular', block.muted ? 0.4 : undefined);
      flow.gap(3);
      break;
    case 'steps':
      block.items.forEach((item, i) => {
        flow.listItem(`${i + 1}.`, item);
        flow.gap(2);
      });
      break;
    case 'bullets':
      for (const item of block.items) {
        flow.listItem('·', item);
        flow.gap(2);
      }
      break;
    case 'callout':
      flow.callout(block.text);
      break;
    case 'field':
      flow.field(block.label, block.value);
      break;
    case 'mono':
      flow.paragraph(block.text, 0, SIZE.mono, 'mono');
      flow.gap(2);
      break;
    case 'rule':
      flow.rule(0.5);
      break;
    case 'pageBreak':
      flow.break();
      break;
  }
}

export function renderDocumentPdf(doc: PrintDocument): Uint8Array {
  const flow = new Flow();

  // --- cover ---------------------------------------------------------
  flow.gap(90);
  flow.text(`${COVER_MARKER.MANUAL}  ${PRODUCT_NAME}`, 'regular', SIZE.coverSub, MARGIN_X, 0.35);
  flow.gap(8);
  flow.text(doc.title, 'bold', SIZE.cover, MARGIN_X, undefined, hexToRgb(GRADIENT_STOPS[2]));
  if (doc.subtitle) {
    flow.gap(4);
    flow.text(doc.subtitle, 'regular', SIZE.coverSub, MARGIN_X, 0.3);
  }
  flow.rule(0.4);
  flow.gap(8);
  flow.field('Prepared for', doc.meta.organisation);
  if (doc.meta.audience) flow.field('Audience', doc.meta.audience);
  flow.field('Reference', doc.meta.reference);
  flow.field('Version', doc.meta.version);

  const banner = STATUS_BANNER[doc.meta.status];
  if (banner) {
    flow.gap(16);
    flow.callout(banner);
  }
  flow.break();

  for (const block of doc.blocks) renderBlock(flow, block);

  // --- assemble -------------------------------------------------------
  const body = flow.finish();
  const pages: PdfPage[] = body.map((ops, index) => {
    const chrome: PdfOp[] = [...letterheadOps()];
    chrome.push({
      kind: 'rule',
      x1: MARGIN_X,
      y1: BOTTOM_Y - 14,
      x2: A4_WIDTH - MARGIN_X,
      y2: BOTTOM_Y - 14,
      grey: 0.82,
    });
    chrome.push({
      kind: 'text',
      x: MARGIN_X,
      y: BOTTOM_Y - 26,
      text: SERVICES_LINE,
      font: 'regular',
      size: SIZE.footer,
      grey: 0.45,
    });
    chrome.push({
      kind: 'text',
      x: MARGIN_X,
      y: BOTTOM_Y - 36,
      text: `${COPYRIGHT_LINE} · ${BRAND_TAGLINE} · ${doc.meta.reference} v${doc.meta.version}`,
      font: 'regular',
      size: SIZE.footer,
      grey: 0.45,
    });
    const label = `Page ${index + 1} of ${body.length}`;
    chrome.push({
      kind: 'text',
      x: A4_WIDTH - MARGIN_X - measureText(label, 'regular', SIZE.footer),
      y: BOTTOM_Y - 26,
      text: label,
      font: 'regular',
      size: SIZE.footer,
      grey: 0.45,
    });
    return { ops: [...chrome, ...ops] };
  });

  return buildPdf(pages, {
    title: `${doc.title}${doc.meta.audience ? ` (${doc.meta.audience})` : ''}`,
    author: COMPANY_LEGAL_NAME,
    subject: doc.subtitle ?? PRODUCT_NAME,
    idSeed: `${doc.meta.reference}|${doc.meta.audience ?? ''}|${doc.meta.version}`,
  });
}
