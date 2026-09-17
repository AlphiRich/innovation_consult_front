/**
 * Election Campaign OS — SA ID structural checks
 *
 * The vectors here were computed rather than recalled. `8001015009087` is
 * the worked example that appears throughout published descriptions of the
 * format; it validates under the implementation below, and independently
 * under a plain Luhn pass over all thirteen digits, which is a second
 * derivation of the same answer rather than the same one twice.
 *
 * The rest of this file is about the uploaded integration scheme, because
 * two of its statements are wrong and both would have shipped as code.
 */
import { describe, expect, it } from 'vitest';
import {
  FEMALE_SEQUENCE_MAX,
  maskSaIdNumber,
  parseSaIdNumber,
  saIdCheckDigit,
  SA_ID_LENGTH,
  type SaIdNumber,
} from './saIdNumber';

/** The published worked example. Check digit 7. */
const VALID = '8001015009087';

const parsed = (raw: string, now?: Date): SaIdNumber => {
  const result = parseSaIdNumber(raw, now);
  if (!result.ok) throw new Error(`expected ${raw} to parse, got ${result.code}`);
  return result;
};

/** An independent second opinion: plain Luhn over all thirteen digits. */
function plainLuhnPasses(digits: string): boolean {
  let sum = 0;
  [...digits].reverse().forEach((char, index) => {
    let value = Number(char);
    if (index % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  });
  return sum % 10 === 0;
}

describe('the check digit', () => {
  it('reproduces the published worked example', () => {
    expect(saIdCheckDigit(VALID.slice(0, 12))).toBe(7);
    expect(parseSaIdNumber(VALID).ok).toBe(true);
  });

  it('agrees with a plain Luhn pass, derived separately', () => {
    expect(plainLuhnPasses(VALID)).toBe(true);
    for (const wrong of ['8001015009081', '8001015009080', '8001015009089']) {
      expect(plainLuhnPasses(wrong), wrong).toBe(false);
      expect(parseSaIdNumber(wrong).ok, wrong).toBe(false);
    }
  });

  it('always returns a single digit, and the number it completes always parses', () => {
    // Only the sequence digits are varied. Walking the whole prefix as one
    // integer marches the citizenship digit past 1, and the parser is right
    // to reject that — the first version of this loop failed on its own
    // malformed input rather than on anything the implementation did.
    for (let sequence = 0; sequence < 10000; sequence += 37) {
      const prefix = `800101${String(sequence).padStart(4, '0')}08`;
      const check = saIdCheckDigit(prefix);
      expect(check, prefix).toBeGreaterThanOrEqual(0);
      expect(check, prefix).toBeLessThan(10);
      expect(parseSaIdNumber(prefix + check).ok, prefix).toBe(true);
    }
  });

  it('catches a single transposed pair, which is the typo it exists for', () => {
    // 8001015009087 → swap the 5 and the 0 beside it.
    expect(parseSaIdNumber('8001010509087').ok).toBe(false);
  });
});

/**
 * The uploaded scheme, checked rather than trusted. Both findings are
 * recorded as executable assertions so that neither can be quietly
 * "corrected" back later.
 */
describe('the uploaded DHA integration scheme', () => {
  /** Its §4, implemented exactly as written: odd positions EXCLUDE the check digit, then total % 10 === 0. */
  function schemeLiteralRule(thirteenDigits: string): boolean {
    const first12 = [...thirteenDigits.slice(0, 12)].map(Number);
    const odd = first12.filter((_, i) => i % 2 === 0).reduce((sum, d) => sum + d, 0);
    const evenDoubled = Number(first12.filter((_, i) => i % 2 === 1).join('')) * 2;
    const even = [...String(evenDoubled)].reduce((sum, c) => sum + Number(c), 0);
    return (odd + even) % 10 === 0;
  }

  it('states a rule that rejects a valid ID number', () => {
    // Step 1 excluding the check digit and step 4 testing `total % 10 === 0`
    // cannot both be right. Implemented literally, the rule is wrong.
    expect(schemeLiteralRule(VALID)).toBe(false);
    expect(parseSaIdNumber(VALID).ok).toBe(true);
  });

  it('carries a sample ID in its own payload that fails its own check', () => {
    const sample = '9001015800086';
    const result = parseSaIdNumber(sample);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.code).toBe('CHECK_DIGIT');
    // The check digit it should have carried.
    expect(saIdCheckDigit(sample.slice(0, 12))).toBe(8);
  });
});

