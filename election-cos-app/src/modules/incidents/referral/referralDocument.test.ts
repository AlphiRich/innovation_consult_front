import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Incident } from '@/dal/ports/incidents';
import {
  buildReferralDocument,
  canonicalPayload,
  CANONICAL_FORMAT_VERSION,
  EVIDENCE_BASIS,
  INTEGRITY_HASH_BASIS,
  referralContentHash,
  referralDocumentId,
  referralReference,
  referralStoragePath,
  STANDING_DISCLAIMER,
  verifyReferralContentHash,
  type ReferralInput,
} from './referralDocument';

const incident: Incident = {
  id: '8f2c1a9e-4d55-4f6b-9c31-7a0e5b2d8811',
  tenantId: 'tenant-nw405',
  vdCode: '32900123',
  wardCode: 'NW405012',
  category: 'WATER_SANITATION',
  severity: 'HIGH',
  status: 'ESCALATED',
  description: 'Sewage overflow at the corner of Church and Kruis Street.',
  photoPaths: [
    'tenants/tenant-nw405/incidents/8f2c1a9e/photo-0002.jpg',
    'tenants/tenant-nw405/incidents/8f2c1a9e/photo-0001.jpg',
  ],
  reportedBy: 'uid-canvasser-7',
  createdAt: '2026-03-04T08:15:00.000Z',
  updatedAt: '2026-03-06T11:02:00.000Z',
  updatedBy: 'uid-ward-lead-2',
  deletedAt: null,
  schemaVersion: 1,
};

const input: ReferralInput = {
  incident,
  issuingOrganisation: 'Ward 12 Campaign Office',
  recipient: {
    municipalityName: 'JB Marks Local Municipality',
    municipalityCode: 'NW405',
    department: 'Water & Sanitation',
  },
  coveringNote: 'Residents report the overflow has run for six days.',
  preparedByUid: 'uid-municipal-lead-1',
  preparedAt: '2026-03-06T12:00:00.000Z',
  authorisation: null,
};

const authorised: ReferralInput = {
  ...input,
  authorisation: {
    signatory: { uid: 'uid-municipal-lead-1', fullName: 'T. Mokoena', roleLabel: 'Municipal Lead' },
    authorisedAt: '2026-03-06T12:05:00.000Z',
  },
};

describe('buildReferralDocument', () => {
  it('is a DRAFT until it is authorised, and AUTHORISED after (§6.4)', () => {
    expect(buildReferralDocument(input).status).toBe('DRAFT');
    expect(buildReferralDocument(authorised).status).toBe('AUTHORISED');
  });

  it('refuses to build for an incident that has not been escalated', () => {
    for (const status of ['LOGGED', 'TRIAGED'] as const) {
      expect(() => buildReferralDocument({ ...input, incident: { ...incident, status } })).toThrow(
        /only be prepared for an escalated incident/,
      );
    }
  });

  it('refuses to build without an issuing organisation — it invents no party name', () => {
    expect(() => buildReferralDocument({ ...input, issuingOrganisation: '   ' })).toThrow(
      /issuing campaign’s name/,
    );
  });

  it('refuses to build without a named recipient department', () => {
    expect(() => buildReferralDocument({ ...input, recipient: { ...input.recipient, department: '' } })).toThrow(
      /recipient department/,
    );
  });

  it('refuses an authorisation with no signatory name — no hardcoded fallback exists', () => {
    expect(() =>
      buildReferralDocument({
        ...authorised,
        authorisation: { ...authorised.authorisation!, signatory: { uid: 'u1', fullName: '', roleLabel: 'Lead' } },
      }),
    ).toThrow(/authorising officer’s name/);
  });

  it('carries the signatory through from the authorising session, not a constant', () => {
    const a = buildReferralDocument(authorised).authorisation!.signatory;
    const b = buildReferralDocument({
      ...authorised,
      authorisation: {
        ...authorised.authorisation!,
        signatory: { uid: 'uid-other', fullName: 'N. Dlamini', roleLabel: 'HQ Admin' },
      },
    }).authorisation!.signatory;
    expect(a.fullName).toBe('T. Mokoena');
    expect(b.fullName).toBe('N. Dlamini');
  });

  it('orders evidence paths so the same photo set always hashes the same', () => {
    const forward = buildReferralDocument(input).evidencePaths;
    const reversed = buildReferralDocument({
      ...input,
      incident: { ...incident, photoPaths: [...incident.photoPaths].reverse() },
    }).evidencePaths;
    expect(forward).toEqual(reversed);
  });
});

