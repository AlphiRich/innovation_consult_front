import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  consentDeclarationProblem,
  importKey,
  parseCsv,
  planImport,
  toImportRows,
  type ConsentDeclaration,
  type ImportRow,
} from './bulkImport';

const CONSENT: ConsentDeclaration = {
  method: 'WRITTEN',
  declaredAt: '2026-03-02T00:00:00.000Z',
  reference: 'Membership forms 001-112, Ikageng drive, 2 March 2026',
};

let n = 0;
const ids = () => `voter-${(n += 1)}`;

const base = {
  vdCode: '86821094',
  wardCode: 'NW405012',
  householdId: 'hh-import',
  makeId: ids,
};

const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  firstName: 'Lerato',
  lastName: 'Molefe',
  phone: '0821234567',
  lineNumber: 2,
  ...over,
});

const plan = (rows: ImportRow[], consent: ConsentDeclaration | null = CONSENT, existingKeys?: Set<string>) =>
  planImport({ ...base, rows, consent, existingKeys });

/**
 * The gate this module exists to defend. `firestore.rules` refuses a
 * voter without `popiaConsentGiven == true`; bulk import is the one place
 * that gate could be satisfied by simply asserting it.
 */
describe('consent is a precondition, not a checkbox', () => {
  it('imports nothing at all without a consent declaration', () => {
    const result = plan([row(), row({ lineNumber: 3, firstName: 'Thabo' })], null);
    expect(result.ready).toEqual([]);
    expect(result.fileErrors).toHaveLength(1);
    expect(result.fileErrors[0]).toMatch(/asserting consent nobody can produce/i);
  });

  it('refuses a reference that identifies nothing', () => {
    for (const reference of ['', 'yes', 'ok', '   ', 'consent']) {
      const result = plan([row()], { ...CONSENT, reference });
      expect(result.ready, reference).toEqual([]);
      expect(result.fileErrors[0]).toMatch(/where the consent actually lives/i);
    }
  });

  it('refuses a consent date that is not a date', () => {
    const result = plan([row()], { ...CONSENT, declaredAt: 'last Tuesday' });
    expect(result.ready).toEqual([]);
    expect(result.fileErrors[0]).toMatch(/not a date/i);
  });

  it('offers no row-level detail when the file itself is the problem', () => {
    // The operator's next action is to fix the declaration, not to go
    // hunting through rows.
    const result = plan([row(), row({ lineNumber: 3 })], null);
    expect(result.rejected).toEqual([]);
    expect(result.totalRows).toBe(2);
  });

  it('cannot express a doorstep method for a batch at the type level', () => {
    // Nobody verbally consented four hundred people in a batch. A file
    // claiming it is mislabelled or untrue, and BulkConsentMethod
    // excludes VERBAL_DOORSTEP so the case cannot even be constructed.
    const source = readFileSync(resolve(process.cwd(), 'src/modules/voters/bulkImport.ts'), 'utf8');
    expect(source).toMatch(/Extract<Voter\['popiaConsentMethod'\], 'WRITTEN' \| 'DIGITAL'>/);
  });

  it('says what is wrong before a file is even chosen', () => {
    // Exported so the UI can refuse the declaration up front rather than
    // letting an operator pick a file and then rejecting all of it.
    expect(consentDeclarationProblem(CONSENT)).toBeNull();
    expect(consentDeclarationProblem(null)).toMatch(/how these people consented, when, and where/i);
    expect(consentDeclarationProblem({ ...CONSENT, reference: 'yes' })).toMatch(/identify where the consent/i);
    expect(consentDeclarationProblem({ ...CONSENT, declaredAt: 'nope' })).toMatch(/not a date/i);
  });

  it('never produces a row without consent recorded', () => {
    const result = plan([row(), row({ lineNumber: 3, firstName: 'Thabo', phone: '0839876543' })]);
    expect(result.ready).toHaveLength(2);
    for (const draft of result.ready) {
      expect(draft.popiaConsentGiven).toBe(true);
      expect(draft.popiaConsentAt).toBe(CONSENT.declaredAt);
      expect(draft.popiaConsentMethod).toBe('WRITTEN');
      expect(draft.popiaConsentReference).toBe(CONSENT.reference);
    }
  });

  it('carries provenance onto every record rather than into an import log', () => {
    // A log nobody can find later is not a demonstration of consent.
    const result = plan([row()]);
    expect(result.ready[0].popiaConsentReference).toContain('Membership forms 001-112');
  });
});

