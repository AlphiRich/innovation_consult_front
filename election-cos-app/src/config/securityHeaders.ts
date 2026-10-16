/**
 * Election Campaign OS — the response headers Hosting serves
 * IC-ECOS-BUILD-2026-V2 §1.
 *
 * WHY THIS IS A MODULE AND NOT JUST firebase.json
 *
 * The values live here, a guard test asserts `firebase.json` carries
 * them, and the local verification harness serves exactly these headers
 * over the real build so a CSP that would break the product in
 * production breaks it here first. A policy nobody can test is a policy
 * nobody should ship.
 *
 * WHY NOT A CLOUDFLARE WORKER
 *
 * Session 31 reviewed a reverse-proxy Worker that did roughly this, and
 * deferred it because "this build has no deployment target configured".
 * There is one now, so the question reopened — and the answer is still
 * no, for a reason that got stronger rather than weaker:
 *
 *  - Firebase Hosting serves these headers itself. One platform, one
 *    deploy, one set of credentials, and `npm run preflight` can check
 *    them. A Worker is a second deploy path that can silently drift out
 *    of step with the app it fronts.
 *  - Rule 1 of the build spec is `africa-south1`, for voter data. Edge
 *    compute terminates and processes requests at whichever point of
 *    presence is nearest the user — which is the opposite of a
 *    data-residency commitment, and this product's residency story is
 *    something a municipality will ask about.
 *
 * Cloudflare as *DNS* is a separate question and is fine. See §4.1 of
 * docs/deploy-credentials-request.md for the proxy caveat.
 *
 * THE TWO SESSION-31 CORRECTIONS, CARRIED OUT
 *
 *  - `X-XSS-Protection` is NOT set. It is deprecated, ignored by current
 *    Chrome and Firefox, and its filtering mode has itself been a source
 *    of vulnerabilities. The CSP is what provides the protection.
 *  - `script-src` does NOT carry `'unsafe-inline'`. Session 31 said it
 *    was not required; verified against the real build, which has zero
 *    inline scripts — `dist/index.html` emits one `<script type="module"
 *    src=…>` and nothing else.
 *
 * THE ONE CONCESSION, STATED PLAINLY
 *
 * `style-src` DOES carry `'unsafe-inline'`, because three components set
 * style attributes with values only known at runtime: `BarMeter`'s width
 * percentage, `SchematicMap`'s per-ward alpha, and the household map's
 * height. An inline style attribute cannot be hashed, and a nonce cannot
 * be applied to an attribute, so the alternatives are this or losing
 * those renders. It is a far smaller exposure than the script-src
 * equivalent — it permits style injection, not code execution — and it
 * is the only `'unsafe-*'` in the policy.
 */

/** Hosts the Firebase SDKs talk to. Narrower than `*.googleapis.com`. */
const FIREBASE_API = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firestore.googleapis.com',
  'https://firebaseinstallations.googleapis.com',
  'https://firebasestorage.googleapis.com',
  'https://www.googleapis.com',
];

/**
 * Google Maps, used by the household map. Present whether or not a key is
 * configured: when `VITE_GOOGLE_MAPS_API_KEY` is unset the wrapper never
 * loads the SDK, but a CSP that omits these would mean the map silently
 * dies the day somebody sets the key — the exact failure mode nobody
 * connects back to a header.
 */
const MAPS = ['https://maps.googleapis.com', 'https://maps.gstatic.com'];

/** The Google sign-in popup and the Firebase auth helper iframe. */
const AUTH_FRAME = ['https://accounts.google.com', 'https://apis.google.com'];

export const CONTENT_SECURITY_POLICY = [
  `default-src 'self'`,
  // No 'unsafe-inline'. The build has no inline scripts.
  `script-src 'self' https://apis.google.com ${MAPS[0]}`,
  // See the header comment: three runtime style attributes force this.
  `style-src 'self' 'unsafe-inline'`,
  // Self-hosted woff2 only — no CDN, which is also why the app works offline.
  `font-src 'self'`,
  `img-src 'self' data: blob: https://lh3.googleusercontent.com ${MAPS.join(' ')}`,
  `connect-src 'self' ${FIREBASE_API.join(' ')} ${MAPS[0]} https://*.firebaseio.com wss://*.firebaseio.com`,
  `frame-src 'self' ${AUTH_FRAME.join(' ')} https://election2026-campaignms7-0.firebaseapp.com`,
  // Nothing in this product is a plugin or an embedded object.
  `object-src 'none'`,
  // Stops an injected <base> redirecting every relative URL in the app.
  `base-uri 'self'`,
  // A form in this app posts to this app. Nowhere else.
  `form-action 'self'`,
  // The modern X-Frame-Options. Both are sent; this is the one that counts.
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

/**
 * Applied to every path.
 *
 * HSTS has no `preload`, deliberately. Preloading is submitted to a list
 * baked into browsers and is slow and painful to reverse; a one-year
 * max-age gives the protection without the trap. Add `preload` as a
 * separate, deliberate decision once the domain has been stable.
 */
export const GLOBAL_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // Routes here carry ward and voting-district codes. The same reasoning
  // as the <meta name="referrer"> in index.html, enforced at the edge
  // where a meta tag cannot reach (non-HTML responses).
  'Referrer-Policy': 'same-origin',
  // Geolocation is the one capability this product has a claim to, and it
  // does not use it yet. Everything is denied until something asks.
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  // Against the browser cache leaking a previous user's screens on a
  // shared phone — which, on a campaign, is the normal case.
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};

/**
 * Cache rules. Vite fingerprints asset filenames, so those are immutable;
 * everything that is NOT fingerprinted has to revalidate or an update
 * never reaches a device.
 *
 * `sw.js` in particular: a cached service worker is a device frozen on an
 * old build, and this is an offline-first application whose users are in
 * the field.
 */
export const CACHE_RULES = [
  { source: '/assets/**', value: 'public, max-age=31536000, immutable' },
  { source: '/fonts/**', value: 'public, max-age=31536000, immutable' },
  { source: '/sw.js', value: 'no-cache, no-store, must-revalidate' },
  { source: '/index.html', value: 'no-cache' },
  { source: '/manifest.webmanifest', value: 'no-cache' },
];
