/**
 * Election Campaign OS — guards on the subject access response
 *
 * This document goes to a member of the public who cannot check it. Every
 * other reader of a document this product prints — a ward lead, a
 * municipality, an auditor — can go and look at the underlying records if
 * something reads oddly. The data subject cannot. They have exactly what
 * the page says and no way to test it.
 *
 * So the guards here are not about formatting. They are about the three
 * ways this document could lie to the one reader who would never find out:
 *
 *  1. By looking complete when it is not. The sources that were not
 *     searched must be named on the document itself, every one of them.
 *  2. By reading "nothing found" as "nothing held".
 *  3. By promising erasure. Suppression is not destruction, and this is
 *     the document where a data subject decides what to ask for next.
 *
 * And one thing that must never leave the building: a gate code.
 */
import { describe, expect, it } from 'vitest';
import type { Block, PrintDocument } from '@/lib/document/model';
import type { Voter } from '@/dal/ports/voters';
import type { Household } from '@/dal/ports/households';
import type { DataSubjectRequest } from '@/dal/ports/dataSubjectRequests';
import { renderDocumentDocx } from '@/lib/document/docxRenderer';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import {
  ASSEMBLY_BASIS,
  COMPLETENESS_NOTICE,
  splitRequesterName,
  subjectAccessDocument,
  UNSEARCHED_SOURCES,
} from './subjectAccess';

const META = { organisation: 'Ward 12 Campaign Office', version: '1.0' };

const REQUEST: DataSubjectRequest = {
  id: 'f2c1a9e4-7b31-4d2e-9a55-0c8d1e6b4a20',
  tenantId: 'tenant-1',
  subjectType: 'VOTER',
  requestType: 'ACCESS',
  requesterName: 'Thandi Mokoena',
  requesterContact: '072 555 0101',
  status: 'IN_PROGRESS',
  receivedAt: '2026-08-01T09:00:00.000Z',
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  updatedBy: 'uid-compliance',
};

const VOTER: Voter = {
  id: 'voter-1',
  tenantId: 'tenant-1',
  householdId: 'household-1',
  vdCode: '32900123',
  wardCode: 'NW405012',
  firstName: 'Thandi',
  lastName: 'Mokoena',
  phoneMasked: '072 *** 0101',
  sentiment: 'LEAN_SUPPORT',
  popiaConsentGiven: true,
  popiaConsentAt: '2026-06-14T16:20:00.000Z',
  popiaConsentMethod: 'VERBAL_DOORSTEP',
  createdAt: '2026-06-14T16:20:00.000Z',
  updatedAt: '2026-06-14T16:20:00.000Z',
  updatedBy: 'uid-canvasser',
  deletedAt: null,
  schemaVersion: 1,
};

const HOUSEHOLD: Household = {
  id: 'household-1',
  tenantId: 'tenant-1',
  vdCode: '32900123',
  wardCode: 'NW405012',
  addressLine: '14 Mahikeng Street, Unit 3',
  dwellingType: 'FORMAL',
  contactStatus: 'CONTACTED',
  accessNote: {
    hazards: ['LOCKED_GATE', 'HOSTILE_RECEPTION_REPORTED'],
    note: 'Shouted at the last canvasser; call ahead before approaching.',
    accessCode: '4821#',
    updatedAt: '2026-07-02T15:00:00.000Z',
    updatedBy: 'uid-canvasser',
  },
  createdAt: '2026-06-14T16:00:00.000Z',
  updatedAt: '2026-07-02T15:00:00.000Z',
  updatedBy: 'uid-canvasser',
  deletedAt: null,
  schemaVersion: 1,
};

const FINDINGS = {
  request: REQUEST,
  voters: [VOTER],
  households: [HOUSEHOLD],
  assembledAt: '2026-08-04T10:15:00.000Z',
  assembledByName: 'N. Dlamini, Compliance Officer',
};

/** Every word this document actually puts in front of its reader. */
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

const found = () => subjectAccessDocument(FINDINGS, META);
const empty = () => subjectAccessDocument({ ...FINDINGS, voters: [], households: [] }, META);

