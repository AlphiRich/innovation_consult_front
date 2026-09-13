/**
 * Election Campaign OS — what a POPIA deletion request can actually achieve
 * IC-ECOS-BUILD-2026-V2 §6.8, §4.4. POPIA Condition 8 (§23–25), §14.
 *
 * WHY THIS EXISTS
 *
 * `DataSubjectRequestType` offers DELETION, and the request log offers a
 * "Mark fulfilled" action. Taken together those imply this system can
 * erase a person's personal information on request. It cannot — not for
 * any subject type — and recording such a request as FULFILLED would put
 * a false statement into a compliance record that the Information
 * Regulator may one day read.
 *
 * The facts, from this repository rather than from assumption:
 *
 *  - `firestore.rules` sets `allow delete: if false` on all fourteen
 *    tenant collections. Nothing in this product hard-deletes anything.
 *  - Voters and households carry `deletedAt` and are *suppressed*, not
 *    destroyed. The personal information remains in Firestore.
 *  - Donations and the donor ledger are marked in the rules themselves as
 *    "statutory record — never deleted, only corrected".
 *  - There is no de-identification routine anywhere in this codebase.
 *
 * WHAT THIS MODULE IS, AND IS NOT
 *
 * It is not a reason to remove the DELETION request type, the request
 * log, or the Compliance Officer's ability to action requests. Those are
 * the valuable part and they stay. It is the correction to the *claim*
 * attached to them: the operator is told what the system actually did, so
 * the outcome they record is true.
 *
 * ATTORNEY REVIEW NEEDED on every `basis` string below. POPIA §14(1)
 * permits retention where it is "required or authorised by law", and the
 * Political Party Funding Act's record-keeping duty is the basis relied
 * on for donor records — but which records that covers, and for how long,
 * has not been settled by counsel. These strings are this build's working
 * position and say so. Same discipline as `dataSubjectRequestSla.ts`.
 */
import type { DataSubjectType } from '@/dal/ports/dataSubjectRequests';

export type ErasureDisposition =
  /** Retention is required or authorised by law; erasure must be refused. */
  | 'RESTRICTED_BY_LAW'
  /** The record can be suppressed, but suppression is not destruction. */
  | 'SUPPRESSION_ONLY';

export interface ErasurePosition {
  disposition: ErasureDisposition;
  /** Shown to the operator before they record an outcome. */
  basis: string;
  /**
   * Whether this system can honestly record the request as FULFILLED.
   * False everywhere today — see the header. Kept as a field rather than
   * a constant so that building real de-identification flips one place.
   */
  canRecordFulfilled: boolean;
}

/**
 * The sentence that belongs on any surface offering DELETION as a request
 * type. Guarded by `dataSubjectErasure.test.ts`.
 */
export const ERASURE_CAPABILITY_BASIS =
  'This system suppresses records; it does not yet destroy or de-identify them, and it ' +
  'hard-deletes nothing. A deletion request can therefore be restricted or suppressed, but ' +
  'not fulfilled as erasure. Recording the accurate outcome is required — see the note on ' +
  'each request. De-identification is not built (BUILD-STATUS.md) and this position is ' +
  'pending attorney review.';

const DONOR_BASIS =
  'Donation and donor-ledger records cannot be deleted by this system — firestore.rules sets ' +
  'delete: if false on both, because a donation is treated as a statutory record under the ' +
  'Political Party Funding Act. POPIA §14(1) permits retention where it is required or ' +
  'authorised by law; PPFA record-keeping is the basis relied on here. Refuse the erasure and ' +
  'record this reason — do not mark it fulfilled, because nothing was deleted. Working ' +
  'position, pending attorney review.';

const SUPPRESSION_BASIS =
  'This record can be suppressed (deletedAt) so it stops appearing in the app, but the ' +
  'personal information remains in Firestore. Suppression is not the destruction or ' +
  'de-identification POPIA §14(4)–(5) contemplates, so this must not be recorded as a ' +
  'fulfilled erasure. Tell the data subject what was actually done. Working position, ' +
  'pending attorney review.';

export function erasurePosition(subjectType: DataSubjectType): ErasurePosition {
  if (subjectType === 'DONOR') {
    return { disposition: 'RESTRICTED_BY_LAW', basis: DONOR_BASIS, canRecordFulfilled: false };
  }
  return { disposition: 'SUPPRESSION_ONLY', basis: SUPPRESSION_BASIS, canRecordFulfilled: false };
}

/**
 * Prefilled refusal reason for a donor erasure request, so the compliance
 * record carries the legal basis rather than a bare "rejected".
 *
 * Deliberately not auto-applied: a person decides and can edit it. A
 * prefilled reason that writes itself is how a template ends up asserting
 * something nobody checked.
 */
export const DONOR_ERASURE_REFUSAL_REASON =
  'Retention required — donation records are kept under the Political Party Funding Act; ' +
  'POPIA §14(1) permits retention required or authorised by law. Record not deleted.';

/**
 * True when the system cannot honestly offer "Mark fulfilled" for this
 * request. Every DELETION today; ACCESS and CORRECTION are unaffected —
 * this product can genuinely do both.
 */
export function blocksFulfilment(
  subjectType: DataSubjectType,
  requestType: 'ACCESS' | 'CORRECTION' | 'DELETION',
): boolean {
  return requestType === 'DELETION' && !erasurePosition(subjectType).canRecordFulfilled;
}
