/**
 * Election Campaign OS — the manual, as printable files
 *
 * This used to hold its own page-layout engine. It no longer does. The
 * manual and the legal document set are now both `PrintDocument`s
 * (`src/lib/document/model.ts`) rendered by one PDF writer and one Word
 * writer, on the Innovation Consult letterhead.
 *
 * The reason for collapsing them is the one that applies to every second
 * implementation of the same thing: two layout engines would have drifted.
 * A change to how a warning is called out would have landed in the manual
 * and not in the privacy notice, and the difference would have been
 * noticed by a subscriber rather than by us.
 *
 * This file stays because `buildManualPdf(manual, meta)` is what the rest
 * of the product calls, and because the manual — unlike the legal set —
 * is assembled per reader and deserves a name that says so.
 */
import { renderDocumentDocx } from '@/lib/document/docxRenderer';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import { documentFileStem } from '@/lib/document/model';
import type { Manual } from './manualModel';
import { manualToDocument, type ManualDocumentMeta } from './manualDocument';

export { MANUAL_STATUS_NOTE } from './manualDocument';

export type ManualMeta = ManualDocumentMeta;

export function buildManualPdf(manual: Manual, meta: ManualMeta): Uint8Array {
  return renderDocumentPdf(manualToDocument(manual, meta));
}

export function buildManualDocx(manual: Manual, meta: ManualMeta): Uint8Array {
  return renderDocumentDocx(manualToDocument(manual, meta));
}

/** Shared stem for both formats — the extension is the only difference. */
export function manualFileStem(manual: Manual, meta: ManualMeta): string {
  return documentFileStem(manualToDocument(manual, meta));
}

export function manualFileName(manual: Manual, meta: ManualMeta): string {
  return `${manualFileStem(manual, meta)}.pdf`;
}
