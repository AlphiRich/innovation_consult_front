/**
 * Election Campaign OS — seed roles
 * IC-ECOS-BUILD-2026-V2 §4.4
 *
 * Seven seed roles, labels from the Stitch screens. The permissions screen
 * shows a Finance-Officer-locked capability row, which corroborates this
 * count (master index §3.3, resolving canonical review finding C3).
 *
 * Separation-of-duties note (§4.4): `ppfa.manage_thresholds` changes what
 * the law is understood to require; `ppfa.edit` changes what was donated.
 * They are deliberately not both defaulted to the same role except Finance
 * Officer, whose whole function is PPFA — a tenant may override this, but
 * must do so deliberately, not by seed-data accident.
 *
 * SEVEN ROLES — DECIDED 13 Sep 2026. `compliance-officer` stays.
 *
 * These seven map one-to-one onto the six the `ecos-rbac-config` skill
 * calls canonical, plus Compliance Officer. That skill warns that WBS
 * task-owner labels (COMPLIANCE_OFFICER, INFORMATION_OFFICER, …) must not
 * leak into login RBAC "unless a product decision explicitly adds them".
 * This is that decision, and the role meets the carve-out rather than
 * relying on it: it holds two real capabilities (`dsr.view`/`dsr.manage`),
 * they gate a built page (`DataSubjectRequestsPage.tsx`), and they are
 * enforced server-side in `firestore.rules` — it is a login role that does
 * work, not a label borrowed from a project plan.
 *
 * Why it is not folded into another role, in POPIA/PPFA terms:
 *
 *  - `party-hq-admin` also holds `dsr.*` but deliberately does NOT hold
 *    `ppfa.edit`. Folding POPIA duties there would make data-subject
 *    handling an HQ-admin-only function — the opposite of the separation
 *    POPIA's information-officer concept assumes.
 *  - `finance-officer` holds the full PPFA set including `ppfa.export` and
 *    `ppfa.manage_thresholds`. Folding POPIA duties there would let the
 *    person who answers a donor's data request also set the disclosure
 *    thresholds that determine what must be published about that donor.
 *    That is the one combination worth refusing outright.
 *
 * Compliance Officer holds `ppfa.view` + `ppfa.edit` but NOT `ppfa.export`
 * and NOT `ppfa.manage_thresholds`. `ppfa.edit` is there because POPIA's
 * correction right (§24) over a donor record cannot be actioned without
 * it — the capability is load-bearing for the role's actual job, not
 * convenience. The compensating controls are structural rather than
 * procedural: `donations` and `donorLedger` are `delete: if false`, so a
 * correction can amend but never remove, and `ppfaConfigs` is append-only
 * so history cannot be rewritten to match an amendment.
 *
 * Guarded by `roleModel.test.ts`.
 */
import type { Role } from './types';

export const SEED_ROLES: Role[] = [
  {
    id: 'party-hq-admin',
    label: 'Party HQ Admin',
    geoScope: 'TENANT',
    systemRole: true,
    defaultCaps: [
      'warroom.view',
      'voters.view',
      'wards.view',
      'wards.edit',
      'diary.view',
      'incidents.view',
      'incidents.triage',
      'incidents.escalate',
      'logistics.view',
      'logistics.edit',
      'logistics.approve',
      'ppfa.view',
      'ppfa.manage_thresholds',
      'analytics.view',
      'analytics.export',
      'team.manage',
      'settings.tenant',
      'settings.permissions',
      'dsr.view',
      'dsr.manage',
    ],
  },
  {
    id: 'municipal-team-lead',
    label: 'Municipal Team Lead',
    geoScope: 'MUNICIPALITY',
    systemRole: true,
    defaultCaps: [
      'warroom.view',
      'voters.view',
      'voters.edit',
      'wards.view',
      'diary.view',
      'diary.edit',
      'incidents.view',
      'incidents.escalate',
      'logistics.view',
      'logistics.edit',
      'analytics.view',
    ],
  },
  {
    id: 'ward-lead',
    label: 'Ward Lead',
    geoScope: 'WARD',
    systemRole: true,
    defaultCaps: [
      'warroom.view',
      'voters.view',
      'voters.edit',
      'diary.view',
      'diary.edit',
      'incidents.view',
      'incidents.triage',
      'logistics.view',
      'logistics.edit',
      'analytics.view',
    ],
  },
  {
    id: 'vd-captain',
    label: 'VD Captain',
    geoScope: 'VD',
    systemRole: true,
    defaultCaps: [
      'voters.view',
      'voters.edit',
      'diary.view',
      'diary.edit',
      'incidents.view',
      'incidents.create',
      // Added session 9: VD Captain had zero logistics capabilities,
      // meaning the "request materials" action the Stitch reference
      // screens show on their dashboard was impossible — logistics.edit
      // covers requesting/logging stock; approval stays a separate
      // capability (logistics.approve) nobody at this level holds.
      'logistics.view',
      'logistics.edit',
    ],
  },
  {
    id: 'canvasser',
    label: 'Canvasser',
    geoScope: 'VD',
    systemRole: true,
    defaultCaps: ['voters.view', 'voters.edit', 'diary.view', 'diary.edit', 'incidents.create'],
  },
  {
    id: 'compliance-officer',
    label: 'Compliance Officer',
    geoScope: 'TENANT',
    systemRole: true,
    defaultCaps: ['voters.view', 'ppfa.view', 'ppfa.edit', 'analytics.view', 'dsr.view', 'dsr.manage'],
  },
  {
    id: 'finance-officer',
    label: 'Finance Officer',
    geoScope: 'TENANT',
    systemRole: true,
    defaultCaps: ['ppfa.view', 'ppfa.edit', 'ppfa.export', 'ppfa.manage_thresholds'],
  },
];
