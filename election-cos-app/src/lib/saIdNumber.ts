/**
 * Election Campaign OS — South African ID number, structural checks only
 *
 * WHAT THIS IS FOR
 *
 * Candidates carry an ID number (`dal/ports/candidates.ts`), and a PR list
 * submitted with a mistyped one comes back. This catches the typo at the
 * keyboard, for nothing: no network call, no third party, no new personal
 * information, and no accreditation.
 *
 * WHAT STRUCTURAL VALIDITY IS NOT — THE WHOLE POINT OF THIS HEADER
 *
 * A number that passes every check below is a number *shaped* like an SA
 * ID. That is all. It does not establish that:
 *
 *  - the number was ever issued — the check digit is arithmetic, and a
 *    fabricated number can satisfy it on the first try;
 *  - it belongs to the person who gave it;
 *  - that person is alive, or a citizen;
 *  - that person is a registered voter in this municipality.
 *
 * The last one is what `Candidate.verificationStatus` means and what
 * section 14(5) of the Municipal Electoral Act turns on, and it is a
 * different question answered by a different body. Nothing here may be
 * used to set that flag, and `saIdNumber.test.ts` guards the distinction.
 *
 * IDENTITY VERIFICATION AGAINST HOME AFFAIRS IS NOT BUILT AND IS NOT
 * PROPOSED HERE. It requires accreditation, an SLA, a data protection
 * impact assessment, and a decision to hold a new class of personal
 * information. See `docs/dha-idvs-and-provincial-scale-review.md`.
 *
 * THE SEX MARKER IS NOT A GENDER DECLARATION
 *
 * Digits 7–10 record a sequence number whose range differs for the two
 * sexes recorded on the identity document. `CandidateGender` in this
 * product is self-declared, optional, and explicitly never inferred —
 * `prList.ts` reports "cannot assess" rather than guessing. This module
 * exposes what the number encodes because a structural parser that hid it
 * would be lying about the format; it must never become the source of a
 * candidate's declared gender, and the tests assert that it is not.
 *
 * THE ALGORITHM, AND A CORRECTION TO THE SOURCE MATERIAL
 *
 * The check digit is Luhn over the thirteen digits. The formulation
 * usually written down for SA IDs is:
 *
 *   odd  = sum of digits in positions 1,3,5,7,9,11
 *   even = digits in positions 2,4,6,8,10,12, read as one number,
 *          doubled, then its own digits summed
 *   check = (10 − (odd + even) mod 10) mod 10
 *
 * The uploaded integration scheme states this with step 1 excluding the
 * check digit *and* step 4 testing `total mod 10 == 0`. Those two cannot
 * both hold: implemented literally, the rule rejects valid numbers.
 * Verified rather than assumed — see `saIdNumber.test.ts`, which runs the
 * scheme's own literal rule against a number known to be valid and shows
 * it failing, and runs it against the scheme's own sample ID, which is
 * itself structurally invalid.
 */

export const SA_ID_LENGTH = 13;

/** Sequence ranges by the sex recorded on the document. Digits 7–10. */
export const FEMALE_SEQUENCE_MAX = 4999;

export type SaIdCitizenship = 'CITIZEN' | 'PERMANENT_RESIDENT';

/**
 * The sex recorded on the identity document. Deliberately not named
 * "gender", and deliberately not the same type as `CandidateGender`, so
 * that assigning one to the other does not compile.
 */
export type SaIdSexMarker = 'F' | 'M';

export type SaIdProblemCode =
  | 'EMPTY'
  | 'LENGTH'
  | 'NON_NUMERIC'
  | 'IMPOSSIBLE_DATE'
  | 'UNKNOWN_CITIZENSHIP'
  | 'CHECK_DIGIT';

export interface SaIdProblem {
  ok: false;
  code: SaIdProblemCode;
  message: string;
}

export interface SaIdNumber {
  ok: true;
  /** The thirteen digits, stripped of spaces and separators. */
  digits: string;
  /** Two-digit year as printed. The century is not encoded — see below. */
  birthYearInCentury: number;
  birthMonth: number;
  birthDay: number;
  /**
   * The number carries no century, so a birth date cannot be read from it
   * alone. Both readings are offered, most recent first, with any date in
   * the future dropped. A caller that needs one date has to choose, and
   * should do so from something other than this number.
   */
  possibleBirthDates: string[];
  sexMarker: SaIdSexMarker;
  citizenship: SaIdCitizenship;
}

