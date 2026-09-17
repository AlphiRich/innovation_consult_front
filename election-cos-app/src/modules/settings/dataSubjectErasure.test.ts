import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DataSubjectType } from '@/dal/ports/dataSubjectRequests';
import {
  blocksFulfilment,
  DONOR_ERASURE_REFUSAL_REASON,
  ERASURE_CAPABILITY_BASIS,
  erasurePosition,
} from './dataSubjectErasure';

const ALL_SUBJECTS: DataSubjectType[] = ['VOTER', 'STAFF', 'CANDIDATE', 'DONOR'];

describe('erasurePosition', () => {
  it('treats donor records as retention-restricted, not merely suppressed', () => {
    const donor = erasurePosition('DONOR');
    expect(donor.disposition).toBe('RESTRICTED_BY_LAW');
    expect(donor.basis).toMatch(/Political Party Funding Act/);
    expect(donor.basis).toMatch(/§14\(1\)/);
  });

  it('is honest that suppression is not destruction for everyone else', () => {
    for (const subject of ALL_SUBJECTS.filter((s) => s !== 'DONOR')) {
      const position = erasurePosition(subject);
      expect(position.disposition).toBe('SUPPRESSION_ONLY');
      expect(position.basis, subject).toMatch(/remains in Firestore/);
    }
  });

  it('cannot record a fulfilled erasure for any subject type today', () => {
    for (const subject of ALL_SUBJECTS) {
      expect(erasurePosition(subject).canRecordFulfilled, subject).toBe(false);
    }
  });
});

describe('blocksFulfilment', () => {
  it('blocks every deletion request', () => {
    for (const subject of ALL_SUBJECTS) {
      expect(blocksFulfilment(subject, 'DELETION'), subject).toBe(true);
    }
  });

  it('leaves access and correction alone — this product can genuinely do both', () => {
    for (const subject of ALL_SUBJECTS) {
      expect(blocksFulfilment(subject, 'ACCESS'), subject).toBe(false);
      expect(blocksFulfilment(subject, 'CORRECTION'), subject).toBe(false);
    }
  });
});

/**
 * The claim this module exists to keep true, asserted against the rules
 * file itself rather than against a memory of it. If someone ever opens a
 * hard delete, these fail and the prose above has to be revisited — which
 * is the point. A capability claim that outlives the code behind it is
 * exactly the defect this project keeps finding in other people's work.
 */
describe('the stated position matches firestore.rules', () => {
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

  it('no tenant collection permits a hard delete', () => {
    const deleteClauses = rules.match(/allow delete[^;]*;/g) ?? [];
    expect(deleteClauses.length).toBeGreaterThan(10);
    for (const clause of deleteClauses) {
      expect(clause, `a delete was opened: ${clause}`).toMatch(/if false/);
    }
  });

  it('still forbids deleting donations and the donor ledger specifically', () => {
    for (const collection of ['donations', 'donorLedger']) {
      const start = rules.indexOf(`match /tenants/{tid}/${collection}/`);
      expect(start, `${collection} block not found`).toBeGreaterThan(-1);
      // A fixed window, not indexOf('}') — the match line itself contains
      // braces ({tid}, {donationId}), so brace-matching cut the block at
      // the first one and the assertion passed on nothing.
      expect(rules.slice(start, start + 400), collection).toMatch(/allow delete: if false/);
    }
  });
});

// Same discipline as ppfaDefaults.test.ts and dataSubjectRequestSla.test.ts:
// the figures and the hedges have to travel together, and a surface must
// not promise something the code cannot do.
describe('claim discipline', () => {
  it('never claims this system erases, destroys or de-identifies anything', () => {
    for (const text of [
      ERASURE_CAPABILITY_BASIS,
      erasurePosition('DONOR').basis,
      erasurePosition('VOTER').basis,
    ]) {
      expect(text).not.toMatch(/\bpermanently deleted\b|\bfully erased\b|\bdestroyed on request\b/i);
    }
    expect(ERASURE_CAPABILITY_BASIS).toMatch(/does not yet destroy or de-identify/i);
    expect(ERASURE_CAPABILITY_BASIS).toMatch(/hard-deletes nothing/i);
  });

  it('keeps every legal position marked as pending attorney review', () => {
    for (const text of [
      ERASURE_CAPABILITY_BASIS,
      erasurePosition('DONOR').basis,
      erasurePosition('VOTER').basis,
    ]) {
      expect(text).toMatch(/pending attorney review/i);
    }
  });

  it('states no response deadline — that belongs to dataSubjectRequestSla.ts', () => {
    for (const text of [ERASURE_CAPABILITY_BASIS, erasurePosition('DONOR').basis]) {
      // Narrow, matching dataSubjectRequestSla.test.ts. "Statutory record"
      // is accurate here and is the rules file's own wording for a
      // donation; what must never appear is a statutory *deadline*.
      expect(text).not.toMatch(/statutory (turnaround|deadline|SLA|response)/i);
      expect(text).not.toMatch(/\d+-day (statutory|SLA)/i);
      expect(text).not.toMatch(/within \d+ (working )?days/i);
    }
  });

  it('gives the donor refusal a legal basis instead of a bare rejection', () => {
    expect(DONOR_ERASURE_REFUSAL_REASON).toMatch(/Political Party Funding Act/);
    expect(DONOR_ERASURE_REFUSAL_REASON).toMatch(/Record not deleted/);
  });

  it('is rendered by the request log rather than retyped there', () => {
    const page = readFileSync(
      resolve(process.cwd(), 'src/modules/settings/DataSubjectRequestsPage.tsx'),
      'utf8',
    );
    expect(page).toContain('ERASURE_CAPABILITY_BASIS');
    expect(page).toContain('blocksFulfilment');
  });
});
