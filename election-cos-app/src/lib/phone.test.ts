import { describe, expect, it } from 'vitest';
import { maskPhone } from './phone';

describe('maskPhone', () => {
  it('masks a standard 10-digit SA mobile number, keeping head and tail', () => {
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
