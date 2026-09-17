/**
 * Election Campaign OS — checking an issued referral against the record
 * IC-ECOS-BUILD-2026-V2 §6.4, §8.4.
 *
 * WHY THIS EXISTS
 *
 * Every issued referral prints an integrity hash and a sentence saying
 * what it is for: that it "verifies that the particulars above match the
 * record held in Election Campaign OS". Until now nothing could perform
 * that check. `verifyReferralContentHash()` existed and needed a
 * `ReferralDocument`, and a `ReferralDocument` could not be rebuilt from
 * anything stored — the issuing organisation, the addressee, the covering
 * note and the timestamps went into the PDF and the hash and nowhere
 * else.
 *
 * So the document made a promise about itself that the product could not
 * keep. That is the same defect as the fork's "SHA-256 Verified" badge
 * over nothing, made quietly instead of loudly, and it is worse here
 * because this hash is real: a campaign challenged on what it sent could
 * produce a number and no way to stand behind it.
 *
 * The registry entry now carries the exact serialization the hash was
 * taken over, and this recomputes it.
 *
 * WHAT A PASS MEANS, PRECISELY
 *
 * That the hash recorded in the registry is the hash of the particulars
 * the registry holds — so neither has been altered since issue without
 * the other. Checked against a printed hash from a municipality's copy,
 * it also shows the paper and the record describe the same referral.
 *
 * It does not attest to the photographs, it is not a signature, and it
 * cannot tell you the referral was delivered. `INTEGRITY_HASH_BASIS` says
 * all of that on the document itself, and `verifyReferral.test.ts` holds
 * this module to the same limits.
 */
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import { sha256Hex } from '@/lib/hash';
import { referralDocumentId } from './referralDocument';

export type ReferralCheckOutcome =
  /** Recomputed hash matches the one on the registry entry. */
  | 'MATCHES'
  /** Recomputed hash differs — the record or the hash has been altered. */
  | 'DIFFERS'
  /** No referral has been issued for this incident. */
  | 'NOT_ISSUED'
  /** Issued before the particulars were stored, so there is nothing to recompute. */
  | 'CANNOT_CHECK';

export interface ReferralCheck {
  outcome: ReferralCheckOutcome;
  /** What the registry says the hash is. Absent when nothing was issued. */
  recordedHash?: string;
  /** What the particulars actually hash to. Absent when it cannot be computed. */
  recomputedHash?: string;
  /** A sentence for the operator, saying what this does and does not show. */
  message: string;
}

export const CHECK_MESSAGE: Record<ReferralCheckOutcome, string> = {
  MATCHES:
    'The hash on the record is the hash of the particulars on the record. Compare it against the hash ' +
    'printed on any copy you have been shown — if those agree too, the paper and the record describe the ' +
    'same referral. This says nothing about the photographs, it is not a signature, and it does not show ' +
    'the referral was delivered.',
  DIFFERS:
    'The particulars on the record do not hash to the hash on the record. Something has been altered since ' +
    'this referral was issued. Do not rely on either until you know what — and do not re-issue over it, ' +
    'because that would replace the evidence of the discrepancy.',
  NOT_ISSUED: 'No referral has been issued for this incident, so there is nothing to check.',
  CANNOT_CHECK:
    'This referral was issued before the particulars were stored alongside the hash, so the hash cannot be ' +
    'recomputed. The printed document is still the record; it simply cannot be checked from here. Re-issuing ' +
    'is not a fix — it would produce a second authorised copy of the same referral.',
};

/**
 * Reads the registry entry for an incident's referral and recomputes.
 *
 * Requires `incidents.view`, which is also what the security rules gate a
 * referral registry read on — so a person who can see the incident can
 * check its referral, and nobody else can.
 */
export async function verifyIssuedReferral(ctx: SessionContext, incidentId: string): Promise<ReferralCheck> {
  const entry = await dal.documents.getById(ctx, referralDocumentId(incidentId));

  if (!entry) {
    return { outcome: 'NOT_ISSUED', message: CHECK_MESSAGE.NOT_ISSUED };
  }
  if (!entry.canonicalPayload) {
    return {
      outcome: 'CANNOT_CHECK',
      recordedHash: entry.integrityHashSha256,
      message: CHECK_MESSAGE.CANNOT_CHECK,
    };
  }

  const recomputedHash = await sha256Hex(entry.canonicalPayload);
  const matches = recomputedHash === entry.integrityHashSha256.trim().toLowerCase();

  return {
    outcome: matches ? 'MATCHES' : 'DIFFERS',
    recordedHash: entry.integrityHashSha256,
    recomputedHash,
    message: matches ? CHECK_MESSAGE.MATCHES : CHECK_MESSAGE.DIFFERS,
  };
}

/**
 * Compare a hash somebody read off a printed referral against the record.
 * Whitespace and case are forgiven; nothing else is.
 */
export function printedHashAgrees(check: ReferralCheck, printed: string): boolean {
  const normalised = printed.replace(/\s+/g, '').toLowerCase();
  return normalised !== '' && normalised === check.recordedHash?.trim().toLowerCase();
}
