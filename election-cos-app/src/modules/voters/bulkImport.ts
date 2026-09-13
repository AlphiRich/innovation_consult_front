/**
 * Election Campaign OS — bulk voter import
 * IC-ECOS-BUILD-2026-V2 §6.2, §6.2.1.
 *
 * WHY THIS EXISTS
 *
 * A campaign does not start empty. It starts with a membership register in
 * a spreadsheet. Until now this build had no way to bring that in: voters
 * were captured one at a time at a door, and the only bulk path in the
 * repository was the VD demarcation seed script, which is reference data
 * rather than people. That is a day-one onboarding blocker.
 *
 * THE THING THAT MAKES THIS DIFFERENT FROM AN ORDINARY CSV IMPORT
 *
 * `firestore.rules` refuses to create a voter unless
 * `popiaConsentGiven == true`. That gate exists because consent is
 * captured at the door, by a canvasser, from the person. A spreadsheet
 * has no doorstep and no canvasser, so a bulk import is the one place
 * where that gate could be satisfied by simply asserting it — which would
 * make the gate decorative.
 *
 * So this module will not produce an importable row without a **consent
 * declaration that could actually be shown to someone**: a lawful basis,
 * a date, and a reference identifying where the consent lives (the
 * membership-form batch, the event, the signup campaign). POPIA puts the
 * burden of demonstrating consent on the responsible party, and "everyone
 * on this list agreed" demonstrates nothing.
 *
 * A doorstep method is refused for bulk on its face: nobody verbally
 * consented four hundred people in a batch, so a file claiming it is
 * either mislabelled or untrue, and either way it should not import.
 *
 * THIS MODULE WRITES NOTHING
 *
 * It returns a *plan*. Every row is classified — ready, rejected, or
 * already present — with a reason, and the caller commits deliberately.
 * A half-finished import that silently created some people and dropped
 * others is worse than one that refuses, because nobody can tell
 * afterwards which happened.
 */
import type { Voter, VoterDraft } from '@/dal/ports/voters';
import { maskPhone } from '@/lib/phone';

/** Consent methods that can honestly describe a batch. */
export type BulkConsentMethod = Extract<Voter['popiaConsentMethod'], 'WRITTEN' | 'DIGITAL'>;

export interface ConsentDeclaration {
  method: BulkConsentMethod;
  /** ISO 8601 — when the people on this list gave consent. */
  declaredAt: string;
  /**
   * Where the consent can be found. Free text, but it has to be
   * something: "Membership forms 001–112, Ikageng drive, 2 March 2026",
   * not "yes".
   */
  reference: string;
}

export interface ImportRow {
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** Row number in the source file, for a message the operator can act on. */
  lineNumber: number;
}

export type RejectionCode =
  | 'MISSING_NAME'
  | 'MISSING_PHONE'
  | 'DUPLICATE_IN_FILE'
  | 'ALREADY_PRESENT';

export interface RejectedRow {
  row: ImportRow;
  code: RejectionCode;
  reason: string;
}

export interface ImportPlan {
  /** Drafts ready to write, in file order. */
  ready: VoterDraft[];
  rejected: RejectedRow[];
  /** Refusals that apply to the whole file, not to individual rows. */
  fileErrors: string[];
  totalRows: number;
}

/** Minimum length of a consent reference that means anything. */
const MIN_REFERENCE_LENGTH = 8;

export interface PlanOptions {
  rows: ImportRow[];
  consent: ConsentDeclaration | null;
  vdCode: string;
  wardCode: string;
  householdId: string;
  /**
   * Keys already in the store, as `firstname|lastname|digits`. Supplied by
   * the caller so this stays pure.
   */
  existingKeys?: Set<string>;
  /** Injected so a plan is reproducible in a test. */
  makeId?: () => string;
}

export function importKey(firstName: string, lastName: string, phone: string): string {
  return [firstName.trim().toLowerCase(), lastName.trim().toLowerCase(), phone.replace(/\D/g, '')].join('|');
}

