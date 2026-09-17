/**
 * Election Campaign OS — what the candidate form tells the operator
 * IC-ECOS-BUILD-2026-V2 §6.6.
 *
 * Two sentences that have to say the same thing on the screen and in
 * SOP-11, so they live here rather than being typed twice. The same
 * reason `dataSubjectErasure.ts` owns the erasure position: a claim about
 * what the product does with personal information, repeated in two
 * places, becomes two claims.
 *
 * They are also the two places this module is most likely to be made
 * quietly worse — by writing a plausible-looking ciphertext, or by
 * filling in a gender nobody declared — so each is guarded.
 */

/**
 * Why a full identity number is typed and not kept.
 *
 * Real AES-256 needs a KMS-backed key exchange that is not provisioned
 * (BUILD-STATUS.md). A field named `idNumberEncrypted` holding something
 * that is not encrypted would be worse than an empty one, so it stays
 * empty and this says so out loud. Same stance as `VoterForm` takes on
 * phone numbers and `DonorForm` on donor identity numbers.
 */
export const ID_CAPTURE_BASIS =
  'The number is checked and then kept only as a mask showing its last four digits. This build stores no ' +
  'encrypted copy, because the key management that would make "encrypted" true is not provisioned — keep ' +
  'the full number wherever your party keeps its other originals.';

/**
 * Why the form asks rather than works it out.
 *
 * An SA identity number carries a sex marker in digits 7–10, and reading
 * it into `CandidateGender` would fill this field for every candidate
 * without anybody being asked. It is a different thing from the gender a
 * person declares, it is frequently wrong for the person concerned, and
 * `SaIdSexMarker` is a separate type for exactly that reason — assigning
 * one to the other does not compile.
 */
export const GENDER_CAPTURE_BASIS =
  'Ask the candidate. Nothing is read off their identity number and nothing is guessed from a name.';
