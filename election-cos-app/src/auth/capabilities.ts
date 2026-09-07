/**
 * Election Campaign OS — effective capability resolver
 * IC-ECOS-BUILD-2026-V2 §4.4
 *
 * "Resolve on the server in a Cloud Function, write to custom claims, force
 * token refresh on change. Never resolve capabilities client-side for
 * authorisation purposes — client-side resolution is for rendering only."
 *
 * This function is the shared logic used by both:
 *  - functions/src/resolveCapabilities.ts (the authoritative, server-side
 *    resolution that gets written to custom claims), and
 *  - client-side rendering (e.g. Shell.tsx deciding which nav items to
 *    show) — which is UX only and never trusted for access control. The
 *    real gate is always the token claims, checked again in
 *    firestore.rules and in the DAL.
 */
import type { Capability, Role, StaffProfile } from './types';

export function resolveEffectiveCapabilities(
  role: Pick<Role, 'defaultCaps'>,
  overrides: StaffProfile['capOverrides'],
): Capability[] {
  const granted = new Set<Capability>([...role.defaultCaps, ...overrides.granted]);
  for (const revoked of overrides.revoked) {
    granted.delete(revoked);
  }
  return [...granted].sort();
}

export function hasCapability(caps: Capability[], required: Capability): boolean {
  return caps.includes(required);
}
