/**
 * Election-COS1.0 — navigation model
 * IC-ECOS-BUILD-2026-V2 §3.2.
 *
 * One shell, one nav. Items render conditionally on capability grants —
 * the nav structure never changes per persona; what changes is which items
 * render, driven by resolveEffectiveCapabilities() (§4.4). A canvasser and
 * a provincial coordinator see the same structure with different contents.
 */
import type { Capability } from '@/auth/types';

export interface NavItem {
  label: string;
  route: string;
  /** 'always' means every authenticated user sees it, regardless of caps. */
  capability: Capability | 'always';
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'War Room', route: '/war-room', capability: 'warroom.view' },
  { label: 'Voters', route: '/voters', capability: 'voters.view' },
  { label: 'Wards', route: '/wards', capability: 'wards.view' },
  { label: 'Field Diary', route: '/diary', capability: 'diary.view' },
  { label: 'Incidents', route: '/incidents', capability: 'incidents.view' },
  { label: 'Logistics', route: '/logistics', capability: 'logistics.view' },
  { label: 'Funding & Disclosure', route: '/finance', capability: 'ppfa.view' },
  { label: 'Analytics', route: '/analytics', capability: 'analytics.view' },
  { label: 'Settings', route: '/settings', capability: 'always' },
];

export function isNavItemVisible(item: NavItem, caps: Capability[]): boolean {
  return item.capability === 'always' || caps.includes(item.capability);
}
