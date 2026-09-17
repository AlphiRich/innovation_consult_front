/**
 * Election Campaign OS — the client and the server resolve the same roles
 *
 * The role table exists twice: `seedRoles.ts` for the client, and a
 * generated copy in `functions/src/seedRoles.ts` for the Cloud Function
 * that stamps custom claims. They must agree.
 *
 * What drift costs, concretely: the client renders the nav from
 * `SEED_ROLES` and the token is stamped from the server's copy. A
 * capability in one and not the other produces a page a user can open and
 * a rule that then refuses the read — which presents as a broken page, not
 * as a stale table, and is debugged in the wrong file.
 *
 * The generated file is compared byte-for-byte rather than field-by-field.
 * A field comparison passes while the file on disk is stale, because it
 * re-renders the truth and compares it to itself; comparing to the file is
 * the only version of this test that can fail.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEED_ROLES } from './seedRoles';
import { MIRROR_PATH, renderRoleMirror } from './seedRolesMirror';

const REPO = path.resolve(__dirname, '..', '..');
const onDisk = () => readFileSync(path.join(REPO, MIRROR_PATH), 'utf-8');

describe('the server’s copy of the role table', () => {
  it('is exactly what the generator produces — run `npm run gen:roles`', () => {
    expect(onDisk()).toBe(renderRoleMirror());
  });

  it('carries every role the client knows about', () => {
    const mirror = onDisk();
    for (const role of SEED_ROLES) {
      expect(mirror, role.id).toContain(`'${role.id}': {`);
      expect(mirror, `${role.id} geoScope`).toContain(`geoScope: '${role.geoScope}',`);
    }
  });

  it('carries every default capability, so no role resolves to an empty token', () => {
    const mirror = onDisk();
    for (const role of SEED_ROLES) {
      expect(role.defaultCaps.length, `${role.id} has no default capabilities`).toBeGreaterThan(0);
      for (const cap of role.defaultCaps) {
        expect(mirror, `${role.id} is missing ${cap}`).toContain(`'${cap}',`);
      }
    }
  });

  it('is consumed by the function that stamps the token, not merely present', () => {
    // The defect this whole arrangement exists to prevent was a role
    // lookup that returned `defaultCaps: []` while looking entirely
    // plausible. Assert the function actually reads the table.
    const fn = readFileSync(path.join(REPO, 'functions', 'src', 'resolveCapabilities.ts'), 'utf-8');
    const code = fn.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).toContain("from './seedRoles'");
    expect(code).toMatch(/seedRole\(\s*after\.roleId\s*\)/);
    expect(code, 'no hardcoded empty capability list may remain').not.toMatch(/defaultCaps:\s*\[\s*\]/);
  });

  it('refuses to stamp a token at all for a role it does not know', () => {
    const fn = readFileSync(path.join(REPO, 'functions', 'src', 'resolveCapabilities.ts'), 'utf-8');
    const code = fn.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    // Two `setCustomUserClaims(uid, null)` calls: one for a deactivated
    // staff member, one for an unknown role. Both strip rather than stamp.
    expect((code.match(/setCustomUserClaims\(uid, null\)/g) ?? []).length).toBe(2);
  });
});
