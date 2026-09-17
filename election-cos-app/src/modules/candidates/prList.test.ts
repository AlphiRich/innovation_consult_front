import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Candidate, CandidateGender } from '@/dal/ports/candidates';
import {
  checkPrList,
  DEFAULT_LIST_LENGTH_MULTIPLIER,
  GENDER_BASIS,
  LIST_LENGTH_BASIS,
  PR_LIST_CITATIONS,
  PR_LIST_EXPORT_BASIS,
} from './prList';

let seq = 0;
const candidate = (over: Partial<Candidate> = {}): Candidate => {
  seq += 1;
  return {
    id: `cand-${seq}`,
    tenantId: 'tenant-nw405',
    fullName: `Candidate ${seq}`,
    affiliation: 'PR',
    listRank: seq,
    idNumberMasked: `7711${seq.toString().padStart(2, '0')} •••• 081`,
    idNumberEncrypted: 'enc',
    verificationStatus: 'VERIFIED',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    updatedBy: 'uid-1',
    deletedAt: null,
    schemaVersion: 1,
    ...over,
  };
};

const listOf = (n: number, genders?: CandidateGender[]) =>
  Array.from({ length: n }, (_, i) => candidate({ listRank: i + 1, gender: genders?.[i] }));

const codes = (r: ReturnType<typeof checkPrList>) => r.issues.map((i) => i.code).sort();

describe('list length', () => {
  it('caps at the multiplier times the PR seats', () => {
    expect(checkPrList({ candidates: listOf(16), prSeats: 8 }).maxListLength).toBe(16);
    expect(checkPrList({ candidates: listOf(4), prSeats: 8, listLengthMultiplier: 3 }).maxListLength).toBe(24);
  });

  it('blocks an over-long list rather than truncating it', () => {
    const result = checkPrList({ candidates: listOf(17), prSeats: 8 });
    expect(result.blocking.map((i) => i.code)).toContain('LIST_TOO_LONG');
    expect(result.canExport).toBe(false);
    // Silently dropping a name the party meant to include is the worse
    // failure, so the full list must still come back.
    expect(result.ordered).toHaveLength(17);
  });

  it('allows a list exactly at the cap', () => {
    expect(checkPrList({ candidates: listOf(16), prSeats: 8 }).canExport).toBe(true);
  });

  it('does not invent a cap when PR seats are unknown', () => {
    const result = checkPrList({ candidates: listOf(50), prSeats: 0 });
    expect(result.issues.map((i) => i.code)).not.toContain('LIST_TOO_LONG');
  });
});

describe('list positions', () => {
  it('blocks a candidate with no list position', () => {
    const result = checkPrList({ candidates: [candidate(), candidate({ listRank: undefined })], prSeats: 8 });
    expect(result.blocking.map((i) => i.code)).toContain('RANK_MISSING');
  });

  it('blocks a duplicated position', () => {
    const result = checkPrList({
      candidates: [candidate({ listRank: 1 }), candidate({ listRank: 1 })],
      prSeats: 8,
    });
    const dup = result.blocking.find((i) => i.code === 'RANK_DUPLICATED');
    expect(dup).toBeDefined();
    expect(dup!.candidateIds).toHaveLength(2);
  });

  it('warns, but does not block, on a gap left by a removal', () => {
    const result = checkPrList({
      candidates: [candidate({ listRank: 1 }), candidate({ listRank: 3 })],
      prSeats: 8,
    });
    expect(result.warnings.map((i) => i.code)).toContain('RANK_NOT_CONTIGUOUS');
    expect(result.canExport).toBe(true);
  });

  it('orders the list by position, not by insertion', () => {
    const result = checkPrList({
      candidates: [candidate({ listRank: 3 }), candidate({ listRank: 1 }), candidate({ listRank: 2 })],
      prSeats: 8,
    });
    expect(result.ordered.map((c) => c.listRank)).toEqual([1, 2, 3]);
  });
});

describe('the same person twice', () => {
  it('blocks a candidate appearing twice on one list', () => {
    const masked = '771120 •••• 081';
    const result = checkPrList({
      candidates: [candidate({ idNumberMasked: masked }), candidate({ idNumberMasked: masked })],
      prSeats: 8,
    });
    expect(result.blocking.map((i) => i.code)).toContain('CANDIDATE_DUPLICATED');
  });

  it('does not treat two blank identifiers as the same person', () => {
    const result = checkPrList({
      candidates: [candidate({ idNumberMasked: '' }), candidate({ idNumberMasked: '' })],
      prSeats: 8,
    });
    expect(result.issues.map((i) => i.code)).not.toContain('CANDIDATE_DUPLICATED');
  });
});

describe('verification', () => {
  it('blocks on a rejected candidate', () => {
    const result = checkPrList({ candidates: [candidate({ verificationStatus: 'REJECTED' })], prSeats: 8 });
    expect(result.blocking.map((i) => i.code)).toContain('NOT_VERIFIED');
  });

  it('only warns on a pending one', () => {
    const result = checkPrList({ candidates: [candidate({ verificationStatus: 'PENDING' })], prSeats: 8 });
    expect(result.warnings.map((i) => i.code)).toContain('NOT_VERIFIED');
    expect(result.canExport).toBe(true);
  });
});

