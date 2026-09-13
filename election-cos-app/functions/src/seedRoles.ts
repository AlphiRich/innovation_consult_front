/**
 * Election Campaign OS — role table (GENERATED — DO NOT EDIT)
 *
 * Generated from `src/auth/seedRoles.ts` by `npm run gen:roles`.
 * `src/auth/roleMirror.test.ts` fails if this file and that one disagree.
 *
 * The client and the server must resolve the same capabilities from the
 * same role, or a user sees a page the token will not let them use —
 * which reads as a bug in the page rather than as a drift between two
 * copies of a table.
 */

export interface SeedRole {
  geoScope: 'TENANT' | 'MUNICIPALITY' | 'WARD' | 'VD';
  defaultCaps: string[];
}

export const SEED_ROLES: Record<string, SeedRole> = {
  'party-hq-admin': {
    geoScope: 'TENANT',
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
  'municipal-team-lead': {
    geoScope: 'MUNICIPALITY',
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
  'ward-lead': {
    geoScope: 'WARD',
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
  'vd-captain': {
    geoScope: 'VD',
    defaultCaps: [
      'voters.view',
      'voters.edit',
      'diary.view',
      'diary.edit',
      'incidents.view',
      'incidents.create',
      'logistics.view',
      'logistics.edit',
    ],
  },
  'canvasser': {
    geoScope: 'VD',
    defaultCaps: [
      'voters.view',
      'voters.edit',
      'diary.view',
      'diary.edit',
      'incidents.create',
    ],
  },
  'compliance-officer': {
    geoScope: 'TENANT',
    defaultCaps: [
      'voters.view',
      'ppfa.view',
      'ppfa.edit',
      'analytics.view',
      'dsr.view',
      'dsr.manage',
    ],
  },
  'finance-officer': {
    geoScope: 'TENANT',
    defaultCaps: [
      'ppfa.view',
      'ppfa.edit',
      'ppfa.export',
      'ppfa.manage_thresholds',
    ],
  },
};

export function seedRole(roleId: string): SeedRole | null {
  return Object.prototype.hasOwnProperty.call(SEED_ROLES, roleId) ? SEED_ROLES[roleId] : null;
}
