/**
 * Election Campaign OS — service delivery referral document model
 * IC-ECOS-BUILD-2026-V2 §6.4, §8.4.
 *
 * §6.4's workflow ends: "Municipal Lead authorises → formal referral PDF
 * generated (authorisation strips the DRAFT watermark and appends
 * signature + timestamp)". This module is the document itself — a pure,
 * testable value with no React, no Firebase and no I/O, so the thing that
 * gets hashed and printed can be reasoned about on its own.
 *
 * WHAT THIS DOCUMENT IS, AND IS NOT
 *
 * It is a *campaign's* referral **to** a municipality: one political
 * party's field organisation formally handing a logged service-delivery
 * fault to the department responsible for it, with a reference number so
 * both sides can track it.
 *
 * It is NOT a municipal instrument, and the layout must never let a
 * reader think otherwise. The ecos-v2 fork's version of this screen put
 * "Republic of South Africa · North West Province" and a circular
 * "OFFICIAL" seal above the municipality's name, so a party document
 * arrived looking like state correspondence
 * (docs/ecos-v2-fork-review.md §4i). Hence:
 *
 *   - the issuer block comes first and names the campaign;
 *   - the municipality appears only as an addressee;
 *   - `STANDING_DISCLAIMER` is a required, non-removable part of the
 *     document body — `referralDocument.test.ts` fails if it ever stops
 *     being emitted, or starts claiming statutory force.
 *
 * The same discipline applied to the PPFA thresholds and the POPIA
 * response target applies here: this document asserts no statutory
 * deadline, no legal obligation on the recipient, and no authority it
 * does not have.
 */
import type { Incident } from '@/dal/ports/incidents';
import { sha256Hex } from '@/lib/hash';
import { CATEGORY_LABEL, SEVERITY_META } from '../incidentMeta';

/**
 * Version tag on the canonical serialization below. The content hash is
 * only meaningful if the exact bytes hashed can be reproduced later, so
 * ANY change to `canonicalPayload` — field order, naming, formatting —
 * must bump this. Old documents keep verifying against their own version.
 */
export const CANONICAL_FORMAT_VERSION = 'ecos.referral.v1';

/**
 * Printed verbatim on every referral, draft or authorised. Deliberately
 * says what the document is not: the fork's failure mode was a party
 * document that read as a municipal one.
 */
export const STANDING_DISCLAIMER =
  'This referral is issued by the campaign named above and is addressed to the municipality. ' +
  'It is not a municipal or government document, carries no municipal or state authority, ' +
  'and is not a notice, demand or application made under any statute. It is a record of a ' +
  'service-delivery fault reported by residents, passed on for the department’s attention.';

/**
 * Printed above the evidence list. The fork put a "SHA-256 Verified" badge
 * beside every photo path while hashing nothing anywhere in the file; this
 * says plainly what the paths are and what is not being attested.
 */
export const EVIDENCE_BASIS =
  'Photographs are held in the campaign’s file store at the paths below and are available ' +
  'to the municipality on request. The paths are listed for retrieval only — the images ' +
  'themselves are not hashed, and this document makes no attestation about them.';

/** Explains the printed hash, so nobody has to guess what it covers. */
export const INTEGRITY_HASH_BASIS =
  'Computed over this referral’s canonical field serialization (' +
  CANONICAL_FORMAT_VERSION +
  ') at the moment of issue. It verifies that the particulars above match the record held in ' +
  'Election Campaign OS. It does not cover the photographs, and it is not a signature.';

export interface ReferralRecipient {
  municipalityName: string;
  municipalityCode: string;
  /** The department the referral is addressed to, e.g. "Water & Sanitation". */
  department: string;
}

/**
 * Who authorised the referral. Every field is read from the authorising
 * user's own staff profile and session — never a constant. The fork signed
 * every referral it ever produced "James Khumalo (Municipal Lead)".
 */
export interface ReferralSignatory {
  uid: string;
  fullName: string;
  roleLabel: string;
}

