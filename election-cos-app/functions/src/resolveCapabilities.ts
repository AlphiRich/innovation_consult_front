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
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { REGION } from './region';

if (!getApps().length) initializeApp();

interface Role {
  defaultCaps: string[];
  geoScope: string;
}
interface StaffProfile {
  roleId: string;
  tenantId: string;
  wardScope?: string;
  vdScope?: string;
  active: boolean;
  capOverrides: { granted: string[]; revoked: string[] };
}

function resolveEffectiveCapabilities(role: Pick<Role, 'defaultCaps'>, overrides: StaffProfile['capOverrides']) {
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

    // TODO(Phase 2 sign-off): load the tenant's Role document by roleId
    // instead of this placeholder. Roles are tenant-configurable, not a
    // hardcoded table — see src/auth/seedRoles.ts for the seed data shape.
    const role: Role = { defaultCaps: [], geoScope: 'VD' };

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
