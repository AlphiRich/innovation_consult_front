/**
 * Election Campaign OS — service worker
 * IC-ECOS-BUILD-2026-V2 §7.1 (offline-first).
 *
 * THE RULE THAT SHAPES EVERYTHING HERE
 *
 * This caches the application, never the data.
 *
 * It is tempting, in an offline-first product, to cache API responses too
 * — the app would open with yesterday's voter list instead of an empty
 * screen. That would be wrong twice over. It would show a canvasser a
 * voter record that has since been corrected, with no way to tell;  and it
 * would put personal information under POPIA into a cache this
 * application cannot enumerate, expire on sign-out, or wipe when a phone
 * changes hands.
 *
 * Offline data in this product lives in Dexie (`src/offline/`), which is
 * tenant-scoped, inspectable, clearable on sign-out, and already carries
 * the outbox that replays writes. The service worker's job is narrower
 * and entirely about the shell: make the application itself load without
 * a network, so the Dexie-backed screens can render.
 *
 * So:
 *   - Same-origin build assets  -> cache-first, precached at install.
 *   - Navigations               -> network, falling back to the cached shell.
 *   - Everything else           -> straight to the network, never cached.
 *
 * Firestore, Cloud Functions, Google APIs and every other cross-origin
 * request fall into that last bucket and are not touched. `FORBIDDEN_HOSTS`
 * makes that explicit rather than incidental, so a later edit that adds a
 * broad caching rule trips over it.
 *
 * GENERATED PRECACHE LIST
 *
 * `__PRECACHE_MANIFEST__` and `__BUILD_ID__` are replaced after every
 * build by `scripts/build-sw.mjs`, which reads the real hashed filenames
 * out of `dist/`. A hand-written list would go stale on the first build
 * and silently precache nothing.
 */
/* eslint-env serviceworker */
/* global self, caches, clients, fetch, URL, Response */

const BUILD_ID = '__BUILD_ID__';
const PRECACHE = '__PRECACHE_MANIFEST__';
const CACHE_NAME = `ecos-shell-${BUILD_ID}`;

/**
 * Hosts whose responses must never enter a cache, whatever a future
 * fetch handler does. Data, auth and telemetry.
 */
const FORBIDDEN_HOSTS = [
  'firestore.googleapis.com',
  'firebasestorage.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'cloudfunctions.net',
  'googleapis.com',
  'google-analytics.com',
];

function isCacheable(url) {
  if (url.origin !== self.location.origin) return false;
  // /api/** is the sync function behind a Hosting rewrite: same origin,
  // but data.
  if (url.pathname.startsWith('/api/')) return false;
  if (FORBIDDEN_HOSTS.some((host) => url.hostname.endsWith(host))) return false;
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll is atomic: one missing asset fails the install and the old
      // worker stays in charge, which is the right outcome. A partially
      // precached shell is a white screen offline.
      await cache.addAll(PRECACHE);
      // Take over as soon as the user reloads rather than waiting for
      // every tab to close; the app prompts before this happens.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith('ecos-shell-') && name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // A navigation offline must still open the app. Network first, so a
  // deployed update is picked up, with the cached shell behind it.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const shell = await cache.match('/index.html');
          return (
            shell ??
            new Response('Election Campaign OS is not available offline yet — open it once with a connection.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  if (!isCacheable(url)) return; // straight to the network, uncached

  // Build assets are content-hashed, so a cache hit is always correct.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});

// The app asks for this when the user accepts an update prompt.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
