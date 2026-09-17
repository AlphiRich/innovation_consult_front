/**
 * Election Campaign OS — navigation model
 * IC-ECOS-BUILD-2026-V2 §3.2.
 *
 * One shell, one nav. Items render conditionally on capability grants —
 * the nav structure never changes per persona; what changes is which items
 * render, driven by resolveEffectiveCapabilities() (§4.4). A canvasser and
 * a provincial coordinator see the same structure with different contents.
 */
import type { Capability } from '@/auth/types';
import type { TenantEntitlement } from '@/dal/ports/entitlements';
import { resolveAccess, type AccessDecision } from '@/auth/entitlements';

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

/**
 * Both gates, for a nav item.
 *
 * `isNavItemVisible` above answers the capability half and is what every
 * existing caller and test asks. This answers the whole question, and it
 * is what `Shell` uses once the tenant's entitlements have arrived.
 *
 * `entitlements` is deliberately optional, and `undefined` means "not
 * known yet" rather than "none". A read still in flight, or one that
 * failed, falls back to the capability answer — a billing lookup that
 * times out must not lock a paid-up campaign out of its own platform, and
 * the authoritative gate is `firestore.rules` either way. See
 * `useEntitlements`.
 */
export function navItemAccess(
  item: NavItem,
  caps: Capability[],
  entitlements?: TenantEntitlement[],
): AccessDecision {
  if (item.capability === 'always') {
    return { outcome: 'ALLOWED', allowed: true, module: null, reason: '' };
  }
  if (!entitlements) {
    const permitted = caps.includes(item.capability);
    return {
      outcome: permitted ? 'ALLOWED' : 'NOT_PERMITTED',
      allowed: permitted,
      module: null,
      reason: permitted ? '' : 'Your role does not include this. An administrator can change that.',
    };
  }
  return resolveAccess(caps, entitlements, item.capability);
}
