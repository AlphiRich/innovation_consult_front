/**
 * Election Campaign OS — membership OTP callables
 * IC-ECOS-BUILD-2026-V2 §4.4, §6.2.1, §6.6, §7.5.
 *
 * Two functions, replacing the Cloud Run service reviewed in
 * docs/asset-control-sheet.md §35. The logic and every guard live in
 * `membershipOtp.ts`; this file is the Firestore and auth wiring.
 *
 * @deployable fails-closed
 *
 * One marker, deliberately the restrictive one. `deploy-preflight.mjs`
 * reads the first `@deployable` in a file and this file holds two
 * functions: `requestMembershipOtp`, which cannot send without a
 * credential this project does not have, and `verifyMembershipOtp`,
 * which is complete. A file is as shippable as its weakest function.
 *
 * WHY REQUEST FAILS CLOSED AND VERIFY DOES NOT
 *
 * Request needs a WhatsApp credential that does not exist on this
 * project, so it refuses — and refuses *before* writing anything, so it
 * cannot leave a challenge nobody can answer. Verify needs nothing but
 * Firestore and is complete; with no challenges in existence it simply
 * has nothing to verify, which is true rather than broken.
 *
 * WHAT THE CALLER HAS TO BE
 *
 * Signed in, in a tenant, holding `voters.edit`. That is the same gate as
 * editing the voter record itself, which is deliberate: the person doing
 * this is the canvasser standing at the door who captured the form. A
 * separate `voters.verify` capability was considered and not added —
 * every capability that nobody has been assigned is a feature that is
 * dead until someone edits a role, and this one is already covered by a
 * gate with exactly the right population. If outbound contact ever needs
 * its own gate, it is one line here plus a role assignment.
 *
 * THE CONSENT PRECONDITION
 *
 * A voter with `popiaConsentGiven: false` is not messaged. Sending an
 * unsolicited OTP to someone who has not consented to be contacted is
 * precisely the thing the consent flag exists to prevent, and a
 * verification flow is not an exception to it.
 *
 * THE NUMBER IS BOUND TO THE RECORD
 *
 * The caller supplies the number — this never decrypts `phoneEncrypted`,
 * so it does not depend on the KMS key that `unmaskCandidateIdNumber` is
 * waiting on. What stops an agent sending a code to a number of their own
 * choosing is that the supplied number must mask to the voter's stored
 * `phoneMasked`.
 *
 * That is a real binding and not a perfect one: the mask keeps three
 * digits at each end, so roughly 10^4 numbers satisfy it. It is stated
 * here rather than overstated — when the KMS key lands this becomes an
 * exact comparison and the check gets stronger without the flow changing.
 *
 * WHAT A VERIFIED CHALLENGE DOES NOT DO
 *
 * It does not write to the voter. `popiaConsentMethod` and
 * `popiaConsentAt` record how consent was actually obtained, and a code
 * typed into a handset afterwards does not change that history. The
 * evidence is the verified challenge and its audit event. Surfacing a
 * `phoneVerifiedAt` on the voter record is a schema change across the
 * port, the rules and the adapter, and belongs in its own turn.
 */
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { REGION } from './region';
import {
  MAX_ATTEMPTS,
  OTP_TTL_MS,
  canResend,
  generateOtp,
  hashOtp,
  maskPhone,
  newSalt,
  toE164ZA,
  verifyOtp,
  type OtpChallenge,
} from './membershipOtp';
import {
  MissingDeliveryCredential,
  WHATSAPP_API_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  deliverOtp,
} from './membershipOtpDelivery';

if (!getApps().length) initializeApp();

const CHALLENGES = 'membershipOtpChallenges';

interface Caller {
  uid: string;
  tenantId: string;
}

/**
 * The caller, from the verified token and nothing else.
 *
 * `tenantId` comes off the token's custom claims. A tenant id in the
 * request payload is ignored — the reviewed service took the identity of
 * the subject straight from an unauthenticated request body, which is how
 * it became possible to verify anyone.
 */
