// Multi-location venues (ROADMAP Theme 2; see docs/decisions/0011). A venue can
// have several branches that share one name, menu and cuisine but each have
// their own address, coordinates, phone and opening hours (e.g. Kaffee Eis,
// Gong Cha). The data carries them as an optional
//   "locations": [{ label?, address, lat, lng, phone, hours }, … ]
// array; a single-location venue keeps those fields at the top level and has no
// `locations`. This module is the ONE place that reconciles the two shapes into
// a canonical branch list, and resolves the *nearest* branch when we know where
// the viewer is — the branch whose distance, drive-time, open/closed status and
// maps handoff the UI should use. Pure (no DOM, no network), so it's
// unit-testable and offline-safe.

import { haversineKm } from "./distance.js";

/**
 * Canonical branch list for a venue — always ≥ 1. When the record carries a
 * non-empty `locations` array those branches win; otherwise a single branch is
 * synthesised from the top-level address/lat/lng/phone/hours, so every consumer
 * sees the same shape whether the venue is one site or many. Pure.
 */
export function branchesOf(r) {
  if (Array.isArray(r.locations) && r.locations.length) return r.locations;
  return [
    {
      label: null,
      address: r.address ?? null,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      phone: r.phone ?? null,
      hours: r.hours ?? null,
    },
  ];
}

/** {lat,lng} for a branch when it has real coordinates, else null. */
export function branchCoords(b) {
  return b && typeof b.lat === "number" && typeof b.lng === "number"
    ? { lat: b.lat, lng: b.lng }
    : null;
}

/**
 * The branch nearest `origin` ({lat,lng}), as { branch, index, distanceKm }.
 * Without an origin (or when no branch has coordinates) the first branch is the
 * default and distanceKm is Infinity — a coordless branch never beats a located
 * one. Pure.
 */
export function nearestBranch(r, origin = null) {
  const branches = branchesOf(r);
  let best = { branch: branches[0], index: 0, distanceKm: Infinity };
  if (!origin) return best;
  branches.forEach((branch, index) => {
    const c = branchCoords(branch);
    if (!c) return;
    const distanceKm = haversineKm(origin, c);
    if (distanceKm < best.distanceKm) best = { branch, index, distanceKm };
  });
  return best;
}

/** Straight-line km from `origin` to the nearest branch, or Infinity. */
export function venueDistanceKm(r, origin = null) {
  return nearestBranch(r, origin).distanceKm;
}

/**
 * The hours that drive this venue's open/closed status: the nearest branch's
 * when we know the viewer's location, otherwise the first (primary) branch's —
 * we can't honestly claim a "nearest" without a location. Returns the hours
 * object or null.
 */
export function venueHours(r, origin = null) {
  return nearestBranch(r, origin).branch.hours ?? null;
}

/**
 * Branches ordered for display: nearest first when `origin` is known (each
 * annotated with `distanceKm`), otherwise data order. Coordless branches keep
 * their relative order after the located ones. The input branches are copied,
 * never mutated. Pure.
 */
export function orderedBranches(r, origin = null) {
  const branches = branchesOf(r).map((b, i) => {
    const c = branchCoords(b);
    return { ...b, _i: i, distanceKm: origin && c ? haversineKm(origin, c) : Infinity };
  });
  if (origin) branches.sort((a, b) => a.distanceKm - b.distanceKm || a._i - b._i);
  return branches;
}

/**
 * Which branches to surface on the contact card, and which to tuck behind a
 * "show all". A many-branch chain (e.g. McDonald's) otherwise floods the page
 * with far-away addresses. Rule (owner, 2026-07-23): at most the **2 nearest**,
 * and only within `thresholdKm` — the viewer's "Show branches within" distance
 * dial (favBoostKm in settings; originally a home-ranking favourite boost,
 * repurposed here as the branch-proximity cutoff — see settings.js).
 *
 * `branches` must already be nearest-first (orderedBranches). When we know real
 * distances (origin set + at least one located branch), the 2nd is dropped
 * beyond the threshold — but the single nearest is always kept so the card is
 * never empty. With no distances (no location, or coordless branches) we can't
 * rank, so the first two in data order show. Returns { shown, rest }. Pure.
 */
export function branchesToShow(branches, thresholdKm) {
  const haveDistances = branches.some((b) => Number.isFinite(b.distanceKm));
  const shown = haveDistances
    ? branches.filter((b, i) => i === 0 || b.distanceKm <= thresholdKm).slice(0, 2)
    : branches.slice(0, 2);
  const shownSet = new Set(shown);
  return { shown, rest: branches.filter((b) => !shownSet.has(b)) };
}

/** True when a venue has more than one branch (drives the per-branch UI). */
export function isMultiLocation(r) {
  return Array.isArray(r.locations) && r.locations.length > 1;
}

/**
 * A branch as a minimal place object geo.js can build a maps URL from: it needs
 * the venue name (branches don't carry one) plus the branch's own address and
 * coordinates. So the directions handoff targets the chosen branch, not the
 * primary one.
 */
export function branchAsPlace(r, b) {
  return { name: r.name, address: b.address ?? null, lat: b.lat ?? null, lng: b.lng ?? null };
}
