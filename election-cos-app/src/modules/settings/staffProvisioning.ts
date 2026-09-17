/**
 * Election Campaign OS — adding a person to the team
 * IC-ECOS-BUILD-2026-V2 §4.3, §4.4.
 *
 * WHAT THIS DOES AND WHAT IT DELIBERATELY DOES NOT
 *
 * It builds the staff record that gives a person a role, a geographic
 * scope and therefore a token. It does **not** create their sign-in
 * account. Creating a Firebase Auth account for someone else requires the
 * Admin SDK, which means a Cloud Function that does not exist in this
 * build — so the account is created by the person themselves, signing in
 * once and reaching the "Awaiting access" screen, which shows them the
 * sign-in ID to hand to their administrator.
 *
 * That ordering is not a workaround. It keeps this product out of the
 * business of holding anyone's password, and it keeps the Auth record to
 * the UID and email address §4.3 permits: the name, the phone number, the
 * role and the scope are written here, to Firestore in South Africa, and
 * never to Auth.
 *
 * TWO SILENT FAILURES THIS EXISTS TO PREVENT
 *
 * Both produce an account that signs in perfectly and then shows an empty
 * application, with nothing on screen to say why:
 *
 *  1. **A ward or VD role saved with no scope.** `inScope()` in
 *     firestore.rules compares the record's ward against the token's
 *     `wardScope`. An absent scope fails that comparison for every record
 *     in the tenant, so the user is denied everything — safely, but
 *     invisibly. Required here rather than discovered in the field.
 *  2. **A scope set on a role that has none.** A tenant-wide role carries
 *     its ward on the token and `inScope()` ignores it, so the record
 *     reads as a restriction that is not applied. Refused, because a
 *     staff record that appears to limit someone and does not is worse
 *     than one that plainly does not limit them.
 */
import { SEED_ROLES } from '@/auth/seedRoles';
import type { GeoScope, StaffProfile } from '@/auth/types';

/**
 * Firebase Auth sets the shape of a UID, not this product. Documented as
 * at most 128 characters; the rest is Google's business. So this validates
 * only what it can defend — present, no whitespace, within that limit —
 * rather than asserting a character set that a future Firebase release
 * could widen and this code would then reject.
 */
export const MAX_SIGN_IN_ID_LENGTH = 128;

export const SIGN_IN_ID_BASIS =
  'The sign-in ID is the identifier Firebase Authentication issues when a person first signs in. ' +
  'It is shown to them on the “Awaiting access” screen. It is not their email address, and there is ' +
  'no way to look one up from an email address in this build — the person has to send it to you.';

export interface StaffDraft {
  signInId: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleId: string;
  wardScope: string;
  vdScope: string;
}

export type ProvisioningField = 'signInId' | 'firstName' | 'lastName' | 'phone' | 'roleId' | 'wardScope' | 'vdScope';

export interface ProvisioningProblem {
  field: ProvisioningField;
  message: string;
}

export const EMPTY_DRAFT: StaffDraft = {
  signInId: '',
  firstName: '',
  lastName: '',
  phone: '',
  roleId: '',
  wardScope: '',
  vdScope: '',
};

/** Which scope field a role requires, derived from the role itself. */
export function scopeRequirement(roleId: string): GeoScope | null {
  return SEED_ROLES.find((r) => r.id === roleId)?.geoScope ?? null;
}

export function provisioningProblems(draft: StaffDraft, existingUids: string[]): ProvisioningProblem[] {
  const problems: ProvisioningProblem[] = [];
  const signInId = draft.signInId.trim();
  const wardScope = draft.wardScope.trim();
  const vdScope = draft.vdScope.trim();

  if (signInId === '') {
    problems.push({ field: 'signInId', message: 'Sign-in ID is required. ' + SIGN_IN_ID_BASIS });
  } else if (/\s/.test(signInId)) {
    problems.push({ field: 'signInId', message: 'A sign-in ID contains no spaces — check for a stray line break.' });
  } else if (signInId.includes('@')) {
    problems.push({
      field: 'signInId',
      message: 'That looks like an email address. The sign-in ID is a separate identifier — see the “Awaiting access” screen.',
    });
  } else if (signInId.length > MAX_SIGN_IN_ID_LENGTH) {
    problems.push({ field: 'signInId', message: `A sign-in ID is at most ${MAX_SIGN_IN_ID_LENGTH} characters.` });
  } else if (existingUids.includes(signInId)) {
    problems.push({ field: 'signInId', message: 'This person is already on the team. Edit their record instead.' });
  }

  if (draft.firstName.trim() === '') problems.push({ field: 'firstName', message: 'First name is required.' });
  if (draft.lastName.trim() === '') problems.push({ field: 'lastName', message: 'Last name is required.' });
  if (draft.phone.trim() === '') {
    problems.push({ field: 'phone', message: 'A contact number is required — a field team that cannot be reached is not a team.' });
  }

  const geoScope = scopeRequirement(draft.roleId);
  if (geoScope === null) {
    problems.push({ field: 'roleId', message: 'Choose a role.' });
    return problems;
  }

  if (geoScope === 'WARD' && wardScope === '') {
    problems.push({
      field: 'wardScope',
      message: 'This role is scoped to a ward, so it needs a ward code. Without one they will sign in to an empty application.',
    });
  }
  if (geoScope === 'VD' && vdScope === '') {
    problems.push({
      field: 'vdScope',
      message: 'This role is scoped to a voting district, so it needs a VD code. Without one they will sign in to an empty application.',
    });
  }
  if (geoScope !== 'WARD' && geoScope !== 'VD' && (wardScope !== '' || vdScope !== '')) {
    problems.push({
      field: 'wardScope',
      message: 'This role sees the whole tenant, so a ward or VD code here would be recorded but never applied. Clear it.',
    });
  }
  if (geoScope === 'WARD' && vdScope !== '') {
    problems.push({ field: 'vdScope', message: 'A ward role is not narrowed by a VD code. Clear it.' });
  }
  // A VD role is narrowed on the voting district and deliberately not on
  // its ward — `geoScope.test.ts` asserts that branch is distinct. A ward
  // code here would be stamped on the token and never consulted, which is
  // the same recorded-but-not-applied problem refused above.
  if (geoScope === 'VD' && wardScope !== '') {
    problems.push({ field: 'wardScope', message: 'A voting-district role is narrowed on the VD, not the ward. Clear it.' });
  }

  return problems;
}

/**
 * The record as it will be written. New staff start with no capability
 * overrides: the role is the decision, and an override made at the moment
 * of joining is an exception nobody has had a reason to make yet.
 */
export function toStaffProfile(draft: StaffDraft, tenantId: string): StaffProfile {
  const geoScope = scopeRequirement(draft.roleId);
  const wardScope = draft.wardScope.trim();
  const vdScope = draft.vdScope.trim();
  return {
    uid: draft.signInId.trim(),
    tenantId,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    phone: draft.phone.trim(),
    roleId: draft.roleId,
    wardScope: geoScope === 'WARD' ? wardScope || undefined : undefined,
    vdScope: geoScope === 'VD' ? vdScope || undefined : undefined,
    capOverrides: { granted: [], revoked: [] },
    active: true,
  };
}
