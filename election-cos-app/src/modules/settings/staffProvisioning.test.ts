import { describe, expect, it } from 'vitest';
import { SEED_ROLES } from '@/auth/seedRoles';
import {
  EMPTY_DRAFT,
  MAX_SIGN_IN_ID_LENGTH,
  provisioningProblems,
  scopeRequirement,
  toStaffProfile,
  type StaffDraft,
} from './staffProvisioning';

const draft = (over: Partial<StaffDraft> = {}): StaffDraft => ({
  ...EMPTY_DRAFT,
  signInId: 'aB3xYz9QwErTyUiOpAsDfGhJkLzX',
  firstName: 'Thandi',
  lastName: 'Mokoena',
  phone: '0821234567',
  roleId: 'party-hq-admin',
  ...over,
});

const fieldsIn = (problems: ReturnType<typeof provisioningProblems>) => problems.map((p) => p.field);

describe('adding a person to the team', () => {
  it('accepts a complete tenant-scoped record', () => {
    expect(provisioningProblems(draft(), [])).toEqual([]);
  });

  it('requires the things a staff record cannot work without', () => {
    const problems = provisioningProblems({ ...EMPTY_DRAFT }, []);
    expect(fieldsIn(problems)).toEqual(
      expect.arrayContaining(['signInId', 'firstName', 'lastName', 'phone', 'roleId']),
    );
  });

  it('stops at the role when no role is chosen, rather than guessing a scope rule', () => {
    const problems = provisioningProblems(draft({ roleId: '' }), []);
    expect(problems.filter((p) => p.field === 'roleId')).toHaveLength(1);
    expect(fieldsIn(problems)).not.toContain('wardScope');
  });
});

describe('the sign-in ID', () => {
  it('rejects an email address with an explanation, because that is the likely mistake', () => {
    const [problem] = provisioningProblems(draft({ signInId: 'thandi@example.org' }), []);
    expect(problem.field).toBe('signInId');
    expect(problem.message).toMatch(/email address/i);
    expect(problem.message).toMatch(/Awaiting access/);
  });

  it('rejects a pasted value carrying whitespace', () => {
    expect(fieldsIn(provisioningProblems(draft({ signInId: 'abc def' }), []))).toContain('signInId');
  });

  it('rejects one longer than Firebase issues', () => {
    const tooLong = 'a'.repeat(MAX_SIGN_IN_ID_LENGTH + 1);
    expect(fieldsIn(provisioningProblems(draft({ signInId: tooLong }), []))).toContain('signInId');
  });

  it('refuses a second record for someone already on the team', () => {
    const existing = ['aB3xYz9QwErTyUiOpAsDfGhJkLzX'];
    const [problem] = provisioningProblems(draft(), existing);
    expect(problem.message).toMatch(/already on the team/i);
  });
});

/**
 * The whole reason this module exists. Both directions produce an account
 * that signs in and then shows nothing, with no error anywhere to explain
 * it — one because `inScope()` denies every record, the other because the
 * scope recorded is never consulted.
 */
describe('geographic scope is required exactly where the role has one', () => {
  it('refuses a ward role with no ward code', () => {
    const problems = provisioningProblems(draft({ roleId: 'ward-lead' }), []);
    expect(fieldsIn(problems)).toEqual(['wardScope']);
    expect(problems[0].message).toMatch(/empty application/i);
  });

  it('refuses a VD role with no VD code', () => {
    const problems = provisioningProblems(draft({ roleId: 'canvasser' }), []);
    expect(fieldsIn(problems)).toEqual(['vdScope']);
  });

  it('accepts each role once its own scope is supplied', () => {
    expect(provisioningProblems(draft({ roleId: 'ward-lead', wardScope: 'NW405-W12' }), [])).toEqual([]);
    expect(provisioningProblems(draft({ roleId: 'canvasser', vdScope: '86910138' }), [])).toEqual([]);
  });

  it('refuses a scope on a role that sees the whole tenant', () => {
    const problems = provisioningProblems(draft({ roleId: 'finance-officer', wardScope: 'NW405-W12' }), []);
    expect(problems[0].message).toMatch(/recorded but never applied/i);
  });

  it('refuses a VD code on a ward role and a ward code on a VD role', () => {
    expect(
      fieldsIn(provisioningProblems(draft({ roleId: 'ward-lead', wardScope: 'NW405-W12', vdScope: '869' }), [])),
    ).toEqual(['vdScope']);
    // A VD role narrows on the voting district and deliberately not on its
    // ward — geoScope.test.ts asserts that branch is distinct, so a ward
    // code here would be stamped on the token and never consulted.
    expect(
      fieldsIn(provisioningProblems(draft({ roleId: 'canvasser', vdScope: '869', wardScope: 'NW405-W12' }), [])),
    ).toEqual(['wardScope']);
  });

  it('derives the requirement from the role table rather than a second list', () => {
    for (const role of SEED_ROLES) {
      expect(scopeRequirement(role.id), role.id).toBe(role.geoScope);
    }
    expect(scopeRequirement('no-such-role')).toBeNull();
  });
});

describe('the record that gets written', () => {
  it('trims what it stores and starts with no capability overrides', () => {
    const profile = toStaffProfile(
      draft({ signInId: '  uid123  ', firstName: ' Thandi ', lastName: ' Mokoena ', phone: ' 082 123 4567 ' }),
      'tenant-a',
    );
    expect(profile.uid).toBe('uid123');
    expect(profile.firstName).toBe('Thandi');
    expect(profile.phone).toBe('082 123 4567');
    expect(profile.capOverrides).toEqual({ granted: [], revoked: [] });
    expect(profile.active).toBe(true);
    expect(profile.tenantId).toBe('tenant-a');
  });

  it('stores only the scope the role actually uses', () => {
    const ward = toStaffProfile(draft({ roleId: 'ward-lead', wardScope: 'NW405-W12' }), 't');
    expect(ward.wardScope).toBe('NW405-W12');
    expect(ward.vdScope).toBeUndefined();

    const vd = toStaffProfile(draft({ roleId: 'canvasser', vdScope: '86910138' }), 't');
    expect(vd.vdScope).toBe('86910138');
    expect(vd.wardScope).toBeUndefined();

    const hq = toStaffProfile(draft({ roleId: 'party-hq-admin' }), 't');
    expect(hq.wardScope).toBeUndefined();
    expect(hq.vdScope).toBeUndefined();
  });

  it('never carries a field Firebase Auth is forbidden to hold into the Auth record', () => {
    // The staff record is the *Firestore* half of a person, deliberately —
    // §4.3 keeps name, phone, role and scope out of Auth entirely. This
    // asserts the shape stays that way: everything below is written to
    // Firestore in South Africa, and `firebaseAuth.ts` would throw on any
    // attempt to send it to Auth instead.
    const profile = toStaffProfile(draft(), 't');
    expect(Object.keys(profile).sort()).toEqual(
      ['active', 'capOverrides', 'firstName', 'lastName', 'phone', 'roleId', 'tenantId', 'uid', 'vdScope', 'wardScope'].sort(),
    );
  });
});
