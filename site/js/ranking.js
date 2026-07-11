// Default home-screen ordering: float the places you can actually order
// from *right now* to the top, sink the ones you can't. Two signals, both
// honest and offline:
//
//  1. Open status (always available — from hours + the NZ clock). A place
//     that's open (right up to closing time — you might be 2 minutes away)
//     or opening within the hour beats one that's shut for the night.
//  2. Favourites (from the device-local heart store). A place you've
//     hearted — or one holding a dish you've hearted — is one you actually
//     want. Rather than always beating distance, a favourite is treated as
//     `favBoostKm` nearer than it is: a favourite 8 km away (→ −2) outranks
//     a non-favourite 2 km away, but a favourite 30 km away (→ 20) sits
//     below one 2 km away. It never overrides availability: a closed
//     favourite you can't order from still sits below anywhere open.
//  3. Distance (only when we know where you are, i.e. "Near me"). A
//     favourite in another town is great when you're there and useless the
//     rest of the time, so beyond a "reachable tonight" radius (`farKm`,
//     measured on ACTUAL distance — the boost is preference, not reach) it
//     sinks below everything nearby.
//
//  4. A usable menu. A "menu coming soon" stub can be found by name but not
//     ordered from, so it sinks below everything orderable; among stubs,
//     proximity (not open-status) is the only useful signal.
//
// Sort order is lexicographic: pinned (the Cook-at-Home recipes collection
// always anchors the top) → orderable-before-stub → reachable → availability
// → effective distance (favourite-boosted) → favourite-tiebreak → curated.
// Pure (no DOM/network) so it's unit-tested; favourites arrive as a plain Set
// of venue ids and the two distances as params, so this stays store-agnostic.
// The viewer can tune both distances (settings.js).

import { openStatus } from "./hours.js";
import { haversineKm } from "./distance.js";

// Product defaults, also the source of truth for settings.js DEFAULTS.
// FAR_KM: straight-line km beyond which a venue is "another town" — 50 km
// keeps the whole Wellington region reachable while catching a Queenstown/
// Auckland favourite. FAV_BOOST_KM: how much nearer a favourite is treated
// as being. Both only apply when we know the viewer's location.
export const FAR_KM = 50;
export const FAV_BOOST_KM = 10;

// Safe numeric compare (Infinity − Infinity is NaN, which would corrupt a
// subtraction-based comparator; coordless venues carry Infinity distance).
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// A "stub" is a venue with no usable menu yet (status "stub"): you can find it
// by name, but there's nothing to order — so it sinks below everything
// orderable and is skipped by the "Pick for us" shuffle.
const isStub = (r) => r.status === "stub";

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
export function isAvailableNow(r, { now, origin = null, farKm = FAR_KM } = {}) {
  if (isStub(r)) return false; // nothing to order from a "menu coming soon" stub
  if (availabilityTier(r, now) === 3) return false;
  const c = origin && coordsOf(r);
  if (c && haversineKm(origin, c) > farKm) return false;
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
export function rankVenues(
  restaurants,
  { now, origin = null, favouriteIds = null, favBoostKm = FAV_BOOST_KM, farKm = FAR_KM } = {}
) {
  const keyed = restaurants.map((r, i) => {
    const c = origin && coordsOf(r);
    const dist = c ? haversineKm(origin, c) : Infinity;
    const isFav = !!(favouriteIds && favouriteIds.has(r.id));
    const stub = isStub(r) ? 1 : 0;
    // "Too far" gates on actual distance — a favourite in another town is
    // still unreachable; the boost only reorders, it doesn't extend reach.
    const far = origin && dist !== Infinity && dist > farKm ? 1 : 0;
    // Effective distance: a favourite counts as favBoostKm nearer. Coordless
    // venues stay at Infinity (no coords to boost). favTie separates
    // favourites when there's no location (all Infinity) or an exact tie.
    const effective = dist === Infinity ? Infinity : dist - (isFav ? favBoostKm : 0);
    // Availability ranks only *within* the orderable group. For a stub it's
    // meaningless — and worse, "unknown hours" (tier 2) would beat "known
    // closed" (tier 3), so a nearer closed stub sank below a farther unknown
    // one. Zero it for stubs so they order by distance instead.
    const tier = stub ? 0 : availabilityTier(r, now);
    return {
      r, i, effective, dist, far, tier, stub,
      pinned: r.kind === "recipes" ? 0 : 1, // Cook at Home always anchors the top
      favTie: isFav ? 0 : 1,
    };
  });
  keyed.sort(
    (a, b) =>
      a.pinned - b.pinned || // the recipes collection is pinned to the very top
      a.stub - b.stub || // orderable venues above menu-less "coming soon" stubs
      a.far - b.far || // reachable (within farKm) before too-far
      a.tier - b.tier || // availability, within the orderable group
      cmp(a.effective, b.effective) || // favourite-boosted distance
      a.favTie - b.favTie || // separate favourites on an exact tie
      a.i - b.i // curated order
  );
  return keyed.map(({ r, dist }) =>
    origin && dist !== Infinity ? { ...r, distanceKm: dist } : r
  );
}
