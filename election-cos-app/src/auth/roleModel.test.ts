import { describe, expect, it } from 'vitest';
import { SEED_ROLES } from './seedRoles';
import type { Capability } from './types';

/**
 * Election Campaign OS — the role model decision, as a test
 *
 * Seven roles, `compliance-officer` included. Decided 13 Sep 2026 by the
 * project owner; reasoning in `seedRoles.ts` and `BUILD-STATUS.md`.
 *
 * This file exists for the same reason `dalAdapter.test.ts` does: the
 * role count has been raised as an inconsistency by several uploaded
 * artefacts, and the `ecos-rbac-config` skill names role-count drift as a
 * previously-flagged defect class in this project. The next challenge
 * should meet a failing test and a decision record, not a fresh debate.
 *
 * It is a tripwire, not a prohibition. Changing the role model means
 * changing these expectations deliberately.
 */

const byId = (id: string) => SEED_ROLES.find((r) => r.id === id);
const capsOf = (id: string): Capability[] => byId(id)?.defaultCaps ?? [];

describe('the role model', () => {
  it('has exactly seven seed roles', () => {
    expect(SEED_ROLES).toHaveLength(7);
  });

  it('is the canonical six plus Compliance Officer, with nothing else added', () => {
    // The six the ecos-rbac-config skill calls canonical, in this repo's
    // own id vocabulary, plus the one a product decision added.
    expect(SEED_ROLES.map((r) => r.id).sort()).toEqual(
      [
        'canvasser', // VOLUNTEER
        'compliance-officer', // the decided seventh
        'finance-officer', // FINANCE_OFFICER
        'municipal-team-lead', // LOCAL_HEAD
        'party-hq-admin', // HQ_ADMIN
        'vd-captain', // VD_CAPTAIN
        'ward-lead', // WARD_LEAD
      ].sort(),
    );
  });

  it('gives every role a geographic scope and marks all seven as system roles', () => {
    for (const role of SEED_ROLES) {
      expect(role.geoScope, role.id).toBeTruthy();
      expect(role.systemRole, role.id).toBe(true);
      expect(role.label.trim(), role.id).not.toBe('');
    }
  });
});

describe('compliance-officer earns its place', () => {
  it('holds the DSR capabilities that justify it being a login role', () => {
    expect(capsOf('compliance-officer')).toContain('dsr.view');
    expect(capsOf('compliance-officer')).toContain('dsr.manage');
  });

  it('can action POPIA corrections over donor records', () => {
    // ppfa.edit is load-bearing for the role's actual job — POPIA's
    // correction right over a donor record cannot be actioned without it.
    expect(capsOf('compliance-officer')).toContain('ppfa.edit');
  });

  it('cannot set the thresholds that decide what is disclosed about a donor', () => {
    // The one combination worth refusing outright: the person who answers
    // a donor's data request must not also control the disclosure
    // thresholds applied to that donor.
    expect(capsOf('compliance-officer')).not.toContain('ppfa.manage_thresholds');
    expect(capsOf('compliance-officer')).not.toContain('ppfa.export');
  });
});

describe('separation of duties across the PPFA capabilities', () => {
  it('keeps ppfa.edit and ppfa.manage_thresholds apart except for Finance Officer', () => {
    const bothByDefault = SEED_ROLES.filter(
      (r) => r.defaultCaps.includes('ppfa.edit') && r.defaultCaps.includes('ppfa.manage_thresholds'),
    ).map((r) => r.id);
    expect(bothByDefault).toEqual(['finance-officer']);
  });

  it('leaves the donor ledger editable by only the two roles whose job it is', () => {
    const editors = SEED_ROLES.filter((r) => r.defaultCaps.includes('ppfa.edit')).map((r) => r.id).sort();
    expect(editors).toEqual(['compliance-officer', 'finance-officer']);
  });

  it('does not let the Finance Officer answer data subject requests', () => {
    // The mirror of the check above: funding compliance and data
    // compliance are separate jobs and separate people.
    expect(capsOf('finance-officer')).not.toContain('dsr.view');
    expect(capsOf('finance-officer')).not.toContain('dsr.manage');
  });

  it('grants no role every capability at once', () => {
    for (const role of SEED_ROLES) {
      const hasFullPpfa =
        role.defaultCaps.includes('ppfa.edit') &&
        role.defaultCaps.includes('ppfa.manage_thresholds') &&
        role.defaultCaps.includes('dsr.manage');
      expect(hasFullPpfa, `${role.id} concentrates funding and data compliance`).toBe(false);
    }
  });
});

/**
 * The skill's first and sixth non-negotiables: permissions are checked
 * against capabilities, never against a hardcoded role string. This is
 * the specific discipline whose absence produced the FINANCE_OFFICER
 * seed gap the skill was written about.
 */
describe('permissions are capability-checked, never role-checked', () => {
  it('names no seed role id anywhere in firestore.rules', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    // Strip comments first. The rules file explains its capability splits
    // in prose ("a canvasser who can log an incident cannot authorise its
    // escalation") — scanning raw text matches the explanation rather than
    // the logic, which is the wrong thing to measure. Same precedent as
    // referralDocument.test.ts.
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, '');
    for (const role of SEED_ROLES) {
      expect(rules, `firestore.rules hardcodes the role "${role.id}"`).not.toContain(role.id);
    }
    // And it does check capabilities, so the assertion above is not
    // passing because the file simply has no authorisation logic.
    expect(rules).toContain("cap('");
  });
});
