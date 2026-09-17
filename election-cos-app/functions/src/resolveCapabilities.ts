/**
 * Election Campaign OS — resolveCapabilities Cloud Function
 * IC-ECOS-BUILD-2026-V2 §4.4.
 *
 * "Resolve on the server in a Cloud Function, write to custom claims, force
 * token refresh on change. Never resolve capabilities client-side for
 * authorisation purposes." Triggered on staff/{uid} document write.
 *
 * NOTE: not yet deployed/wired to a live Firebase project this session —
 * see BUILD-STATUS.md. The pure resolution logic it calls
 * (resolveEffectiveCapabilities) lives in src/auth/capabilities.ts on the
 * app side and is duplicated here in trimmed form until the two packages
 * share a workspace; keep them in sync, or better, extract to a shared
 * package before Phase 2 sign-off.
 *
 * SESSION 27 — the role lookup was a placeholder that resolved
 * `defaultCaps: []` for every role, so a user's effective capabilities
 * were their per-user overrides and nothing else. Assigning someone the
 * Ward Lead role would have stamped an empty `caps` claim into their
 * token: every page hidden, every rule refusing, and the cause invisible
 * from the client. Found while writing SOP-02, which documents exactly
 * this step.
 *
 * Its TODO said to load a per-tenant Role document. That premise is
 * stale — this build decided against tenant-customisable roles, and
 * `PermissionsPage.tsx` renders the seven seed roles read-only. So the
 * table is what it should be: static, generated from the client's copy by
 * `npm run gen:roles`, and guarded by `src/auth/roleMirror.test.ts`. If
 * tenant-defined roles ever arrive, this is the one place that changes.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { REGION } from './region';
import { seedRole } from './seedRoles';

if (!getApps().length) initializeApp();

interface StaffProfile {
  roleId: string;
  tenantId: string;
  wardScope?: string;
  vdScope?: string;
  active: boolean;
  capOverrides: { granted: string[]; revoked: string[] };
}

function resolveEffectiveCapabilities(role: { defaultCaps: string[] }, overrides: StaffProfile['capOverrides']) {
  const granted = new Set<string>([...role.defaultCaps, ...overrides.granted]);
  for (const revoked of overrides.revoked) granted.delete(revoked);
  return [...granted].sort();
}

export const resolveCapabilities = onDocumentWritten(
  { document: 'tenants/{tenantId}/staff/{uid}', region: REGION },
  async (event) => {
    const after = event.data?.after?.data() as StaffProfile | undefined;
    const { tenantId, uid } = event.params as { tenantId: string; uid: string };

    if (!after || !after.active) {
      // Deactivated or deleted staff: strip tenant claims so a stale token
      // can't be used for access, without touching the (minimal) Auth record.
      await getAuth().setCustomUserClaims(uid, null);
      return;
    }

    const role = seedRole(after.roleId);
    if (!role) {
      // An unknown role is not a reason to stamp a partial token. Strip the
      // claims instead: the user lands on "Awaiting access" and an
      // administrator can see that the assignment did not take, which is
      // recoverable. A token carrying overrides but no role would look like
      // a working account with inexplicably missing pages.
      console.error(`resolveCapabilities: unknown roleId "${after.roleId}" for ${tenantId}/${uid}`);
      await getAuth().setCustomUserClaims(uid, null);
      return;
    }

    const caps = resolveEffectiveCapabilities(role, after.capOverrides);

    await getAuth().setCustomUserClaims(uid, {
      tenantId,
      roleId: after.roleId,
      caps,
      geoScope: role.geoScope,
      wardScope: after.wardScope,
      vdScope: after.vdScope,
    });
    // Client must force a token refresh (getIdToken(true)) to pick this up.
  },
);
