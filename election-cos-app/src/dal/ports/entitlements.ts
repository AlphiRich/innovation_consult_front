/**
 * Election Campaign OS — tenant entitlement port
 * IC-ECOS-BUILD-2026-V2 §4.4-adjacent. See `src/auth/modules.ts` for why
 * entitlement is separate from capability, and why ward scope matters.
 *
 * An entitlement is a **billing fact**, not a tenant setting. It records
 * what a campaign bought and until when. It is written server-side only —
 * `firestore.rules` denies client writes outright — because a tenant
 * admin who could grant themselves a module would make the commercial
 * model meaningless, in the same way that a client-side capability check
 * would make the security model meaningless.
 *
 * It carries no price. See the module catalogue's header: the platform is
 * sold to competing parties on published, flat, identical terms, and a
 * per-tenant price on a record is the appearance of differential terms
 * whatever the number says.
 */
import type { ModuleKey } from '@/auth/modules';
import type { SessionContext } from './session';

export interface TenantEntitlement {
  /** `{module}` for tenant scope, `{module}::{wardCode}` for ward scope. */
  id: string;
  tenantId: string;
  module: ModuleKey;
  /** Set only for ward-scoped modules. */
  wardCode?: string;
  /** ISO 8601. Active from this instant. */
  activeFrom: string;
  /**
   * ISO 8601, exclusive. Absent means open-ended.
   *
   * Cycle-priced modules expire with the campaign cycle and monthly
   * casework expires monthly, so an entitlement that could not end would
   * misrepresent both.
   */
  activeUntil?: string;
  /** Free-text provenance — e.g. an invoice or agreement reference. */
  sourceReference?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface EntitlementRepository {
  /** Every entitlement record for the tenant, active or not. */
  listAll(ctx: SessionContext): Promise<TenantEntitlement[]>;
}

/** Deterministic document id, so provisioning the same thing twice is idempotent. */
export function entitlementId(module: ModuleKey, wardCode?: string): string {
  return wardCode ? `${module}::${wardCode}` : module;
}
