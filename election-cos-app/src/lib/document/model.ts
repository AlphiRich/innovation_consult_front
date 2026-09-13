/**
 * Election Campaign OS — the printable document model
 *
 * One model, two renderers. The manual and the legal document set are
 * built once as blocks, then rendered to PDF (`src/lib/pdf/`) or to Word
 * (`src/lib/docx/`).
 *
 * That indirection exists for one reason: a manual written twice drifts.
 * The Word copy and the PDF copy of the same SOP would disagree within a
 * release or two, and the one a subscriber quotes back would be whichever
 * they happened to open. Both renderers consume this, so there is only
 * ever one wording.
 */

export type Block =
  | { kind: 'title'; text: string }
  | { kind: 'subtitle'; text: string }
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'para'; text: string; muted?: boolean }
  | { kind: 'steps'; items: string[] }
  | { kind: 'bullets'; items: string[] }
  /** Boxed. Safety, legal exposure, irreversible acts. */
  | { kind: 'callout'; text: string }
  /** A two-column definition row — label and value. */
  | { kind: 'field'; label: string; value: string }
  | { kind: 'rule' }
  | { kind: 'pageBreak' }
  | { kind: 'mono'; text: string };

export type DocumentStatus =
  /** Issued and relied upon. */
  | 'ISSUED'
  /** Drafted here, stating facts about the product; pending attorney review. */
  | 'DRAFT_PENDING_REVIEW'
  /** A pack for an attorney to draft from; contains no operative clauses. */
  | 'DRAFTING_PACK';

export interface DocumentMeta {
  /** The subscribing organisation, as it should read on the cover. */
  organisation: string;
  version: string;
  /** e.g. 'Canvasser copy'. Optional. */
  audience?: string;
  status: DocumentStatus;
  /** Document reference, e.g. 'IC-ECOS-SOP-2026-01'. */
  reference: string;
}

export interface PrintDocument {
  title: string;
  subtitle?: string;
  meta: DocumentMeta;
  blocks: Block[];
}

export const STATUS_BANNER: Record<DocumentStatus, string> = {
  ISSUED: '',
  DRAFT_PENDING_REVIEW:
    'DRAFT — PENDING ATTORNEY REVIEW. This document states facts about how the platform works and ' +
    'has been drafted by Innovation Consult. It has not been reviewed by a qualified South African ' +
    'attorney and must not be published or relied upon as a legal instrument until it has been.',
  DRAFTING_PACK:
    'DRAFTING PACK — NOT A LEGAL INSTRUMENT. This document contains no operative clauses. It sets ' +
    'out the verified facts about the platform that the instrument must be drafted against, the ' +
    'claims it must never make, and the questions an attorney needs answered. The instrument itself ' +
    'is to be drafted by a qualified South African attorney.',
};

/** A stable file stem, lower-case and hyphenated. */
export function documentFileStem(doc: PrintDocument): string {
  const slug = (s: string) =>
    s
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  const audience = doc.meta.audience ? `-${slug(doc.meta.audience)}` : '';
  return `${slug(doc.meta.reference)}${audience}-v${slug(doc.meta.version)}`;
}
