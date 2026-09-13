import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TenantEntitlement } from '@/dal/ports/entitlements';
import { entitlementId } from '@/dal/ports/entitlements';
import { gatingModule, MODULES, moduleDefinition, type ModuleKey } from './modules';
import { activeModules, isModuleActive, resolveAccess, subscribedWards } from './entitlements';

const NOW = new Date('2026-06-01T00:00:00.000Z');

const ent = (module: ModuleKey, over: Partial<TenantEntitlement> = {}): TenantEntitlement => ({
  id: entitlementId(module, over.wardCode),
  tenantId: 'tenant-nw405',
  module,
  activeFrom: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'system',
  ...over,
});

const PPFA_CAPS = ['ppfa.view', 'ppfa.edit', 'ppfa.export', 'ppfa.manage_thresholds'] as const;

describe('the module catalogue', () => {
  it('gates each capability by at most one module', () => {
    const seen = new Set<string>();
    for (const m of MODULES) {
      for (const c of m.gatedCapabilities) {
        expect(seen.has(c), `${c} is gated by two modules`).toBe(false);
        seen.add(c);
      }
    }
  });

  it('keeps core and the diary bundled, and the priced modules not', () => {
    expect(moduleDefinition('core').bundled).toBe(true);
    expect(moduleDefinition('campaign-diary').bundled).toBe(true);
    for (const key of ['ppfa-disclosure', 'ward-sentiment', 'incident-pro', 'casework'] as ModuleKey[]) {
      expect(moduleDefinition(key).bundled, key).toBe(false);
    }
  });

  it('models ward-bought modules as ward-scoped, not tenant-wide', () => {
    // The mistake this guards: assuming every entitlement is tenant-wide.
    // Parties buy their strongest wards, not whole municipalities.
    expect(moduleDefinition('ward-sentiment').scope).toBe('WARD');
    expect(moduleDefinition('casework').scope).toBe('WARD');
    expect(moduleDefinition('incident-pro').scope).toBe('TENANT');
    expect(moduleDefinition('ppfa-disclosure').scope).toBe('TENANT');
  });

  it('leaves ungated capabilities ungated', () => {
    expect(gatingModule('voters.view')).toBeNull();
    expect(gatingModule('incidents.escalate')).toBeNull();
    expect(gatingModule('ppfa.export')?.key).toBe('ppfa-disclosure');
  });

  it('rejects an unknown module rather than guessing', () => {
    expect(() => moduleDefinition('nope' as ModuleKey)).toThrow(/Unknown module/);
  });
});

describe('isModuleActive', () => {
  it('treats bundled modules as always on, with no record needed', () => {
    expect(isModuleActive([], 'core', { now: NOW })).toBe(true);
    expect(isModuleActive([], 'campaign-diary', { now: NOW })).toBe(true);
  });

  it('needs a record for a priced module', () => {
    expect(isModuleActive([], 'ppfa-disclosure', { now: NOW })).toBe(false);
    expect(isModuleActive([ent('ppfa-disclosure')], 'ppfa-disclosure', { now: NOW })).toBe(true);
  });

  it('respects the term window at both ends', () => {
    const notYet = ent('ppfa-disclosure', { activeFrom: '2026-09-01T00:00:00.000Z' });
    const lapsed = ent('ppfa-disclosure', { activeUntil: '2026-03-01T00:00:00.000Z' });
    const live = ent('ppfa-disclosure', { activeUntil: '2026-12-01T00:00:00.000Z' });
    expect(isModuleActive([notYet], 'ppfa-disclosure', { now: NOW })).toBe(false);
    expect(isModuleActive([lapsed], 'ppfa-disclosure', { now: NOW })).toBe(false);
    expect(isModuleActive([live], 'ppfa-disclosure', { now: NOW })).toBe(true);
  });

  it('treats activeUntil as exclusive, so a term ends when it ends', () => {
    const endsNow = ent('ppfa-disclosure', { activeUntil: NOW.toISOString() });
    expect(isModuleActive([endsNow], 'ppfa-disclosure', { now: NOW })).toBe(false);
  });

  it('matches a ward-scoped module only for the ward it was bought for', () => {
    const bought = [ent('ward-sentiment', { wardCode: 'NW405012' })];
    expect(isModuleActive(bought, 'ward-sentiment', { wardCode: 'NW405012', now: NOW })).toBe(true);
    expect(isModuleActive(bought, 'ward-sentiment', { wardCode: 'NW405007', now: NOW })).toBe(false);
    expect(isModuleActive(bought, 'ward-sentiment', { now: NOW })).toBe(false);
  });
});

