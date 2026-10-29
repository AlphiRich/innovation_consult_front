/**
 * Election Campaign OS — application shell
 * IC-ECOS-BUILD-2026-V2 §3.2, §3.4.
 *
 * One shell, one nav, conditional on capability grants. This component
 * does not itself decide who can do what — it renders what
 * useSession().caps already resolved server-side (§4.4) — so treat any nav
 * item visible here as a rendering convenience, never as the access check.
 *
 * Session 10 made this the single place that branches on auth status.
 * Three real states, not one: `loading` (still resolving the ID token),
 * `signed-out` (show SignInPage), and `signed-in` with `session === null`
 * — a real Firebase Auth user who has not been assigned a tenant or role
 * yet, which is a different situation from "not signed in".
 *
 * SESSION 38: THIS IS A PHONE APPLICATION AND THE NAV WAS NOT
 *
 * The sidebar was `md:w-64`, which on a phone meant a full-width block of
 * nine links stacked above the content — every screen opened on the menu
 * and the user scrolled past it to reach the page. For a canvasser
 * working one-handed at a gate that is the whole screen wasted.
 *
 * It is now a drawer on small screens and the sidebar on large ones. A
 * drawer rather than a bottom tab bar because §3.2 fixes the nav at nine
 * items and `nav.test.ts` guards that count: nine does not fit a tab bar,
 * and picking four to promote would be inventing a hierarchy the spec
 * does not have.
 */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthState } from '@/auth/useSession';
import { SignInPage } from '@/auth/SignInPage';
import { signOut } from '@/auth/firebaseAuth';
import { NAV_FOOTER_LINE, PRODUCT_NAME_SHORT } from '@/lib/legalText';
import { useEntitlements } from '@/auth/useEntitlements';
import { useQuery } from '@tanstack/react-query';
import { dal } from '@/dal';
import { Button, Card, DataLine, SectionLabel } from '@/components/ui';
import { SyncStatus } from './SyncStatus';
import { PRIMARY_NAV, navItemAccess } from './nav';

export function Shell() {
  const { session, status, user } = useAuthState();
  const { entitlements } = useEntitlements();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The municipality this tenant is campaigning in. Until session 39 the
  // chrome showed nothing here — the slot was left empty because no tenant
  // *name* existed to put in it. A municipality name does, and it is the
  // one piece of context that tells somebody which campaign they are
  // looking at before they read a single figure.
  const profileQuery = useQuery({
    queryKey: ['municipalityProfile', session?.tenantId],
    queryFn: () => dal.municipalityProfile.get(session!),
    enabled: Boolean(session),
  });
  const location = useLocation();

  // Navigating must close the drawer, or the user taps a link and stares
  // at the menu they just used.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

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
        <Card className="w-full max-w-sm space-y-4 p-8">
          <p className="text-headline-md font-display text-ink">Awaiting access</p>
          <p className="text-body-md font-body text-slate">
            You&rsquo;re signed in as {user?.email}, but no role or geographic scope has been assigned to your
            account yet. Send your administrator the sign-in ID below and ask them to add you under Settings →
            Permissions.
          </p>
          {/*
           * The sign-in ID is shown because the administrator has no way
           * to look one up. A staff record is keyed by Firebase Auth uid,
           * and resolving an email to a uid needs the Admin SDK — a Cloud
           * Function that does not exist. Until it does, the person
           * holding the account is the only one who can supply it.
           */}
          <div className="rounded border border-ink/10 bg-paper p-3">
            <SectionLabel>Your sign-in ID</SectionLabel>
            <p className="text-data-mono font-mono text-ink mt-1 break-all">{user?.uid}</p>
          </div>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Card>
      </div>
    );
  }

  const caps = session?.caps ?? [];
  const items = PRIMARY_NAV.filter((item) => navItemAccess(item, caps, entitlements).allowed);
  const profile = profileQuery.data;
  // Rendered only once a real name exists. A tenant id here would be worse
  // than nothing: it is opaque and reads as a defect.
  const municipality = profile?.municipalityName
    ? `${profile.municipalityName} · ${profile.municipalityCode}`
    : null;

  const navList = (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.route}>
          <NavLink
            to={item.route}
            className={({ isActive }) =>
              `flex min-h-11 items-center rounded px-3 py-2 text-body-md font-body transition-colors ${
                isActive ? 'bg-gold text-ink font-medium' : 'text-paper/85 hover:bg-teal/40'
              }`
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  const navFooter = (
    <div className="mt-auto pt-6 border-t border-paper/10 space-y-1">
      <SyncStatus />
      <p className="text-body-md font-body text-paper/60 truncate">{user?.email}</p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-11 text-label-caps font-display uppercase text-paper/60 hover:text-paper"
      >
        Sign out
      </button>
      <DataLine className="text-paper/40 pt-3">{NAV_FOOTER_LINE}</DataLine>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper">
      {/* Keyboard and switch-access users should not tab through nine nav
          links to reach the page on every navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-label-caps focus:font-display focus:uppercase focus:text-ink"
      >
        Skip to content
      </a>

      {/* Phone: a bar, and the nav behind it. */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 bg-ink px-4 py-3 text-paper">
        <span className="min-w-0">
          <span className="font-display text-headline-md tracking-wide block">{PRODUCT_NAME_SHORT}</span>
          {municipality && (
            <span className="block truncate text-data-mono font-mono text-paper/60">{municipality}</span>
          )}
        </span>
        <div className="flex items-center gap-3">
          <SyncStatus compact />
          <button
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-expanded={drawerOpen}
            aria-controls="primary-nav"
            className="min-h-11 rounded border border-paper/30 px-3 text-label-caps font-display uppercase"
          >
            {drawerOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div
          id="primary-nav"
          className="md:hidden bg-ink px-4 pb-6 pt-2 text-paper flex flex-col min-h-[60vh]"
        >
          {navList}
          {navFooter}
        </div>
      )}

      {/* Desktop: the sidebar, as before. */}
      <nav
        aria-label="Primary"
        className="hidden md:flex md:w-64 shrink-0 bg-ink text-paper p-4 md:min-h-screen flex-col"
      >
        {/*
         * IC-ECOS-NAMING-2026-V1 §2.3: this surface takes the compact mark
         * ("EC OS"), not the full product name. §2.3 also specifies "with
         * tenant name below" — not rendered, because no tenant *name*
         * exists to render. SessionContext carries tenantId only, and the
         * Tenant.displayName that would supply a real name lives in the V2
         * Postgres store, which is unbuilt.
         */}
        <div className="mb-6">
          <p className="font-display text-headline-md tracking-wide">{PRODUCT_NAME_SHORT}</p>
          {municipality && <DataLine className="text-paper/60 mt-0.5">{municipality}</DataLine>}
        </div>
        {navList}
        {navFooter}
      </nav>

      <main id="main" className="flex-1 p-4 md:p-8 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
