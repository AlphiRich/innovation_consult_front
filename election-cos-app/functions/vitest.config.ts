/**
 * Election-COS1.0 — Cloud Functions test config
 * Excludes `lib/` (tsc's build output — same test files, already
 * compiled) from vitest's default include glob. Found session 9 when
 * warRoomCounters.test.ts became the first test file this package ever
 * had: without this, `npm run build` followed by `npm run test` picked up
 * both the TS source and the compiled `lib/*.test.js` copy, and the
 * compiled CommonJS copy fails outright (`vitest` is ESM-only).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', 'lib/**'],
  },
});
