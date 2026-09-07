/**
 * Election Campaign OS — household map view
 * IC-ECOS-BUILD-2026-V2 §6.2. Session 11.
 *
 * Shows real households (`dal.households`) for the current VD as pins,
 * and lets a canvasser drop a pin to capture a new household's exact
 * location instead of typing an address blind — reuses `HouseholdQuickAdd`
 * for the actual save, just pre-filling `initialGeo` from the click.
 *
 * Pin colour reuses `src/design/toneClasses.ts`'s existing Tone system
 * (already the app's one semantic-colour convention, used by sentiment/
 * severity/urgency elsewhere) rather than introducing a second one — see
 * BUILD-STATUS.md's "ecos-v2 integration" entry for why a parallel RAG
 * token set from that fork wasn't adopted.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, AdvancedMarker, Pin, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { dal } from '@/dal';
import type { SessionContext } from '@/dal/ports/session';
import type { Household } from '@/dal/ports/households';
import { GoogleMapsWrapper } from '@/components/GoogleMapsWrapper';
import { NW405_MAP_CENTER, NW405_DEFAULT_ZOOM } from '@/lib/googleMapsConfig';
import { tokens } from '@/design/tokens';
import { useVdWard } from '@/lib/useVdWard';
import { HouseholdQuickAdd } from './HouseholdQuickAdd';

const DWELLING_PIN_COLOR: Record<Household['dwellingType'], string> = {
  FORMAL: tokens.color.teal,
  INFORMAL: tokens.color.gold,
  BACKYARD: tokens.color.slate,
  OTHER: tokens.color.slate,
};

interface VoterHouseholdMapProps {
  ctx: SessionContext;
  vdCode: string;
}

export function VoterHouseholdMap({ ctx, vdCode }: VoterHouseholdMapProps) {
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const { wardOptions, resolved, selectedWardCode, setSelectedWardCode } = useVdWard(ctx, vdCode);
  const wardCode = resolved?.wardCode ?? null;

  const householdsQuery = useQuery({
    queryKey: ['households', ctx.tenantId, vdCode],
    queryFn: () => dal.households.listByVD(ctx, vdCode, { pageSize: 100 }),
    enabled: Boolean(vdCode),
  });

  const households = useMemo(() => householdsQuery.data?.items ?? [], [householdsQuery.data]);
  const withGeo = useMemo(() => households.filter((h) => h.geo), [households]);
  const missingGeoCount = households.length - withGeo.length;

  const center = withGeo[0]?.geo ?? NW405_MAP_CENTER;

  function handleMapClick(e: MapMouseEvent) {
    if (!wardCode) return; // can't save a household without a resolved ward
    const latLng = e.detail.latLng;
    if (!latLng) return;
    setPendingPin({ lat: latLng.lat, lng: latLng.lng });
  }

  return (
    <div className="space-y-3">
      {!wardCode && wardOptions.length > 1 && (
        <label className="space-y-1 block max-w-xs">
          <span className="text-label-caps font-display uppercase text-slate">
            VD {vdCode} is split across wards — which one for new pins?
          </span>
          <select
            className="w-full border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white"
            value={selectedWardCode ?? ''}
            onChange={(e) => setSelectedWardCode(e.target.value)}
          >
            <option value="" disabled>
              Select a ward
            </option>
            {wardOptions.map((o) => (
              <option key={o.wardCode} value={o.wardCode}>
                {o.wardCode} ({o.registeredVoters.toLocaleString('en-ZA')} registered here)
              </option>
            ))}
          </select>
          <span className="text-body-md font-body text-slate/70">Existing pins still show either way.</span>
        </label>
      )}
      {missingGeoCount > 0 && (
        <p className="text-body-md font-body text-slate">
          {missingGeoCount} of {households.length} households in this VD have no coordinates yet (created before
          this map existed, or added without a pin) — not shown on the map.
        </p>
      )}

      <GoogleMapsWrapper>
        <div style={{ height: '420px' }} className="rounded-lg overflow-hidden border border-ink/10">
          <Map
            // mapId is optional here: Advanced Markers render fine on the
            // default map without one (Google's implicit raster fallback);
            // a real Map ID only buys custom map styling, which nothing
            // here depends on. Set VITE_GOOGLE_MAPS_MAP_ID if that's wanted.
            mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined}
            defaultCenter={center}
            defaultZoom={withGeo.length > 0 ? 15 : NW405_DEFAULT_ZOOM}
            onClick={handleMapClick}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {withGeo.map((h) => (
              <AdvancedMarker key={h.id} position={h.geo!}>
                <Pin
                  background={DWELLING_PIN_COLOR[h.dwellingType]}
                  borderColor={tokens.color.ink}
                  glyphColor={tokens.color.ink}
                />
              </AdvancedMarker>
            ))}
            {pendingPin && (
              <AdvancedMarker position={pendingPin}>
                <Pin background={tokens.color.maroon} borderColor={tokens.color.ink} glyphColor="white" />
              </AdvancedMarker>
            )}
          </Map>
        </div>
      </GoogleMapsWrapper>

      <p className="text-body-md font-body text-slate/70">
        Click the map to drop a pin for a new household at that exact location.
      </p>

      {pendingPin && wardCode && (
        <HouseholdQuickAdd
          ctx={ctx}
          vdCode={vdCode}
          wardCode={wardCode}
          initialGeo={{ lat: pendingPin.lat, lng: pendingPin.lng, accuracyM: 10 }}
          onCreated={() => setPendingPin(null)}
          onCancel={() => setPendingPin(null)}
        />
      )}
    </div>
  );
}
