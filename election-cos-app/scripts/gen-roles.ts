/**
 * Election Campaign OS — regenerate the server's copy of the role table
 *
 *   npm run gen:roles
 *
 * See `src/auth/seedRolesMirror.ts` for why a mirror exists at all.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { MIRROR_PATH, renderRoleMirror } from '@/auth/seedRolesMirror';

const target = path.resolve(process.cwd(), MIRROR_PATH);
writeFileSync(target, renderRoleMirror());
console.log(`✓ wrote ${MIRROR_PATH}`);
