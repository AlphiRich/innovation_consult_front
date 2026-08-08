import { describe, expect, it } from 'vitest';
import { PRIMARY_NAV, isNavItemVisible } from './nav';

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
