/**
 * Election-COS1.0 — unmaskCandidateIdNumber callable function
 * IC-ECOS-BUILD-2026-V2 §6.6: "unmask requires an explicit capability and
 * writes an audit event, export requires a second-factor confirmation."
 *
 * Skeleton — decryption and the audit-log write are TODOs pending the KMS
 * key setup in Phase 0 infra (see BUILD-STATUS.md).
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

  // TODO(Phase 3): decrypt candidate.idNumberEncrypted via Cloud KMS, then
  // write an auditLog entry (action: 'candidate.idNumber.unmask',
  // actorUid: request.auth.uid, targetId: request.data.candidateId) before
  // returning the plaintext value. Never log the plaintext itself.
  throw new HttpsError('unimplemented', 'ID number decryption not yet wired up — see TODO in this file.');
});
