/**
 * Election Campaign OS — the "a new version is ready" prompt
 * IC-ECOS-BUILD-2026-V2 §7.1.
 *
 * Deliberately a prompt and not an automatic reload. A canvasser at a
 * door has unsent work in the outbox and may be halfway through a capture
 * form; reloading under them to apply a build is how that gets lost. The
 * new version waits until somebody chooses it.
 *
 * Dismissable for the same reason — "not now" has to be an answer, or the
 * only way past it is to do the thing you were avoiding.
 */
import { useState } from 'react';
import { applyWaitingUpdate } from '@/offline/registerServiceWorker';

export function UpdateBanner({ onDismiss }: { onDismiss: () => void }) {
  const [applying, setApplying] = useState(false);

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-gold bg-ink px-4 py-3 text-paper"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <p className="text-body-md font-body">
          A new version of Election Campaign OS is ready. Anything you have captured is saved and will not be
          lost.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded border border-paper/40 px-3 py-1.5 text-label-caps font-display uppercase"
          >
            Not now
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={() => {
              setApplying(true);
              applyWaitingUpdate();
            }}
            className="rounded bg-gold px-3 py-1.5 text-label-caps font-display uppercase text-ink disabled:opacity-60"
          >
            {applying ? 'Updating…' : 'Update now'}
          </button>
        </div>
      </div>
    </div>
  );
}
