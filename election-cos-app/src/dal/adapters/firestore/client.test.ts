/**
 * Election Campaign OS — guards on the Firebase client
 *
 * Session 38 pointed this build at an emulator for the first time, which
 * is how the application was finally run end to end. The risk that
 * introduces is a bundle that ships talking to localhost, or worse to a
 * host somebody made configurable. Both are guarded here by reading the
 * source, because the condition is a build-time constant that a unit test
 * cannot otherwise observe.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EMULATOR_PORTS, usingEmulators } from './client';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const source = readFileSync(path.join(__dirname, 'client.ts'), 'utf8');

describe('emulator mode cannot ship', () => {
  it('tracks the flag in a development run', () => {
    // Not asserted as false: a developer with a local .env pointing at
    // the emulator suite SHOULD get true here, and pinning it either way
    // would make this test a report on whose machine it ran. What must
    // hold is the relationship.
    const flagged = import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true';
    expect(usingEmulators()).toBe(flagged && !import.meta.env.PROD);
  });

  it('checks PROD before it checks the flag', () => {
    // Order matters: a production bundle must refuse even if the
    // environment variable is somehow set at build time.
    const body = /export function usingEmulators\(\)[^}]*}/.exec(source)?.[0] ?? '';
    expect(body).toMatch(/import\.meta\.env\.PROD/);
    expect(body.indexOf('PROD')).toBeLessThan(body.indexOf('VITE_FIREBASE_USE_EMULATORS'));
  });

  it('hardcodes the loopback host', () => {
    // A configurable emulator host is a way to send a tenant's voter
    // records somewhere else.
    expect(source).toMatch(/const EMULATOR_HOST = '127\.0\.0\.1'/);
    const occurrences = source.match(/EMULATOR_HOST/g) ?? [];
    expect(occurrences.length).toBeGreaterThan(1);
    expect(source).not.toMatch(/VITE_EMULATOR_HOST|env\.\w*EMULATOR_HOST/);
  });

  it('attaches every client or none, so nothing talks half to production', () => {
    // Auth against the emulator with Firestore against the real project
    // would write real records under a fake uid.
    for (const connector of [
      'connectAuthEmulator',
      'connectFirestoreEmulator',
      'connectStorageEmulator',
      'connectFunctionsEmulator',
    ]) {
      expect(source, `${connector} is not wired`).toContain(connector);
    }
    expect(source.match(/usingEmulators\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('uses the ports firebase.json actually declares', () => {
    const firebaseJson = JSON.parse(readFileSync(path.join(REPO_ROOT, 'firebase.json'), 'utf8')) as {
      emulators: Record<string, { port: number }>;
    };
    expect(EMULATOR_PORTS.auth).toBe(firebaseJson.emulators.auth.port);
    expect(EMULATOR_PORTS.firestore).toBe(firebaseJson.emulators.firestore.port);
    expect(EMULATOR_PORTS.storage).toBe(firebaseJson.emulators.storage.port);
    expect(EMULATOR_PORTS.functions).toBe(firebaseJson.emulators.functions.port);
  });
});

describe('the emulator sign-in block cannot ship either', () => {
  const signIn = readFileSync(path.join(REPO_ROOT, 'src', 'auth', 'SignInPage.tsx'), 'utf8');

  it('renders only behind usingEmulators()', () => {
    expect(signIn).toMatch(/\{usingEmulators\(\) && \(/);
    // Exactly one gated block. A second would be a second thing to keep
    // gated. (Two matches: the import and the one call site.)
    expect(signIn.match(/\{usingEmulators\(\) && \(/g)?.length).toBe(1);
  });

  it('carries no hardcoded credential', () => {
    expect(signIn).not.toMatch(/password\s*[:=]\s*['"][^'"]{3,}['"]/i);
    expect(signIn).not.toMatch(/@example\.(org|com)/);
  });
});

describe('the region rule', () => {
  it('pins Functions to africa-south1 in the client too', () => {
    // §0 rule 1. The client must call the same region the functions
    // deploy to, or every callable fails with a 404 that reads as a bug
    // in the function.
    expect(source).toMatch(/const FUNCTIONS_REGION = 'africa-south1'/);
  });
});
