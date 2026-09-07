import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Incident } from '@/dal/ports/incidents';
import type { SessionContext } from '@/dal/ports/session';
import { buildReferralDocument, referralDocumentId, type ReferralInput } from './referralDocument';
import { issueReferral } from './issueReferral';

const calls: string[] = [];

const upload = vi.fn(async (...args: unknown[]) => {
  calls.push('upload');
  const path = args[1] as string;
  return { path, downloadUrl: `https://storage.example/${path}`, sizeBytes: (args[2] as Uint8Array).byteLength };
});
const upsert = vi.fn(async (..._args: unknown[]) => {
  calls.push('documents.upsert');
  return { id: 'x', updatedAt: '' };
});
const markReferred = vi.fn(async (..._args: unknown[]) => {
  calls.push('markReferred');
});

// The factory is hoisted above these declarations, so it must reach the
// spies lazily rather than capturing them.
vi.mock('@/dal', () => ({
  dal: {
    fileStore: { upload: (...a: unknown[]) => upload(...a) },
    documents: { upsert: (...a: unknown[]) => upsert(...a) },
    incidents: { markReferred: (...a: unknown[]) => markReferred(...a) },
  },
}));

const incident: Incident = {
  id: '8f2c1a9e-4d55-4f6b-9c31-7a0e5b2d8811',
  tenantId: 'tenant-nw405',
  vdCode: '32900123',
  wardCode: 'NW405012',
  category: 'WATER_SANITATION',
  severity: 'HIGH',
  status: 'ESCALATED',
  description: 'Sewage overflow at the corner of Church and Kruis Street.',
  photoPaths: [],
  reportedBy: 'uid-canvasser-7',
  createdAt: '2026-03-04T08:15:00.000Z',
  updatedAt: '2026-03-06T11:02:00.000Z',
  updatedBy: 'uid-ward-lead-2',
  deletedAt: null,
  schemaVersion: 1,
};

const ctx: SessionContext = {
  tenantId: 'tenant-nw405',
  uid: 'uid-municipal-lead-1',
  caps: ['incidents.view', 'incidents.escalate'],
  geoScope: 'MUNICIPALITY',
};

const input: ReferralInput = {
  incident,
  issuingOrganisation: 'Ward 12 Campaign Office',
  recipient: {
    municipalityName: 'JB Marks Local Municipality',
    municipalityCode: 'NW405',
    department: 'Water & Sanitation',
  },
  coveringNote: '',
  preparedByUid: ctx.uid,
  preparedAt: '2026-03-06T12:00:00.000Z',
  authorisation: {
    signatory: { uid: ctx.uid, fullName: 'T. Mokoena', roleLabel: 'Municipal Lead' },
    authorisedAt: '2026-03-06T12:05:00.000Z',
  },
};

const authorised = buildReferralDocument(input);
const draft = buildReferralDocument({ ...input, authorisation: null });

beforeEach(() => {
  calls.length = 0;
  upload.mockClear();
  upsert.mockClear();
  markReferred.mockClear();
});

describe('issueReferral', () => {
  it('writes the PDF before the registry entry, and the status transition last', async () => {
    await issueReferral(ctx, authorised);
    expect(calls).toEqual(['upload', 'documents.upsert', 'markReferred']);
  });

  it('uploads a real PDF at the content-addressed path', async () => {
    const result = await issueReferral(ctx, authorised);
    const [, path, bytes, contentType] = upload.mock.calls[0];
    expect(contentType).toBe('application/pdf');
    expect(path).toBe(`tenants/tenant-nw405/referrals/${incident.id}/referral-${result.contentHash.slice(0, 16)}.pdf`);
    expect(new TextDecoder('latin1').decode(bytes as Uint8Array).startsWith('%PDF-1.7')).toBe(true);
  });

  it('records the same hash in the registry that the PDF carries', async () => {
    const result = await issueReferral(ctx, authorised);
    const registryEntry = upsert.mock.calls[0][1] as Record<string, unknown>;
    expect(registryEntry.integrityHashSha256).toBe(result.contentHash);
    expect(registryEntry.storagePath).toBe(result.storagePath);
    expect(registryEntry.id).toBe(referralDocumentId(incident.id));
    expect(registryEntry.watermark).toBe('FINAL');
    expect(registryEntry.classification).toBe('CONFIDENTIAL');
    expect(registryEntry.signedBy).toBe('uid-municipal-lead-1');
  });

  it('points the incident at the path it actually wrote', async () => {
    const result = await issueReferral(ctx, authorised);
    expect(markReferred.mock.calls[0].slice(1)).toEqual([incident.id, result.storagePath]);
  });

  it('is idempotent by content — a retry lands on the same path and id', async () => {
    const first = await issueReferral(ctx, authorised);
    const second = await issueReferral(ctx, authorised);
    expect(second.storagePath).toBe(first.storagePath);
    expect(second.contentHash).toBe(first.contentHash);
  });

  it('refuses to issue a draft', async () => {
    await expect(issueReferral(ctx, draft)).rejects.toThrow(/Refusing to issue a draft/);
    expect(calls).toEqual([]);
  });

  it('refuses without incidents.escalate, before writing anything', async () => {
    await expect(issueReferral({ ...ctx, caps: ['incidents.view'] }, authorised)).rejects.toThrow(
      /incidents\.escalate/,
    );
    expect(calls).toEqual([]);
  });

  it('refuses to sign one user’s name onto another user’s session', async () => {
    await expect(issueReferral({ ...ctx, uid: 'uid-someone-else' }, authorised)).rejects.toThrow(
      /authorised by the signed-in user/,
    );
    expect(calls).toEqual([]);
  });

  it('leaves the incident ESCALATED if the upload fails', async () => {
    upload.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(issueReferral(ctx, authorised)).rejects.toThrow(/storage unavailable/);
    expect(markReferred).not.toHaveBeenCalled();
  });

  it('leaves the incident ESCALATED if the registry write fails', async () => {
    upsert.mockRejectedValueOnce(new Error('permission-denied'));
    await expect(issueReferral(ctx, authorised)).rejects.toThrow(/permission-denied/);
    expect(markReferred).not.toHaveBeenCalled();
  });
});
