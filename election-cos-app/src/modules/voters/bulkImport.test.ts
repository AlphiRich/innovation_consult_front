import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { maskPhone } from '@/lib/phone';
import {
  consentDeclarationProblem,
  existingVoterKey,
  holdingAddressLine,
  householdKey,
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

/**
 * NW405 shapes, from the real gazette output: 86821094 is one of the
 * split station codes (Ward 1 and Ward 2 both hold a portion of its
 * roll), 86910587 is not. Both facts are asserted against
 * `seed-data/jb-marks-nw405-wards-vds.json` below, so these fixtures
 * cannot drift into fiction.
 */
const SPLIT_VD = '86821094';
const SIMPLE_VD = '86910587';

const VOTING_DISTRICTS = [
  { vdCode: SPLIT_VD, wardCode: 'NW405-W1' },
  { vdCode: SPLIT_VD, wardCode: 'NW405-W2' },
  { vdCode: SIMPLE_VD, wardCode: 'NW405-W1' },
];

const base = {
  votingDistricts: VOTING_DISTRICTS,
  defaultVdCode: SIMPLE_VD,
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

  it('rejects someone already on the roll, matched through the mask', () => {
    // A stored voter has no plaintext number, so both sides are keyed on
    // the masked form. See existingVoterKey's header.
    const existing = new Set([existingVoterKey('Lerato', 'Molefe', maskPhone('0821234567'))]);
    const result = plan([row()], CONSENT, existing);
    expect(result.ready).toEqual([]);
    expect(result.rejected[0].code).toBe('ALREADY_PRESENT');
    expect(result.rejected[0].reason).toMatch(/appears to be on the roll/i);
  });

  it('would match nothing if the roll were keyed on a raw number', () => {
    // The defect this arrangement exists to prevent: a stored record's
    // phone is masked, an import row's is not, so keying the roll on the
    // raw number reports an entire re-import as new people.
    const rawKeyed = new Set([importKey('Lerato', 'Molefe', '0821234567')]);
    expect(plan([row()], CONSENT, rawKeyed).ready).toHaveLength(1);
    expect(importKey('Lerato', 'Molefe', '0821234567')).not.toBe(
      existingVoterKey('Lerato', 'Molefe', maskPhone('0821234567')),
    );
  });

  it('errs towards holding a name back rather than duplicating a person', () => {
    // Two different numbers sharing their visible digits key the same.
    // Stated in the module header as the accepted cost.
    expect(maskPhone('0821234567')).toBe(maskPhone('0829994567'));
    const existing = new Set([existingVoterKey('Lerato', 'Molefe', maskPhone('0829994567'))]);
    expect(plan([row({ phone: '0821234567' })], CONSENT, existing).rejected[0].code).toBe('ALREADY_PRESENT');
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


/**
 * Placing the rows is most of the work and all of the silent risk. A
 * person put in the wrong ward is visible to the wrong team, counted in
 * the wrong coverage figure, and worked by a canvasser who should not
 * have them — and nothing anywhere reports it.
 */
describe('where the people go', () => {
  const seed = JSON.parse(
    readFileSync(resolve(__dirname, '..', '..', '..', 'seed-data', 'jb-marks-nw405-wards-vds.json'), 'utf-8'),
  ) as { votingDistricts: { vdCode: string; wardCode: string }[] }[];

  const wardsFor = (code: string) => {
    const wards = new Set<string>();
    for (const entry of seed) {
      for (const vd of entry.votingDistricts) if (vd.vdCode === code) wards.add(vd.wardCode);
    }
    return [...wards];
  };

  it('uses fixtures that are real: one split station code and one that is not', () => {
    // If the seed data ever changes shape, these fixtures stop being
    // examples of the thing they are named for, and every test below
    // would keep passing while testing nothing.
    expect(wardsFor(SPLIT_VD).length).toBeGreaterThan(1);
    expect(wardsFor(SIMPLE_VD)).toHaveLength(1);
  });

  it('refuses a row whose voting district is not one of ours', () => {
    const result = plan([row({ vdCode: '99999999' })]);
    expect(result.ready).toHaveLength(0);
    expect(result.rejected[0].code).toBe('UNKNOWN_VOTING_DISTRICT');
    expect(result.rejected[0].reason).toMatch(/ground this campaign does not/i);
  });

  it('refuses a split voting district that does not say which ward', () => {
    const result = plan([row({ vdCode: SPLIT_VD })]);
    expect(result.rejected[0].code).toBe('SPLIT_VOTING_DISTRICT');
    expect(result.rejected[0].reason).toMatch(/split across 2 wards/);
    expect(result.rejected[0].reason).toMatch(/Add a ward column, or split the file by ward/);
  });

  it('accepts a split voting district once the row names its ward', () => {
    const result = plan([row({ vdCode: SPLIT_VD, wardCode: 'NW405-W2' })]);
    expect(result.rejected).toHaveLength(0);
    expect(result.ready[0].wardCode).toBe('NW405-W2');
    expect(result.ready[0].vdCode).toBe(SPLIT_VD);
  });

  it('refuses a ward the split district does not actually reach', () => {
    const result = plan([row({ vdCode: SPLIT_VD, wardCode: 'NW405-W9' })]);
    expect(result.rejected[0].code).toBe('SPLIT_VOTING_DISTRICT');
  });

  it('derives the ward for an unsplit district rather than asking for it', () => {
    const result = plan([row({ vdCode: SIMPLE_VD })]);
    expect(result.ready[0].wardCode).toBe('NW405-W1');
  });

  it('refuses a row with no district at all when the file names none either', () => {
    const result = planImport({
      ...base,
      defaultVdCode: undefined,
      rows: [row()],
      consent: CONSENT,
    });
    expect(result.rejected[0].code).toBe('NO_VOTING_DISTRICT');
  });

  it('refuses the whole file when no voting districts have been seeded', () => {
    const result = planImport({ ...base, votingDistricts: [], rows: [row()], consent: CONSENT });
    expect(result.ready).toHaveLength(0);
    expect(result.rejected).toHaveLength(0);
    expect(result.fileErrors[0]).toMatch(/SOP-03/);
  });
});

describe('the door each person gets', () => {
  it('creates one household per distinct address in a district', () => {
    const result = plan([
      row({ address: '12 Church Street' }),
      row({ firstName: 'Sipho', address: '12 Church Street' }),
      row({ firstName: 'Naledi', address: '14 Church Street' }),
    ]);
    expect(result.households).toHaveLength(2);
    expect(result.ready[0].householdId).toBe(result.ready[1].householdId);
    expect(result.ready[2].householdId).not.toBe(result.ready[0].householdId);
  });

  it('treats casing and spacing differences as the same address', () => {
    const result = plan([row({ address: '12 Church Street' }), row({ firstName: 'Sipho', address: '12  church  STREET' })]);
    expect(result.households).toHaveLength(1);
    expect(householdKey('x', '12  Church  Street')).toBe(householdKey('x', '12 church street'));
  });

  it('reuses a household that already exists rather than creating a second one', () => {
    const existingHouseholds = new Map([[householdKey(SIMPLE_VD, '12 Church Street'), 'hh-existing']]);
    const result = planImport({ ...base, rows: [row({ address: '12 Church Street' })], consent: CONSENT, existingHouseholds });
    expect(result.households).toHaveLength(0);
    expect(result.ready[0].householdId).toBe('hh-existing');
  });

  it('says plainly that an imported person has no address, rather than inventing one', () => {
    const result = plan([row()]);
    expect(result.withoutAddress).toBe(1);
    expect(result.households[0].addressLine).toBe(holdingAddressLine(CONSENT.reference));
    expect(result.households[0].addressLine).toMatch(/^No address supplied on import/);
    // The consent reference is carried into it, so the holding record
    // says which import put these people there.
    expect(result.households[0].addressLine).toContain('Ikageng drive');
  });

  it('puts every address-less person in a district into the same holding record', () => {
    const result = plan([row(), row({ firstName: 'Sipho' }), row({ firstName: 'Naledi', vdCode: SIMPLE_VD })]);
    expect(result.households).toHaveLength(1);
    expect(result.withoutAddress).toBe(3);
  });

  it('never places a household in a ward its district does not reach', () => {
    const result = plan([row({ vdCode: SPLIT_VD, wardCode: 'NW405-W2', address: '1 Main Road' })]);
    expect(result.households[0].wardCode).toBe('NW405-W2');
    expect(result.households[0].vdCode).toBe(SPLIT_VD);
  });

  it('plans households before the voters that reference them', () => {
    // The caller writes households first; a voter whose household does
    // not exist yet is a dangling reference nothing else will notice.
    const result = plan([row({ address: '12 Church Street' })]);
    const ids = new Set(result.households.map((h) => h.id));
    for (const voter of result.ready) expect(ids.has(voter.householdId)).toBe(true);
  });
});

describe('the header spellings a real register uses', () => {
  it('reads voting district, ward and address columns', () => {
    const rows = toImportRows(
      parseCsv('Name,Surname,Cell,VD Code,Ward,Street\nLerato,Molefe,0821234567,86910587,NW405-W1,12 Church Street\n'),
    );
    expect(rows[0]).toMatchObject({
      firstName: 'Lerato',
      lastName: 'Molefe',
      phone: '0821234567',
      vdCode: '86910587',
      wardCode: 'NW405-W1',
      address: '12 Church Street',
    });
  });

  it('accepts the Afrikaans spellings too', () => {
    const rows = toImportRows(parseCsv('Voornaam,Van,Selfoon,Stemdistrik,Wyk,Adres\nLerato,Molefe,0821234567,86910587,NW405-W1,12 Kerkstraat\n'));
    expect(rows[0].vdCode).toBe('86910587');
    expect(rows[0].address).toBe('12 Kerkstraat');
  });
});
