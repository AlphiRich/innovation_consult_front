/**
 * Election Campaign OS — Firebase app singleton
 * IC-ECOS-BUILD-2026-V2 §1, §4.3
 *
 * The ONLY place `initializeApp` is called. Firestore/Storage/Auth clients
 * are lazily created from here. This file — and the rest of
 * src/dal/adapters/firestore/** and src/auth/** — are the only places
 * allowed to import the Firebase SDK; see the ESLint boundary in
 * .eslintrc.cjs and §2.2 of the build spec.
 *
 * Deliberately does not throw at import time when env vars are absent, so
 * that `npm run build` / unit tests work without live Firebase credentials
 * (none exist yet for this project — see BUILD-STATUS.md). It throws only
 * when a consumer actually tries to use an uninitialised client.
 *
 * EMULATORS (session 38)
 *
 * Until now this file could only talk to a real project, and no real
 * project has ever been reachable from this build — which meant the
 * application had never been run against a backend of any kind, by
 * anybody, in thirty-seven sessions. Everything was proven by unit test
 * and review.
 *
 * Setting `VITE_FIREBASE_USE_EMULATORS=true` points Auth, Firestore,
 * Storage and Functions at the local emulator suite (`npm run emulators`,
 * ports from firebase.json). That is how a developer signs in, loads the
 * NW405 seed and sees a screen with real data in it.
 *
 * Two safety rules, both guarded by `client.test.ts`:
 *
 *  - Emulator mode is refused in a production build. A bundle that shipped
 *    pointing at localhost would silently fail for every user, and a
 *    bundle that shipped pointing at an emulator somebody port-forwarded
 *    would be worse.
 *  - It only ever attaches to 127.0.0.1. The host is not configurable,
 *    because a configurable emulator host is a way to send a tenant's
 *    voter records somewhere else.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';

const FUNCTIONS_REGION = 'africa-south1'; // §0 rule 1 — every Cloud Function, no exceptions

/** Ports as declared in firebase.json. Kept in step by client.test.ts. */
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  storage: 9199,
  functions: 5001,
} as const;

/**
 * Never configurable, and never in a production build. See the header.
 */
const EMULATOR_HOST = '127.0.0.1';

export function usingEmulators(): boolean {
  if (import.meta.env.PROD) return false;
  return import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true';
}

function readConfig() {
  const env = import.meta.env;
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  const isConfigured = Boolean(config.apiKey && config.projectId);
  return { config, isConfigured };
}

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const { config, isConfigured } = readConfig();
  if (!isConfigured) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and fill in the project ' +
        'created per 03-implementation-rollout-plan-v2.md §2 (Firebase project, region ' +
        'africa-south1). See BUILD-STATUS.md for what is still pending.',
    );
  }
  app = getApps().length ? getApps()[0] : initializeApp(config);
  return app;
}

let authInstance: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    if (usingEmulators()) {
      connectAuthEmulator(authInstance, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
        disableWarnings: true,
      });
    }
  }
  return authInstance;
}

let dbInstance: Firestore | null = null;
export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
    if (usingEmulators()) connectFirestoreEmulator(dbInstance, EMULATOR_HOST, EMULATOR_PORTS.firestore);
  }
  return dbInstance;
}

let storageInstance: FirebaseStorage | null = null;
export function getStorageClient(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
    if (usingEmulators()) connectStorageEmulator(storageInstance, EMULATOR_HOST, EMULATOR_PORTS.storage);
  }
  return storageInstance;
}

let functionsInstance: Functions | null = null;
export function getFunctionsClient(): Functions {
  if (!functionsInstance) {
    functionsInstance = getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
    if (usingEmulators()) connectFunctionsEmulator(functionsInstance, EMULATOR_HOST, EMULATOR_PORTS.functions);
  }
  return functionsInstance;
}
