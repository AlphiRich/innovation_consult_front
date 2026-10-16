/**
 * Election Campaign OS — service worker registration
 * IC-ECOS-BUILD-2026-V2 §7.1.
 *
 * Registration is deliberately small and deliberately not silent about
 * updates.
 *
 * A canvasser mid-round has unsent work in the Dexie outbox. Reloading
 * the page under them to apply a new build is how that gets interrupted,
 * and auto-reloading service workers are a well-known way to lose a form
 * somebody was halfway through. So a waiting worker raises a callback and
 * the application asks; it never reloads on its own.
 *
 * Nothing here runs in development. A service worker caching a dev build
 * makes Vite's hot reload behave in ways that waste an afternoon, and the
 * thing being tested offline is the production shell anyway.
 */

export type UpdateHandler = () => void;

let waitingWorker: ServiceWorker | null = null;

/** Apply a waiting update. Reloads the page; call it only on a deliberate action. */
export function applyWaitingUpdate(): void {
  if (!waitingWorker) return;
  waitingWorker.postMessage('SKIP_WAITING');
  waitingWorker = null;
}

export function hasWaitingUpdate(): boolean {
  return waitingWorker !== null;
}

/**
 * Register the worker and call `onUpdateReady` when a new build is
 * waiting.
 *
 * Returns false when registration was not attempted, so a caller can tell
 * "no service worker support" from "registered and nothing to report".
 */
export function registerServiceWorker(onUpdateReady?: UpdateHandler): boolean {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  if (import.meta.env.DEV) return false;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // A worker already waiting when the page loads: the user has been
        // here since the last deploy.
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorker = registration.waiting;
          onUpdateReady?.();
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // `controller` is null on the very first install — that is not
            // an update, it is the app becoming available offline, and
            // prompting for it would be noise.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = installing;
              onUpdateReady?.();
            }
          });
        });
      })
      .catch(() => {
        // A failed registration must not break the app: everything still
        // works online. Swallowed rather than surfaced, because there is
        // nothing a canvasser could do about it.
      });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });

  return true;
}
