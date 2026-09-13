/**
 * Election Campaign OS — the legal document set
 *
 * Eight documents in two classes, and the class is the important part:
 *
 *   LEG-01…03  Factual notices. They describe what the system does, which
 *              this repository is the authority on. Drafted here, marked
 *              DRAFT — PENDING ATTORNEY REVIEW.
 *   LEG-04…08  Drafting packs for the instruments that allocate risk.
 *              Not drafted here. Each carries the facts, the prohibitions,
 *              the open questions and the decisions the company still owes,
 *              and no operative clause.
 *
 * The split is not caution for its own sake. A notice that misdescribes
 * the product is a defect this build can find and fix; a limitation clause
 * drafted from a precedent by someone who is not an attorney is a defect
 * that shows up in litigation.
 */
import type { PrintDocument } from '@/lib/document/model';
import { draftingPack, INSTRUMENTS } from './draftingPacks';
import { capabilityStatement, privacyNotice, residencyDisclosure, type LegalDocumentMeta } from './notices';

export type { LegalDocumentMeta } from './notices';
export { INSTRUMENTS, NO_OPERATIVE_CLAUSES } from './draftingPacks';
export { CROSS_BORDER_DISCLOSURE, SUPPRESSION_NOT_ERASURE } from './notices';
export { MUST_NOT_CLAIM, OPEN_QUESTIONS, PRODUCT_FACTS } from './facts';

/** The factual notices, in reading order. */
export function legalNotices(meta: LegalDocumentMeta): PrintDocument[] {
  return [privacyNotice(meta), residencyDisclosure(meta), capabilityStatement(meta)];
}

/** One pack per risk-allocating instrument. */
export function legalDraftingPacks(meta: LegalDocumentMeta): PrintDocument[] {
  return INSTRUMENTS.map((spec) => draftingPack(spec, meta));
}

export function buildLegalDocuments(meta: LegalDocumentMeta): PrintDocument[] {
  return [...legalNotices(meta), ...legalDraftingPacks(meta)];
}
