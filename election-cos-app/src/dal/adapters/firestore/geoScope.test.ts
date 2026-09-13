import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { SessionContext } from '@/dal/ports/session';
import { SEED_ROLES } from '@/auth/seedRoles';

/**
 * Election Campaign OS — geographic scoping (§4.2)
 *
 * Session 21. An uploaded Postgres RLS policy (`tenant_isolation.sql`)
 * named two isolation bug classes it had just corrected in its own draft:
 *
 *   1. narrowing on a bare ward *number*, which collides across
 *      municipalities — every municipality has a Ward 12;
 *   2. giving voting-district roles whole-ward access, because the policy
 *      only had a ward-level branch.
 *
 * That file targets a Postgres migration this project closed (Firestore is
 * the database, 13 Sep 2026), so none of it was adopted. But this
 * repository had **no test covering `inScope()` or `geoScopeConstraints()`
 * at all**, which is precisely the gap those two bugs would live in. This
 * is that test.
 *
 * `firestore.rules` is the enforcement layer and cannot be executed here
 * without the emulator, so the rules half is asserted as source parity:
 * the shape the DAL mirrors must still be the shape the rules use.
 */

// Capture what `where()` is called with, rather than inspecting Firestore's
// opaque QueryConstraint internals. Lazily referenced — vi.mock is hoisted.
const whereSpy = vi.fn((field: string, op: string, value: unknown) => ({ field, op, value }));
vi.mock('firebase/firestore', () => ({
  where: (...a: unknown[]) => whereSpy(...(a as [string, string, unknown])),
}));

const { geoScopeConstraints } = await import('./base');

const ctx = (over: Partial<SessionContext>): SessionContext => ({
  tenantId: 'tenant-nw405',
  uid: 'uid-1',
  caps: [],
  geoScope: 'TENANT',
  ...over,
});

type Captured = { field: string; op: string; value: unknown };
const constraints = (c: SessionContext) => geoScopeConstraints(c) as unknown as Captured[];

describe('geoScopeConstraints', () => {
  it('narrows a ward role on ward CODE, never a ward number', () => {
    const [c] = constraints(ctx({ geoScope: 'WARD', wardScope: 'NW405012' }));
    expect(c.field).toBe('wardCode');
    expect(c.op).toBe('==');
    // A code carries the municipality; a bare number does not, and
    // 'NW405012' vs 'JHB012' is the collision this guards.
    expect(c.value).toBe('NW405012');
    expect(String(c.value)).not.toMatch(/^\d{1,3}$/);
  });

  it('narrows a VD role on the voting district, not on its ward', () => {
    const captured = constraints(ctx({ geoScope: 'VD', vdScope: '32900123', wardScope: 'NW405012' }));
    expect(captured).toHaveLength(1);
    expect(captured[0].field).toBe('vdCode');
    expect(captured[0].value).toBe('32900123');
    // The specific defect: a VD role must not be widened to its whole ward.
    expect(captured.some((c) => c.field === 'wardCode')).toBe(false);
  });

  it('does not narrow tenant- or municipality-scoped roles', () => {
    expect(constraints(ctx({ geoScope: 'TENANT' }))).toHaveLength(0);
    expect(constraints(ctx({ geoScope: 'MUNICIPALITY' }))).toHaveLength(0);
  });

  it('adds no constraint when the scope value is missing, and the rules deny instead', () => {
    // Client-side narrowing is a query-shape convenience; firestore.rules
    // is the enforcement layer. With no wardScope on the token, inScope()
    // compares wardCode against nothing and denies — it fails closed, so
    // an unnarrowed query returns nothing rather than everything.
    expect(constraints(ctx({ geoScope: 'WARD' }))).toHaveLength(0);
    expect(constraints(ctx({ geoScope: 'VD' }))).toHaveLength(0);
  });
});

describe('firestore.rules inScope() still matches what the DAL mirrors', () => {
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
  const inScope = rules.slice(rules.indexOf('function inScope('), rules.indexOf('function isUnchanged('));

  it('compares ward and VD by code', () => {
    expect(inScope).toContain('data.wardCode');
    expect(inScope).toContain('data.vdCode');
  });

  it('keeps a VD branch distinct from the ward branch', () => {
    expect(inScope).toMatch(/scope == 'WARD'/);
    expect(inScope).toMatch(/scope == 'VD'/);
    // The VD branch must test vdCode — if it tested wardCode, a VD role
    // would see the whole ward, which is bug (2) above.
    expect(inScope).toMatch(/scope == 'VD' && data\.vdCode/);
  });

  it('narrows on no numeric ward field', () => {
    expect(inScope).not.toMatch(/wardNumber|ward_number/);
  });
});

describe('the seed roles use the granularity the scoping enforces', () => {
  it('scopes VD Captain and Canvasser to a voting district, not a ward', () => {
    for (const id of ['vd-captain', 'canvasser']) {
      expect(SEED_ROLES.find((r) => r.id === id)?.geoScope, id).toBe('VD');
    }
  });

  it('keeps the Finance Officer off the voter roll entirely', () => {
    // The uploaded policy granted FINANCE_OFFICER a tenant-wide bypass on
    // `voters`, justified by an existing household grant. This build is
    // deliberately tighter: the capability is simply absent, so the
    // voters rule fails at cap('voters.view') before scope is considered.
    // POPIA data minimisation — funding compliance needs donors, not the
    // voter roll.
    const finance = SEED_ROLES.find((r) => r.id === 'finance-officer');
    expect(finance?.defaultCaps).not.toContain('voters.view');
    expect(finance?.defaultCaps).not.toContain('voters.edit');
    expect(finance?.defaultCaps).not.toContain('voters.export');
  });
});