export interface ReferralInput {
  incident: Incident;
  /**
   * The campaign/party organisation issuing the referral. Required, and
   * has no default: this codebase holds no tenant display name yet
   * (SessionContext carries an id only — see BUILD-STATUS.md), and
   * inventing a party name on a document addressed to a municipality is
   * exactly the class of fabrication this build refuses. The preparer
   * types it and it is recorded in the hash.
   */
  issuingOrganisation: string;
  recipient: ReferralRecipient;
  /** Free-text covering note from the preparer. May be empty. */
  coveringNote: string;
  preparedByUid: string;
  /** ISO 8601. Supplied by the caller so the document is testable. */
  preparedAt: string;
  /** Null while the document is a draft. Set only on authorisation. */
  authorisation: { signatory: ReferralSignatory; authorisedAt: string } | null;
}

export type ReferralStatus = 'DRAFT' | 'AUTHORISED';

export interface ReferralDocument {
  status: ReferralStatus;
  /** Human tracking reference. A reference number, never called a hash. */
  reference: string;
  issuingOrganisation: string;
  recipient: ReferralRecipient;
  incident: {
    id: string;
    categoryLabel: string;
    severityLabel: string;
    wardCode: string;
    vdCode: string;
    description: string;
    reportedBy: string;
    loggedAt: string;
    escalatedAt: string;
  };
  coveringNote: string;
  evidencePaths: string[];
  preparedByUid: string;
  preparedAt: string;
  authorisation: { signatory: ReferralSignatory; authorisedAt: string } | null;
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(`Referral cannot be built without ${field}.`);
  }
  return trimmed;
}

/**
 * Tracking reference, e.g. `NW405/2026/8f2c1a9e`. Derived from the
 * municipality code, the year the incident was logged, and the first eight
 * characters of its id.
 *
 * This is the legitimate use of the id prefix the fork printed under the
 * label "HASH:" — as a short reference two organisations can quote to each
 * other. It is labelled "Reference" everywhere it appears, and the real
 * integrity hash is a separate, actual SHA-256 (`referralContentHash`).
 */
export function referralReference(incident: Incident, municipalityCode: string): string {
  const year = new Date(incident.createdAt).getUTCFullYear();
  const code = municipalityCode.trim().toUpperCase() || 'UNSPECIFIED';
  return `${code}/${Number.isNaN(year) ? 'UNDATED' : year}/${incident.id.slice(0, 8)}`;
}

export function buildReferralDocument(input: ReferralInput): ReferralDocument {
  const { incident } = input;

  if (incident.status !== 'ESCALATED' && incident.status !== 'REFERRED') {
    throw new Error(
      `A referral can only be prepared for an escalated incident (§6.4); this one is ${incident.status}.`,
    );
  }
  if (input.authorisation) {
    requireNonEmpty(input.authorisation.signatory.fullName, 'the authorising officer’s name');
    requireNonEmpty(input.authorisation.signatory.roleLabel, 'the authorising officer’s role');
    requireNonEmpty(input.authorisation.signatory.uid, 'the authorising officer’s user id');
  }

  const recipient: ReferralRecipient = {
    municipalityName: requireNonEmpty(input.recipient.municipalityName, 'a recipient municipality'),
    municipalityCode: requireNonEmpty(input.recipient.municipalityCode, 'a recipient municipality code'),
    department: requireNonEmpty(input.recipient.department, 'a recipient department'),
  };

  return {
    status: input.authorisation ? 'AUTHORISED' : 'DRAFT',
    reference: referralReference(incident, recipient.municipalityCode),
    issuingOrganisation: requireNonEmpty(input.issuingOrganisation, 'the issuing campaign’s name'),
    recipient,
    incident: {
      id: incident.id,
      categoryLabel: CATEGORY_LABEL[incident.category],
      severityLabel: SEVERITY_META[incident.severity].label,
      wardCode: incident.wardCode,
      vdCode: incident.vdCode,
      description: incident.description,
      reportedBy: incident.reportedBy,
      loggedAt: incident.createdAt,
      escalatedAt: incident.updatedAt,
    },
    coveringNote: input.coveringNote.trim(),
    evidencePaths: [...incident.photoPaths].sort(),
    preparedByUid: requireNonEmpty(input.preparedByUid, 'a preparing user'),
    preparedAt: input.preparedAt,
    authorisation: input.authorisation,
  };
}

