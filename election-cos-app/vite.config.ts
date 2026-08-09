import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Election-COS1.0 — election-cos-app
// IC-ECOS-BUILD-2026-V2 §1
// Imports defineConfig from 'vitest/config' (which merges Vite's and
// Vitest's config types) so the `test` block below type-checks without an
// `as any` escape hatch.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // functions/ is a separate package with its own vitest.config.ts and
    // its own `npm run test` — without 'functions/**' here, this app-root
    // run also swept into functions/src (redundant re-run of the same
    // suite) and functions/lib (tsc's compiled output, which crashes:
    // vitest is ESM-only and lib/ is CommonJS). Found session 9 when
    // functions/src/warRoomCounters.test.ts became that package's first
    // test file ever, exposing that this exclude had never been needed.
    // The rest of the list is vitest's own default (setting `exclude`
    // replaces it rather than appending, so it has to be repeated here).
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      'functions/**',
    ],
  },
});
