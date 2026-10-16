/**
 * Reads the two exported constants out of
 * src/config/securityHeaders.ts without a TypeScript toolchain.
 *
 * The file is deliberately plain — string literals, arrays and one object
 * — so stripping the type annotations and evaluating it as an ES module
 * is sufficient and has no dependencies. A guard test imports the real
 * module through vitest and asserts this loader agrees with it, so the
 * shortcut cannot quietly diverge from the source of truth.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'src', 'config', 'securityHeaders.ts');

const js = readFileSync(SOURCE, 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/:\s*Record<string,\s*string>/g, '')
  .replace(/:\s*string\[\]/g, '');

const module = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

export const { GLOBAL_HEADERS, CACHE_RULES, CONTENT_SECURITY_POLICY } = module;
