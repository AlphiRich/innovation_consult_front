/**
 * Election Campaign OS — the full document set, in both formats
 *
 * One entry point that produces everything a subscriber is handed: the
 * role-filtered operations manual, the factual notices, and the drafting
 * packs for the instruments an attorney still has to write.
 *
 * Two formats from one model. The Word copy is the editable one — a
 * subscriber's compliance officer will want to paste an SOP into their own
 * induction pack, and an attorney will want to draft into the pack rather
 * than beside it. The PDF is the fixed-layout copy, the one that gets
 * printed and the one a version can be quoted against. Both render the
 * same `PrintDocument`, so there is only ever one wording.
 */
import { renderDocumentDocx } from '@/lib/document/docxRenderer';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import { documentFileStem, type PrintDocument } from '@/lib/document/model';
import { assembleManual, type ManualAudience } from '@/modules/manual/manualModel';
import { manualToDocument } from '@/modules/manual/manualDocument';
import { SOPS } from '@/modules/manual/sops';
import { buildLegalDocuments } from '@/modules/legal';

export interface DocumentSetMeta {
  organisation: string;
  version: string;
}

export interface RenderedDocument {
  doc: PrintDocument;
  /** Shared stem; the extension distinguishes the two files. */
  stem: string;
  pdf: Uint8Array;
  docx: Uint8Array;
}

/**
 * Every document for one reader. The manual is filtered to their role and
 * their tenant's subscription; the legal set is not, because a document
 * that tells a subscriber what the platform will not claim is exactly the
 * document that must not be filtered.
 */
export function buildDocumentSet(audience: ManualAudience, meta: DocumentSetMeta): PrintDocument[] {
  const manual = assembleManual(SOPS, audience);
  return [manualToDocument(manual, meta), ...buildLegalDocuments(meta)];
}

export function renderDocument(doc: PrintDocument): RenderedDocument {
  return {
    doc,
    stem: documentFileStem(doc),
    pdf: renderDocumentPdf(doc),
    docx: renderDocumentDocx(doc),
  };
}

export function renderDocumentSet(audience: ManualAudience, meta: DocumentSetMeta): RenderedDocument[] {
  return buildDocumentSet(audience, meta).map(renderDocument);
}
