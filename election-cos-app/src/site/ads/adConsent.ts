/**
 * Election Campaign OS — the advertising consent record
 *
 * Three states, and the distinction between two of them matters:
 * `granted`, `refused`, and `unasked`. Refused and unasked produce the
 * same outcome — no advert — but only `unasked` shows the banner. A
 * visitor who said no is not asked again on every page.
 *
 * WHY localStorage AND WHY THAT IS ACCEPTABLE HERE
 *
 * Browser storage on this project is reserved for per-viewer
 * conveniences and never for state that must be reliable or that Claude
 * or a server reads back. A consent choice is exactly that: it belongs
 * to one person on one device, nothing else depends on it, and losing it
 * fails to the safe side — the banner reappears and no advert loads
 * until the person answers again.
 *
 * Every read and write is wrapped. In a private window, with site data
 * blocked, or during a thumbnail capture, the accessor can throw rather
 * than return empty, and an exception here would take the page down over
 * an advert.
 *
 * The stored record carries the version it was given under, so changing
 * the wording in `AD_CONSENT_VERSION` voids every consent collected
 * against the old wording rather than silently inheriting it.
 */
import { AD_CONSENT_VERSION } from './adPolicy';

const STORAGE_KEY = 'ecos.site.adConsent';

export type AdConsentState = 'granted' | 'refused' | 'unasked';

interface StoredConsent {
  state: 'granted' | 'refused';
  version: number;
  at: string;
}

/**
 * What this visitor has said.
 *
 * Returns `unasked` for anything that is not a well-formed record at the
 * current version — a missing key, unparsable JSON, a record from an
 * older wording, or a value somebody put there by hand. Failing to
 * `unasked` rather than to `granted` is the whole design: every
 * unreadable state results in no advert.
 */
export function readAdConsent(): AdConsentState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'unasked';

    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.version !== AD_CONSENT_VERSION) return 'unasked';
    if (parsed.state !== 'granted' && parsed.state !== 'refused') return 'unasked';

    return parsed.state;
  } catch {
    return 'unasked';
  }
}

/** Record a choice. Silently a no-op if storage refuses the write. */
export function writeAdConsent(state: 'granted' | 'refused'): void {
  const record: StoredConsent = {
    state,
    version: AD_CONSENT_VERSION,
    at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /*
     * Storage unavailable. The choice holds for this page view through
     * React state; next visit the banner asks again. Deliberately not
     * surfaced as an error: a visitor who declined cookies does not need
     * to be told that the cookie recording their decline could not be
     * set.
     */
  }
}

/** Forget the choice, so the banner asks again. For the withdrawal link. */
export function clearAdConsent(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* As above. */
  }
}

/** True only on an active, current-version grant. */
export function hasAdConsent(state: AdConsentState): boolean {
  return state === 'granted';
}
