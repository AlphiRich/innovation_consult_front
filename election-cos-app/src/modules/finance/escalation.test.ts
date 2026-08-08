import { describe, expect, it } from 'vitest';
import { levelForAggregate, requiresNamedAcknowledgement } from './escalation';
import { defaultPPFAConfig } from './ppfaDefaults';
import type { PPFAConfig } from '@/dal/ports/ppfaConfig';

const config: PPFAConfig = {
  id: 'cfg-1',
  createdAt: new Date().toISOString(),
  ...defaultPPFAConfig('tenant-1', 'uid-1'),
};

// IC-ECOS-BUILD-2026-V2 §6.8.3 escalation ladder table.
describe('levelForAggregate', () => {
  it('is null below the warning threshold', () => {
    expect(levelForAggregate(100_000_00, config)).toBeNull();
  });

  it('is WARNING at 80% of the disclosure threshold (R160,000)', () => {
    expect(levelForAggregate(160_000_00, config)).toBe('WARNING');
  });

  it('is DISCLOSURE_REQUIRED at the disclosure threshold (R200,000)', () => {
    expect(levelForAggregate(200_000_00, config)).toBe('DISCLOSURE_REQUIRED');
  });

  it('is CAP_APPROACHING at 80% of the annual cap (R24,000,000)', () => {
    expect(levelForAggregate(24_000_000_00, config)).toBe('CAP_APPROACHING');
  });

  it('is CAP_EXCEEDED at the annual cap (R30,000,000)', () => {
    expect(levelForAggregate(30_000_000_00, config)).toBe('CAP_EXCEEDED');
  });

  it('never returns a level for a donation below any threshold, even a huge single one just under cap', () => {
    expect(levelForAggregate(29_999_999_99, config)).toBe('CAP_APPROACHING');
  });
});

describe('requiresNamedAcknowledgement', () => {
  it('is true only for CAP_EXCEEDED', () => {
    expect(requiresNamedAcknowledgement('CAP_EXCEEDED')).toBe(true);
    expect(requiresNamedAcknowledgement('CAP_APPROACHING')).toBe(false);
    expect(requiresNamedAcknowledgement('DISCLOSURE_REQUIRED')).toBe(false);
    expect(requiresNamedAcknowledgement('WARNING')).toBe(false);
  });
});
