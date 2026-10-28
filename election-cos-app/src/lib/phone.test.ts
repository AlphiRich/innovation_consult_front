import { describe, expect, it } from 'vitest';
import { maskPhone } from './phone';

describe('maskPhone', () => {
  it('masks a standard 10-digit SA mobile number, keeping head and tail', () => {
    // Paired with functions/src/membershipOtp.test.ts, which asserts the
    // same vectors against that package's standalone copy of maskPhone.
    // The two packages do not share a workspace; this table is what keeps
    // the copies from drifting apart in silence.
    expect(maskPhone('0821234567')).toBe('082 •••• 567');
  });

  it('strips formatting characters before masking', () => {
    expect(maskPhone('+27 82 123 4567')).toBe('278 •••• 567');
  });

  it('fully masks numbers too short to safely reveal both ends', () => {
    expect(maskPhone('12345')).toBe('•••••');
  });

  it('never returns the original digits verbatim', () => {
    const raw = '0821234567';
    expect(maskPhone(raw)).not.toContain('1234');
  });
});
