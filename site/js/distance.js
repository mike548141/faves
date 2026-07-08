// Distance maths for the "what's close" home-screen mode — the haversine
// and the human-readable formatter that ranking.js uses to order and label
// venues by distance. Pure maths, no DOM, no network, so it's unit-testable
// and offline-safe. We deliberately do NOT draw a tile map: that needs a CDN
// map library + external tile requests, which break the offline /
// zero-dependency / no-external-request constraints. A distance-ranked list
// delivers ~80% of the "what's near me" value with none of that (roadmap
// Theme 2; see docs/decisions/0005).

const EARTH_KM = 6371;
const rad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km between two {lat, lng} points (haversine). */
export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Human distance: "450 m" under a km, "1.2 km" under ten, "14 km" beyond. */
export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return "";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
