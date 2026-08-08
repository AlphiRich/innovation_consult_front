/**
 * Election Campaign OS — application shell
 * IC-ECOS-BUILD-2026-V2 §3.2, §3.4.
 *
 * One shell, one nav, conditional on capability grants. This component
 * does not itself decide who can do what — it renders what
 * useSession().caps already resolved server-side (§4.4) — so treat any nav
 * item visible here as a rendering convenience, never as the access check.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthState } from '@/auth/useSession';
import { PRIMARY_NAV, isNavItemVisible } from './nav';

export function Shell() {
  const { session, status } = useAuthState();
  const caps = session?.caps ?? [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper">
      <nav className="md:w-64 shrink-0 bg-ink text-paper p-4 md:min-h-screen">
        <div className="font-display text-lg tracking-wide mb-6">Election Campaign OS</div>
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
        {status === 'signed-out' && (
          <p className="mt-6 text-xs text-paper/60">
            Not signed in — nav shows unauthenticated defaults only. See BUILD-STATUS.md; no live
            Firebase project is wired up yet.
          </p>
        )}
      </nav>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