/**
 * The heart of it. Schedule 1 asks a party to "seek to ensure" half its
 * candidates are women and that the sexes are "evenly distributed" — an
 * aspiration, not a gate. Over-enforcing past what the statute requires
 * is the same mistake as manufacturing a PPFA certification: it invents
 * an obligation and then blocks a lawful act on it.
 */
describe('gender distribution never blocks', () => {
  const allMale = listOf(6, Array(6).fill('MALE'));

  it('warns on a shortfall and still permits export', () => {
    const result = checkPrList({ candidates: allMale, prSeats: 8 });
    expect(result.warnings.map((i) => i.code)).toContain('GENDER_SHORTFALL');
    expect(result.canExport).toBe(true);
    expect(result.blocking).toEqual([]);
  });

  it('warns when one sex is clustered rather than distributed', () => {
    // Three women at the bottom is exactly what "not evenly distributed"
    // looks like in practice.
    const clustered = listOf(6, ['MALE', 'MALE', 'MALE', 'FEMALE', 'FEMALE', 'FEMALE']);
    const result = checkPrList({ candidates: clustered, prSeats: 8 });
    expect(result.warnings.map((i) => i.code)).toContain('GENDER_CLUSTERED');
    expect(result.canExport).toBe(true);
  });

  it('is quiet about distribution on a properly alternated list', () => {
    const zebra = listOf(6, ['FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE']);
    const result = checkPrList({ candidates: zebra, prSeats: 8 });
    expect(codes(result)).not.toContain('GENDER_CLUSTERED');
    expect(codes(result)).not.toContain('GENDER_SHORTFALL');
  });

  it('says it cannot assess rather than inferring gender from a name', () => {
    const result = checkPrList({ candidates: listOf(4), prSeats: 8 });
    expect(result.warnings.map((i) => i.code)).toContain('GENDER_UNDECLARED');
    expect(result.declaredCount).toBe(0);
    expect(result.canExport).toBe(true);
  });

  it('treats UNDISCLOSED as an answer, not as a woman or a man', () => {
    const result = checkPrList({
      candidates: listOf(2, ['UNDISCLOSED', 'UNDISCLOSED']),
      prSeats: 8,
    });
    expect(result.declaredCount).toBe(0);
    expect(result.womenCount).toBe(0);
  });

  it('never raises a gender issue at BLOCKING severity, whatever the list', () => {
    for (const genders of [
      Array(8).fill('MALE') as CandidateGender[],
      Array(8).fill('FEMALE') as CandidateGender[],
      Array(8).fill('UNDISCLOSED') as CandidateGender[],
    ]) {
      const result = checkPrList({ candidates: listOf(8, genders), prSeats: 8 });
      const genderIssues = result.issues.filter((i) => i.code.startsWith('GENDER_'));
      expect(genderIssues.every((i) => i.severity === 'WARNING')).toBe(true);
    }
  });
});

describe('scope', () => {
  it('ignores ward candidates and suppressed records', () => {
    const result = checkPrList({
      candidates: [
        candidate({ affiliation: 'WARD', listRank: undefined }),
        candidate({ deletedAt: '2026-03-02T00:00:00.000Z' }),
        candidate({ listRank: 1 }),
      ],
      prSeats: 8,
    });
    expect(result.ordered).toHaveLength(1);
    expect(result.canExport).toBe(true);
  });

  it('cannot export an empty list', () => {
    expect(checkPrList({ candidates: [], prSeats: 8 }).canExport).toBe(false);
  });
});

describe('claim discipline', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/modules/candidates/prList.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, '');

  it('cites section 14 and 15, and never section 17', () => {
    expect(PR_LIST_CITATIONS.submission).toMatch(/Section 14,.*Municipal Electoral Act 27 of 2000/);
    expect(PR_LIST_CITATIONS.certification).toMatch(/Section 15,/);
    expect(PR_LIST_CITATIONS.composition).toMatch(/Schedule 1,.*Municipal Structures Act 117 of 1998/);
    // Section 17 governs ward candidate nominations. Another build cited
    // it as the basis for PR party lists; this one must not.
    for (const citation of Object.values(PR_LIST_CITATIONS)) {
      expect(citation, citation).not.toMatch(/Section 17\b/i);
    }
    expect(source).not.toMatch(/Sec(tion)?\.?\s*17\b/i);
  });

  it('never describes the export as filing anything with the Commission', () => {
    expect(PR_LIST_EXPORT_BASIS).toMatch(/not a submission/i);
    expect(PR_LIST_EXPORT_BASIS).toMatch(/Nothing here is filed/i);
    expect(source).not.toMatch(/submit to the (IEC|Commission)|automated filing|files with the/i);
  });

  it('flags the unverified list-length multiplier instead of asserting it', () => {
    expect(DEFAULT_LIST_LENGTH_MULTIPLIER).toBe(2);
    expect(LIST_LENGTH_BASIS).toMatch(/not been confirmed against a primary source/i);
    expect(LIST_LENGTH_BASIS).toMatch(/configurable/i);
    expect(LIST_LENGTH_BASIS).toMatch(/pending attorney review/i);
  });

  it('states the gender rule as an aspiration, not a threshold', () => {
    expect(GENDER_BASIS).toMatch(/seek to ensure/i);
    expect(GENDER_BASIS).toMatch(/evenly distributed/i);
    expect(GENDER_BASIS).toMatch(/never blocks/i);
    expect(GENDER_BASIS).not.toMatch(/\brequires 50\b|\bmust be 50\b|\bmandatory\b/i);
  });
});
