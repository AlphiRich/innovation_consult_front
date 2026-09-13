/**
 * Election Campaign OS — the manual, as a printable document
 *
 * Real PDF bytes via `src/lib/pdf/`, the same writer the service delivery
 * referral uses. Print-ready means print-ready: A4, real Helvetica
 * metrics, page numbers, and a cover that says who this copy was
 * assembled for, because a role-filtered manual that does not name its
 * role is a document nobody can check.
 *
 * Deterministic, like everything else that writer produces — the same
 * manual for the same role and subscription is byte-identical, so a
 * subscriber can be told which version they hold.
 */
import {
  A4_HEIGHT,
  A4_WIDTH,
  buildPdf,
  measureText,
  wrapText,
  type PdfOp,
  type PdfPage,
} from '@/lib/pdf/pdfWriter';
import { COMPANY_LEGAL_NAME, COPYRIGHT_LINE, PRODUCT_NAME } from '@/lib/legalText';
import { AREA_LABEL, groupByArea, type Manual, type Sop } from './manualModel';
import { PLANNED_SOPS } from './sops';

const MARGIN_X = 56;
const TOP_Y = A4_HEIGHT - 60;
const BOTTOM_Y = 72;
const WIDTH = A4_WIDTH - MARGIN_X * 2;

const SIZE = { cover: 24, coverSub: 12, area: 15, title: 13, heading: 10.5, body: 10, small: 8.5, footer: 7 };

/**
 * The manual is a document about how to use the product. It is not the
 * Terms of Use, the Licence Agreement, the Privacy Policy or any of the
 * instruments those will become, and it says so on its own cover so that
 * nobody mistakes an operating procedure for a contractual term.
 */
