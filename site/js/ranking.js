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
import { nearestBranch, venueDistanceKm, venueHours } from "./locations.js";

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

// Tier from a resolved hours object (already picked for the right branch).
function tierFromHours(hours, now) {
  const st = openStatus(hours, now).state;
  if (st === "open" || st === "closing-soon") return 0;
  if (st === "opening-soon") return 1;
  if (st === "unknown") return 2;
  return 3;
}

/**
 * Availability tier — lower is more useful right now:
 *   0  open (incl. "closing soon" — still serving) OR a Cook-at-Home
 *      collection (you can always cook), so these anchor the top
 *   1  opening within the hour
 *   2  hours unknown — can't rule it out, so above definitely-closed
 *   3  closed (opens later today or another day)
 * For a multi-location venue the hours are the *nearest* branch's when `origin`
 * is known, else the primary branch's (venueHours) — the honest read, since we
 * can't say "nearest" without a location.
 */
export function availabilityTier(r, now, origin = null) {
  if (r.kind === "recipes") return 0; // always an option
  return tierFromHours(venueHours(r, origin), now);
}

/**
 * True when a venue is worth landing on / ordering from now: not shut for
 * the night, and (if we know where you are) within reach. Used by the "Pick
 * for us" shuffle so the dice doesn't land on a closed or faraway place.
 * Distance is measured to the nearest branch; a coordless venue (Infinity) is
 * never demoted for reach — we only exclude a *known* too-far distance.
 */
export function isAvailableNow(r, { now, origin = null, farKm = FAR_KM } = {}) {
  if (isStub(r)) return false; // nothing to order from a "menu coming soon" stub
  if (availabilityTier(r, now, origin) === 3) return false;
  const dist = origin ? venueDistanceKm(r, origin) : Infinity;
  if (dist !== Infinity && dist > farKm) return false;
  return true;
}

/**
 * Rank venues for the home list. The primary key depends on whether the viewer
 * asked for "Nearest first":
 *   • no origin (default order): reachable → availability → distance → curated.
 *     We can't measure distance, so float the places you can order from *now*.
 *   • origin known ("Nearest first" is ON): reachable → distance → availability
 *     → curated. The toggle promises nearest-first, so distance leads; a place
 *     being open is still shown (its badge) and filterable ("Open now"), but it
 *     no longer floats a farther-but-open venue above a nearer one. (Fixes the
 *     owner's report that a 10 km venue outranked a 2.5 km one under "Nearest
 *     first" — the cause was availability outranking distance, not a text sort.)
 * `origin` ({lat,lng}) is optional; without it nothing is demoted for distance.
 * `favouriteIds` is a Set of venue ids the viewer has hearted (the venue itself
 * or any dish it holds — the caller flattens dish favourites to their venue id);
 * omit or pass null to ignore favourites. A favourite still counts as
 * `favBoostKm` nearer (weighted into the distance key), so hearts keep their
 * pull even in "Nearest first". Venues with coordinates gain a `distanceKm`
 * field when origin is known, for the card. The input array is not mutated.
 */
export function rankVenues(
  restaurants,
  { now, origin = null, favouriteIds = null, favBoostKm = FAV_BOOST_KM, farKm = FAR_KM } = {}
) {
  const keyed = restaurants.map((r, i) => {
    // Resolve the nearest branch once: its distance and its hours both feed the
    // ranking (and the hours are handed to the card so its badge matches the
    // branch the distance refers to). For a single-location venue this is just
    // the venue itself.
    const nb = nearestBranch(r, origin);
    const dist = nb.distanceKm;
    const hours = nb.branch.hours ?? null;
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
    const tier = stub || r.kind === "recipes" ? 0 : tierFromHours(hours, now);
    return {
      r, i, effective, dist, hours, far, tier, stub,
      pinned: r.kind === "recipes" ? 0 : 1, // Cook at Home always anchors the top
      favTie: isFav ? 0 : 1,
    };
  });
  // Shared leading keys, then distance vs availability swap by mode (see the
  // doc comment). `cmp` compares the boosted distance *numerically* — never
  // the formatted "10 km" string, which would sort lexicographically (10 < 2.5).
  keyed.sort((a, b) => {
    const lead =
      a.pinned - b.pinned || // the recipes collection is pinned to the very top
      a.stub - b.stub || // orderable venues above menu-less "coming soon" stubs
      a.far - b.far; // reachable (within farKm) before too-far
    if (lead) return lead;
    const byDistance = cmp(a.effective, b.effective); // favourite-boosted distance
    const byAvailability = a.tier - b.tier; // open now floats up
    const tail = a.favTie - b.favTie || a.i - b.i; // favourite tiebreak → curated
    return origin
      ? byDistance || byAvailability || tail // "Nearest first": distance leads
      : byAvailability || byDistance || tail; // default: availability leads
  });
  // With a known location, hand the card the nearest branch's distance and
  // hours (so its "📍 1.2 km" and open/closed badge describe the same branch).
  // Without one, the record is unchanged — its primary-branch hours stand.
  return keyed.map(({ r, dist, hours }) => {
    if (!origin) return r;
    const patch = { hours };
    if (dist !== Infinity) patch.distanceKm = dist;
    return { ...r, ...patch };
  });
}
