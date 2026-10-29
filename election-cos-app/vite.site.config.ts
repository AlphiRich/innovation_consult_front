/**
 * Election Campaign OS — public site build (electioncos.co.za)
 *
 * A second Vite config rather than a second entry in the first one.
 *
 * `scripts/build-sw.mjs` walks every file under `dist/` and writes them
 * into the service worker's precache list. A marketing site built into
 * the same directory would therefore be downloaded and held offline by
 * every field device — the opposite of what an offline-first canvassing
 * application should spend a canvasser's data on. Separate `outDir`,
 * separate deploy target, one set of tokens and conventions.
 */
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { renameSync } from 'node:fs';
import path from 'node:path';

/**
 * The entry is `site.html` in the source tree so it cannot be confused
 * with the application's `index.html`, but a web server resolves `/` to
 * `index.html` and nothing else. Without this rename the built site
 * answers 404 at its own front door — found by serving the build rather
 * than trusting it.
 */
function entryAsIndex(outDir: string): Plugin {
  return {
    name: 'ecos-site-entry-as-index',
    closeBundle() {
      renameSync(path.join(outDir, 'site.html'), path.join(outDir, 'index.html'));
    },
  };
}

const OUT_DIR = path.resolve(__dirname, 'dist-site');

export default defineConfig({
  plugins: [react(), entryAsIndex(OUT_DIR)],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'site.html'),
    },
  },
});
