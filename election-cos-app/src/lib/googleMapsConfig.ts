/**
 * Election Campaign OS — Google Maps Platform configuration
 * IC-ECOS-BUILD-2026-V2 §6.2 (household geocoding).
 *
 * Key handling follows the same pattern as
 * `src/dal/adapters/firestore/client.ts`: absence of a key is not an
 * import-time crash, it's a runtime state a consuming component can
 * render around (`isGoogleMapsConfigured() === false` → show a
 * "not configured" message instead of a blank/broken map).
 *
 * Deliberately NOT included, unlike an earlier draft of this file seen in
 * an unrelated fork: any hardcoded fallback API key. A key committed to
 * source is a live credential leak regardless of how it's gated — this
 * module only ever reads `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
 */

export function isGoogleMapsConfigured(): boolean {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  return typeof key === 'string' && key.trim().length > 0;
}

export function getGoogleMapsApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!key || !key.trim()) {
    throw new Error(
      'Google Maps is not configured for this environment — set VITE_GOOGLE_MAPS_API_KEY. ' +
        'Check isGoogleMapsConfigured() before calling this.',
    );
  }
  return key.trim();
}

/**
 * Generic initial map framing only — Potchefstroom's public town-level
 * coordinates, used to center/zoom the map before any real household pins
 * load. This is NOT ward-boundary or demarcation data; do not use it to
 * infer which ward a point falls in. Real ward/VD geography lives in
 * `seed-data/jb-marks-nw405-wards-vds.json` (see docs/nw405-seed-data.md)
 * — this file adds no GIS boundary data of its own, unlike an earlier
 * draft seen in an unrelated fork that asserted specific informal-
 * settlement boundary coordinates with no cited source. Don't repeat that:
 * if per-ward map framing is ever needed, derive it from that seed file's
 * real ward list, not from a value invented here.
 */
export const NW405_MAP_CENTER = { lat: -26.7145, lng: 27.097 };
export const NW405_DEFAULT_ZOOM = 12;
