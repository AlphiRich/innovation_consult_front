#!/usr/bin/env node
/**
 * Election Campaign OS — stamp capability claims on an emulator account
 * IC-ECOS-BUILD-2026-V2 §4.4.
 *
 * In production `functions/src/resolveCapabilities.ts` mints these claims
 * from a staff record whenever one changes. Locally there is no staff
 * record and often no functions emulator, so a developer signs in and
 * lands on "Awaiting access" with no way forward. This is that way
 * forward.
 *
 * REFUSES TO TALK TO ANYTHING BUT THE EMULATOR
 *
 * It only ever posts to 127.0.0.1 on the Auth emulator port, and the
 * emulator's owner token is the only credential it uses. Pointed at a
 * real project it would be a privilege-escalation tool, so it cannot be
 * pointed at one: the host is not a parameter.
 *
 * USAGE
 *   node tools/dev/grant-claims.mjs <email> [roleId]
 *   node tools/dev/grant-claims.mjs thandi@example.org party-hq-admin
 */
import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const HOST = '127.0.0.1';
const PORT = JSON.parse(readFileSync(path.join(ROOT, 'firebase.json'), 'utf8')).emulators.auth.port;
const PROJECT = JSON.parse(readFileSync(path.join(ROOT, '.firebaserc'), 'utf8')).projects.default;
// The emulator keys accounts by project id; `npm run emulators` uses this one.
const EMULATOR_PROJECT = process.env.ECOS_EMULATOR_PROJECT ?? 'demo-ecos';
const BASE = `http://${HOST}:${PORT}/identitytoolkit.googleapis.com/v1/projects/${EMULATOR_PROJECT}/accounts`;

const [email, roleId = 'party-hq-admin'] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node tools/dev/grant-claims.mjs <email> [roleId]');
  process.exit(2);
}

/** Every capability in the product, read from the source of truth. */
function allCapabilities() {
  const source = readFileSync(path.join(ROOT, 'src', 'auth', 'allCapabilities.ts'), 'utf8');
  const found = [...source.matchAll(/'([a-zA-Z_]+\.[a-zA-Z_]+)'/g)].map((m) => m[1]);
  return [...new Set(found)];
}

async function call(suffix, payload) {
  const response = await fetch(BASE + suffix, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${suffix} -> ${response.status} ${await response.text()}`);
  return response.json();
}

try {
  const { userInfo = [] } = await call(':query', {});
  const account = userInfo.find((u) => u.email === email);
  if (!account) {
    console.error(
      `No emulator account for ${email}. Sign in once through the app's emulator block first — ` +
        `the account is created on first use.\nAccounts present: ${userInfo.map((u) => u.email).join(', ') || 'none'}`,
    );
    process.exit(1);
  }

  const caps = allCapabilities();
  const claims = { tenantId: 'demo-tenant', roleId, caps, geoScope: 'MUNICIPALITY' };
  await call(':update', { localId: account.localId, customAttributes: JSON.stringify(claims) });

  console.log(`Granted ${caps.length} capabilities to ${email} as ${roleId} in tenant demo-tenant.`);
  console.log(`uid ${account.localId}`);
  console.log('\nSign out and back in — the ID token only picks up new claims on refresh.');
  console.log(`(Real project is ${PROJECT}; this touched the emulator at ${HOST}:${PORT} only.)`);
} catch (error) {
  console.error(
    `Failed: ${error.message}\n\nIs the Auth emulator running? Start it with: npm run emulators`,
  );
  process.exit(1);
}
