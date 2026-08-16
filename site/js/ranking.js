// The home list has ONE ranking, and distance is in it (ADR 0068). There is no
// mode, no sort control and no second branch: the same comparator runs whether
// or not we know where the viewer is. Its keys, in order:
//
//   pinned → orderable-before-stub → reachable → availability → distance
//   bucket → favourite tiebreak → raw distance → curated
//
// Why that order:
//  1. Availability leads distance — deliberately the opposite of the retired
//     "Nearest first" branch. A closed shop 200 m away is not a better answer
//     than an open one at 900 m; you can't eat at the closed one. Open (right
//     up to closing — you might be two minutes away) beats opening-within-the-
//     hour beats unknown beats shut.
//  2. Distance is bucketed, not raw, so the heart has somewhere to act. Two
//     venues inside the same FAV_TIE_KM band are "the same sort of distance
//     away"; the heart separates them. One band further out and distance has
//     already decided — the heart cannot reach across a band.
//  3. The heart is a tiebreak, never a credit. The old design subtracted
//     FAV_BOOST_KM (10 km) from a favourite's distance, which pushed a hearted
//     venue ahead of *everything* inside the credit — a hearted place across
//     town outranking the shop next door. Bucketing asks the question that has
//     an answer ("is this the same sort of distance away?") instead of the one
//     that doesn't ("how many km is a heart worth?"). ADR 0068 finding 1.
//  4. Beyond `farKm` a venue is another town: it sinks below everything
//     reachable whatever its hours or hearts say.
//  5. A "menu coming soon" stub can be found by name but not ordered from, so
//     it sinks below everything orderable; among stubs, distance is the only
//     useful signal (their availability tier is zeroed — see below).
//
// With no origin every distance is Infinity, so every bucket is Infinity: the
// buckets and the raw-distance key both tie and the order falls through to
// availability → favourite → curated. That is the permission-refused path and
// it must stay exactly today's no-location order.
//
// Pure (no DOM/network) so it's unit-tested; favourites arrive as a plain Set
// of venue ids and the distances as params, so this stays store-agnostic.

import { openStatus } from "./hours.js";
import { kindOf } from "./kinds.js";
import { nearestBranch, venueDistanceKm, venueHours } from "./locations.js";
import { FAR_KM, FAV_BOOST_KM, FAV_TIE_KM } from "./defaults.js";
import { venueTimezone } from "./place.js";
import { isTrading } from "./temporal.js";

// The distance defaults live in `defaults.js` (a leaf) so settings.js can
// have them without importing this module, which imports place.js, which
// imports settings.js. Re-exported so every existing importer is unaffected.
export { FAR_KM, FAV_BOOST_KM, FAV_TIE_KM } from "./defaults.js";

// Safe numeric compare for keys that can be Infinity — a coordless venue, or
// *every* venue when no origin was given. `Math.round(Infinity / FAV_TIE_KM)`
// is Infinity, so the bucket carries the same values as the raw distance.
//
// Measured, not assumed: in the `||` chain below, subtraction would in fact be
// safe — Infinity − Infinity is NaN, NaN is falsy, so `||` falls through to the
// next key, which is exactly what a tie should do (and the sort spec coerces a
// NaN comparator result to +0 anyway). `cmp` is used regardless because that
// safety is a property of the *chain*, not of the key: the day someone returns
// one of these keys on its own, or reorders the chain so a distance key lands
// last, subtraction starts lying and nothing here would fail to say so.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Which FAV_TIE_KM-wide band a venue falls in. Rounding (not flooring) puts the
// boundary between two bands at the midpoint, so venues either side of a
// round number like 400 m aren't split by a hair. Infinity stays Infinity: no
// distance means no band, and every such venue ties.
const distanceBucket = (dist) => (dist === Infinity ? Infinity : Math.round(dist / FAV_TIE_KM));

// A "stub" is a venue with no usable menu yet (status "stub"): you can find it
// by name, but there's nothing to order — so it sinks below everything
// orderable and is skipped by the "Pick for us" shuffle.
const isStub = (r) => r.status === "stub";

// Tier from a resolved hours object (already picked for the right branch).
// Module-local: it was exported so the along-a-route sort could tier on the
// same scale, and that feature was removed whole (owner ruling, 2026-08-16 —
// suburb centroids were the wrong proxy for "on my way"). Export it again if a
// second ranker ever needs this scale; don't duplicate it.
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
export function availabilityTier(r, clock, origin = null) {
  // Nothing with no opening hours can be ranked by them. Cook at Home answers
  // this the way it does because your own kitchen has no timetable, not
  // because of what it is called.
  if (!kindOf(r).hasHours) return 0; // always an option
  // A venue shut for a refit (or for good) is closed whatever its posted hours
  // say — the lifecycle outranks the weekly timetable (temporal.js, ADR 0023).
  if (!isTrading(r)) return 3;
  return tierFromHours(venueHours(r, origin), clock.at(venueTimezone(r, origin)));
}

