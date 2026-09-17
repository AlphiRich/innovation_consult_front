/**
 * Election Campaign OS — guards on the separations of duty
 *
 * Two halves, and the second is the one that was missing.
 *
 * The seed roles obey the separations — `roleModel.test.ts` has asserted
 * that for several sessions. What nothing asserted is that the mechanism
 * for departing from a role, per-user capability overrides, cannot
 * reassemble a separation silently. It could, with a checkbox.
 *
 * The first test below is also the one that caught this module's own
 * first draft inventing two rules this build does not hold. A rule that
 * fires on a correctly-configured seed role is worse than no rule: it
 * teaches an administrator that the warning is noise.
 */
import { describe, expect, it } from 'vitest';
import { SEED_ROLES } from '@/auth/seedRoles';
import { resolveEffectiveCapabilities } from '@/auth/capabilities';
import { ALL_CAPABILITIES } from '@/auth/allCapabilities';
import {
  CONCENTRATION_BASIS,
  dutyConcentrations,
  ROLE_WITHHOLDINGS,
  SEPARATION_RULES,
  withholdingBreaches,
} from './dutyConcentration';

const capsOf = (id: string) => SEED_ROLES.find((r) => r.id === id)!.defaultCaps;

describe('the rules describe this build, not a plausible one', () => {
  it('names capabilities and roles that exist', () => {
    for (const rule of SEPARATION_RULES) {
      for (const capability of rule.capabilities) {
        expect(ALL_CAPABILITIES, rule.label).toContain(capability);
      }
      expect(rule.capabilities.length, rule.label).toBeGreaterThan(1);
      expect(rule.reason.length, rule.label).toBeGreaterThan(40);
    }
    for (const withholding of ROLE_WITHHOLDINGS) {
      expect(SEED_ROLES.map((r) => r.id)).toContain(withholding.roleId);
      for (const capability of withholding.capabilities) {
        expect(ALL_CAPABILITIES, withholding.roleId).toContain(capability);
      }
    }
  });

  it('is breached by no seed role', () => {
    // The guard that caught the first draft of this module: it declared
    // "dsr.manage + ppfa.manage_thresholds" a general separation, which
    // party-hq-admin holds by design, and "the full funding set", which
    // finance-officer holds by design. Neither is a rule of this build.
    for (const role of SEED_ROLES) {
      expect(dutyConcentrations(role.defaultCaps), role.id).toEqual([]);
      expect(withholdingBreaches(role.id, role.defaultCaps), role.id).toEqual([]);
    }
  });

  it('records the two role-specific withholdings the role model reasons about', () => {
    // Cross-checked against roleModel.test.ts so the two cannot drift into
    // describing different rules.
    expect(capsOf('compliance-officer')).toContain('ppfa.edit');
    expect(capsOf('compliance-officer')).not.toContain('ppfa.manage_thresholds');
    expect(capsOf('compliance-officer')).not.toContain('ppfa.export');
    expect(capsOf('finance-officer')).toContain('ppfa.manage_thresholds');
    expect(capsOf('finance-officer')).not.toContain('dsr.manage');
    expect(ROLE_WITHHOLDINGS.map((w) => w.roleId)).toEqual(['compliance-officer', 'finance-officer']);
  });
});

describe('detecting a concentration', () => {
  it('finds nothing in a set that breaches nothing', () => {
    expect(dutyConcentrations(['voters.view', 'diary.edit'])).toEqual([]);
    expect(dutyConcentrations([])).toEqual([]);
  });

  it('fires only when every capability in a rule is held', () => {
    expect(dutyConcentrations(['ppfa.edit', 'dsr.manage'])).toEqual([]);
    expect(dutyConcentrations(['ppfa.edit', 'ppfa.manage_thresholds'])).toEqual([]);
    expect(dutyConcentrations(['ppfa.edit', 'ppfa.manage_thresholds', 'dsr.manage'])).toHaveLength(1);
  });

  /* ------------------------------------------------------------------ */
  /* The half that was missing: overrides                               */
  /* ------------------------------------------------------------------ */

  it('catches the separation reassembled by a per-user override', () => {
    // A Compliance Officer holds ppfa.edit and dsr.manage already. One
    // checkbox — ppfa.manage_thresholds — gives them the whole chain. The
    // role refuses it; the override screen offered it without a word.
    const resolved = resolveEffectiveCapabilities(
      { defaultCaps: capsOf('compliance-officer') },
      { granted: ['ppfa.manage_thresholds'], revoked: [] },
    );
    expect(dutyConcentrations(resolved)).toHaveLength(1);
  });

  it('catches it from the other direction too', () => {
    // A Finance Officer holds ppfa.edit and ppfa.manage_thresholds by
    // design. Granting dsr.manage completes the same combination.
    const resolved = resolveEffectiveCapabilities(
      { defaultCaps: capsOf('finance-officer') },
      { granted: ['dsr.manage'], revoked: [] },
    );
    expect(dutyConcentrations(resolved)).toHaveLength(1);
  });

  it('clears when a revocation breaks the combination', () => {
    // A revocation is as real as a grant, and the warning follows the
    // resolved set rather than the checkboxes ticked on either side.
    const resolved = resolveEffectiveCapabilities(
      { defaultCaps: capsOf('compliance-officer') },
      { granted: ['ppfa.manage_thresholds'], revoked: ['dsr.manage'] },
    );
    expect(dutyConcentrations(resolved)).toEqual([]);
  });
});

describe('detecting a role-specific departure', () => {
  it('names what a Compliance Officer is deliberately denied', () => {
    const resolved = resolveEffectiveCapabilities(
      { defaultCaps: capsOf('compliance-officer') },
      { granted: ['ppfa.export'], revoked: [] },
    );
    const breaches = withholdingBreaches('compliance-officer', resolved);
    expect(breaches).toHaveLength(1);
    expect(breaches[0].held).toEqual(['ppfa.export']);
    expect(breaches[0].withholding.reason).toMatch(/deliberately kept away/i);
  });

  it('names what a Finance Officer is deliberately denied', () => {
    const resolved = resolveEffectiveCapabilities(
      { defaultCaps: capsOf('finance-officer') },
      { granted: ['dsr.view', 'dsr.manage'], revoked: [] },
    );
    const breaches = withholdingBreaches('finance-officer', resolved);
    expect(breaches[0].held).toEqual(['dsr.view', 'dsr.manage']);
  });

  it('says nothing about a role it has no withholdings for', () => {
    expect(withholdingBreaches('canvasser', ['ppfa.export', 'dsr.manage'])).toEqual([]);
    expect(withholdingBreaches('party-hq-admin', capsOf('party-hq-admin'))).toEqual([]);
  });
});

describe('what the warning says about itself', () => {
  it('is a warning, and says so', () => {
    expect(CONCENTRATION_BASIS).toMatch(/does not stop you saving/i);
    expect(CONCENTRATION_BASIS).toMatch(/must not be is accidental/i);
    expect(CONCENTRATION_BASIS).not.toMatch(/\b(prohibited|forbidden|not allowed|blocked)\b/i);
  });
});
