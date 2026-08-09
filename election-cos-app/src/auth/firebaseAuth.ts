/**
 * Election-COS1.0 — Firebase Auth wrapper, minimal-footprint
 * IC-ECOS-BUILD-2026-V2 §4.3
 *
 * "Firebase Authentication stores user records in the United States. There
 * is no regional residency option." Permitted in the Auth record: UID,
 * email address, password hash (Firebase-managed), email-verified flag.
 * Forbidden: full name, phone number, SA ID number, photograph, address,
 * date of birth, any voter data.
 *
 * Enforcement is two-layered, deliberately redundant:
 *  1. Compile-time — every exported function's parameter type only accepts
 *     the permitted fields. There is no `...rest` or `Record<string, any>`
 *     escape hatch anywhere in this file.
 *  2. Runtime — assertMinimalAuthPayload is called before any write to
 *     Auth, and is exported so it can be unit-tested directly and reused by
 *     functions/src (Cloud Functions Admin SDK side does the actual write
 *     for staff invites; this client-side path covers self-serve auth
 *     flows like email link sign-in).
 *
 * Everything else about a staff member lives in
 * /tenants/{tenantId}/staff/{uid} in Firestore africa-south1 — see
 * src/auth/types.ts StaffProfile and src/dal/ports/staff.ts.
 */
import { getFirebaseAuth } from '@/dal/adapters/firestore/client';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';

export const PERMITTED_AUTH_FIELDS = ['uid', 'email', 'emailVerified'] as const;
export type PermittedAuthField = (typeof PERMITTED_AUTH_FIELDS)[number];

const FORBIDDEN_FIELD_HINTS = [
  'name',
  'firstName',
  'lastName',
  'displayName',
  'phone',
  'phoneNumber',
  'idNumber',
  'saIdNumber',
  'photo',
  'photoURL',
  'address',
  'dob',
  'dateOfBirth',
  'ward',
  'vd',
  'role',
];

/**
 * Runtime guard: throws if `payload` carries any key that is not one of the
 * permitted Auth fields, or whose name matches a forbidden-data hint (catches
 * accidental spreads of a StaffProfile-shaped object into an Auth call).
 */
export function assertMinimalAuthPayload(payload: Record<string, unknown>): void {
  const keys = Object.keys(payload);
  for (const key of keys) {
    const isPermitted = (PERMITTED_AUTH_FIELDS as readonly string[]).includes(key);
    if (!isPermitted) {
      throw new Error(
        `Refusing to write "${key}" to Firebase Auth — Auth records must contain UID and ` +
          `email only (§4.3). Store this field in /tenants/{tenantId}/staff/{uid} instead.`,
      );
    }
  }
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const hint of FORBIDDEN_FIELD_HINTS) {
    if (lowerKeys.some((k) => k.includes(hint.toLowerCase()))) {
      throw new Error(
        `Refusing Auth write — key resembling "${hint}" is forbidden in Firebase Auth (§4.3).`,
      );
    }
  }
}

export interface MinimalAuthCredential {
  email: string;
  password: string;
}

/** Interactive email/password sign-up. Auth record ends up with UID + email only. */
export async function signUpWithEmail({ email, password }: MinimalAuthCredential): Promise<User> {
  assertMinimalAuthPayload({ email });
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function signInWithEmail({ email, password }: MinimalAuthCredential): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

/**
 * Google Sign-in (popup flow). Session 10 — added at the human's explicit
 * request, using their existing Firebase project.
 *
 * TENSION WITH THE MINIMAL-FOOTPRINT RULE ABOVE, disclosed rather than
 * silently resolved: Firebase's Google OAuth integration automatically
 * populates `displayName`/`photoURL` on the resulting Auth user record as
 * a side effect of linking the provider — this is Firebase's own
 * behaviour, not something `assertMinimalAuthPayload` can intercept (it
 * only guards fields *this module* chooses to write). Mitigation: right
 * after a successful sign-in, this function scrubs both fields back to
 * null via `updateProfile()` — the best narrowing the Firebase Auth API
 * surface allows, not a guarantee those values were never transiently
 * present in Google's/Firebase's care during the OAuth handshake itself.
 * If the real answer is "keep the profile photo," that's a deliberate
 * policy change to make on purpose, not by silently skipping this scrub.
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  if (credential.user.displayName || credential.user.photoURL) {
    await updateProfile(credential.user, { displayName: null, photoURL: null });
  }
  return credential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

/** Projects a Firebase Auth user down to exactly the permitted fields. */
export function toMinimalAuthRecord(user: User): Pick<User, PermittedAuthField> {
  const record = {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
  };
  assertMinimalAuthPayload(record);
  return record as Pick<User, PermittedAuthField>;
}