/**
 * Why a consent declaration is unusable, or null if it is fine. Exported
 * so the UI can say what is wrong before the operator picks a file.
 */
export function consentDeclarationProblem(consent: ConsentDeclaration | null): string | null {
  if (!consent) {
    return 'A bulk import needs a consent declaration: how these people consented, when, and where that consent is recorded. Without it the import would be asserting consent nobody can produce.';
  }
  if (consent.reference.trim().length < MIN_REFERENCE_LENGTH) {
    return 'The consent reference has to identify where the consent actually lives — a membership-form batch, an event, a signup campaign. It is the thing you would show if the consent were ever questioned.';
  }
  if (Number.isNaN(new Date(consent.declaredAt).getTime())) {
    return 'The consent date is not a date.';
  }
  return null;
}

export function planImport(options: PlanOptions): ImportPlan {
  const { rows, consent, vdCode, wardCode, householdId } = options;
  const makeId = options.makeId ?? (() => crypto.randomUUID());
  const existing = options.existingKeys ?? new Set<string>();

  const problem = consentDeclarationProblem(consent);
  if (problem) {
    // Nothing is importable, and no row-level detail is offered — the
    // file is not the issue.
    return { ready: [], rejected: [], fileErrors: [problem], totalRows: rows.length };
  }

  const ready: VoterDraft[] = [];
  const rejected: RejectedRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const firstName = (row.firstName ?? '').trim();
    const lastName = (row.lastName ?? '').trim();
    const phone = (row.phone ?? '').trim();

    if (firstName === '' || lastName === '') {
      rejected.push({ row, code: 'MISSING_NAME', reason: 'A first and last name are both required.' });
      continue;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      rejected.push({
        row,
        code: 'MISSING_PHONE',
        reason: 'A usable contact number is required — without one the record cannot be matched or contacted.',
      });
      continue;
    }

    const key = importKey(firstName, lastName, phone);
    if (seen.has(key)) {
      rejected.push({ row, code: 'DUPLICATE_IN_FILE', reason: 'This person appears earlier in the same file.' });
      continue;
    }
    if (existing.has(key)) {
      rejected.push({ row, code: 'ALREADY_PRESENT', reason: 'This person is already on the roll.' });
      continue;
    }
    seen.add(key);

    ready.push({
      id: makeId(),
      tenantId: '',
      householdId,
      vdCode,
      wardCode,
      firstName,
      lastName,
      phoneMasked: maskPhone(phone),
      sentiment: 'UNDECIDED',
      // Consent is carried from the declaration onto every record, so the
      // provenance travels with the person rather than living in an
      // import log nobody will find later.
      popiaConsentGiven: true,
      popiaConsentAt: consent!.declaredAt,
      popiaConsentMethod: consent!.method,
      popiaConsentReference: consent!.reference.trim(),
    });
  }

  return { ready, rejected, fileErrors: [], totalRows: rows.length };
}

/**
 * A small, strict CSV reader. Handles quoted fields, embedded commas and
 * doubled quotes; does not attempt to be a general CSV library.
 *
 * Returns rows keyed by lower-cased header so the column order in
 * somebody's spreadsheet does not matter.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((cells) => Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? '').trim()])));
}

/** Maps parsed CSV records onto import rows using common header spellings. */
export function toImportRows(records: Record<string, string>[]): ImportRow[] {
  const pick = (r: Record<string, string>, names: string[]) =>
    names.map((n) => r[n]).find((v) => v !== undefined && v !== '');

  return records.map((r, index) => ({
    firstName: pick(r, ['firstname', 'first name', 'first_name', 'name', 'voornaam']),
    lastName: pick(r, ['lastname', 'last name', 'last_name', 'surname', 'van']),
    phone: pick(r, ['phone', 'cell', 'cellphone', 'mobile', 'contact', 'number', 'selfoon']),
    lineNumber: index + 2, // +1 for the header, +1 for 1-based counting
  }));
}
