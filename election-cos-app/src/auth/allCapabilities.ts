/**
 * Election-COS1.0 — runtime list of every Capability
 * IC-ECOS-BUILD-2026-V2 §4.4. `Capability` in types.ts is a TS union, not
 * a runtime value — PermissionsPage.tsx needs an actual array to render
 * checkboxes over. `CAP_SET` is typed `Record<Capability, true>`, which
 * forces TypeScript to error if a union member is ever added to
 * `Capability` without a matching entry here (or removed here without
 * removing it from the union) — exhaustiveness the union type itself
 * can't give a plain array literal.
 */
import type { Capability } from './types';

const CAP_SET: Record<Capability, true> = {
  'warroom.view': true,
  'voters.view': true,
  'voters.edit': true,
  'voters.export': true,
  'wards.view': true,
  'wards.edit': true,
  'diary.view': true,
  'diary.edit': true,
  'incidents.view': true,
  'incidents.create': true,
  'incidents.triage': true,
  'incidents.escalate': true,
  'logistics.view': true,
  'logistics.edit': true,
  'logistics.approve': true,
  'ppfa.view': true,
  'ppfa.edit': true,
  'ppfa.export': true,
  'ppfa.manage_thresholds': true,
  'analytics.view': true,
  'analytics.export': true,
  'team.manage': true,
  'settings.tenant': true,
  'settings.permissions': true,
  'dsr.view': true,
  'dsr.manage': true,
};

export const ALL_CAPABILITIES: Capability[] = Object.keys(CAP_SET) as Capability[];
