/**
 * Election Campaign OS — checking an issued referral
 *
 * The claim under test is one the document makes about itself, in print,
 * on every copy sent to a municipality: that the hash verifies the
 * particulars against the record held here. Until the registry stored the
 * particulars, that claim was unsupportable — so the first test is that
 * the check can be performed at all.
 */
import { describe, expect, it, vi } from 'vitest';
import type { CampaignDocument } from '@/dal/ports/documents';
import type { Incident } from '@/dal/ports/incidents';
import type { SessionContext } from '@/dal/ports/session';
import { sha256Hex } from '@/lib/hash';
import {
  INTEGRITY_HASH_BASIS,
  buildReferralDocument,
  canonicalPayload,
  referralContentHash,
  referralDocumentId,
  type ReferralInput,
} from './referralDocument';
import { CHECK_MESSAGE, printedHashAgrees, verifyIssuedReferral } from './verifyReferral';

let stored: CampaignDocument | null = null;

vi.mock('@/dal', () => ({
  dal: { documents: { getById: async () => stored } },
}));

const ctx: SessionContext = {
  tenantId: 'tenant-nw405',
  uid: 'uid-lead',
  caps: ['incidents.view', 'incidents.escalate'],
  geoScope: 'MUNICIPALITY',
};

const incident: Incident = {
  id: '8f2c1a9e-4d55-4f6b-9c31-7a0e5b2d8811',
  tenantId: 'tenant-nw405',
  vdCode: '32900123',
  wardCode: 'NW405012',
  category: 'WATER_SANITATION',
  severity: 'HIGH',
  status: 'ESCALATED',
  description: 'Sewage overflow at the corner of Church and Kruis Street.',
  photoPaths: ['tenants/tenant-nw405/incidents/8f2c/1.jpg'],
  reportedBy: 'uid-canvasser',
  createdAt: '2026-03-02T08:00:00.000Z',
  updatedAt: '2026-03-04T10:00:00.000Z',
  updatedBy: 'uid-lead',
  deletedAt: null,
  schemaVersion: 1,
};

const input: ReferralInput = {
  incident,
  issuingOrganisation: 'Ward 12 Campaign Office — Tlokwe',
  recipient: {
    municipalityName: 'JB Marks Local Municipality',
    municipalityCode: 'NW405',
    department: 'Water & Sanitation',
  },
  coveringNote: 'Third report from this street in a month.',
  preparedByUid: 'uid-lead',
  preparedAt: '2026-03-04T10:00:00.000Z',
  authorisation: {
    signatory: { uid: 'uid-lead', fullName: 'Thandi Mokoena', roleLabel: 'Municipal Team Lead' },
    authorisedAt: '2026-03-04T10:05:00.000Z',
  },
};

const doc = buildReferralDocument(input);

const registryEntry = async (): Promise<CampaignDocument> => ({
  id: referralDocumentId(incident.id),
  tenantId: ctx.tenantId,
  title: `Service delivery referral ${doc.reference}`,
  classification: 'CONFIDENTIAL',
  storagePath: 'tenants/tenant-nw405/referrals/x.pdf',
  integrityHashSha256: await referralContentHash(doc),
  canonicalPayload: canonicalPayload(doc),
  watermark: 'FINAL',
  signedBy: 'uid-lead',
  signedAt: '2026-03-04T10:05:00.000Z',
  createdAt: '',
  updatedAt: '',
  updatedBy: 'uid-lead',
  deletedAt: null,
  schemaVersion: 1,
});