export function callerFrom(request: CallableRequest): Caller {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.');

  const token = auth.token as { tenantId?: unknown; caps?: unknown };
  const tenantId = typeof token.tenantId === 'string' ? token.tenantId : '';
  if (!tenantId) throw new HttpsError('permission-denied', 'This account is not attached to a tenant.');

  const caps = Array.isArray(token.caps) ? (token.caps as string[]) : [];
  if (!caps.includes('voters.edit')) {
    throw new HttpsError('permission-denied', 'Requires the voters.edit capability.');
  }
  return { uid: auth.uid, tenantId };
}

async function writeAudit(
  tenantId: string,
  event: { actorUid: string; action: string; targetId: string; metadata?: Record<string, unknown> },
): Promise<void> {
  await getFirestore().collection(`tenants/${tenantId}/auditLog`).add({
    tenantId,
    actorUid: event.actorUid,
    action: event.action,
    targetType: 'membershipOtpChallenge',
    targetId: event.targetId,
    occurredAt: FieldValue.serverTimestamp(),
    metadata: event.metadata ?? {},
  });
}

/* --------------------------------------------------------------- request */

interface RequestPayload {
  voterId?: unknown;
  phone?: unknown;
}

export const requestMembershipOtp = onCall<RequestPayload>(
  { region: REGION, secrets: [WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID] },
  async (request) => {
    const caller = callerFrom(request);

    const voterId = typeof request.data?.voterId === 'string' ? request.data.voterId.trim() : '';
    const phoneRaw = typeof request.data?.phone === 'string' ? request.data.phone : '';
    if (!voterId) throw new HttpsError('invalid-argument', 'voterId is required.');

    const toE164 = toE164ZA(phoneRaw);
    if (!toE164) {
      throw new HttpsError('invalid-argument', 'That is not a South African mobile number.');
    }

    const db = getFirestore();
    const voterRef = db.doc(`tenants/${caller.tenantId}/voters/${voterId}`);
    const voterSnap = await voterRef.get();
    if (!voterSnap.exists) throw new HttpsError('not-found', 'No such voter in this tenant.');

    const voter = voterSnap.data() as {
      firstName?: string;
      phoneMasked?: string;
      popiaConsentGiven?: boolean;
      deletedAt?: string | null;
    };

    if (voter.deletedAt) throw new HttpsError('not-found', 'No such voter in this tenant.');

    if (voter.popiaConsentGiven !== true) {
      throw new HttpsError(
        'failed-precondition',
        'This record has no POPIA consent, so no message may be sent to it.',
      );
    }

    if (maskPhone(toE164) !== voter.phoneMasked) {
      throw new HttpsError('failed-precondition', 'That number does not match the one on this record.');
    }

    // Cooldown, from the most recent challenge for this voter.
    const latestSnap = await db
      .collection(`tenants/${caller.tenantId}/${CHALLENGES}`)
      .where('voterId', '==', voterId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const latest = latestSnap.empty ? null : (latestSnap.docs[0].data() as OtpChallenge);

    const now = Date.now();
    if (!canResend(latest, now)) {
      throw new HttpsError('resource-exhausted', 'A code was just sent. Wait a minute before asking for another.');
    }

    const code = generateOtp();
    const salt = newSalt();
    const challenge: OtpChallenge = {
      tenantId: caller.tenantId,
      voterId,
      phoneMasked: maskPhone(toE164),
      codeHash: await hashOtp(code, salt),
      salt,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      status: 'PENDING_DELIVERY',
      requestedByUid: caller.uid,
    };

    // Written before the send, so a code that goes out is always one we
    // can verify; marked SENT only once Meta has taken it. The reverse
    // order loses the record of a message the member is holding.
    const ref = await db.collection(`tenants/${caller.tenantId}/${CHALLENGES}`).add({
      ...challenge,
      expireAt: Timestamp.fromMillis(challenge.expiresAt + 7 * 24 * 60 * 60 * 1000),
    });

    try {
      const result = await deliverOtp({ toE164, code, memberName: voter.firstName ?? 'Member' });
      await ref.update({
        status: result.delivered ? 'SENT' : 'DELIVERY_FAILED',
        providerMessageId: result.providerMessageId ?? null,
      });
      await writeAudit(caller.tenantId, {
        actorUid: caller.uid,
        action: result.delivered ? 'membership.otp.sent' : 'membership.otp.delivery_failed',
        targetId: ref.id,
        metadata: { voterId, phoneMasked: challenge.phoneMasked },
      });

      if (!result.delivered) {
        throw new HttpsError('unavailable', 'The message could not be sent. Try again in a moment.');
      }
      return { challengeId: ref.id, expiresAt: challenge.expiresAt, phoneMasked: challenge.phoneMasked };
    } catch (error) {
      await ref.update({ status: 'DELIVERY_FAILED' });
      if (error instanceof HttpsError) throw error;

      if (error instanceof MissingDeliveryCredential) {
        logger.error('requestMembershipOtp: no WhatsApp credential on this project');
        throw new HttpsError('failed-precondition', 'Message sending is not configured on this deployment.');
      }

      // Detail to the logs, a generic message to the caller. The reviewed
      // service returned `str(e)` to an anonymous caller (§35.5).
      logger.error('requestMembershipOtp: delivery threw', { message: (error as Error).message });
      throw new HttpsError('unavailable', 'The message could not be sent. Try again in a moment.');
    }
  },
);

/* ---------------------------------------------------------------- verify */

interface VerifyPayload {
  challengeId?: unknown;
  code?: unknown;
}

export const verifyMembershipOtp = onCall<VerifyPayload>({ region: REGION }, async (request) => {
  const caller = callerFrom(request);

  const challengeId = typeof request.data?.challengeId === 'string' ? request.data.challengeId.trim() : '';
  const code = typeof request.data?.code === 'string' ? request.data.code.trim() : '';
  if (!challengeId || !code) throw new HttpsError('invalid-argument', 'challengeId and code are required.');

  const db = getFirestore();
  const ref = db.doc(`tenants/${caller.tenantId}/${CHALLENGES}/${challengeId}`);

  /**
   * The read, the decision and the write are one transaction.
   *
   * Without it, two submissions racing each other both read `attempts: 2`
   * and both write `3`, so the counter under-counts and the lockout can
   * be walked straight past by submitting in parallel. A lockout that a
   * concurrent caller can outrun is not a lockout.
   */
  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'No such verification request.');

    const challenge = snap.data() as OtpChallenge;
    if (challenge.tenantId !== caller.tenantId) {
      // Unreachable by path construction; a mis-tenanted document would
      // otherwise be readable across the boundary.
      throw new HttpsError('not-found', 'No such verification request.');
    }

    const result = await verifyOtp(challenge, code, Date.now());

    if (result.kind === 'VERIFIED') {
      tx.update(ref, { status: 'VERIFIED', verifiedAt: FieldValue.serverTimestamp() });
    } else if (result.kind === 'WRONG') {
      // Only the counter moves. The hash and the salt are never touched —
      // §35.3, where a failed attempt destroyed the challenge and one
      // typo locked the member out permanently.
      tx.update(ref, { attempts: challenge.attempts + 1 });
    } else if (result.kind === 'LOCKED' && challenge.status !== 'LOCKED') {
      tx.update(ref, { attempts: Math.min(challenge.attempts + 1, MAX_ATTEMPTS), status: 'LOCKED' });
    }

    return result;
  });

  await writeAudit(caller.tenantId, {
    actorUid: caller.uid,
    action: `membership.otp.${outcome.kind.toLowerCase()}`,
    targetId: challengeId,
  });

  return outcome;
});
