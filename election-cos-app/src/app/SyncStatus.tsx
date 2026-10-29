/**
 * Election Campaign OS — the persistent sync indicator
 * IC-ECOS-BUILD-2026-V2 §7.1, §7.5.
 *
 * Replaces `ConnectionStatus` (removed), which reported
 * `navigator.onLine` and the Dexie outbox depth and — correctly, given
 * only those two signals — refused ever to say "synced". `src/offline/syncStatus.ts` explains what
 * the Firestore listener metadata adds and why the word is now sayable.
 *
 * WHY IT IS IN THE CHROME AND NOT ON A SCREEN
 *
 * The product's central promise is that a canvasser can work with no
 * signal and the work is sent later. The promise rests on something the
 * user cannot otherwise see, and the failure it guards against is the
 * worst this application could have: a round finished in a dead spot, the
 * app closed in the belief the day is filed, the queue still full. A fact
 * that load-bearing belongs where it is always visible, not behind a tap.
 *
 * ACCESSIBILITY
 *
 * The status word carries the status. The marker only repeats it, and the
 * markers differ in shape as well as hue — a filled disc, a hollow ring,
 * a dashed ring — so the five states are separable by somebody who cannot
 * separate the colours (rule 13). `role="status"` with `aria-live`
 * "polite" means a change is announced without stealing focus, which is
 * the "notify" half of the job: a user who cannot see the chrome still
 * hears that the connection dropped with four doors unsent.
 *
 * The compact form keeps the full sentence in an `sr-only` span, so the
 * phone bar is terse visually and complete to a screen reader rather
 * than being a bare coloured dot with no accessible name.
 */
import type { SyncStatus } from '@/offline/syncStatus';
import { useSyncStatus } from './syncStatusContext';

/**
 * Marker shape and tone per state.
 *
 * Tones are design tokens only (§12). `paper/60` is the quiet default on
 * the dark chrome; `gold` is this product's attention colour; `green` is
 * used for exactly one state, so it never becomes decoration.
 */
const MARKER: Record<SyncStatus, { shape: string; tone: string; short: string }> = {
  // Filled disc — the only solid marker, for the only state that asserts
  // the work has landed.
  SYNCED: { shape: 'rounded-full bg-green', tone: 'text-green', short: 'Synced' },
  // Hollow ring: in flight.
  SENDING: { shape: 'rounded-full border-2 border-paper/60', tone: 'text-paper/60', short: 'Sending' },
  // Hollow ring, quiet: offline is normal here.
  OFFLINE: { shape: 'rounded-full border-2 border-paper/60', tone: 'text-paper/60', short: 'Offline' },
  // Dashed ring: something is wrong that the user can act on.
  UNREACHABLE: {
    shape: 'rounded-full border-2 border-dashed border-gold',
    tone: 'text-gold',
    short: 'No server',
  },
  // Dashed ring, quiet: not established yet.
  UNKNOWN: {
    shape: 'rounded-full border-2 border-dashed border-paper/60',
    tone: 'text-paper/60',
    short: 'Checking',
  },
};

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { status, label, detail, attention } = useSyncStatus();
  const marker = MARKER[status];
  // `attention` can raise a state's tone but never lowers one: offline
  // with doors unsent is the case this exists for.
  const tone = attention ? 'text-gold' : marker.tone;
  const shape = attention ? 'rounded-full border-2 border-gold' : marker.shape;

  if (compact) {
    return (
      <span
        role="status"
        aria-live="polite"
        title={detail}
        className={`inline-flex items-center gap-1.5 text-label-caps font-display uppercase ${tone}`}
      >
        <span aria-hidden="true" className={`h-2.5 w-2.5 flex-none ${shape}`} />
        {/*
         * The SHORT word here, not `label`. Found by running it: the
         * phone bar carries the brand, this indicator and the Menu
         * button on one line, and "Cannot reach server" — the longest
         * label — fits at 390px but collides with Menu at 320px, which
         * is still a common handset width. The word is what makes the
         * state readable without colour, so shortening it is right and
         * dropping it is not. The full sentence is unchanged below for
         * anybody not reading it visually.
         */}
        <span aria-hidden="true">{marker.short}</span>
        {/* The sentence, for anybody who cannot hover a title attribute. */}
        <span className="sr-only">
          {label}. {detail}
        </span>
      </span>
    );
  }

  return (
    <div role="status" aria-live="polite" className="space-y-1">
      <p className={`flex items-center gap-2 text-label-caps font-display uppercase ${tone}`}>
        <span aria-hidden="true" className={`h-2.5 w-2.5 flex-none ${shape}`} />
        {label}
      </p>
      <p className="text-body-md font-body text-paper/60">{detail}</p>
    </div>
  );
}
