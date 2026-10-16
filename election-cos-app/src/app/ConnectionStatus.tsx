/**
 * Election Campaign OS — is this device online, and is anything waiting?
 * IC-ECOS-BUILD-2026-V2 §7.1, §7.5.
 *
 * WHY A FIELD APP NEEDS THIS IN THE CHROME
 *
 * The product's central promise is that a canvasser can work with no
 * signal and the work is sent later. The whole promise rests on something
 * the user cannot otherwise see: whether their captures are still sitting
 * in the outbox on this handset, or have actually reached the server.
 *
 * Without it the two states look identical. A canvasser finishes a round
 * in a dead spot, closes the app believing the day is filed, and the
 * queue is still full. That is the single worst failure this application
 * could have, and until session 38 nothing anywhere in the interface
 * reported it.
 *
 * WHAT IT WILL NOT DO
 *
 * It will not claim anything is synced. It reports two facts it can
 * actually establish — whether the browser thinks it has a connection,
 * and how many operations are queued locally — and nothing else.
 * `navigator.onLine` is famously optimistic (it means "attached to a
 * network", not "can reach the server"), so the wording is "connected",
 * never "synced", and the queue depth is the figure that matters.
 */
import { useConnectionStatus } from './useConnectionStatus';

export function ConnectionStatus({ compact = false }: { compact?: boolean }) {
  const { online, pending } = useConnectionStatus();
  const queued = pending !== null && pending > 0;

  // Offline with nothing queued is normal and not worth a warning. Offline
  // with work queued is the state a canvasser must notice.
  const tone = !online && queued ? 'text-gold' : !online ? 'text-paper/60' : queued ? 'text-gold' : 'text-paper/60';

  const label = online ? 'Connected' : 'Offline';
  const queueText =
    pending === null ? '' : pending === 0 ? ' · nothing waiting' : ` · ${pending} waiting to send`;

  if (compact) {
    return (
      <span className={`text-label-caps font-display uppercase ${tone}`} title={`${label}${queueText}`}>
        <span aria-hidden="true">{online ? '●' : '○'}</span>
        {queued && <span className="ml-1">{pending}</span>}
        <span className="sr-only">
          {label}
          {queueText}
        </span>
      </span>
    );
  }

  return (
    <p className={`text-label-caps font-display uppercase ${tone}`}>
      <span aria-hidden="true">{online ? '●' : '○'} </span>
      {label}
      {queueText}
    </p>
  );
}