/**
 * True when a venue is worth landing on / ordering from now: not shut for
 * the night, and (if we know where you are) within reach. Used by the "Pick
 * for us" shuffle so the dice doesn't land on a closed or faraway place.
 * Distance is measured to the nearest branch; a coordless venue (Infinity) is
 * never demoted for reach — we only exclude a *known* too-far distance.
 */
export function isAvailableNow(r, { clock, origin = null, farKm = FAR_KM } = {}) {
  if (isStub(r)) return false; // nothing to order from a "menu coming soon" stub
  if (availabilityTier(r, clock, origin) === 3) return false;
  const dist = origin ? venueDistanceKm(r, origin) : Infinity;
  if (dist !== Infinity && dist > farKm) return false;
  return true;
}

/**
 * Rank venues for the home list — one ranking, described at the top of this
 * module (ADR 0068). Availability leads, distance follows, and a heart only
 * separates venues already in the same FAV_TIE_KM band.
 *
 * `origin` ({lat,lng}) is optional and the only thing that varies: without it
 * every distance is Infinity, so the distance keys tie for everyone and the
 * order falls through to availability → favourite → curated. That fallback is
 * the geolocation-refused path, so it is a behaviour to preserve, not a
 * degraded mode to apologise for.
 *
 * `favouriteIds` is a Set of venue ids the viewer has hearted (the venue itself
 * or any dish it holds — the caller flattens dish favourites to their venue id);
 * omit or pass null to ignore favourites.
 *
 * `favBoostKm` is accepted but **reorders nothing**. It stopped being a
 * favourites dial in 2026-07 (it is the branch-proximity cutoff now) and the
 * favourite credit it once fed is gone entirely — the heart is a bucket
 * tiebreak. It stays in the signature because settings.js still stores it under
 * that key and app.js passes the whole settings object through.
 *
 * Venues with coordinates gain a `distanceKm` field when origin is known, for
 * the card. The input array is not mutated.
 */
export function rankVenues(
  restaurants,
  {
    clock,
    origin = null,
    favouriteIds = null,
    // Accepted and deliberately unread — see the note above. Destructured
    // rather than ignored so a caller passing it isn't silently punished by a
    // future rest-param, and so this line is where anyone hunting the old
    // favourite credit lands.
    favBoostKm = FAV_BOOST_KM,
    farKm = FAR_KM,
  } = {}
) {
  const keyed = restaurants.map((r, i) => {
    const kind = kindOf(r);
    // Resolve the nearest branch once: its distance and its hours both feed the
    // ranking (and the hours are handed to the card so its badge matches the
    // branch the distance refers to). For a single-location venue this is just
    // the venue itself.
    const nb = nearestBranch(r, origin);
    const dist = nb.distanceKm;
    const hours = nb.branch.hours ?? null;
    const isFav = !!(favouriteIds && favouriteIds.has(r.id));
    const stub = isStub(r) ? 1 : 0;
    // "Too far" gates on actual distance, not the bucket — a favourite in
    // another town is still unreachable, and no tiebreak can reach past this.
    const far = origin && dist !== Infinity && dist > farKm ? 1 : 0;
    // Availability ranks only *within* the orderable group. For a stub it's
    // meaningless — and worse, "unknown hours" (tier 2) would beat "known
    // closed" (tier 3), so a nearer closed stub sank below a farther unknown
    // one. Zero it for stubs so they order by distance instead.
    const tier =
      stub || !kind.hasHours ? 0 : tierFromHours(hours, clock.at(venueTimezone(r, origin)));
    return {
      r, i, dist, bucket: distanceBucket(dist), hours, far, tier, stub,
      pinned: kind.pinnedFirst ? 0 : 1, // Cook at Home always anchors the top
      favTie: isFav ? 0 : 1,
    };
  });
  // One comparator, no mode. Distance is compared *numerically* — never the
  // formatted "10 km" string, which would sort lexicographically (10 < 2.5) —
  // and through `cmp`, for the reason given at its definition.
  keyed.sort(
    (a, b) =>
      a.pinned - b.pinned || // the recipes collection is pinned to the very top
      a.stub - b.stub || // orderable venues above menu-less "coming soon" stubs
      a.far - b.far || // reachable (within farKm) before another town
      a.tier - b.tier || // open now floats up: you can't eat at the closed one
      cmp(a.bucket, b.bucket) || // …then how far, in "same sort of distance" bands
      a.favTie - b.favTie || // …and only inside a band does the heart speak
      cmp(a.dist, b.dist) || // within a band, the actually-nearer one still leads
      a.i - b.i // curated order breaks whatever is left
  );
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
