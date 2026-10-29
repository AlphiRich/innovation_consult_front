import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { SyncStatusProvider } from './SyncStatusProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Free-tier discipline (§7.4): don't refetch aggressively by default.
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/*
           * Inside AuthProvider because the Firestore link probe needs
           * `tenantId` and `uid` to name the document it watches, and
           * outside everything that renders chrome so that one
           * subscription serves every indicator. See
           * SyncStatusProvider.tsx — mounting the indicator twice (the
           * phone bar and the desktop sidebar) must not open two
           * listeners, and the two must never disagree.
           */}
          <SyncStatusProvider>{children}</SyncStatusProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