describe('referralReference', () => {
  it('is a quotable tracking reference built from municipality, year and id prefix', () => {
    expect(referralReference(incident, 'NW405')).toBe('NW405/2026/8f2c1a9e');
  });

  it('is never presented as a hash — the module labels it "Reference"', () => {
    // The ecos-v2 fork printed exactly this construction under the label
    // "HASH:" (docs/ecos-v2-fork-review.md §4i). It is fine as a reference
    // number and unacceptable as an integrity claim, so the source must
    // not associate the two.
    const source = readFileSync(resolve(process.cwd(), 'src/modules/incidents/referral/referralDocument.ts'), 'utf8');
    const referenceFn = source.slice(source.indexOf('export function referralReference'));
    expect(referenceFn.slice(0, referenceFn.indexOf('\n}'))).not.toMatch(/hash/i);
  });
});

describe('canonicalPayload', () => {
  it('is deterministic for the same document', () => {
    expect(canonicalPayload(buildReferralDocument(input))).toBe(canonicalPayload(buildReferralDocument(input)));
  });

  it('is versioned, so a format change cannot silently invalidate old hashes', () => {
    expect(canonicalPayload(buildReferralDocument(input)).startsWith(`${CANONICAL_FORMAT_VERSION}\n`)).toBe(true);
  });

  it('escapes newlines in free text so a description cannot forge a field', () => {
    const injected = buildReferralDocument({
      ...input,
      incident: { ...incident, description: 'Harmless line\nauthorised.name=Someone Else' },
    });
    const payload = canonicalPayload(injected);
    expect(payload).toContain('incident.description=Harmless line\\nauthorised.name=Someone Else');
    expect(payload.split('\n').filter((l) => l.startsWith('authorised.name='))).toEqual(['authorised.name=']);
  });

  it('covers every field a reader sees', () => {
    const payload = canonicalPayload(buildReferralDocument(authorised));
    for (const value of [
      'Ward 12 Campaign Office',
      'JB Marks Local Municipality',
      'Water & Sanitation',
      'Sewage overflow at the corner of Church and Kruis Street.',
      'Residents report the overflow has run for six days.',
      'T. Mokoena',
      'Municipal Lead',
      'photo-0001.jpg',
      'photo-0002.jpg',
    ]) {
      expect(payload, `payload omitted "${value}"`).toContain(value);
    }
  });
});

describe('referralContentHash — a real SHA-256, not an id prefix', () => {
  it('is 64 lowercase hex characters', async () => {
    expect(await referralContentHash(buildReferralDocument(input))).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches the known SHA-256 of the payload it claims to hash', async () => {
    // Independent check against Web Crypto over the same string, so the
    // hash cannot drift into hashing something other than what the
    // document says it hashes.
    const doc = buildReferralDocument(authorised);
    const expected = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalPayload(doc)))),
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(await referralContentHash(doc)).toBe(expected);
  });

  it('bears no relationship to the incident id — the fork\'s "hash" was id.slice(0, 8)', async () => {
    const hash = await referralContentHash(buildReferralDocument(input));
    expect(hash).not.toContain(incident.id.slice(0, 8));
    expect(hash.startsWith(incident.id.slice(0, 8))).toBe(false);
  });

  it('changes when any field changes', async () => {
    const base = await referralContentHash(buildReferralDocument(input));
    const variants = await Promise.all([
      referralContentHash(buildReferralDocument({ ...input, coveringNote: 'Different note.' })),
      referralContentHash(buildReferralDocument({ ...input, issuingOrganisation: 'Ward 13 Campaign Office' })),
      referralContentHash(
        buildReferralDocument({ ...input, recipient: { ...input.recipient, department: 'Electricity' } }),
      ),
      referralContentHash(buildReferralDocument({ ...input, incident: { ...incident, severity: 'CRITICAL' } })),
      referralContentHash(buildReferralDocument(authorised)),
    ]);
    for (const variant of variants) expect(variant).not.toBe(base);
    expect(new Set(variants).size).toBe(variants.length);
  });

  it('verifies against itself and rejects a tampered document', async () => {
    const doc = buildReferralDocument(authorised);
    const hash = await referralContentHash(doc);
    expect(await verifyReferralContentHash(doc, hash)).toBe(true);
    expect(await verifyReferralContentHash(doc, hash.toUpperCase())).toBe(true);
    const tampered = { ...doc, coveringNote: 'Something else entirely.' };
    expect(await verifyReferralContentHash(tampered, hash)).toBe(false);
  });
});

