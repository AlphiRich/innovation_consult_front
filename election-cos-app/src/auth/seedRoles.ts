/**
 * Election-COS1.0 — seed roles
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