export type SaIdResult = SaIdNumber | SaIdProblem;

const problem = (code: SaIdProblemCode, message: string): SaIdProblem => ({ ok: false, code, message });

/** The check digit for the first twelve digits. Luhn, SA formulation. */
export function saIdCheckDigit(firstTwelve: string): number {
  const digits = [...firstTwelve].map(Number);
  const odd = digits.filter((_, i) => i % 2 === 0).reduce((sum, d) => sum + d, 0);
  const evenConcatenated = Number(digits.filter((_, i) => i % 2 === 1).join('')) * 2;
  const even = [...String(evenConcatenated)].reduce((sum, c) => sum + Number(c), 0);
  return (10 - ((odd + even) % 10)) % 10;
}

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Structure, date, citizenship digit and check digit. Nothing else — read
 * the header before adding a claim to this function.
 */
export function parseSaIdNumber(raw: string, now = new Date()): SaIdResult {
  const digits = raw.replace(/[\s-]/g, '');
  if (digits === '') return problem('EMPTY', 'Enter an ID number.');
  if (!/^\d+$/.test(digits)) return problem('NON_NUMERIC', 'An ID number is digits only.');
  if (digits.length !== SA_ID_LENGTH) {
    return problem('LENGTH', `An ID number is ${SA_ID_LENGTH} digits — this one has ${digits.length}.`);
  }

  const birthYearInCentury = Number(digits.slice(0, 2));
  const birthMonth = Number(digits.slice(2, 4));
  const birthDay = Number(digits.slice(4, 6));

  const possibleBirthDates = [2000 + birthYearInCentury, 1900 + birthYearInCentury]
    .filter((year) => isRealDate(year, birthMonth, birthDay))
    .map((year) => new Date(Date.UTC(year, birthMonth - 1, birthDay)))
    .filter((date) => date.getTime() <= now.getTime())
    .map((date) => date.toISOString().slice(0, 10));

  if (possibleBirthDates.length === 0) {
    return problem('IMPOSSIBLE_DATE', 'The first six digits are not a date that has happened.');
  }

  const citizenshipDigit = digits[10];
  if (citizenshipDigit !== '0' && citizenshipDigit !== '1') {
    return problem('UNKNOWN_CITIZENSHIP', 'The eleventh digit is neither 0 nor 1, so this is not a valid ID number.');
  }

  if (saIdCheckDigit(digits.slice(0, 12)) !== Number(digits[12])) {
    return problem(
      'CHECK_DIGIT',
      'That ID number fails its own check digit — it has been mistyped or transcribed wrongly.',
    );
  }

  return {
    ok: true,
    digits,
    birthYearInCentury,
    birthMonth,
    birthDay,
    possibleBirthDates,
    sexMarker: Number(digits.slice(6, 10)) <= FEMALE_SEQUENCE_MAX ? 'F' : 'M',
    citizenship: citizenshipDigit === '0' ? 'CITIZEN' : 'PERMANENT_RESIDENT',
  };
}

/**
 * Display mask. Reveals the last four digits and nothing else.
 *
 * WHY NOT THE FIRST SIX AS WELL
 *
 * A mask that shows `771120 •••• 081` — the form an earlier comment in
 * `ports/candidates.ts` gave as an example — reveals nine of thirteen
 * digits, and one of the four it hides is determined by the other twelve
 * through the check digit. That leaves on the order of a thousand
 * candidate numbers, which is not a mask. It also discloses a full date of
 * birth, which is personal information in its own right and is exactly
 * what a mask is supposed to withhold.
 *
 * Four digits is enough for the person who captured a record to recognise
 * it, which is the only thing a display mask is for.
 */
export function maskSaIdNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return '•'.repeat(Math.max(digits.length, 1));
  return `${'•'.repeat(digits.length - 4)} ${digits.slice(-4)}`;
}
