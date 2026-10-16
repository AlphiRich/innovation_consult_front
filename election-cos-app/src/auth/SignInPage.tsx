/**
 * Election Campaign OS — sign-in
 * IC-ECOS-BUILD-2026-V2 §4.3. Session 10 — the app never had a sign-in UI
 * at all before this; every module page just showed "No active session"
 * and there was no way to actually reach a signed-in state. Google
 * Sign-in only (email/password functions exist in firebaseAuth.ts but
 * aren't exposed here — Google was the human's explicit ask).
 *
 * THE EMULATOR BLOCK (session 38)
 *
 * `signInWithPopup` loads apis.google.com, which no emulator can stand in
 * for. That made the whole application unreachable locally: there was no
 * way to get past this screen without a live Google OAuth round trip, so
 * in thirty-seven sessions nobody had ever seen a signed-in screen of
 * this product running.
 *
 * So when — and only when — the app is pointed at the local emulator
 * suite, this screen also offers email sign-in, using the
 * `signUpWithEmail`/`signInWithEmail` functions that have been in
 * `firebaseAuth.ts` and tested since session 3 but were never exposed.
 *
 * `usingEmulators()` returns false in any production build by
 * construction (it checks `import.meta.env.PROD` first), so this block
 * cannot ship. `signInPage.test.ts` asserts that.
 */
import { useState } from 'react';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from './firebaseAuth';
import { GoogleIcon } from './GoogleIcon';
import { usingEmulators } from '@/dal/adapters/firestore/client';
import { Button, Field } from '@/components/ui';
import { NAV_FOOTER_LINE, PRODUCT_NAME } from '@/lib/legalText';

export function SignInPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleEmulatorSignIn() {
    setPending(true);
    setError(null);
    try {
      // Sign in if the account exists, create it if it does not. Against
      // an emulator whose state is thrown away on restart, making the
      // developer register first is friction with no benefit.
      try {
        await signInWithEmail({ email, password });
      } catch {
        await signUpWithEmail({ email, password });
      }
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : 'Emulator sign-in failed.');
    }
  }

  async function handleSignIn() {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
      // onIdTokenChanged in AuthProvider.tsx picks up the new user; no
      // navigation needed here.
    } catch (err) {
      setPending(false);
      if (err instanceof Error && err.message.includes('Firebase is not configured')) {
        setError('Firebase is not configured for this environment yet — see BUILD-STATUS.md.');
        return;
      }
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return; // user closed the popup — not an error worth showing
      }
      setError('Sign-in failed. Try again, or contact your administrator if this keeps happening.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-white border border-ink/10 rounded-lg p-8 space-y-6">
        <div>
          {/* IC-ECOS-NAMING-2026-V1 §2.3 fixes this header string exactly. */}
          <h1 className="text-headline-md font-display text-ink">Sign in to {PRODUCT_NAME}</h1>
          <p className="text-body-md font-body text-slate mt-2">
            Use your party-issued Google account to continue.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={pending}
          className="w-full flex items-center justify-center gap-3 border border-ink/20 rounded py-2.5 text-body-md font-body text-ink disabled:opacity-50"
        >
          <GoogleIcon />
          {pending ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {error && <p className="text-body-md font-body text-maroon">{error}</p>}

        <p className="text-body-md font-body text-slate">
          Signing in doesn't grant access on its own — an administrator still has to assign you a role and
          geographic scope in Settings → Permissions before you can see any data (§4.4).
        </p>

        {usingEmulators() && (
          <div className="border-t border-ink/10 pt-5 space-y-3">
            <p className="text-label-caps font-display uppercase text-gold">Local emulator</p>
            <p className="text-body-md font-body text-slate">
              This build is pointed at the local Firebase emulator suite, so Google sign-in is unavailable.
              Use any email and password; the account is created on first use and discarded when the emulator
              stops.
            </p>
            <Field label="Email">
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label="Password">
              {(props) => (
                <input
                  {...props}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            <Button
              variant="secondary"
              className="w-full"
              disabled={pending || email.trim() === '' || password === ''}
              onClick={() => void handleEmulatorSignIn()}
            >
              {pending ? 'Signing in…' : 'Sign in to emulator'}
            </Button>
          </div>
        )}

        <p className="text-xs text-slate/60 text-center">{NAV_FOOTER_LINE}</p>
      </div>
    </div>
  );
}