/**
 * The exact string the integrity hash is computed over.
 *
 * Properties this has to keep, because the hash is worthless without them:
 *  - deterministic — same document, same bytes, on any device, any day;
 *  - total — every field a reader sees is in here, so a changed document
 *    is a changed hash;
 *  - unambiguous — free text is escaped so a description containing a
 *    newline cannot forge extra fields.
 */
export function canonicalPayload(doc: ReferralDocument): string {
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
  const lines: string[] = [
    CANONICAL_FORMAT_VERSION,
    `status=${doc.status}`,
    `reference=${escape(doc.reference)}`,
    `issuer=${escape(doc.issuingOrganisation)}`,
    `recipient.municipality=${escape(doc.recipient.municipalityName)}`,
    `recipient.code=${escape(doc.recipient.municipalityCode)}`,
    `recipient.department=${escape(doc.recipient.department)}`,
    `incident.id=${escape(doc.incident.id)}`,
    `incident.category=${escape(doc.incident.categoryLabel)}`,
    `incident.severity=${escape(doc.incident.severityLabel)}`,
    `incident.ward=${escape(doc.incident.wardCode)}`,
    `incident.vd=${escape(doc.incident.vdCode)}`,
    `incident.description=${escape(doc.incident.description)}`,
    `incident.reportedBy=${escape(doc.incident.reportedBy)}`,
    `incident.loggedAt=${escape(doc.incident.loggedAt)}`,
    `incident.escalatedAt=${escape(doc.incident.escalatedAt)}`,
    `coveringNote=${escape(doc.coveringNote)}`,
    `evidence.count=${doc.evidencePaths.length}`,
    ...doc.evidencePaths.map((path, i) => `evidence.${i}=${escape(path)}`),
    `preparedBy=${escape(doc.preparedByUid)}`,
    `preparedAt=${escape(doc.preparedAt)}`,
    `authorised.uid=${escape(doc.authorisation?.signatory.uid ?? '')}`,
    `authorised.name=${escape(doc.authorisation?.signatory.fullName ?? '')}`,
    `authorised.role=${escape(doc.authorisation?.signatory.roleLabel ?? '')}`,
    `authorised.at=${escape(doc.authorisation?.authorisedAt ?? '')}`,
  ];
  return lines.join('\n');
}

/** Real SHA-256 over `canonicalPayload`. Lowercase hex, 64 characters. */
export function referralContentHash(doc: ReferralDocument): Promise<string> {
  return sha256Hex(canonicalPayload(doc));
}

/**
 * Recompute and compare. This is what makes the printed hash worth
 * printing: a municipality (or an auditor, or a court) holding the paper
 * and the record can check that they describe the same referral.
 */
export async function verifyReferralContentHash(doc: ReferralDocument, expectedHash: string): Promise<boolean> {
  return (await referralContentHash(doc)) === expectedHash.trim().toLowerCase();
}

/**
 * Deterministic Cloud Storage path for the issued PDF. Content-addressed:
 * the same referral always lands at the same path, so re-issuing cannot
 * silently fork into two differing "authorised" copies.
 */
export function referralStoragePath(tenantId: string, incidentId: string, contentHash: string): string {
  return `tenants/${tenantId}/referrals/${incidentId}/referral-${contentHash.slice(0, 16)}.pdf`;
}

/** Stable id for the referral's entry in the documents registry (§8.4). */
export function referralDocumentId(incidentId: string): string {
  // The `referral-` prefix is load-bearing: firestore.rules and
  // storage.rules both key the incidents.escalate allowance off it, so a
  // Municipal Lead can file a referral without holding team.manage.
  return `referral-${incidentId}`;
}
