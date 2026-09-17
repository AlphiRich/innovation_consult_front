import { describe, expect, it } from 'vitest';
import type { Capability } from '@/auth/types';
import type { TenantEntitlement } from '@/dal/ports/entitlements';
import { PRIMARY_NAV, isNavItemVisible, navItemAccess } from './nav';

// IC-ECOS-BUILD-2026-V2 §3.2 — the exact 9-item nav table.
describe('PRIMARY_NAV', () => {
  it('has exactly the 9 items from §3.2, in order, with the specified routes', () => {
    expect(PRIMARY_NAV.map((i) => [i.label, i.route])).toEqual([
      ['War Room', '/war-room'],
      ['Voters', '/voters'],
      ['Wards', '/wards'],
      ['Field Diary', '/diary'],
      ['Incidents', '/incidents'],
      ['Logistics', '/logistics'],
      ['Funding & Disclosure', '/finance'],
      ['Analytics', '/analytics'],
      ['Settings', '/settings'],
    ]);
  });

  it('Settings is visible to everyone regardless of capabilities', () => {
    const settings = PRIMARY_NAV.find((i) => i.route === '/settings')!;
    expect(isNavItemVisible(settings, [])).toBe(true);
  });

  it('a canvasser with no ppfa.view does not see Funding & Disclosure', () => {
    const finance = PRIMARY_NAV.find((i) => i.route === '/finance')!;
    expect(isNavItemVisible(finance, ['voters.view', 'diary.view'])).toBe(false);
  });

  it('a finance officer with ppfa.view sees Funding & Disclosure', () => {
    const finance = PRIMARY_NAV.find((i) => i.route === '/finance')!;
    expect(isNavItemVisible(finance, ['ppfa.view'])).toBe(true);
  });
});

/**
 * The second gate, wired in at last.
 *
 * `src/auth/entitlements.ts` was written to keep "not permitted" and "not
 * subscribed" apart, and its header says collapsing them is the failure it
 * exists to prevent. Nothing in the application imported it — the nav
 * asked the capability question alone, so a campaign that never bought the
 * PPFA module saw the Funding item, opened it, and used the whole donor
 * ledger. The manual meanwhile withheld SOP-10 from that same tenant.
 */
describe('navItemAccess — capability and entitlement', () => {
  const ent = (module: string, over: Partial<TenantEntitlement> = {}): TenantEntitlement => ({
    id: module,
    tenantId: 't',
    module: module as TenantEntitlement['module'],
    activeFrom: '2026-01-01T00:00:00.000Z',
    createdAt: '',
    updatedAt: '',
    updatedBy: 'system',
    ...over,
  });
  const finance = PRIMARY_NAV.find((i) => i.route === '/finance')!;
  const voters = PRIMARY_NAV.find((i) => i.route === '/voters')!;
  const settings = PRIMARY_NAV.find((i) => i.route === '/settings')!;

  it('hides a paid module from a tenant that did not buy it, and says why', () => {
    const decision = navItemAccess(finance, ['ppfa.view'], [ent('campaign-diary')]);
    expect(decision.allowed).toBe(false);
    expect(decision.outcome).toBe('MODULE_NOT_SUBSCRIBED');
    expect(decision.module).toBe('ppfa-disclosure');
  });

  it('keeps "not permitted" apart from "not subscribed"', () => {
    // The whole point of the module. Same item, same tenant, two people:
    // one needs an administrator, the other needs a purchase, and telling
    // either of them the other thing sends them somewhere useless.
    const unsubscribed = navItemAccess(finance, ['ppfa.view'], [ent('campaign-diary')]);
    const unpermitted = navItemAccess(finance, ['voters.view'], [ent('ppfa-disclosure')]);
    expect(unsubscribed.outcome).toBe('MODULE_NOT_SUBSCRIBED');
    expect(unpermitted.outcome).toBe('NOT_PERMITTED');
    expect(unsubscribed.reason).not.toBe(unpermitted.reason);
  });

  it('shows it once the module is subscribed', () => {
    expect(navItemAccess(finance, ['ppfa.view'], [ent('ppfa-disclosure')]).allowed).toBe(true);
  });

  it('turns a paid module off when its term has ended, and distinguishes that too', () => {
    const lapsed = navItemAccess(
      finance,
      ['ppfa.view'],
      [ent('ppfa-disclosure', { activeUntil: '2026-02-01T00:00:00.000Z' })],
    );
    expect(lapsed.allowed).toBe(false);
    expect(lapsed.outcome).toBe('MODULE_EXPIRED');
  });

  it('leaves the core platform alone whatever the subscription says', () => {
    // A tenant with no subscription on record still has a voter roll.
    expect(navItemAccess(voters, ['voters.view'], []).allowed).toBe(true);
    expect(navItemAccess(settings, [], []).allowed).toBe(true);
  });

  it('treats a subscription still loading as unknown, not as none', () => {
    // undefined means the read has not landed. Hiding Funding for the
    // first second of every session would teach people that the screen
    // flickers, which is how a real entitlement message gets ignored.
    expect(navItemAccess(finance, ['ppfa.view'], undefined).allowed).toBe(true);
    // …and an empty array is a real answer that does turn it off.
    expect(navItemAccess(finance, ['ppfa.view'], []).allowed).toBe(false);
    expect(navItemAccess(finance, ['ppfa.view'], []).outcome).toBe('TENANT_NOT_PROVISIONED');
  });

  it('never lets an entitlement open a door a capability closed', () => {
    // Order matters: somebody who was never permitted to touch the donor
    // ledger is told that, not told their campaign needs to buy something
    // — which is commercial information they have no business being
    // handed as an explanation of their own permissions.
    expect(navItemAccess(finance, [], [ent('ppfa-disclosure')]).outcome).toBe('NOT_PERMITTED');
  });

  it('agrees with isNavItemVisible wherever entitlements are not in play', () => {
    for (const item of PRIMARY_NAV) {
      for (const caps of [[], ['voters.view'], ['ppfa.view', 'voters.view']] as Capability[][]) {
        expect(navItemAccess(item, caps).allowed, item.route).toBe(isNavItemVisible(item, caps));
      }
    }
  });
});
