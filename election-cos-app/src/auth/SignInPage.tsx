/**
 * Election Campaign OS — sign-in
 * IC-ECOS-BUILD-2026-V2 §4.3. Session 10 — the app never had a sign-in UI
 * at all before this; every module page just showed "No active session"
 * and there was no way to actually reach a signed-in state. Google
 * Sign-in only (email/password functions exist in firebaseAuth.ts but
 * aren't exposed here — Google was the human's explicit ask).
 */
import { useState } from 'react';
import { signInWithGoogle } from './firebaseAuth';
import { GoogleIcon } from './GoogleIcon';
import { NAV_FOOTER_LINE, PRODUCT_NAME } from '@/lib/legalText';

export function SignInPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        <p className="text-xs text-slate/60 text-center">{NAV_FOOTER_LINE}</p>
      </div>
    </div>
  );
}