describe('activeModules / subscribedWards', () => {
  it('lists tenant-scoped modules only', () => {
    const list = activeModules([ent('ppfa-disclosure'), ent('ward-sentiment', { wardCode: 'NW405012' })], NOW);
    expect(list).toContain('core');
    expect(list).toContain('campaign-diary');
    expect(list).toContain('ppfa-disclosure');
    expect(list).not.toContain('ward-sentiment');
  });

  it('lists the wards a ward-scoped module was bought for, deduplicated and sorted', () => {
    const list = subscribedWards(
      [
        ent('ward-sentiment', { wardCode: 'NW405012' }),
        ent('ward-sentiment', { wardCode: 'NW405007' }),
        ent('ward-sentiment', { wardCode: 'NW405012' }),
        ent('casework', { wardCode: 'NW405001' }),
      ],
      'ward-sentiment',
      NOW,
    );
    expect(list).toEqual(['NW405007', 'NW405012']);
  });
});

/**
 * The heart of it. "Not permitted" and "not subscribed" are different
 * problems with different remedies, and telling someone the wrong one
 * sends them to an administrator who cannot help.
 */
describe('resolveAccess distinguishes permission from subscription', () => {
  const subscribed = [ent('ppfa-disclosure')];

  it('allows when both gates open', () => {
    const d = resolveAccess(['ppfa.export'], subscribed, 'ppfa.export', { now: NOW });
    expect(d.outcome).toBe('ALLOWED');
    expect(d.allowed).toBe(true);
  });

  it('says NOT_PERMITTED when the role lacks it, even where the module is bought', () => {
    const d = resolveAccess([], subscribed, 'ppfa.export', { now: NOW });
    expect(d.outcome).toBe('NOT_PERMITTED');
    expect(d.reason).toMatch(/administrator/i);
  });

  it('checks permission before subscription, so commercial state never explains a permissions failure', () => {
    // Someone who was never allowed near the donor ledger should not be
    // handed the campaign's billing position as the reason.
    const d = resolveAccess([], [], 'ppfa.export', { now: NOW });
    expect(d.outcome).toBe('NOT_PERMITTED');
    expect(d.reason).not.toMatch(/subscri|bought|module|campaign/i);
  });

  it('says MODULE_NOT_SUBSCRIBED when permitted but unbought', () => {
    const d = resolveAccess(['ppfa.export'], [ent('incident-pro')], 'ppfa.export', { now: NOW });
    expect(d.outcome).toBe('MODULE_NOT_SUBSCRIBED');
    expect(d.allowed).toBe(false);
    expect(d.module).toBe('ppfa-disclosure');
  });

  it('distinguishes a lapsed term from something never bought', () => {
    const lapsed = [ent('ppfa-disclosure', { activeUntil: '2026-03-01T00:00:00.000Z' })];
    const d = resolveAccess(['ppfa.export'], lapsed, 'ppfa.export', { now: NOW });
    expect(d.outcome).toBe('MODULE_EXPIRED');
    expect(d.reason).toMatch(/renew/i);
  });

  it('names an unprovisioned tenant distinctly rather than as a refusal to sell', () => {
    const d = resolveAccess(['ppfa.export'], [], 'ppfa.export', { now: NOW });
    expect(d.outcome).toBe('TENANT_NOT_PROVISIONED');
    expect(d.reason).toMatch(/core platform is unaffected/i);
  });

  it('never blocks an ungated capability, however empty the entitlements', () => {
    for (const cap of ['voters.view', 'incidents.create', 'warroom.view'] as const) {
      expect(resolveAccess([cap], [], cap, { now: NOW }).allowed, cap).toBe(true);
    }
  });

  it('keeps the bundled diary working for an unprovisioned tenant', () => {
    // A campaign with no subscription record must still be able to use
    // the platform it was given; only the paid modules go dark.
    expect(resolveAccess(['diary.edit'], [], 'diary.edit', { now: NOW }).allowed).toBe(true);
  });

  it('gates every PPFA capability behind the PPFA module, not just one', () => {
    for (const cap of PPFA_CAPS) {
      expect(resolveAccess([cap], [ent('incident-pro')], cap, { now: NOW }).allowed, cap).toBe(false);
      expect(resolveAccess([cap], [ent('ppfa-disclosure')], cap, { now: NOW }).allowed, cap).toBe(true);
    }
  });
});

