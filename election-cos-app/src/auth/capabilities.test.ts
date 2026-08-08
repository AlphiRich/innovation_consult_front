import { describe, expect, it } from 'vitest';
import { resolveEffectiveCapabilities, hasCapability } from './capabilities';
import type { Capability } from './types';

describe('resolveEffectiveCapabilities', () => {
  it('returns role defaults when there are no overrides', () => {
    const caps = resolveEffectiveCapabilities(
      { defaultCaps: ['voters.view', 'diary.view'] },
      { granted: [], revoked: [] },
    );
    expect(caps).toEqual(['diary.view', 'voters.view']);
  });

  it('adds granted overrides on top of role defaults', () => {
    const caps = resolveEffectiveCapabilities(
      { defaultCaps: ['voters.view'] },
      { granted: ['ppfa.export'], revoked: [] },
    );
    expect(caps).toContain('voters.view');
    expect(caps).toContain('ppfa.export');
  });

  it('removes revoked capabilities even if they are role defaults', () => {
    const caps = resolveEffectiveCapabilities(
      { defaultCaps: ['voters.view', 'voters.edit'] },
      { granted: [], revoked: ['voters.edit'] },
    );
    expect(caps).toEqual(['voters.view']);
  });

  it('revocation wins over a simultaneous grant of the same capability', () => {
    const cap: Capability = 'ppfa.manage_thresholds';
    const caps = resolveEffectiveCapabilities(
      { defaultCaps: [] },
      { granted: [cap], revoked: [cap] },
    );
    expect(caps).not.toContain(cap);
  });

  it('deduplicates and sorts the result', () => {
    const caps = resolveEffectiveCapabilities(
      { defaultCaps: ['voters.view', 'voters.view'] },
      { granted: ['diary.view'], revoked: [] },
    );
    expect(caps).toEqual(['diary.view', 'voters.view']);
  });
});

describe('hasCapability', () => {
  it('is true when the capability is present', () => {
    expect(hasCapability(['voters.view'], 'voters.view')).toBe(true);
  });

  it('is false when absent', () => {
    expect(hasCapability(['voters.view'], 'voters.edit')).toBe(false);
  });
});
