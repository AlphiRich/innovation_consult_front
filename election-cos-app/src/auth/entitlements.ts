/**
 * Election Campaign OS — resolving capability against entitlement
 * IC-ECOS-BUILD-2026-V2 §4.4-adjacent.
 *
 * Two gates, both of which must open, and they fail for different reasons
 * that a person can act on differently:
 *
 *   - **Not permitted** — your role does not include this. Someone with
 *     `settings.permissions` can change that today.
 *   - **Not subscribed** — your campaign has not bought this module. No
 *     amount of permission-granting fixes it; it is a purchase.
 *
 * Collapsing the two into one "access denied" is the failure this module
 * exists to prevent. A Finance Officer told "you do not have permission"
 * when the real answer is "the campaign did not buy the PPFA module" will
 * go and ask an administrator to widen their role, which will not work,
 * and nobody will understand why.
 *
 * WHY THIS IS PURE AND LOCAL
 *
 * Every render can ask this question, and it is asked on the low-RAM
 * phones that the field volunteers actually carry, often on a metered
 * data bundle. So the resolver is a synchronous function over an already-
 * loaded array — no network call, no per-check round trip. The
 * entitlement list is small (one record per module, plus one per bought
 * ward) and is fetched once per session.
 */
import type { Capability } from './types';
import { gatingModule, moduleDefinition, type ModuleKey } from './modules';
import type { TenantEntitlement } from '@/dal/ports/entitlements';

export type AccessOutcome =
  | 'ALLOWED'
  | 'NOT_PERMITTED'
  | 'MODULE_NOT_SUBSCRIBED'
  | 'MODULE_EXPIRED'
  | 'WARD_NOT_SUBSCRIBED'
  | 'TENANT_NOT_PROVISIONED';

export interface AccessDecision {
  outcome: AccessOutcome;
  allowed: boolean;
  /** The module that gated this, when one did. */
  module: ModuleKey | null;
  /** A sentence for the person who hit this, not a log line. */
  reason: string;
}

export interface EntitlementQuery {
  /** Required when checking a capability gated by a ward-scoped module. */
  wardCode?: string;
  now?: Date;
}

function withinWindow(entitlement: TenantEntitlement, now: Date): boolean {
  const from = new Date(entitlement.activeFrom).getTime();
  if (Number.isNaN(from) || now.getTime() < from) return false;
  if (!entitlement.activeUntil) return true;
  const until = new Date(entitlement.activeUntil).getTime();
  if (Number.isNaN(until)) return true;
  return now.getTime() < until;
}

/**
 * Whether a module is active — for the tenant, or for a specific ward
 * where the module is bought ward by ward.
 */
export function isModuleActive(
  entitlements: TenantEntitlement[],
  module: ModuleKey,
  query: EntitlementQuery = {},
): boolean {
  const definition = moduleDefinition(module);
  if (definition.bundled) return true;

  const now = query.now ?? new Date();
  return entitlements.some((e) => {
    if (e.module !== module) return false;
    if (definition.scope === 'WARD' && e.wardCode !== query.wardCode) return false;
    return withinWindow(e, now);
  });
}

/** Modules active right now, for a tenant-wide view (ward-scoped ones excluded). */
export function activeModules(entitlements: TenantEntitlement[], now = new Date()): ModuleKey[] {
  return MODULE_KEYS.filter(
    (key) => moduleDefinition(key).scope === 'TENANT' && isModuleActive(entitlements, key, { now }),
  );
}

/** Wards for which a ward-scoped module is active. */
export function subscribedWards(
  entitlements: TenantEntitlement[],
  module: ModuleKey,
  now = new Date(),
): string[] {
  return [
    ...new Set(
      entitlements
        .filter((e) => e.module === module && e.wardCode && withinWindow(e, now))
        .map((e) => e.wardCode as string),
    ),
  ].sort();
}

const MODULE_KEYS: ModuleKey[] = [
  'core',
  'campaign-diary',
  'ppfa-disclosure',
  'ward-sentiment',
  'incident-pro',
  'casework',
];

/**
 * The whole question, answered once: may this session do this thing here?
 *
 * Capability is checked first. Somebody who was never permitted to touch
 * the donor ledger should be told that, not told their campaign needs to
 * buy a module — the second is commercial information they have no
 * business being handed as an explanation for their own permissions.
 */
export function resolveAccess(
  caps: Capability[],
  entitlements: TenantEntitlement[],
  capability: Capability,
  query: EntitlementQuery = {},
): AccessDecision {
  const gate = gatingModule(capability);

  if (!caps.includes(capability)) {
    return {
      outcome: 'NOT_PERMITTED',
      allowed: false,
      module: gate?.key ?? null,
      reason: 'Your role does not include this. An administrator can change that.',
    };
  }

  if (!gate || gate.bundled) {
    return { outcome: 'ALLOWED', allowed: true, module: gate?.key ?? null, reason: '' };
  }

  const now = query.now ?? new Date();

  if (entitlements.length === 0) {
    return {
      outcome: 'TENANT_NOT_PROVISIONED',
      allowed: false,
      module: gate.key,
      reason:
        'This campaign has no subscription on record yet, so the paid modules are off. ' +
        'The core platform is unaffected.',
    };
  }

  if (gate.scope === 'WARD' && !query.wardCode) {
    return {
      outcome: 'WARD_NOT_SUBSCRIBED',
      allowed: false,
      module: gate.key,
      reason: `${gate.label} is bought ward by ward, so this check needs to know which ward.`,
    };
  }

  if (isModuleActive(entitlements, gate.key, { ...query, now })) {
    return { outcome: 'ALLOWED', allowed: true, module: gate.key, reason: '' };
  }

  // Distinguish "never bought" from "bought and lapsed" — the remedy
  // differs and so does the conversation.
  const lapsed = entitlements.some(
    (e) =>
      e.module === gate.key &&
      (gate.scope !== 'WARD' || e.wardCode === query.wardCode) &&
      !!e.activeUntil &&
      new Date(e.activeUntil).getTime() <= now.getTime(),
  );

  if (lapsed) {
    return {
      outcome: 'MODULE_EXPIRED',
      allowed: false,
      module: gate.key,
      reason: `${gate.label} was subscribed to but the term has ended. Renewing restores it.`,
    };
  }

  if (gate.scope === 'WARD') {
    return {
      outcome: 'WARD_NOT_SUBSCRIBED',
      allowed: false,
      module: gate.key,
      reason: `${gate.label} is not subscribed for this ward. It is bought ward by ward.`,
    };
  }

  return {
    outcome: 'MODULE_NOT_SUBSCRIBED',
    allowed: false,
    module: gate.key,
    reason: `${gate.label} is not part of this campaign's subscription.`,
  };
}