describe('storage and registry addressing', () => {
  it('is content-addressed, so re-issuing the same referral cannot fork', () => {
    const path = referralStoragePath('tenant-nw405', incident.id, 'a'.repeat(64));
    expect(path).toBe(`tenants/tenant-nw405/referrals/${incident.id}/referral-${'a'.repeat(16)}.pdf`);
    expect(referralStoragePath('tenant-nw405', incident.id, 'a'.repeat(64))).toBe(path);
  });

  it('uses the referral- id prefix the security rules key off', () => {
    expect(referralDocumentId(incident.id)).toBe(`referral-${incident.id}`);
    for (const rules of ['firestore.rules', 'storage.rules']) {
      expect(readFileSync(resolve(process.cwd(), rules), 'utf8'), `${rules} lost the referral allowance`).toContain(
        'referral',
      );
    }
  });
});

// The claims discipline that governs the PPFA thresholds and the POPIA
// response target (see ppfaDefaults.test.ts and dataSubjectRequestSla.test.ts)
// applies here too, and matters more: this document leaves the building.
describe('claim discipline', () => {
  // Scan the *code*, not the commentary. This module's header deliberately
  // quotes the fork's failures ("Republic of South Africa", the hardcoded
  // signatory, the "SHA-256 Verified" badge) so a future reader knows what
  // not to reintroduce — a naive source scan would match its own warning
  // label and the guard would be measuring the wrong thing.
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

  const source = stripComments(
    readFileSync(resolve(process.cwd(), 'src/modules/incidents/referral/referralDocument.ts'), 'utf8'),
  );

  it('states plainly that the document is not a municipal or government instrument', () => {
    expect(STANDING_DISCLAIMER).toMatch(/not a municipal or government document/i);
    expect(STANDING_DISCLAIMER).toMatch(/no municipal or state authority/i);
  });

  it('claims no statutory force for the referral', () => {
    expect(STANDING_DISCLAIMER).toMatch(/not a notice, demand or application made under any statute/i);
    for (const text of [STANDING_DISCLAIMER, EVIDENCE_BASIS, INTEGRITY_HASH_BASIS]) {
      expect(text).not.toMatch(/\bstatutory\b/i);
      expect(text).not.toMatch(/\bmust respond\b|\brequired to respond\b|\bwithin \d+ (working )?days\b/i);
    }
  });

  it('never asserts the photographs are verified', () => {
    expect(EVIDENCE_BASIS).toMatch(/not hashed/i);
    expect(EVIDENCE_BASIS).toMatch(/no attestation/i);
    expect(source).not.toMatch(/SHA-256 Verified/i);
    expect(source).not.toMatch(/blockchain/i);
  });

  it('says what the printed hash covers and what it does not', () => {
    expect(INTEGRITY_HASH_BASIS).toContain(CANONICAL_FORMAT_VERSION);
    expect(INTEGRITY_HASH_BASIS).toMatch(/does not cover the photographs/i);
    expect(INTEGRITY_HASH_BASIS).toMatch(/not a signature/i);
  });

  it('contains no state or municipal letterhead vocabulary', () => {
    // The specific strings the fork's letterhead used, plus the seal.
    for (const forbidden of [/Republic of South Africa/i, /\bOFFICIAL\b/, /\bseal\b/i, /coat of arms/i]) {
      expect(source, `referralDocument.ts matched ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it('hardcodes no person, and no municipality as issuer', () => {
    expect(source).not.toMatch(/James Khumalo/i);
    // The issuer is an input with no default; the only municipality
    // reference in the model is the recipient.
    expect(source).not.toMatch(/issuingOrganisation\s*[:=]\s*['"`]/);
  });
});
