import { describe, expect, it } from 'vitest';
import { ALL_CAPABILITIES } from './allCapabilities';

describe('ALL_CAPABILITIES', () => {
  it('has no duplicates', () => {
    expect(new Set(ALL_CAPABILITIES).size).toBe(ALL_CAPABILITIES.length);
  });

  it('has one entry per module namespace prefix, sanity-checked against the current count', () => {
    // Not a source of truth in itself (TS's Record<Capability, true> in
    // allCapabilities.ts is what actually enforces sync with the
    // Capability union) — this just makes an accidental count change
    // visible in a diff instead of silently passing.
    expect(ALL_CAPABILITIES).toHaveLength(26);
  });
});
