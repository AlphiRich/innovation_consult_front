/**
 * Election Campaign OS — capability model
 * IC-ECOS-BUILD-2026-V2 §4.4
 *
 * The Stitch permissions screen shows role → capability toggles → per-user
 * override. This is that model: a role is a named bundle of default
 * capabilities, and a user's effective set is
 *   (role.defaultCaps ∪ overrides.granted) \ overrides.revoked
 * — never a fixed role enum. See capabilities.ts for the resolver.
 */
export type Capability =
  | 'warroom.view'
  | 'voters.view'
  | 'voters.edit'
  | 'voters.export'
  | 'wards.view'
  | 'wards.edit'
  | 'diary.view'
  | 'diary.edit'
  | 'incidents.view'
  | 'incidents.create'
  | 'incidents.triage'
  | 'incidents.escalate'
  | 'logistics.view'
  // Added session 9: firestore.rules gated logistics create/update on
  // logistics.view alone (the only module in this codebase to gate a
  // write on a *.view capability — every other module has a distinct
  // edit/create capability). Found while building LogisticsPage.tsx;
  // fixed by splitting a real edit capability out, matching the
  // view/edit split every other module already has (voters, wards,
  // diary). logistics.approve remains the separation-of-duties gate for
  // the approval step specifically — a requester should not also be able
  // to approve their own request by holding only logistics.edit.
  | 'logistics.edit'
  | 'logistics.approve'
  | 'ppfa.view'
  | 'ppfa.edit'
  | 'ppfa.export'
  | 'ppfa.manage_thresholds'
  | 'analytics.view'
  | 'analytics.export'
  | 'team.manage'
  | 'settings.tenant'
  | 'settings.permissions'
  // POPIA data subject request handling (access/correction/deletion —
  // Condition 8). Added per 04-legal-compliance-workstream.md action LG10
  // and 05-project-schedule.xlsx task 3.8; not in the original build spec's
  // capability list. Split view/manage the same way ppfa.view/ppfa.edit
  // are split — a request log should be readable more widely than it's
  // actionable.
  | 'dsr.view'
  | 'dsr.manage';

export type GeoScope = 'TENANT' | 'MUNICIPALITY' | 'WARD' | 'VD';

export interface Role {
  id: string;
  label: string;
  defaultCaps: Capability[];
  geoScope: GeoScope;
  systemRole: boolean; // system roles cannot be deleted
}

export interface StaffProfile {
  uid: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string; // Firestore only. Never Auth — §4.3.
  roleId: string;
  wardScope?: string;
  vdScope?: string;
  capOverrides: { granted: Capability[]; revoked: Capability[] };
  active: boolean;
}
