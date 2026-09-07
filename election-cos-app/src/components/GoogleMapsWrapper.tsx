/**
 * Election Campaign OS — Google Maps API provider wrapper
 * IC-ECOS-BUILD-2026-V2 §6.2.
 *
 * Single place that decides whether a map can render at all. Every module
 * that wants a map renders this around its content instead of reaching
 * for `APIProvider` directly, so "no key configured" is handled once.
 */
import type { ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { getGoogleMapsApiKey, isGoogleMapsConfigured } from '@/lib/googleMapsConfig';

export function GoogleMapsWrapper({ children }: { children: ReactNode }) {
  if (!isGoogleMapsConfigured()) {
    return (
      <div className="border border-dashed border-ink/20 rounded-lg p-8 text-center bg-white">
        <p className="text-body-md font-body text-slate">
          Map view isn't available — no Google Maps API key is configured for this environment.
        </p>
        <p className="text-body-md font-body text-slate/70 mt-1">
          Set <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> to enable it (see
          .env.example).
        </p>
      </div>
    );
  }

  return <APIProvider apiKey={getGoogleMapsApiKey()}>{children}</APIProvider>;
}
