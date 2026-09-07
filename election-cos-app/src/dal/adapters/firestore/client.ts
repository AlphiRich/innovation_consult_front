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
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';

const FUNCTIONS_REGION = 'africa-south1'; // §0 rule 1 — every Cloud Function, no exceptions

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
  authInstance ??= getAuth(getFirebaseApp());
  return authInstance;
}

let dbInstance: Firestore | null = null;
export function getDb(): Firestore {
  dbInstance ??= getFirestore(getFirebaseApp());
  return dbInstance;
}

let storageInstance: FirebaseStorage | null = null;
export function getStorageClient(): FirebaseStorage {
  storageInstance ??= getStorage(getFirebaseApp());
  return storageInstance;
}

let functionsInstance: Functions | null = null;
export function getFunctionsClient(): Functions {
  functionsInstance ??= getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
  return functionsInstance;
}
