/**
 * Election Campaign OS — the tenant's entitlements, for rendering
 * IC-ECOS-BUILD-2026-V2 §4.4-adjacent.
 *
 * WHY THIS EXISTS
 *
 * `src/auth/entitlements.ts` was written as the second of two gates, and
 * its header says plainly what it is for:
 *
 *   "Collapsing the two into one 'access denied' is the failure this
 *   module exists to prevent."
 *
 * Nothing in the application imported it. `resolveAccess`,
 * `activeModules` and `subscribedWards` were reached only by their own
 * test file; the entitlements port had an adapter, the security rules let
 * every tenant member read the collection, and no screen ever did. The
 * failure the module exists to prevent was therefore the product's actual
 * behaviour, and the module was the description of a gate that was not
 * there.
 *
 * One consequence was visible in two shipped artifacts at once:
 * `assembleManual()` does honour entitlements, so a tenant without the
 * PPFA module received a manual that withheld SOP-10 and an application
 * that let them use the whole funding module.
 *
 * LOADING IS NOT "NOTHING SUBSCRIBED"
 *
 * The distinction this hook is most careful about. An empty entitlement
 * list is a real answer — a tenant with no subscription on record — and
 * it turns paid modules off. A list that has not arrived yet is not that
 * answer, so it returns `undefined` until the read resolves, and every
 * caller treats `undefined` as "fall back to the capability check alone"
 * rather than as "not subscribed". Hiding a module for the first second
 * of every session would teach people that the screen flickers, which is
 * how a real entitlement message gets ignored.
 */
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import type { TenantEntitlement } from '@/dal/ports/entitlements';
import { useSession } from './useSession';

export interface EntitlementState {
  /** `undefined` until the read resolves. Never conflate with `[]`. */
  entitlements: TenantEntitlement[] | undefined;
  isLoading: boolean;
  /**
   * True when the read failed. The caller falls back to the capability
   * check, because refusing access on a failed billing read would lock a
   * paid-up campaign out of its own platform over a network blip.
   */
  isError: boolean;
}

export function useEntitlements(): EntitlementState {
  const session = useSession();
  const query = useQuery({
    queryKey: ['entitlements', session?.tenantId],
    queryFn: () => dal.entitlements.listAll(session!),
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000, // a billing fact, not a live figure
  });

  return {
    entitlements: query.isSuccess ? query.data : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