describe('subject access response', () => {
  /* ------------------------------------------------------------------ */
  /* 1 — an incomplete answer is visibly incomplete                     */
  /* ------------------------------------------------------------------ */

  it('carries the completeness notice on every response', () => {
    for (const doc of [found(), empty()]) {
      expect(prose(doc)).toContain(COMPLETENESS_NOTICE);
    }
  });

  it('names every source it did not search, with the reason', () => {
    // Not a loop over the same array the document was built from — the
    // point of this guard is that adding an unsearchable collection to
    // UNSEARCHED_SOURCES and forgetting to render it fails here. The
    // labels are also asserted literally below so that deleting an entry
    // outright does not quietly shorten both sides.
    for (const doc of [found(), empty()]) {
      const text = prose(doc);
      for (const source of UNSEARCHED_SOURCES) {
        expect(text).toContain(source.label);
        expect(text).toContain(source.reason);
      }
    }
  });

  it('lists the four collections that cannot be searched by name', () => {
    const labels = UNSEARCHED_SOURCES.map((s) => s.label);
    expect(labels).toEqual([
      'Donation and donor records',
      'Candidate records',
      'Staff and volunteer records',
      'Incidents and casework',
    ]);
  });

  /* ------------------------------------------------------------------ */
  /* 2 — "nothing found" is not "nothing held"                          */
  /* ------------------------------------------------------------------ */

  it('does not let an empty search read as an empty campaign', () => {
    expect(prose(empty())).toContain('That does not mean this campaign holds nothing about you');
  });

  it('reports what was found when something was', () => {
    const text = prose(found());
    expect(text).toContain('Thandi Mokoena');
    expect(text).toContain('072 *** 0101');
    expect(text).toContain('NW405012');
    expect(text).toContain('14 Mahikeng Street, Unit 3');
  });

  /* ------------------------------------------------------------------ */
  /* 3 — a gate code is not disclosed to anybody, including the subject */
  /* ------------------------------------------------------------------ */

  it('never prints an access note or the code on it', () => {
    const text = prose(found());
    expect(text).not.toContain('4821#');
    expect(text).not.toContain('Shouted at the last canvasser');
    // The officer is told the note exists and has to decide about it.
    expect(text).toContain('canvasser access note');
  });

  /* ------------------------------------------------------------------ */
  /* 4 — it promises no erasure it cannot perform                       */
  /* ------------------------------------------------------------------ */

  it('tells the data subject what a deletion request will actually do', () => {
    const text = prose(found());
    expect(text).toContain('suppresses records');
    expect(text).toContain('does not destroy or de-identify them');
    expect(text).not.toMatch(/permanently (purged|deleted|erased)/i);
  });

  /* ------------------------------------------------------------------ */
  /* 5 — it goes out as a draft a person signed off                     */
  /* ------------------------------------------------------------------ */

  it('is a draft pending review, and says who prepared it', () => {
    const doc = found();
    expect(doc.meta.status).toBe('DRAFT_PENDING_REVIEW');
    expect(doc.meta.reference).toBe('DSR-f2c1a9e4');
    expect(prose(doc)).toContain('N. Dlamini, Compliance Officer');
  });

  it('states the basis on which it was assembled', () => {
    expect(ASSEMBLY_BASIS).toContain('draft');
    expect(ASSEMBLY_BASIS).toContain('not searched');
  });

  /* ------------------------------------------------------------------ */
  /* 6 — the name split is a suggestion, not a normalisation            */
  /* ------------------------------------------------------------------ */

  it('splits a name into a starting point a person can correct', () => {
    expect(splitRequesterName('Thandi Mokoena')).toEqual({ firstName: 'Thandi', lastName: 'Mokoena' });
    expect(splitRequesterName('  Sipho   John   Ndlovu ')).toEqual({
      firstName: 'Sipho John',
      lastName: 'Ndlovu',
    });
    // One name, and nothing at all. Neither may throw — a request logged
    // with an odd name still has to open the screen that answers it.
    expect(splitRequesterName('Madiba')).toEqual({ firstName: 'Madiba', lastName: '' });
    expect(splitRequesterName('   ')).toEqual({ firstName: '', lastName: '' });
  });

  /* ------------------------------------------------------------------ */
  /* 7 — both renderers accept it                                       */
  /* ------------------------------------------------------------------ */

  it('renders to PDF and Word', () => {
    for (const doc of [found(), empty()]) {
      expect(renderDocumentPdf(doc).byteLength).toBeGreaterThan(1000);
      expect(renderDocumentDocx(doc).byteLength).toBeGreaterThan(1000);
    }
  });
});
