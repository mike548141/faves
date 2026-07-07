// Distance sort for the "what's close" home-screen mode. Pure maths, no
// DOM, no network — so it's unit-testable and offline-safe. We deliberately
// do NOT draw a tile map: that needs a CDN map library + external tile
// requests, which break the offline / zero-dependency / no-external-request
// constraints. A distance-sorted list delivers ~80% of the "what's near me"
// value with none of that (roadmap Theme 2; see docs/decisions/0005).

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

const hasCoords = (r) => typeof r.lat === "number" && typeof r.lng === "number";

/**
 * Return a new array sorted nearest-first from `origin` ({lat, lng}).
 * Venues with coordinates gain a `distanceKm` field; those without (the
 * Cook-at-Home collection, or a not-yet-geocoded stub) keep their original
 * relative order and sink to the end. The input array is not mutated.
 */
export function sortByDistance(restaurants, origin) {
  const decorated = restaurants.map((r, i) => ({
    r,
    i,
    d: hasCoords(r) ? haversineKm(origin, r) : null,
  }));
  decorated.sort((a, b) => {
    if (a.d == null && b.d == null) return a.i - b.i; // stable for the tail
    if (a.d == null) return 1;
    if (b.d == null) return -1;
    return a.d - b.d;
  });
  return decorated.map(({ r, d }) => (d == null ? r : { ...r, distanceKm: d }));
}

/** Human distance: "450 m" under a km, "1.2 km" under ten, "14 km" beyond. */
export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return "";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
