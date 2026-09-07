/**
 * Election Campaign OS — referral PDF layout
 * IC-ECOS-BUILD-2026-V2 §6.4, §8.4.
 *
 * Turns a `ReferralDocument` into real PDF bytes. Layout only — every
 * judgement about *what the document may claim* lives in
 * referralDocument.ts and is guarded by its tests; this file's job is to
 * put those strings on a page without losing any of them.
 *
 * Reading order is the whole point of the arrangement. The issuing
 * campaign's name is the first thing on the page and the municipality
 * appears below it as an addressee, so the document reads as "we are
 * writing to you" rather than as something the municipality issued. The
 * standing disclaimer sits in the body, not in six-point type at the
 * bottom.
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
import { COPYRIGHT_LINE, PRODUCT_NAME } from '@/lib/legalText';
import { shortHash } from '@/lib/hash';
import {
  EVIDENCE_BASIS,
  INTEGRITY_HASH_BASIS,
  referralContentHash,
  STANDING_DISCLAIMER,
  type ReferralDocument,
} from './referralDocument';

const MARGIN_X = 56;
const TOP_Y = A4_HEIGHT - 56;
const BOTTOM_Y = 78; // above the two footer lines and the page number
const CONTENT_WIDTH = A4_WIDTH - MARGIN_X * 2;
const LABEL_WIDTH = 118;

const SIZE = { title: 16, issuer: 13, heading: 9.5, body: 10, mono: 8.5, small: 8, footer: 7 };

/** Formats an ISO timestamp for print. Fixed SAST offset — §0 rule 1. */
function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const sast = new Date(date.getTime() + 2 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${sast.getUTCFullYear()}-${pad(sast.getUTCMonth() + 1)}-${pad(sast.getUTCDate())} ` +
    `${pad(sast.getUTCHours())}:${pad(sast.getUTCMinutes())} SAST`
  );
}

/**
 * A single-column flow layout with automatic page breaks. Kept local and
 * deliberately small — this is the only document the product prints.
 */
class Flow {
  private pages: PdfOp[][] = [[]];
  private y = TOP_Y;

  private get current(): PdfOp[] {
    return this.pages[this.pages.length - 1];
  }

  private ensure(height: number): void {
    if (this.y - height >= BOTTOM_Y) return;
    this.pages.push([]);
    this.y = TOP_Y;
  }

  gap(height: number): void {
    this.ensure(height);
    this.y -= height;
  }

  text(text: string, font: 'regular' | 'bold' | 'mono', size: number, x = MARGIN_X, grey?: number): void {
    const height = size * 1.35;
    this.ensure(height);
    this.y -= height;
    this.current.push({ kind: 'text', x, y: this.y, text, font, size, grey });
  }

  paragraph(text: string, font: 'regular' | 'mono' = 'regular', size = SIZE.body, x = MARGIN_X, grey?: number): void {
    const width = CONTENT_WIDTH - (x - MARGIN_X);
    for (const line of wrapText(text, font, size, width)) {
      if (line === '') {
        this.gap(size * 0.6);
        continue;
      }
      this.text(line, font, size, x, grey);
    }
  }

  /** A label/value row; the value wraps in the remaining column. */
  field(label: string, value: string, valueFont: 'regular' | 'mono' = 'regular'): void {
    const size = SIZE.body;
    const valueX = MARGIN_X + LABEL_WIDTH;
    const lines = wrapText(value, valueFont, size, CONTENT_WIDTH - LABEL_WIDTH);
    const height = size * 1.35;
    this.ensure(height * lines.length);
    lines.forEach((line, index) => {
      this.y -= height;
      if (index === 0) {
        this.current.push({ kind: 'text', x: MARGIN_X, y: this.y, text: label, font: 'bold', size, grey: 0.35 });
      }
      this.current.push({ kind: 'text', x: valueX, y: this.y, text: line, font: valueFont, size });
    });
  }

  heading(text: string): void {
    this.gap(10);
    this.text(text.toUpperCase(), 'bold', SIZE.heading, MARGIN_X, 0.35);
    this.gap(2);
  }

  rule(grey = 0.75): void {
    this.gap(6);
    this.ensure(1);
    this.current.push({ kind: 'rule', x1: MARGIN_X, y1: this.y, x2: A4_WIDTH - MARGIN_X, y2: this.y, grey });
    this.gap(4);
  }

  finish(): PdfOp[][] {
    return this.pages;
  }
}

/**
 * Build the referral's PDF bytes. `contentHash` is passed in rather than
 * computed here because it is printed *on* the document — see
 * `renderReferralPdf` for the ordinary entry point.
 */
export function buildReferralPdfBytes(doc: ReferralDocument, contentHash: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/.test(contentHash)) {
    throw new Error('buildReferralPdfBytes: refusing to print a value that is not a SHA-256 hex digest.');
  }

  const flow = new Flow();
  const isDraft = doc.status === 'DRAFT';

  // --- issuer first, municipality as addressee ----------------------------
  flow.text(doc.issuingOrganisation, 'bold', SIZE.issuer);
  flow.text(`Service delivery referral · Reference ${doc.reference}`, 'regular', SIZE.small, MARGIN_X, 0.35);
  flow.rule(0.4);

  flow.gap(8);
  flow.text('SERVICE DELIVERY REFERRAL', 'bold', SIZE.title);
  flow.gap(6);

  flow.field('To', `${doc.recipient.municipalityName} (${doc.recipient.municipalityCode})`);
  flow.field('Attention', doc.recipient.department);
  flow.field('Reference', doc.reference, 'mono');
  flow.field(
    isDraft ? 'Prepared' : 'Issued',
    isDraft
      ? `${formatStamp(doc.preparedAt)} — DRAFT, NOT AUTHORISED`
      : formatStamp(doc.authorisation!.authorisedAt),
  );

  flow.rule();

  // --- the fault ----------------------------------------------------------
  flow.heading('Incident particulars');
  flow.field('Category', doc.incident.categoryLabel);
  flow.field('Severity', doc.incident.severityLabel);
  flow.field('Ward', doc.incident.wardCode, 'mono');
  flow.field('Voting district', doc.incident.vdCode, 'mono');
  flow.field('Logged', formatStamp(doc.incident.loggedAt));
  flow.field('Escalated', formatStamp(doc.incident.escalatedAt));
  flow.field('Record id', doc.incident.id, 'mono');

  flow.heading('Description of the fault');
  flow.paragraph(doc.incident.description);

  if (doc.coveringNote !== '') {
    flow.heading('Covering note');
    flow.paragraph(doc.coveringNote);
  }

  // --- evidence -----------------------------------------------------------
  flow.heading('Photographic evidence');
  if (doc.evidencePaths.length === 0) {
    flow.paragraph('No photographs were attached to this incident.');
  } else {
    flow.paragraph(EVIDENCE_BASIS, 'regular', SIZE.small, MARGIN_X, 0.35);
    flow.gap(4);
    for (const path of doc.evidencePaths) {
      flow.paragraph(path, 'mono', SIZE.mono);
    }
  }

  // --- authorisation ------------------------------------------------------
  flow.heading('Authorisation');
  if (doc.authorisation) {
    flow.field('Authorised by', doc.authorisation.signatory.fullName);
    flow.field('Role', doc.authorisation.signatory.roleLabel);
    flow.field('User id', doc.authorisation.signatory.uid, 'mono');
    flow.field('Authorised at', formatStamp(doc.authorisation.authorisedAt));
  } else {
    flow.paragraph(
      'This document is a draft. It has not been authorised, it bears no signature, and it must not be sent to the municipality in this state.',
    );
  }
  flow.field('Prepared by', doc.preparedByUid, 'mono');

  // --- standing disclaimer, in the body where it will be read -------------
  flow.rule(0.4);
  flow.paragraph(STANDING_DISCLAIMER, 'regular', SIZE.small, MARGIN_X, 0.25);

  // --- integrity ----------------------------------------------------------
  flow.heading('Document integrity hash (SHA-256)');
  flow.paragraph(contentHash, 'mono', SIZE.mono);
  flow.paragraph(INTEGRITY_HASH_BASIS, 'regular', SIZE.small, MARGIN_X, 0.35);

  // --- assemble, stamping the watermark and footer onto every page --------
  const bodyPages = flow.finish();
  const pages: PdfPage[] = bodyPages.map((ops, index) => {
    const footerOps: PdfOp[] = [];
    if (isDraft) footerOps.push({ kind: 'watermark', text: 'DRAFT' });
    footerOps.push({
      kind: 'rule',
      x1: MARGIN_X,
      y1: BOTTOM_Y - 10,
      x2: A4_WIDTH - MARGIN_X,
      y2: BOTTOM_Y - 10,
      grey: 0.8,
    });
    const footerLines = [
      COPYRIGHT_LINE,
      `${PRODUCT_NAME} · Reference ${doc.reference} · Integrity hash ${shortHash(contentHash)}…`,
    ];
    footerLines.forEach((line, i) => {
      footerOps.push({
        kind: 'text',
        x: MARGIN_X,
        y: BOTTOM_Y - 22 - i * (SIZE.footer * 1.4),
        text: line,
        font: 'regular',
        size: SIZE.footer,
        grey: 0.45,
      });
    });
    const pageLabel = `Page ${index + 1} of ${bodyPages.length}`;
    footerOps.push({
      kind: 'text',
      x: A4_WIDTH - MARGIN_X - measureText(pageLabel, 'regular', SIZE.footer),
      y: BOTTOM_Y - 22,
      text: pageLabel,
      font: 'regular',
      size: SIZE.footer,
      grey: 0.45,
    });
    // Watermark first so body text draws over it.
    return { ops: [...footerOps, ...ops] };
  });

  return buildPdf(pages, {
    title: `Service delivery referral ${doc.reference}${isDraft ? ' (DRAFT)' : ''}`,
    author: doc.issuingOrganisation,
    subject: `${doc.incident.categoryLabel} — ${doc.recipient.municipalityName}`,
    idSeed: contentHash,
  });
}

export interface RenderedReferral {
  bytes: Uint8Array;
  contentHash: string;
}

/** Hash the document, then print the hash on it. The ordinary entry point. */
export async function renderReferralPdf(doc: ReferralDocument): Promise<RenderedReferral> {
  const contentHash = await referralContentHash(doc);
  return { bytes: buildReferralPdfBytes(doc, contentHash), contentHash };
}

/** Suggested download filename. */
export function referralFileName(doc: ReferralDocument): string {
  const slug = doc.reference.replace(/[^A-Za-z0-9]+/g, '-');
  return `referral-${slug}${doc.status === 'DRAFT' ? '-DRAFT' : ''}.pdf`;
}