export const MANUAL_STATUS_NOTE =
  'This is an operating manual. It describes how the platform works and how it is meant to be used. ' +
  'It is not a contract, a licence or a privacy notice, and it does not vary any agreement between ' +
  'you and ' +
  COMPANY_LEGAL_NAME +
  '. Where this manual and a signed agreement differ, the agreement governs.';

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

  text(text: string, font: 'regular' | 'bold' | 'mono', size: number, x = MARGIN_X, grey?: number): void {
    const height = size * 1.35;
    this.ensure(height);
    this.y -= height;
    this.current.push({ kind: 'text', x, y: this.y, text, font, size, grey });
  }

  paragraph(text: string, indent = 0, size = SIZE.body, font: 'regular' | 'bold' = 'regular', grey?: number): void {
    for (const line of wrapText(text, font, size, WIDTH - indent)) {
      if (line === '') this.gap(size * 0.5);
      else this.text(line, font, size, MARGIN_X + indent, grey);
    }
  }

  /** A numbered or bulleted item with a hanging indent. */
  listItem(marker: string, text: string, size = SIZE.body): void {
    const markerWidth = Math.max(18, measureText(marker, 'bold', size) + 6);
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

function renderSop(flow: Flow, sop: Sop): void {
  flow.gap(10);
  flow.text(`${sop.number} · ${sop.title}`, 'bold', SIZE.title);
  flow.gap(2);
  flow.paragraph(sop.purpose, 0, SIZE.small, 'regular', 0.35);
  flow.rule(0.5);

  for (const section of sop.sections) {
    flow.gap(8);
    flow.text(section.heading, 'bold', SIZE.heading);
    flow.gap(3);

    for (const para of section.body ?? []) {
      flow.paragraph(para);
      flow.gap(3);
    }

    (section.steps ?? []).forEach((step, i) => {
      flow.listItem(`${i + 1}.`, step);
      flow.gap(2);
    });

    for (const warning of section.warnings ?? []) {
      flow.gap(4);
      flow.listItem('!', warning, SIZE.small);
      flow.gap(2);
    }
  }
}

export interface ManualMeta {
  /** The subscribing organisation, as it should read on the cover. */
  organisation: string;
  /** A version string the subscriber can quote back. */
  version: string;
}

export function buildManualPdf(manual: Manual, meta: ManualMeta): Uint8Array {
  const flow = new Flow();

  // --- cover ---------------------------------------------------------
  flow.gap(120);
  flow.text(PRODUCT_NAME, 'bold', SIZE.cover);
  flow.gap(6);
  flow.text('Onboarding & Operations Manual', 'regular', SIZE.coverSub, MARGIN_X, 0.3);
  flow.rule(0.4);
  flow.gap(10);
  flow.text(meta.organisation, 'bold', SIZE.coverSub);
  flow.text(`Prepared for: ${manual.roleLabel}`, 'regular', SIZE.body, MARGIN_X, 0.35);
  flow.text(`Version ${meta.version}`, 'mono', SIZE.small, MARGIN_X, 0.45);
  flow.gap(24);
  flow.paragraph(MANUAL_STATUS_NOTE, 0, SIZE.small, 'regular', 0.35);
  flow.break();

  // --- contents ------------------------------------------------------
  flow.text('Contents', 'bold', SIZE.area);
  flow.gap(6);
  for (const group of groupByArea(manual)) {
    flow.gap(4);
    flow.text(AREA_LABEL[group.area], 'bold', SIZE.heading, MARGIN_X, 0.35);
    for (const sop of group.sops) {
      flow.listItem(sop.number, sop.title, SIZE.body);
    }
  }

  if (manual.withheld.length > 0) {
    flow.gap(12);
    flow.text('Not included in this copy', 'bold', SIZE.heading, MARGIN_X, 0.35);
    flow.gap(2);
    flow.paragraph(
      'These procedures exist but are not part of your copy. They are listed so that nothing is silently missing.',
      0,
      SIZE.small,
      'regular',
      0.4,
    );
    flow.gap(3);
    for (const w of manual.withheld) {
      flow.listItem(w.number, `${w.title} — ${w.reason}`, SIZE.small);
    }
  }

  // --- body ----------------------------------------------------------
  for (const group of groupByArea(manual)) {
    flow.break();
    flow.text(AREA_LABEL[group.area], 'bold', SIZE.area);
    flow.rule(0.4);
    for (const sop of group.sops) renderSop(flow, sop);
  }

  // --- appendix: the full register -----------------------------------
  flow.break();
  flow.text('Appendix · The full manual', 'bold', SIZE.area);
  flow.rule(0.4);
  flow.gap(4);
  flow.paragraph(
    'The complete manual is structured as the procedures below. Those not yet issued are listed so ' +
      'the shape of the whole is visible; they are not included here because an empty heading is ' +
      'worse than an acknowledged gap.',
    0,
    SIZE.small,
    'regular',
    0.35,
  );
  flow.gap(6);
  for (const planned of PLANNED_SOPS) {
    flow.listItem(planned.number, `${planned.title} — ${AREA_LABEL[planned.area]} · not yet issued`, SIZE.small);
  }

  // --- assemble with footers ------------------------------------------
  const body = flow.finish();
  const pages: PdfPage[] = body.map((ops, index) => {
    const footer: PdfOp[] = [
      { kind: 'rule', x1: MARGIN_X, y1: BOTTOM_Y - 12, x2: A4_WIDTH - MARGIN_X, y2: BOTTOM_Y - 12, grey: 0.8 },
      {
        kind: 'text',
        x: MARGIN_X,
        y: BOTTOM_Y - 24,
        text: `${COPYRIGHT_LINE} · ${manual.roleLabel} copy · v${meta.version}`,
        font: 'regular',
        size: SIZE.footer,
        grey: 0.45,
      },
    ];
    const label = `Page ${index + 1} of ${body.length}`;
    footer.push({
      kind: 'text',
      x: A4_WIDTH - MARGIN_X - measureText(label, 'regular', SIZE.footer),
      y: BOTTOM_Y - 24,
      text: label,
      font: 'regular',
      size: SIZE.footer,
      grey: 0.45,
    });
    return { ops: [...footer, ...ops] };
  });

  return buildPdf(pages, {
    title: `${PRODUCT_NAME} — Operations Manual (${manual.roleLabel})`,
    author: COMPANY_LEGAL_NAME,
    subject: `Onboarding and operating procedures for ${manual.roleLabel}`,
    idSeed: `${meta.organisation}|${manual.roleLabel}|${meta.version}`,
  });
}

export function manualFileName(manual: Manual, meta: ManualMeta): string {
  const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `ecos-manual-${slug(manual.roleLabel)}-v${slug(meta.version)}.pdf`.toLowerCase();
}