describe('the printed hash can now actually be checked', () => {
  it('recomputes it from the record and finds it matches', async () => {
    stored = await registryEntry();
    const check = await verifyIssuedReferral(ctx, incident.id);
    expect(check.outcome).toBe('MATCHES');
    expect(check.recomputedHash).toBe(check.recordedHash);
    expect(check.recomputedHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('makes the document’s own claim about itself performable', async () => {
    // The sentence printed on every referral. It was not supportable
    // while the particulars lived only inside the PDF.
    expect(INTEGRITY_HASH_BASIS).toMatch(/match the record held in Election Campaign OS/);
    stored = await registryEntry();
    expect((await verifyIssuedReferral(ctx, incident.id)).outcome).toBe('MATCHES');
  });

  it('notices when the stored particulars have been altered', async () => {
    const entry = await registryEntry();
    stored = { ...entry, canonicalPayload: entry.canonicalPayload!.replace('Sewage', 'Water') };
    const check = await verifyIssuedReferral(ctx, incident.id);
    expect(check.outcome).toBe('DIFFERS');
    expect(check.recomputedHash).not.toBe(check.recordedHash);
    expect(check.message).toMatch(/do not re-issue over it/i);
  });

  it('notices when the hash has been altered instead', async () => {
    const entry = await registryEntry();
    stored = { ...entry, integrityHashSha256: await sha256Hex('something else entirely') };
    expect((await verifyIssuedReferral(ctx, incident.id)).outcome).toBe('DIFFERS');
  });
});

describe('the answers that are not yes or no', () => {
  it('says nothing was issued rather than failing', async () => {
    stored = null;
    const check = await verifyIssuedReferral(ctx, incident.id);
    expect(check.outcome).toBe('NOT_ISSUED');
    expect(check.recordedHash).toBeUndefined();
  });

  it('says a pre-existing referral cannot be checked, and not to re-issue', async () => {
    const entry = await registryEntry();
    stored = { ...entry, canonicalPayload: undefined };
    const check = await verifyIssuedReferral(ctx, incident.id);
    expect(check.outcome).toBe('CANNOT_CHECK');
    // The hash is still reported — it is what a reader compares a printed
    // copy against, even when it cannot be recomputed.
    expect(check.recordedHash).toBe(entry.integrityHashSha256);
    expect(check.message).toMatch(/Re-issuing is not a fix/i);
  });
});

describe('comparing against a hash read off paper', () => {
  it('forgives the spacing a hash is printed with', async () => {
    stored = await registryEntry();
    const check = await verifyIssuedReferral(ctx, incident.id);
    const printed = check.recordedHash!.toUpperCase().replace(/(.{8})/g, '$1 ');
    expect(printedHashAgrees(check, printed)).toBe(true);
  });

  it('rejects a hash that differs by one character', async () => {
    stored = await registryEntry();
    const check = await verifyIssuedReferral(ctx, incident.id);
    const wrong = check.recordedHash!.slice(0, 63) + (check.recordedHash!.endsWith('a') ? 'b' : 'a');
    expect(printedHashAgrees(check, wrong)).toBe(false);
  });

  it('treats an empty input as no answer rather than a match', async () => {
    stored = await registryEntry();
    const check = await verifyIssuedReferral(ctx, incident.id);
    expect(printedHashAgrees(check, '')).toBe(false);
    expect(printedHashAgrees(check, '   ')).toBe(false);
  });
});

/**
 * The limits are the part most likely to be softened by whoever writes
 * the next feature on top of this.
 */
describe('what a passing check does not claim', () => {
  it('says so in the message the operator reads', () => {
    expect(CHECK_MESSAGE.MATCHES).toMatch(/nothing about the photographs/i);
    expect(CHECK_MESSAGE.MATCHES).toMatch(/not a signature/i);
    expect(CHECK_MESSAGE.MATCHES).toMatch(/does not show the referral was delivered/i);
  });

  it('never uses the vocabulary this project has already rejected once', () => {
    const text = Object.values(CHECK_MESSAGE).join(' ');
    expect(text).not.toMatch(/blockchain/i);
    expect(text).not.toMatch(/\bcertified\b/i);
    expect(text).not.toMatch(/\bnotaris|notaris|notarised|notarized\b/i);
    expect(text).not.toMatch(/legally binding/i);
  });
});
