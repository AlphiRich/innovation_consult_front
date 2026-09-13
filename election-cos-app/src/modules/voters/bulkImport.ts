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
 * WHERE THE PEOPLE GO
 *
 * A voter record cannot exist without a household, a voting district and
 * a ward. A membership register has names and numbers, sometimes an
 * address, sometimes a voting district, and almost never a ward — so
 * placing the rows is most of the work, and getting it wrong is silent.
 *
 * Three rules, each of which rejects rather than guesses:
 *
 *  - **A voting district that is not one of yours is refused.** Rows are
 *    placed only into voting districts already loaded for this tenant
 *    (SOP-03). A register covering a neighbouring municipality would
 *    otherwise import people this campaign cannot lawfully work.
 *  - **A split voting district with no ward is refused.** A station's
 *    roll can be divided across a ward boundary — about a quarter of them
 *    in the one municipality this build holds gazette data for — so a row
 *    carrying only that code does not say which ward the person is in.
 *    Choosing the first match would put people in the wrong ward silently,
 *    and ward is what every permission and every coverage figure turns on.
 *  - **An address that is absent stays absent.** Rows without one are
 *    placed in a per-district holding record whose address line says so.
 *    Inventing a street would be fabrication, and a fabricated address is
 *    a canvasser sent to a door that is not there.
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
import type { HouseholdDraft } from '@/dal/ports/households';
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
  /** IEC voting district code, where the register carries one. */
  vdCode?: string;
  /** Only needed to resolve a voting district split across two wards. */
  wardCode?: string;
  /** Street address, where the register carries one. */
  address?: string;
  /** Row number in the source file, for a message the operator can act on. */
  lineNumber: number;
}

export type RejectionCode =
  | 'MISSING_NAME'
  | 'MISSING_PHONE'
  | 'DUPLICATE_IN_FILE'
  | 'ALREADY_PRESENT'
  | 'NO_VOTING_DISTRICT'
  | 'UNKNOWN_VOTING_DISTRICT'
  | 'SPLIT_VOTING_DISTRICT';

export interface RejectedRow {
  row: ImportRow;
  code: RejectionCode;
  reason: string;
}

export interface ImportPlan {
  /** Drafts ready to write, in file order. */
  ready: VoterDraft[];
  /**
   * Households that have to be created before the voters referencing them.
   * Already-existing households are reused and do not appear here.
   */
  households: HouseholdDraft[];
  rejected: RejectedRow[];
  /** Refusals that apply to the whole file, not to individual rows. */
  fileErrors: string[];
  totalRows: number;
  /** Rows placed in a holding record because the file carried no address. */
  withoutAddress: number;
}

/** Minimum length of a consent reference that means anything. */
export const MIN_REFERENCE_LENGTH = 8;

/** One entry per ward a voting district code appears in. */
export interface KnownVotingDistrict {
  vdCode: string;
  wardCode: string;
}

export interface PlanOptions {
  rows: ImportRow[];
  consent: ConsentDeclaration | null;
  /**
   * The voting districts loaded for this tenant. A row is placed only
   * into one of these — see the header. Supplied by the caller so this
   * module stays pure.
   */
  votingDistricts: KnownVotingDistrict[];
  /** Used for rows that carry no voting district of their own. */
  defaultVdCode?: string;
  /** Ward for `defaultVdCode`, where that district is split across wards. */
  defaultWardCode?: string;
  /**
   * Keys already in the store, as `firstname|lastname|digits`. Supplied by
   * the caller so this stays pure.
   */
  existingKeys?: Set<string>;
  /** Household ids already in the store, keyed by `householdKey()`. */
  existingHouseholds?: Map<string, string>;
  /** Injected so a plan is reproducible in a test. */
  makeId?: () => string;
}

/** Address line used when the register carries no address. Said plainly. */
export function holdingAddressLine(reference: string): string {
  return `No address supplied on import — ${reference}`;
}

/** Identity of a household for import purposes: a district and an address. */
export function householdKey(vdCode: string, address: string): string {
  return `${vdCode.trim()}|${address.trim().replace(/\s+/g, ' ').toLowerCase()}`;
}

export function importKey(firstName: string, lastName: string, phone: string): string {
  return [firstName.trim().toLowerCase(), lastName.trim().toLowerCase(), phone.replace(/\D/g, '')].join('|');
}

/**
 * The key for someone already on the roll — and why it is not `importKey`.
 *
 * A stored voter has no plaintext number: `phoneEncrypted` is opaque and
 * `phoneMasked` keeps the first three digits and the last three. So a
 * stored record and an import row can only be compared through the mask,
 * and both sides have to be masked the same way. Comparing a raw number
 * against a stored masked one matches nothing, which would report an
 * entire re-import as new people.
 *
 * The cost, stated: two different numbers sharing their first three and
 * last three digits key the same. The check therefore errs towards saying
 * someone is already present, and the plan says "appears to be" rather
 * than asserting it — a name wrongly held back is visible in the rejected
 * list and can be added by hand; a person silently duplicated on the roll
 * is worked twice by two canvassers.
 */
