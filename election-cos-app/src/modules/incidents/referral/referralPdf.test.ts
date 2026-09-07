import { describe, expect, it } from 'vitest';
import type { Incident } from '@/dal/ports/incidents';
import { buildReferralDocument, type ReferralInput } from './referralDocument';
import { buildReferralPdfBytes, referralFileName, renderReferralPdf } from './referralPdf';

const decoder = new TextDecoder('latin1');
const asText = (bytes: Uint8Array) => decoder.decode(bytes);

/**
 * The prose a reader actually sees, reassembled from the content streams.
 * Needed because wrapping splits a sentence across several `Tj` operators,
 * so a raw byte search would miss a phrase that is plainly on the page.
 */
const printedText = (bytes: Uint8Array) =>
  [...asText(bytes).matchAll(/\(((?:\\.|[^\\()])*)\) Tj/g)]
    .map((m) => m[1].replace(/\\([()\\])/g, '$1'))
    .join(' ');

const incident: Incident = {
  id: '8f2c1a9e-4d55-4f6b-9c31-7a0e5b2d8811',
  tenantId: 'tenant-nw405',
  vdCode: '32900123',
  wardCode: 'NW405012',
  category: 'WATER_SANITATION',
  severity: 'HIGH',
  status: 'ESCALATED',
  description: 'Sewage overflow at the corner of Church and Kruis Street, running for six days.',
  photoPaths: ['tenants/tenant-nw405/incidents/8f2c1a9e/photo-0001.jpg'],
  reportedBy: 'uid-canvasser-7',
  createdAt: '2026-03-04T08:15:00.000Z',
  updatedAt: '2026-03-06T11:02:00.000Z',
  updatedBy: 'uid-ward-lead-2',
  deletedAt: null,
  schemaVersion: 1,
};

