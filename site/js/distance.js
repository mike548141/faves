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

// A deliberately crude drive-time hint from the straight-line distance we
// already hold — no routing API (that's keyed/external → breaks offline). We
// pad for roads not being straight, then divide by a conservative through-town
// speed (lights, give-ways). No traffic model. Always shown with a leading "~"
// and never as a substitute for the maps-app handoff, which gives the real,
// live figure. See ADR 0010.
const ROAD_WINDING = 1.3; // road-km per straight-line-km, typical for a city
const URBAN_KMH = 30; // conservative door-to-door average

/** Rough drive time in whole minutes (min 1), or null for a bad distance. */
export function estimateDriveMinutes(km) {
  if (km == null || Number.isNaN(km) || km < 0) return null;
  return Math.max(1, Math.round(((km * ROAD_WINDING) / URBAN_KMH) * 60));
}

// A companion walk-time hint (owner steer 2026-07-23: "I'm 100m walk away" —
// show travel time by the mode that fits the distance, not always drive). Unlike
// the drive estimate we add NO road-winding padding: the owner asked for a
// straight-line "~" figure, and over short walking distances a footpath rarely
// detours far from the crow-line. 5 km/h is the standard adult walking-pace
// planning figure (≈83 m/min). Same leading-"~" honesty; no elevation model.
const WALK_KMH = 5;

// Under this straight-line distance we suggest walking, at/above it driving.
// 2 km ≈ a 24-minute walk at 5 km/h — about as far as most people will walk to
// a takeaway before a drive becomes the realistic mode; beyond it "walk" would
// read as a joke. Named so it's tunable. Straight-line (we hold no route length).
const WALK_MAX_KM = 2;

/** Rough walk time in whole minutes (min 1), or null for a bad distance. */
export function estimateWalkMinutes(km) {
  if (km == null || Number.isNaN(km) || km < 0) return null;
  return Math.max(1, Math.round((km / WALK_KMH) * 60));
}

// One formatter for both modes so the "~N min <mode>" wording never diverges.
const formatTravel = (min, mode) => (min == null ? "" : `~${min} min ${mode}`);

/** "~4 min drive" hint, or "" when there's no usable distance. */
export function formatDriveTime(km) {
  return formatTravel(estimateDriveMinutes(km), "drive");
}

/**
 * Mode-aware travel hint from a straight-line distance: walk under WALK_MAX_KM,
 * drive at/above it. Returns { mode, minutes, text } (e.g. "~15 min walk"), or
 * null for a bad distance. A deliberately crude "~" approximation — never a
 * routed/live figure (no routing API: that's keyed + external, breaking the
 * offline / zero-dependency invariant — see ADR 0021, consistent with 0010/0001).
 */
export function travelHint(km) {
  if (km == null || Number.isNaN(km) || km < 0) return null;
  const mode = km < WALK_MAX_KM ? "walk" : "drive";
  const minutes = mode === "walk" ? estimateWalkMinutes(km) : estimateDriveMinutes(km);
  return { mode, minutes, text: formatTravel(minutes, mode) };
}
