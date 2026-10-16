/**
 * Election Campaign OS — unmaskCandidateIdNumber callable function
 * IC-ECOS-BUILD-2026-V2 §6.6: "unmask requires an explicit capability and
 * writes an audit event, export requires a second-factor confirmation."
 *
 * @deployable fails-closed
 *
 * Decryption needs a Cloud KMS key that Phase 0 infra has not created, so
 * this function cannot do its job yet. What it does instead is refuse:
 * the capability check runs, and then it throws `unimplemented`. There is
 * no code path through it that returns a value, so deploying it cannot
 * leak an ID number or return a plausible wrong one — the worst it can do
 * is tell a caller the feature is not wired up, which is true.
 *
 * That is why it is exported while `sync.ts` was not: a function that
 * fails closed is safe to ship, a half-written write path is not. The
 * `@deployable` marker above is what `scripts/deploy-preflight.mjs` reads
 * to tell those two cases apart.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION } from './region';

interface Request {
  candidateId: string;
}
interface Response {
  idNumber: string;
}

export const unmaskCandidateIdNumber = onCall<Request>({ region: REGION }, async (request): Promise<Response> => {
  const caps = (request.auth?.token as { caps?: string[] } | undefined)?.caps ?? [];
  if (!caps.includes('team.manage')) {
    throw new HttpsError('permission-denied', 'Requires team.manage capability (§6.6).');
  }

  // Pending the KMS key: decrypt candidate.idNumberEncrypted, write an
  // auditLog entry (action: 'candidate.idNumber.unmask', actorUid:
  // request.auth.uid, targetId: request.data.candidateId), and only then
  // return the plaintext. Never log the plaintext itself.
  //
  // Until that key exists this throws. Deliberately the whole body: there
  // is no branch that returns a value, so there is nothing to get wrong.
  throw new HttpsError('unimplemented', 'ID number decryption is not wired up: this deployment has no KMS key.');
});