const draftInput: ReferralInput = {
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

const authorisedInput: ReferralInput = {
  ...draftInput,
  authorisation: {
    signatory: { uid: 'uid-municipal-lead-1', fullName: 'T. Mokoena', roleLabel: 'Municipal Lead' },
    authorisedAt: '2026-03-06T12:05:00.000Z',
  },
};

const draft = buildReferralDocument(draftInput);
const authorised = buildReferralDocument(authorisedInput);
const HASH = 'a'.repeat(64);

describe('buildReferralPdfBytes', () => {
  it('produces a parseable PDF', () => {
    const text = asText(buildReferralPdfBytes(authorised, HASH));
    expect(text.startsWith('%PDF-1.7\n')).toBe(true);
    expect(text.endsWith('%%EOF\n')).toBe(true);
    expect(text).toContain('/Type /Catalog');
  });

  it('refuses to print anything that is not a real SHA-256 digest in the hash field', () => {
    // The specific defect this guards: the fork printed
    // `#NW405-${incident.id.slice(0, 8)}` under a hash label.
    for (const notAHash of ['NW405-8f2c1a9e', incident.id.slice(0, 8), '', 'A'.repeat(64), 'abc']) {
      expect(() => buildReferralPdfBytes(authorised, notAHash)).toThrow(/not a SHA-256 hex digest/);
    }
  });

  it('watermarks a draft and does not watermark an authorised referral', () => {
    expect(asText(buildReferralPdfBytes(draft, HASH))).toContain('(DRAFT) Tj');
    expect(asText(buildReferralPdfBytes(authorised, HASH))).not.toContain('(DRAFT) Tj');
  });

  it('says on a draft that it must not be sent', () => {
    expect(printedText(buildReferralPdfBytes(draft, HASH))).toContain('must not be sent to the municipality');
  });

  it('names the issuing campaign before the municipality', () => {
    const text = asText(buildReferralPdfBytes(authorised, HASH));
    expect(text.indexOf('Ward 12 Campaign Office')).toBeLessThan(text.indexOf('JB Marks Local Municipality'));
  });

  it('carries the standing disclaimer into the printed bytes', () => {
    const text = printedText(buildReferralPdfBytes(authorised, HASH));
    expect(text).toContain('not a municipal or government document');
    expect(text).toContain('no municipal or state authority');
    expect(text).toContain('not a notice, demand or application made under any statute');
  });

  it('prints no state letterhead and no seal', () => {
    const text = printedText(buildReferralPdfBytes(authorised, HASH));
    for (const forbidden of ['Republic of South Africa', 'OFFICIAL', 'Provincial Government', 'Province']) {
      expect(text, `printed "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('prints the signatory from the document, never a fixed name', () => {
    const text = asText(buildReferralPdfBytes(authorised, HASH));
    expect(text).toContain('T. Mokoena');
    expect(text).toContain('Municipal Lead');
    expect(text).not.toContain('James Khumalo');

    const other = buildReferralDocument({
      ...authorisedInput,
      authorisation: {
        signatory: { uid: 'uid-9', fullName: 'N. Dlamini', roleLabel: 'HQ Admin' },
        authorisedAt: '2026-03-06T12:05:00.000Z',
      },
    });
    expect(asText(buildReferralPdfBytes(other, HASH))).toContain('N. Dlamini');
  });

  it('leaves the evidence paths unverified and says so', () => {
    const text = printedText(buildReferralPdfBytes(authorised, HASH));
    expect(text).toContain('photo-0001.jpg');
    expect(text).toContain('the images themselves are not hashed');
    expect(text).toContain('makes no attestation about them');
    expect(text).not.toMatch(/verified/i);
  });

  it('embeds no images — photographs stay in Storage (§6.4)', () => {
    const text = asText(buildReferralPdfBytes(authorised, HASH));
    expect(text).not.toContain('/XObject');
    expect(text).not.toContain('/Image');
    expect(text).not.toContain('base64');
  });

  it('is byte-for-byte deterministic', () => {
    expect(Array.from(buildReferralPdfBytes(authorised, HASH))).toEqual(
      Array.from(buildReferralPdfBytes(authorised, HASH)),
    );
  });

  it('paginates long content and numbers every page', () => {
    const long = buildReferralDocument({
      ...authorisedInput,
      incident: { ...incident, description: 'Sustained water outage across the district. '.repeat(120) },
    });
    const text = asText(buildReferralPdfBytes(long, HASH));
    const pageCount = Number(/\/Count (\d+)/.exec(text)![1]);
    expect(pageCount).toBeGreaterThan(1);
    expect(text).toContain(`(Page 1 of ${pageCount}) Tj`);
    expect(text).toContain(`(Page ${pageCount} of ${pageCount}) Tj`);
  });

  it('repeats the draft watermark on every page', () => {
    const long = buildReferralDocument({
      ...draftInput,
      incident: { ...incident, description: 'Sustained water outage across the district. '.repeat(120) },
    });
    const text = asText(buildReferralPdfBytes(long, HASH));
    const pageCount = Number(/\/Count (\d+)/.exec(text)![1]);
    expect([...text.matchAll(/\(DRAFT\) Tj/g)].length).toBe(pageCount);
  });

  it('keeps the reference and the hash visually distinct — they are different things', () => {
    const text = asText(buildReferralPdfBytes(authorised, HASH));
    expect(text).toContain('(Reference) Tj');
    expect(text).toContain('(NW405/2026/8f2c1a9e) Tj');
    expect(text).toContain('(DOCUMENT INTEGRITY HASH \\(SHA-256\\)) Tj');
    expect(text).toContain(`(${HASH}) Tj`);
  });
});

describe('renderReferralPdf', () => {
  it('prints the same hash it returns', async () => {
    const { bytes, contentHash } = await renderReferralPdf(authorised);
    expect(contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(asText(bytes)).toContain(`(${contentHash}) Tj`);
  });

  it('gives a draft and an authorised referral different hashes', async () => {
    const a = await renderReferralPdf(draft);
    const b = await renderReferralPdf(authorised);
    expect(a.contentHash).not.toBe(b.contentHash);
  });
});

describe('referralFileName', () => {
  it('marks a draft file as a draft', () => {
    expect(referralFileName(draft)).toBe('referral-NW405-2026-8f2c1a9e-DRAFT.pdf');
    expect(referralFileName(authorised)).toBe('referral-NW405-2026-8f2c1a9e.pdf');
  });
});
