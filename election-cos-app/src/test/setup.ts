// Vitest global setup.
//
// fake-indexeddb polyfills IndexedDB for jsdom (which doesn't implement it)
// so src/offline/db.test.ts (Dexie) can run under Vitest.
//
// No @testing-library/jest-dom matchers are wired up yet — this session's
// tests exercise pure logic (capability resolver, seat calculator,
// escalation ladder, Auth minimal-footprint guard, offline schema) rather
// than rendered components. Add jest-dom (and the devDependency) when the
// first component test lands in Phase 3.
import 'fake-indexeddb/auto';
