/**
 * Election Campaign OS — issuing a referral
 * IC-ECOS-BUILD-2026-V2 §6.4, §8.4.
 *
 * The side-effecting half of the referral feature, kept out of the React
 * component so the order of operations is testable on its own.
 *
 * Three writes, in this order, and the order is the point:
 *   1. the PDF into Cloud Storage, at a content-addressed path;
 *   2. the registry entry in `documents` (§8.4 — classification,
 *      watermark, integrity hash, signatory);
 *   3. the incident's ESCALATED -> REFERRED transition, recording the path.
 *
 * If step 2 or 3 fails, the incident stays ESCALATED and the operator can
 * retry. That retry is safe rather than duplicative because everything is
 * addressed by content: the same referral hashes to the same value, so it
 * resolves to the same Storage path and the same registry document id.
 * The failure mode this avoids is an incident marked REFERRED pointing at
 * a PDF that was never written.
 */
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import { referralDocumentId, referralStoragePath, type ReferralDocument } from './referralDocument';
import { renderReferralPdf } from './referralPdf';

export interface IssuedReferral {
  storagePath: string;
  downloadUrl: string;
  contentHash: string;
  bytes: Uint8Array;
}

export async function issueReferral(ctx: SessionContext, doc: ReferralDocument): Promise<IssuedReferral> {
  if (doc.status !== 'AUTHORISED') {
    throw new Error('Refusing to issue a draft referral — authorise it first (§6.4).');
  }
  if (!ctx.caps.includes('incidents.escalate')) {
    // firestore.rules and storage.rules both enforce this; failing here
    // too means the operator gets a sentence instead of a 403.
    throw new Error('Issuing a referral requires the incidents.escalate capability (§6.4).');
  }
  if (doc.authorisation!.signatory.uid !== ctx.uid) {
    // The signature block names a person. It has to be the person whose
    // session is making the write, or the document is signed on someone
    // else's behalf without saying so.
    throw new Error('A referral must be authorised by the signed-in user named on it.');
  }

  const { bytes, contentHash } = await renderReferralPdf(doc);
  const storagePath = referralStoragePath(ctx.tenantId, doc.incident.id, contentHash);

  const stored = await dal.fileStore.upload(ctx, storagePath, bytes, 'application/pdf');

  await dal.documents.upsert(ctx, {
    id: referralDocumentId(doc.incident.id),
    tenantId: ctx.tenantId,
    title: `Service delivery referral ${doc.reference}`,
    // A referral names a resident-reported fault, a ward, and the officer
    // who signed it. It is not for general circulation inside the tenant.
    classification: 'CONFIDENTIAL',
    storagePath,
    integrityHashSha256: contentHash,
    watermark: 'FINAL',
    signedBy: doc.authorisation!.signatory.uid,
    signedAt: doc.authorisation!.authorisedAt,
  });

  await dal.incidents.markReferred(ctx, doc.incident.id, storagePath);

  return { storagePath, downloadUrl: stored.downloadUrl, contentHash, bytes };
}