describe('row validation', () => {
  it('requires both names', () => {
    for (const over of [{ firstName: '' }, { lastName: '' }, { firstName: '  ' }]) {
      const result = plan([row(over)]);
      expect(result.ready).toEqual([]);
      expect(result.rejected[0].code).toBe('MISSING_NAME');
    }
  });

  it('requires a usable contact number', () => {
    const result = plan([row({ phone: '123' })]);
    expect(result.rejected[0].code).toBe('MISSING_PHONE');
  });

  it('masks the number rather than storing it in the clear', () => {
    const result = plan([row({ phone: '082 123 4567' })]);
    expect(result.ready[0].phoneMasked).toMatch(/•/);
    expect(result.ready[0].phoneMasked).not.toContain('1234');
    // The plan carries no plaintext or encrypted number — encryption is a
    // server concern and this module must not pretend to do it.
    expect(result.ready[0]).not.toHaveProperty('phoneEncrypted');
  });

  it('defaults sentiment to undecided rather than inventing support', () => {
    expect(plan([row()]).ready[0].sentiment).toBe('UNDECIDED');
  });
});

describe('deduplication', () => {
  it('rejects the same person twice in one file, keeping the first', () => {
    const result = plan([row(), row({ lineNumber: 3 })]);
    expect(result.ready).toHaveLength(1);
    expect(result.rejected[0].code).toBe('DUPLICATE_IN_FILE');
    expect(result.rejected[0].row.lineNumber).toBe(3);
  });

  it('ignores formatting differences when matching', () => {
    const result = plan([row({ phone: '0821234567' }), row({ lineNumber: 3, phone: '082 123 4567' })]);
    expect(result.ready).toHaveLength(1);
  });

  it('rejects someone already on the roll', () => {
    const existing = new Set([importKey('Lerato', 'Molefe', '0821234567')]);
    const result = plan([row()], CONSENT, existing);
    expect(result.ready).toEqual([]);
    expect(result.rejected[0].code).toBe('ALREADY_PRESENT');
  });
});

describe('the plan is a plan', () => {
  it('classifies every row exactly once', () => {
    const rows = [
      row(),
      row({ lineNumber: 3, firstName: '' }),
      row({ lineNumber: 4 }),
      row({ lineNumber: 5, firstName: 'Thabo', phone: '0839876543' }),
    ];
    const result = plan(rows);
    expect(result.ready.length + result.rejected.length).toBe(result.totalRows);
  });

  it('gives every rejection a reason an operator can act on', () => {
    const result = plan([row({ firstName: '' }), row({ lineNumber: 3, phone: 'x' })]);
    for (const r of result.rejected) {
      expect(r.reason.trim().length).toBeGreaterThan(20);
      expect(r.row.lineNumber).toBeGreaterThan(0);
    }
  });

  it('writes nothing — it exposes no repository at all', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/voters/bulkImport.ts'), 'utf8');
    expect(source).not.toMatch(/from '@\/dal'/);
    expect(source).not.toMatch(/upsert|addDoc|setDoc/);
  });
});

describe('parseCsv', () => {
  it('reads a plain file', () => {
    expect(parseCsv('First Name,Surname,Cell\nLerato,Molefe,0821234567')).toEqual([
      { 'first name': 'Lerato', surname: 'Molefe', cell: '0821234567' },
    ]);
  });

  it('handles quoted fields, embedded commas and doubled quotes', () => {
    const rows = parseCsv('name,note\n"Molefe, Lerato","said ""yes"" at the door"');
    expect(rows[0].name).toBe('Molefe, Lerato');
    expect(rows[0].note).toBe('said "yes" at the door');
  });

  it('survives CRLF and trailing blank lines', () => {
    expect(parseCsv('a,b\r\n1,2\r\n\r\n')).toEqual([{ a: '1', b: '2' }]);
  });

  it('returns nothing for an empty file rather than throwing', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('\n\n')).toEqual([]);
  });

  it('pads short rows instead of shifting columns', () => {
    expect(parseCsv('a,b,c\n1,2')).toEqual([{ a: '1', b: '2', c: '' }]);
  });
});

describe('toImportRows', () => {
  it('accepts the header spellings a real spreadsheet uses, including Afrikaans', () => {
    const rows = toImportRows(parseCsv('Voornaam,Van,Selfoon\nLerato,Molefe,0821234567'));
    expect(rows[0]).toMatchObject({ firstName: 'Lerato', lastName: 'Molefe', phone: '0821234567' });
  });

  it('numbers lines as the operator sees them in the spreadsheet', () => {
    // Row 1 is the header, so the first data row is line 2.
    const rows = toImportRows(parseCsv('firstname,lastname,phone\nA,B,0821234567\nC,D,0839876543'));
    expect(rows.map((r) => r.lineNumber)).toEqual([2, 3]);
  });

  it('leaves a missing column undefined rather than guessing', () => {
    const rows = toImportRows(parseCsv('firstname,lastname\nA,B'));
    expect(rows[0].phone).toBeUndefined();
  });
});