describe('claim discipline', () => {
  const portSource = readFileSync(resolve(process.cwd(), 'src/dal/ports/entitlements.ts'), 'utf8');
  const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, '');

  it('stores no price, rate or amount against a tenant', () => {
    // The platform is sold to competing parties in the same municipality
    // on published, flat, identical terms. A per-tenant price on a record
    // is the appearance of differential terms whatever the number says.
    // Leading boundary only. A trailing \b cannot match `priceZAR` — the
    // same mistake the hash guard's first draft made with `otpCode`, and
    // it passed its own proof by matching nothing.
    for (const forbidden of [/\bprice/i, /\bcost/i, /\bamount/i, /\bfee/i, /\bdiscount/i, /ZAR/, /\brand\b/i]) {
      expect(code(portSource), `entitlements port matched ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it('exposes no client write path — an entitlement is a billing fact', () => {
    // A tenant admin who could grant themselves a module would make the
    // commercial model meaningless.
    //
    // Scoped to the repository interface, not the whole file: the record
    // legitimately carries createdAt/updatedAt/updatedBy, and a file-wide
    // scan for /create|update/ matches those and measures nothing.
    const start = portSource.indexOf('export interface EntitlementRepository {');
    expect(start, 'EntitlementRepository interface not found').toBeGreaterThan(-1);
    const body = portSource.slice(start, portSource.indexOf('}', start));
    for (const forbidden of [/upsert/i, /\bcreate\s*\(/i, /\bupdate\s*\(/i, /\bdelete\s*\(/i, /grant/i, /revoke/i]) {
      expect(body, `EntitlementRepository matched ${forbidden}`).not.toMatch(forbidden);
    }
    expect(body).toMatch(/listAll/);
  });

  it('denies client writes in firestore.rules too', () => {
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
    const start = rules.indexOf('match /tenants/{tid}/entitlements/');
    expect(start, 'entitlements block missing from firestore.rules').toBeGreaterThan(-1);
    const block = rules.slice(start, start + 400);
    expect(block).toMatch(/allow write: if false/);
    expect(block).toMatch(/allow read: if tenantOK\(tid\)/);
  });

  it('claims no surface it has not built', () => {
    // ward-sentiment and incident-pro are sold but not implemented here;
    // declaring gated capabilities they do not govern would be a claim
    // rather than a fact.
    expect(moduleDefinition('ward-sentiment').gatedCapabilities).toEqual([]);
    expect(moduleDefinition('incident-pro').gatedCapabilities).toEqual([]);
    for (const key of ['ward-sentiment', 'incident-pro', 'casework'] as ModuleKey[]) {
      expect(moduleDefinition(key).description, key).toMatch(/not built here yet/i);
    }
  });

  it('describes the diary as scheduling, never as permit compliance', () => {
    const diary = moduleDefinition('campaign-diary').description;
    expect(diary).toMatch(/scheduling tool, not a compliance tool/i);
    expect(diary).toMatch(/does not track gatherings permits/i);
  });

  it('describes PPFA as an aid that never blocks or files', () => {
    const ppfa = moduleDefinition('ppfa-disclosure').description;
    expect(ppfa).toMatch(/never blocks a donation/i);
    expect(ppfa).toMatch(/never files with the Electoral Commission/i);
  });
});
