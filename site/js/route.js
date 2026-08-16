// Pick along a route (ROADMAP Theme 2; see docs/decisions/0014). "Grab dinner
// on the drive home" — rank venues by how little they'd add to a trip from
// where you are (origin) to a destination you name. A true "near the route"
// needs a routing/directions API to get the road polyline — external, keyed,
// usually paid → breaks offline / zero-dependency (the same wall as live
// drive-time, ADR 0010). So this is a pure-haversine approximation of the
// *added distance* a detour costs, computed offline from the coordinates we
// already hold. It is a STRAIGHT-LINE estimate, not roads — honest and useful
// for ordering "what's on my way", never a substitute for the maps app's real
// routed figure (the geo.js handoff gives that; ADR 0014 part b).
//
// Destination input is deliberately zero-dependency and stores no personal
// address: you pick either a suburb (its venues' centroid) or a specific place
// from the list we already carry — never free-text (that needs a geocoder =
// online API). See ADR 0014 for the rejected alternatives.
//
// Pure (no DOM, no network, no geolocation), so it's unit-tested and offline.

import { haversineKm } from "./distance.js";
import { kindOf } from "./kinds.js";
import { branchesOf, branchCoords } from "./locations.js";
import { venueTimezone } from "./place.js";
import { tierFromHours } from "./ranking.js";

// Safe numeric compare (Infinity − Infinity is NaN, which would corrupt a
// subtraction comparator; coordless venues carry Infinity detour).
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Added-distance detour cost: how much longer the trip origin→dest becomes if
 * you stop at `via`.  dist(o,v) + dist(v,d) − dist(o,d).  ~0 when `via` sits on
 * the straight segment between the two; positive when it's off to the side,
 * behind the origin, or past the destination — all genuinely out of the way, so
 * all cost you distance. Pure haversine (great-circle straight lines, not
 * roads). Clamped at 0: floating-point noise and the sphere's slight
 * non-additivity for near-collinear points can dip a hair below zero.
 */
export function detourKm(origin, via, dest) {
  const d =
    haversineKm(origin, via) + haversineKm(via, dest) - haversineKm(origin, dest);
  return d < 0 ? 0 : d;
}

/**
 * The branch that adds the LEAST detour for this trip — a multi-location venue
 * uses its best branch *for your route*, which is not necessarily the one
 * nearest the origin (a branch further from you but nearer your destination can
 * be less of a detour). Returns { branch, index, detourKm, distanceKm } where
 * distanceKm is origin→that branch (for the card). Without both endpoints, or
 * when no branch has coordinates, detourKm is Infinity and the first branch is
 * the default. Pure.
 */
export function bestBranchForRoute(r, origin = null, dest = null) {
  const branches = branchesOf(r);
  let best = { branch: branches[0], index: 0, detourKm: Infinity, distanceKm: Infinity };
  if (!origin || !dest) return best;
  branches.forEach((branch, index) => {
    const c = branchCoords(branch);
    if (!c) return;
    const detour = detourKm(origin, c, dest);
    if (detour < best.detourKm) {
      best = { branch, index, detourKm: detour, distanceKm: haversineKm(origin, c) };
    }
  });
  return best;
}

/** Least detour (km) this venue adds to the origin→dest trip, or Infinity. */
export function venueDetourKm(r, origin = null, dest = null) {
  return bestBranchForRoute(r, origin, dest).detourKm;
}

/**
 * Rank venues for "along a route". The HEADLINE metric — detour — leads the
 * sort, exactly as distance leads "Nearest first" (a distance-type mode honours
 * its label rather than floating a farther-but-open venue up). Availability
 * ("prefer open along the way") is the SECONDARY key, so among two venues that
 * detour you about the same, the open one wins; but a wide-detour open venue
 * never jumps a barely-detour closed one. Favourites are only a tiebreak here —
 * a hearted place that's well off your route isn't "on the way", so unlike the
 * home list its heart earns no distance boost (recorded, ADR 0014).
 *
 * Order: recipes pinned to the very top (consistent with every other home mode;
 * Cook at Home has no location to detour) → orderable before menu-less stubs →
 * detour → availability tier → favourite tiebreak → curated. Coordless venues
 * (and recipes) carry Infinity detour and sink to the bottom of their group.
 * `origin`/`dest` are {lat,lng}; without both, nothing has a real detour.
 * Venues gain a `detourKm` (and `distanceKm`) field for the card; hours are the
 * best-detour branch's, so the card's badge matches the branch shown. Input not
 * mutated. Pure.
 */
export function rankByDetour(
  restaurants,
  { clock, origin = null, dest = null, favouriteIds = null } = {}
) {
  const keyed = restaurants.map((r, i) => {
    const kind = kindOf(r);
    const best = bestBranchForRoute(r, origin, dest);
    // A kind with no location can't detour you; keep it Infinity but pinned.
    const detour = kind.hasLocation ? best.detourKm : Infinity;
    const hours = best.branch?.hours ?? null;
    const stub = r.status === "stub" ? 1 : 0;
    const isFav = !!(favouriteIds && favouriteIds.has(r.id));
    // Availability is meaningless for a stub (nothing to order) and for a kind
    // with no hours; zero it so those groups order by detour/curated alone.
    const tier = stub || !kind.hasHours ? 0 : tierFromHours(hours, clock.at(venueTimezone(r, origin)));
    return {
      r,
      i,
      detour,
      dist: best.distanceKm,
      hours,
      stub,
      tier,
      pinned: kind.pinnedFirst ? 0 : 1, // Cook at Home anchors the top, as everywhere
      favTie: isFav ? 0 : 1,
    };
  });
  keyed.sort(
    (a, b) =>
      a.pinned - b.pinned || // recipes collection pinned to the very top
      a.stub - b.stub || // orderable venues above menu-less "coming soon" stubs
      cmp(a.detour, b.detour) || // headline metric leads (numeric, never text)
      a.tier - b.tier || // then prefer open along the way
      a.favTie - b.favTie || // favourite tiebreak
      a.i - b.i // curated order
  );
  return keyed.map(({ r, detour, dist, hours }) => {
    const patch = { hours };
    if (detour !== Infinity) patch.detourKm = detour;
    if (dist !== Infinity) patch.distanceKm = dist;
    return { ...r, ...patch };
  });
}

/**
 * Representative coordinate for each suburb: the mean of that suburb's venues'
 * coordinates. A coarse but honest, zero-dependency destination — "toward the
 * suburb", not a street — that needs no geocoder and stores no personal address.
 * Returns [{ area, lat, lng, n }] sorted by name; areas with no located venue
 * are skipped (we can't place them). Recipes are excluded (no location). Pure.
 */
export function areaCentroids(restaurants) {
  const acc = new Map();
  for (const r of restaurants) {
    if (!kindOf(r).hasLocation) continue;
    if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
    if (!r.area) continue;
    const a = acc.get(r.area) || { lat: 0, lng: 0, n: 0 };
    a.lat += r.lat;
    a.lng += r.lng;
    a.n += 1;
    acc.set(r.area, a);
  }
  return [...acc.entries()]
    .map(([area, a]) => ({ area, lat: a.lat / a.n, lng: a.lng / a.n, n: a.n }))
    .sort((x, y) => x.area.localeCompare(y.area));
}
