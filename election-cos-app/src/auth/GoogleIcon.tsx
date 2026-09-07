/**
 * Election Campaign OS — Google "G" mark
 * IC-ECOS-BUILD-2026-V2 §2.2 exception, deliberate: this is Google's own
 * brand mark, reproduced at its official fixed colours per Google's
 * identity guidelines — not a design decision this app gets to make via
 * src/design/tokens.ts, the same way a Visa or MasterCard mark on a
 * payment button isn't reskinned into a site's brand palette either.
 * Isolated to this one file (allow-listed in scripts/check-no-hex.mjs
 * alongside tokens.ts) so the hex-literal guard still catches an actual
 * accidental raw-hex regression everywhere else in the app.
 */
export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 013.65 9c0-.59.1-1.17.3-1.7V4.97H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
