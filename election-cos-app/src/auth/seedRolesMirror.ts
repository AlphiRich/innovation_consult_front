/**
 * Election Campaign OS — the role table, mirrored into the functions package
 *
 * WHY A MIRROR AND NOT AN IMPORT
 *
 * `functions/` is a separate npm package with its own tsconfig and its own
 * deploy artefact. It cannot import from `src/`, and the two are not yet a
 * workspace. Until they are, the server needs its own copy of the role
 * table — and a second copy of anything is a second copy that drifts.
 *
 * So it is generated rather than written. `npm run gen:roles` renders this
 * file's output to `functions/src/seedRoles.ts`, and `roleMirror.test.ts`
 * renders it again in-process and compares it to what is on disk. A role
 * edited in `seedRoles.ts` and not regenerated fails the build, which is
 * the same arrangement `tokens.test.ts` has with `tailwind.config.js` and
 * for the same reason.
 *
 * Only the fields the server actually uses are mirrored: the id it looks
 * up by, the default capabilities it resolves, and the geographic scope it
 * stamps into the token. Labels are a client concern.
 */
import { SEED_ROLES } from './seedRoles';

export const MIRROR_PATH = 'functions/src/seedRoles.ts';

export function renderRoleMirror(): string {
  const rows = SEED_ROLES.map((role) => {
    const caps = role.defaultCaps.map((cap) => `      '${cap}',`).join('\n');
    return [
      `  '${role.id}': {`,
      `    geoScope: '${role.geoScope}',`,
      '    defaultCaps: [',
      caps,
      '    ],',
      '  },',
    ].join('\n');
  }).join('\n');

  return `/**
 * Election Campaign OS — role table (GENERATED — DO NOT EDIT)
 *
 * Generated from \`src/auth/seedRoles.ts\` by \`npm run gen:roles\`.
 * \`src/auth/roleMirror.test.ts\` fails if this file and that one disagree.
 *
 * The client and the server must resolve the same capabilities from the
 * same role, or a user sees a page the token will not let them use —
 * which reads as a bug in the page rather than as a drift between two
 * copies of a table.
 */

export interface SeedRole {
  geoScope: 'TENANT' | 'MUNICIPALITY' | 'WARD' | 'VD';
  defaultCaps: string[];
}

export const SEED_ROLES: Record<string, SeedRole> = {
${rows}
};

export function seedRole(roleId: string): SeedRole | null {
  return Object.prototype.hasOwnProperty.call(SEED_ROLES, roleId) ? SEED_ROLES[roleId] : null;
}
`;
}
