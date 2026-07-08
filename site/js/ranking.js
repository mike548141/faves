// Default home-screen ordering: float the places you can actually order
// from *right now* to the top, sink the ones you can't. Two signals, both
// honest and offline:
//
//  1. Open status (always available — from hours + the NZ clock). A place
//     that's open (right up to closing time — you might be 2 minutes away)
//     or opening within the hour beats one that's shut for the night.
//  2. Favourites (from the device-local heart store). A place you've
//     hearted — or one holding a dish you've hearted — is one you actually
//     want, so among places of equal availability it lifts above the rest.
//     It does NOT override availability: a closed favourite you can't order
//     from still sits below anywhere that's open.
//  3. Distance (only when we know where you are, i.e. "Near me"). A
//     favourite in another town is great when you're there and useless the
//     rest of the time, so beyond a "reachable tonight" radius it sinks
//     below everything nearby.
//
// Sort order is lexicographic: reachable → availability → favourite →
// nearest → curated. Pure (no DOM/network) so it's unit-tested; favourites
// arrive as a plain Set of venue ids so this stays store-agnostic.

import { openStatus } from "./hours.js";
import { haversineKm } from "./distance.js";

// Straight-line km beyond which a venue is "another town" — not somewhere
// you'd go for tonight's dinner. Tunable; 50 km comfortably keeps the whole
// Wellington region reachable while catching a Queenstown/Auckland
// favourite. Only applied when we actually know the viewer's location.
export const FAR_KM = 50;

/**
 * Availability tier — lower is more useful right now:
 *   0  open (incl. "closing soon" — still serving) OR a Cook-at-Home
 *      collection (you can always cook), so these anchor the top
 *   1  opening within the hour
 *   2  hours unknown — can't rule it out, so above definitely-closed
 *   3  closed (opens later today or another day)
 */
export function availabilityTier(r, now) {
  if (r.kind === "recipes") return 0; // always an option
  const st = openStatus(r.hours, now).state;
  if (st === "open" || st === "closing-soon") return 0;
  if (st === "opening-soon") return 1;
  if (st === "unknown") return 2;
  return 3;
}

const coordsOf = (r) =>
  typeof r.lat === "number" && typeof r.lng === "number" ? { lat: r.lat, lng: r.lng } : null;

/**
 * True when a venue is worth landing on / ordering from now: not shut for
 * the night, and (if we know where you are) within reach. Used by the "Pick
 * for us" shuffle so the dice doesn't land on a closed or faraway place.
 */
export function isAvailableNow(r, { now, origin = null } = {}) {
  if (availabilityTier(r, now) === 3) return false;
  const c = origin && coordsOf(r);
  if (c && haversineKm(origin, c) > FAR_KM) return false;
  return true;
}

/**
 * Rank venues for the home list. Sort order:
 *   reachable → availability tier → favourite → nearest → curated order.
 * `origin` ({lat,lng}) is optional; without it only open-status + favourites
 * rank and nothing is demoted for distance. `favouriteIds` is a Set of venue
 * ids the viewer has hearted (the venue itself or any dish it holds — the
 * caller flattens dish favourites to their venue id); omit or pass null to
 * ignore favourites. Venues with coordinates gain a `distanceKm` field when
 * origin is known, for the card to display. The input array is not mutated.
 */
export function rankVenues(restaurants, { now, origin = null, favouriteIds = null } = {}) {
  const keyed = restaurants.map((r, i) => {
    const c = origin && coordsOf(r);
    const dist = c ? haversineKm(origin, c) : Infinity;
    const far = origin && dist !== Infinity && dist > FAR_KM ? 1 : 0;
    const fav = favouriteIds && favouriteIds.has(r.id) ? 0 : 1;
    return { r, i, tier: availabilityTier(r, now), fav, dist, far };
  });
  keyed.sort(
    (a, b) =>
      a.far - b.far || a.tier - b.tier || a.fav - b.fav || a.dist - b.dist || a.i - b.i
  );
  return keyed.map(({ r, dist }) =>
    origin && dist !== Infinity ? { ...r, distanceKm: dist } : r
  );
}