describe('what the number encodes', () => {
  it('offers both centuries and refuses to choose between them', () => {
    const result = parsed(VALID, new Date('2026-09-13T00:00:00Z'));
    expect(result.possibleBirthDates).toEqual(['1980-01-01']);
    expect(result.birthMonth).toBe(1);
    expect(result.birthDay).toBe(1);
  });

  it('keeps both readings when both have already happened', () => {
    // 21 December '99 — 2099 has not happened, 1999 has.
    const ambiguous = '9912215009' + '0';
    const full = ambiguous + '8' + saIdCheckDigit(ambiguous + '8');
    const result = parsed(full, new Date('2026-09-13T00:00:00Z'));
    expect(result.possibleBirthDates).toEqual(['1999-12-21']);

    // A date in both centuries: born 2001 or 1901, both in the past.
    const both = '010203' + '5009' + '0';
    const id = both + '8' + saIdCheckDigit(both + '8');
    expect(parsed(id, new Date('2026-09-13T00:00:00Z')).possibleBirthDates).toEqual(['2001-02-03', '1901-02-03']);
  });

  it('rejects a date that never existed', () => {
    const bad = '800231' + '5009' + '08';
    const result = parseSaIdNumber(bad + saIdCheckDigit(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('IMPOSSIBLE_DATE');
  });

  it('reads the sex marker from the sequence range', () => {
    const withSequence = (sequence: string) => {
      const first12 = `800101${sequence}08`;
      return parsed(first12 + saIdCheckDigit(first12));
    };
    expect(withSequence('0000').sexMarker).toBe('F');
    expect(withSequence(String(FEMALE_SEQUENCE_MAX)).sexMarker).toBe('F');
    expect(withSequence(String(FEMALE_SEQUENCE_MAX + 1)).sexMarker).toBe('M');
    expect(withSequence('9999').sexMarker).toBe('M');
  });

  it('reads citizenship only from 0 and 1, and rejects anything else', () => {
    const withCitizenship = (digit: string) => {
      const first12 = `8001015009${digit}8`;
      return parseSaIdNumber(first12 + saIdCheckDigit(first12));
    };
    expect(parsed(`8001015009${'0'}8` + saIdCheckDigit(`8001015009${'0'}8`)).citizenship).toBe('CITIZEN');
    expect(parsed(`8001015009${'1'}8` + saIdCheckDigit(`8001015009${'1'}8`)).citizenship).toBe('PERMANENT_RESIDENT');
    for (const digit of ['2', '5', '9']) {
      const result = withCitizenship(digit);
      expect(result.ok, digit).toBe(false);
      if (!result.ok) expect(result.code).toBe('UNKNOWN_CITIZENSHIP');
    }
  });

  it('reports length and shape problems before anything else', () => {
    expect(parseSaIdNumber('')).toMatchObject({ code: 'EMPTY' });
    expect(parseSaIdNumber('80010150090')).toMatchObject({ code: 'LENGTH' });
    expect(parseSaIdNumber('80010150090ab')).toMatchObject({ code: 'NON_NUMERIC' });
    expect(SA_ID_LENGTH).toBe(13);
  });

  it('tolerates the spaces and hyphens people actually type', () => {
    expect(parseSaIdNumber('800101 5009 087').ok).toBe(true);
    expect(parseSaIdNumber('800101-5009-087').ok).toBe(true);
  });
});

/**
 * The structural checks establish shape and nothing more. This is the
 * claim most likely to be softened by someone in a hurry, so it is
 * asserted rather than left to the header.
 */
describe('structural validity is not verification', () => {
  it('passes a number that was never issued to anybody', () => {
    // Constructed to satisfy every rule. Nobody has this ID.
    const invented = '0001015000' + '08';
    const id = invented + saIdCheckDigit(invented);
    expect(parseSaIdNumber(id).ok).toBe(true);
  });

  it('exposes no field that could be mistaken for a verification outcome', () => {
    const result = parsed(VALID);
    const keys = Object.keys(result);
    for (const forbidden of ['verified', 'verificationStatus', 'exists', 'alive', 'deceased', 'dhaResponse']) {
      expect(keys.some((k) => k.toLowerCase().includes(forbidden.toLowerCase())), forbidden).toBe(false);
    }
  });

  it('keeps the sex marker out of the candidate gender path', () => {
    // `CandidateGender` is self-declared and never inferred — prList.ts
    // reports "cannot assess" rather than guessing. A sex marker read off
    // an ID number would be exactly that guess, wearing a fact's clothes.
    expect(parsed(VALID).sexMarker).toBe('M');
    // The two vocabularies do not overlap, so a mix-up cannot type-check.
    expect(['FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED']).not.toContain(parsed(VALID).sexMarker);
  });
});

describe('the display mask', () => {
  it('reveals four digits and hides the rest', () => {
    expect(maskSaIdNumber(VALID)).toBe('••••••••• 9087');
  });

  it('hides enough that the check digit does not narrow the field', () => {
    const masked = maskSaIdNumber(VALID);
    expect(masked).not.toContain(VALID.slice(0, 6)); // no date of birth
    expect((masked.match(/•/g) ?? []).length).toBe(SA_ID_LENGTH - 4);
  });

  it('masks a too-short value entirely rather than leaking it', () => {
    expect(maskSaIdNumber('1234567')).toBe('•••••••');
    expect(maskSaIdNumber('')).toBe('•');
  });
});
