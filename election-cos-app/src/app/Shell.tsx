/**
 * Election Campaign OS — application shell
 * IC-ECOS-BUILD-2026-V2 §3.2, §3.4.
 *
 * One shell, one nav, conditional on capability grants. This component
 * does not itself decide who can do what — it renders what
 * useSession().caps already resolved server-side (§4.4) — so treat any nav
 * item visible here as a rendering convenience, never as the access check.
 *
 * Session 10: this is also now the single place that branches on auth
 * status — previously every module page independently re-derived its own
 * "no session" message (and there was no sign-in UI to reach a signed-in
 * state at all). Three real states, not one: `loading` (still resolving
 * the ID token), `signed-out` (show SignInPage), and `signed-in` with
 * `session === null` — a real Firebase Auth user who hasn't been
 * assigned a tenant/role yet (resolveCapabilities.ts hasn't stamped
 * custom claims), which is a different situation from "not signed in"
 * and was previously indistinguishable from it in every page's own
 * "No active session" message.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthState } from '@/auth/useSession';
import { SignInPage } from '@/auth/SignInPage';
import { signOut } from '@/auth/firebaseAuth';
import { NAV_FOOTER_LINE, PRODUCT_NAME_SHORT } from '@/lib/legalText';
import { PRIMARY_NAV, isNavItemVisible } from './nav';

export function Shell() {
  const { session, status, user } = useAuthState();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-body-md font-body text-slate">Loading…</p>
      </div>
    );
  }

  if (status === 'signed-out') {
    return <SignInPage />;
  }

  if (status === 'signed-in' && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="w-full max-w-sm bg-white border border-ink/10 rounded-lg p-8 space-y-4">
          <p className="text-headline-md font-display text-ink">Awaiting access</p>
          <p className="text-body-md font-body text-slate">
            You're signed in as {user?.email}, but no role or geographic scope has been assigned to your account yet.
            Ask an administrator to add you under Settings → Permissions.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-label-caps font-display uppercase text-teal"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const caps = session?.caps ?? [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper">
      <nav className="md:w-64 shrink-0 bg-ink text-paper p-4 md:min-h-screen flex flex-col">
        {/*
         * IC-ECOS-NAMING-2026-V1 §2.3: this surface takes the compact mark
         * ("EC OS"), not the full product name — the full name belongs in
         * <title>, the sign-in header, and document/report headers.
         *
         * §2.3 also specifies "with tenant name below". Not rendered: no
         * tenant *name* exists to render. SessionContext carries tenantId
         * only (an opaque id — showing it here would be worse than showing
         * nothing), and the Tenant.displayName field that would supply a
         * real name lives in the V2 Postgres store, which is unbuilt. Slot
         * stays empty on purpose until there's a real name to put in it.
         */}
        <div className="font-display text-lg tracking-wide mb-6">{PRODUCT_NAME_SHORT}</div>
        <ul className="space-y-1">
          {PRIMARY_NAV.filter((item) => isNavItemVisible(item, caps)).map((item) => (
            <li key={item.route}>
              <NavLink
                to={item.route}
                className={({ isActive }) =>
                  `block rounded px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-gold text-ink font-medium' : 'text-paper/85 hover:bg-teal/40'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6 border-t border-paper/10 mt-6">
          <p className="text-xs text-paper/60 truncate">{user?.email}</p>
          <button type="button" onClick={() => signOut()} className="text-xs text-paper/60 hover:text-paper mt-1">
            Sign out
          </button>
          <p className="text-xs text-paper/40 mt-4">{NAV_FOOTER_LINE}</p>
        </div>
      </nav>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
