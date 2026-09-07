/**
 * Election Campaign OS — session hooks
 * IC-ECOS-BUILD-2026-V2 §4.2, §4.4.
 *
 * Split out of AuthProvider.tsx so that file exports only the provider
 * component (react-refresh/only-export-components — Fast Refresh needs a
 * component-only module to hot-reload the provider without a full reload).
 */
import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { SessionContext } from '@/dal/ports/session';

export interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  user: User | null;
  session: SessionContext | null;
}

export const AuthContext = createContext<AuthState>({ status: 'loading', user: null, session: null });

export function useAuthState(): AuthState {
  return useContext(AuthContext);
}

/** Convenience hook for the common case: a signed-in session or null. */
export function useSession(): SessionContext | null {
  return useAuthState().session;
}
