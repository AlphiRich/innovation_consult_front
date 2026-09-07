import { Component, type ReactNode } from 'react';
import { PRODUCT_NAME } from '@/lib/legalText';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentry wiring is Phase 0 infra (03-implementation-rollout-plan-v2.md)
    // — not connected in this session. Log for now.
    console.error('election-cos-app uncaught error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-paper p-8">
          <div className="max-w-md rounded-lg border border-maroon/40 bg-white p-6 text-center">
            {/* String fixed by IC-ECOS-NAMING-2026-V1 §2.3. */}
            <h1 className="font-display text-xl text-maroon">{PRODUCT_NAME} encountered an error</h1>
            <p className="mt-2 text-sm text-slate">
              This has been logged. Reload the page, or contact support if it persists.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