export function existingVoterKey(firstName: string, lastName: string, phoneMasked: string): string {
  return importKey(firstName, lastName, phoneMasked);
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
  const { rows, consent, votingDistricts, defaultVdCode, defaultWardCode } = options;
  const makeId = options.makeId ?? (() => crypto.randomUUID());
  const existing = options.existingKeys ?? new Set<string>();
  const existingHouseholds = options.existingHouseholds ?? new Map<string, string>();

  const problem = consentDeclarationProblem(consent);
  if (problem) {
    // Nothing is importable, and no row-level detail is offered — the
    // file is not the issue.
    return { ready: [], households: [], rejected: [], fileErrors: [problem], totalRows: rows.length, withoutAddress: 0 };
  }

  if (votingDistricts.length === 0) {
    return {
      ready: [],
      households: [],
      rejected: [],
      fileErrors: [
        'No voting districts have been loaded for this tenant, so there is nowhere to put anybody. Seed the ' +
          'wards and voting districts from the demarcation notice first — see SOP-03.',
      ],
      totalRows: rows.length,
      withoutAddress: 0,
    };
  }

  const reference = consent!.reference.trim();
  const wardsByVd = new Map<string, string[]>();
  for (const vd of votingDistricts) {
    const wards = wardsByVd.get(vd.vdCode) ?? [];
    if (!wards.includes(vd.wardCode)) wards.push(vd.wardCode);
    wardsByVd.set(vd.vdCode, wards);
  }

  const ready: VoterDraft[] = [];
  const households: HouseholdDraft[] = [];
  const rejected: RejectedRow[] = [];
  const seen = new Set<string>();
  const householdIds = new Map(existingHouseholds);
  let withoutAddress = 0;

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

    // --- placement ------------------------------------------------------
    const vdCode = (row.vdCode ?? '').trim() || (defaultVdCode ?? '').trim();
    if (vdCode === '') {
      rejected.push({
        row,
        code: 'NO_VOTING_DISTRICT',
        reason:
          'No voting district for this row, and no district was chosen for the file. Every voter belongs to ' +
          'one, and it decides who may work the record.',
      });
      continue;
    }

    const wards = wardsByVd.get(vdCode);
    if (!wards) {
      rejected.push({
        row,
        code: 'UNKNOWN_VOTING_DISTRICT',
        reason:
          `Voting district ${vdCode} is not one of the districts loaded for this municipality. Either the ` +
          'register covers ground this campaign does not, or the code is wrong.',
      });
      continue;
    }

    let wardCode: string;
    if (wards.length === 1) {
      wardCode = wards[0];
    } else {
      const stated = (row.wardCode ?? '').trim() || (defaultWardCode ?? '').trim();
      if (stated !== '' && wards.includes(stated)) {
        wardCode = stated;
      } else {
        rejected.push({
          row,
          code: 'SPLIT_VOTING_DISTRICT',
          reason:
            `Voting district ${vdCode} is split across ${wards.length} wards (${wards.join(', ')}), so this ` +
            'row does not say which ward the person is in. Add a ward column, or split the file by ward.',
        });
        continue;
      }
    }

    // --- deduplication ---------------------------------------------------
    const key = importKey(firstName, lastName, phone);
    if (seen.has(key)) {
      rejected.push({ row, code: 'DUPLICATE_IN_FILE', reason: 'This person appears earlier in the same file.' });
      continue;
    }
    if (existing.has(existingVoterKey(firstName, lastName, maskPhone(phone)))) {
      rejected.push({
        row,
        code: 'ALREADY_PRESENT',
        reason:
          'This person appears to be on the roll already. Stored numbers are masked, so the match is on the ' +
          'name and the visible digits — check the record before adding them by hand.',
      });
      continue;
    }
    seen.add(key);

    // --- the door ---------------------------------------------------------
    const address = (row.address ?? '').trim();
    if (address === '') withoutAddress += 1;
    const addressLine = address === '' ? holdingAddressLine(reference) : address;
    const hhKey = householdKey(vdCode, addressLine);
    let householdId = householdIds.get(hhKey);
    if (householdId === undefined) {
      householdId = makeId();
      householdIds.set(hhKey, householdId);
      households.push({
        id: householdId,
        tenantId: '',
        vdCode,
        wardCode,
        addressLine,
        dwellingType: 'OTHER',
      });
    }

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
      popiaConsentReference: reference,
    });
  }

  return { ready, households, rejected, fileErrors: [], totalRows: rows.length, withoutAddress };
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
    vdCode: pick(r, ['vdcode', 'vd code', 'vd_code', 'vd', 'votingdistrict', 'voting district', 'stemdistrik']),
    wardCode: pick(r, ['wardcode', 'ward code', 'ward_code', 'ward', 'wyk']),
    address: pick(r, ['address', 'addressline', 'address line', 'street', 'adres', 'straat']),
    lineNumber: index + 2, // +1 for the header, +1 for 1-based counting
  }));
}
