/**
 * Election Campaign OS — guards on the exported party list
 *
 * This document leaves the campaign with a party's name and a list of
 * named people on it. Two ways it could do harm:
 *
 *  1. By reading as a submission. A PDF listing candidates in order, with
 *     statutory citations down the side, is what an official list looks
 *     like. The sentence that says it is not one has to be on the paper.
 *  2. By printing identity numbers. The mask is the whole reason
 *     `maskSaIdNumber` exists, and an export is the easiest place for it
 *     to be quietly bypassed.
 *
 * And one way it could mislead the person signing it: exporting a list
 * whose warnings live only in the browser tab of whoever pressed the
 * button.
 */
import { describe, expect, it } from 'vitest';
import type { Block, PrintDocument } from '@/lib/document/model';
import type { Candidate } from '@/dal/ports/candidates';
import { renderDocumentDocx } from '@/lib/document/docxRenderer';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import { maskSaIdNumber } from '@/lib/saIdNumber';
import { checkPrList, PR_LIST_CITATIONS, PR_LIST_EXPORT_BASIS } from './prList';
import { prListDocument } from './prListDocument';

const META = {
  organisation: 'JB Marks Local Municipality',
  partyName: 'Example Party',
  municipalityName: 'JB Marks Local Municipality (NW405)',
  version: '1.0',
  preparedByName: 'T. Molefe, Party HQ Administrator',
  preparedAt: '2026-09-17T08:00:00.000Z',
};

/** A real, internally consistent SA ID number — check digit included. */
const ID_NUMBERS = ['8001015009087', '9202204720083', '7711205026086', '6505158010084'];

const candidate = (over: Partial<Candidate> & { id: string }): Candidate => ({
  tenantId: 't',
  fullName: 'A. Candidate',
  affiliation: 'PR',
  gender: 'FEMALE',
  idNumberEncrypted: '',
  idNumberMasked: maskSaIdNumber(ID_NUMBERS[0]),
  verificationStatus: 'VERIFIED',
  createdAt: '',
  updatedAt: '',
  updatedBy: 'u',
  deletedAt: null,
  schemaVersion: 1,
  ...over,
});

/** Four candidates, alternating declared gender, ranked 1..4. */
const LIST: Candidate[] = ID_NUMBERS.map((idNumber, i) =>
  candidate({
    id: `c${i + 1}`,
    fullName: `Candidate ${i + 1}`,
    listRank: i + 1,
    gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
    idNumberMasked: maskSaIdNumber(idNumber),
  }),
);

function prose(doc: PrintDocument): string {
  const fromBlock = (block: Block): string => {
    switch (block.kind) {
      case 'steps':
      case 'bullets':
        return block.items.join('\n');
      case 'field':
        return `${block.label} ${block.value}`;
      case 'rule':
      case 'pageBreak':
        return '';
      default:
        return block.text;
    }
  };
  return [doc.title, doc.subtitle ?? '', ...doc.blocks.map(fromBlock)].join('\n');
}

const clean = () => prListDocument(checkPrList({ candidates: LIST, prSeats: 10 }), META);

describe('the exported party list', () => {
  it('says it is not a submission, before anything else on the page', () => {
    const doc = clean();
    expect(doc.blocks[0]).toEqual({ kind: 'callout', text: PR_LIST_EXPORT_BASIS });
    expect(PR_LIST_EXPORT_BASIS).toMatch(/not a submission/i);
    // Scanned with the disclaimer removed, because the disclaimer is the
    // one place the words "filed with the Commission" legitimately appear
    // — preceded by "Nothing here is".
    const body = prose(doc).replace(PR_LIST_EXPORT_BASIS, '');
    expect(body).not.toMatch(/\b(filed|submitted|lodged) with the (IEC|Commission)\b/i);
    expect(body).not.toMatch(/\bcertified\b/i);
  });

  it('never prints an identity number in full', () => {
    const text = prose(clean());
    for (const idNumber of ID_NUMBERS) {
      expect(text).not.toContain(idNumber);
      expect(text).toContain(maskSaIdNumber(idNumber));
    }
    // Nor any bare run of thirteen digits arrived at another way.
    expect(text).not.toMatch(/\b\d{13}\b/);
  });

  it('prints every candidate in list order, with their position', () => {
    const doc = clean();
    const positions = doc.blocks.filter((b): b is Extract<Block, { kind: 'field' }> => b.kind === 'field');
    for (const c of LIST) {
      expect(positions.some((p) => p.value.includes(c.fullName))).toBe(true);
    }
    const ranks = positions.filter((p) => LIST.some((c) => p.value.includes(c.fullName))).map((p) => p.label);
    expect(ranks).toEqual(['1', '2', '3', '4']);
  });

  it('carries outstanding warnings onto the paper', () => {
    // Three consecutive women triggers the Schedule 1 clustering warning,
    // which does not block an export — so it will be exported, so it has
    // to be visible to whoever signs it.
    const clustered = LIST.map((c, i) => ({ ...c, gender: i < 3 ? ('FEMALE' as const) : c.gender }));
    const result = checkPrList({ candidates: clustered, prSeats: 10 });
    expect(result.canExport).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);

    const text = prose(prListDocument(result, META));
    for (const warning of result.warnings) expect(text).toContain(warning.message);
    expect(text).toMatch(/Outstanding warnings/i);
  });

  it('says nothing about warnings when there are none', () => {
    expect(checkPrList({ candidates: LIST, prSeats: 10 }).warnings).toHaveLength(0);
    expect(prose(clean())).not.toMatch(/Outstanding warnings/i);
  });

  it('cites the sections it was checked against, and not section 17', () => {
    const text = prose(clean());
    expect(text).toContain(PR_LIST_CITATIONS.submission);
    expect(text).toContain(PR_LIST_CITATIONS.composition);
    // s17 governs ward nominations. Citing it for a party list is the
    // mis-citation prList.ts was written to keep out.
    expect(text).not.toMatch(/section\s*17/i);
  });

  it('names the party and the person who prepared it', () => {
    const text = prose(clean());
    expect(text).toContain('Example Party');
    expect(text).toContain('T. Molefe, Party HQ Administrator');
    expect(text).toContain('JB Marks Local Municipality (NW405)');
  });

  it('renders to PDF and Word', () => {
    const doc = clean();
    expect(renderDocumentPdf(doc).byteLength).toBeGreaterThan(1000);
    expect(renderDocumentDocx(doc).byteLength).toBeGreaterThan(1000);
  });
});
