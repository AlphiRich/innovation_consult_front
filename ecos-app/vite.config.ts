import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Election Campaign OS — ecos-app
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
  },
});
