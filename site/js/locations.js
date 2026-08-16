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

/** True when a venue has more than one branch (drives the per-branch UI). */
export function isMultiLocation(r) {
  return Array.isArray(r.locations) && r.locations.length > 1;
}

// How many branches sit beside the lead as one-tap rows. Owner, 2026-08-16:
// "2-4 more branches in some kind of collapsed state … a user can pick a
// different branch to use in a single step", and the second step only "if there
// are more than 3-5 branches". Four is the top of both ranges, and it is what
// retires the second step for four of this corpus's five chains (McDonald's 5,
// Subway 5, Sushi Bi 3, Pandan 2; only TJ Katsu's 7 still needs it).
export const NEAR_BRANCH_LIMIT = 4;

/**
 * Pick the branch that leads the card. Owner's rule, 2026-08-16: *"the top most
 * branches must not only be closest, but open as well"*.
 *
 * `openStateOf(branch)` returns `"open"`, `"closed"` or `"unknown"` — three
 * states, not two, because **10 of this corpus's 22 branches carry no hours at
 * all** (every McDonald's and every Subway). A two-state rule would quietly
 * treat "we never captured the hours" as "shut", and the openness half of the
 * rule would never fire on the very chain that prompted it — the decorative
 * check this repo keeps re-inventing.
 *
 * So the preference runs in three tiers, each nearest-first:
 *   1. a branch we know is **open**
 *   2. a branch whose hours we **don't have** — unverified beats known-shut,
 *      because it may well be open and we have no evidence either way
 *   3. the nearest branch, even though we know it is closed
 *
 * `branches` must already be nearest-first (orderedBranches). Pure.
 */
export function leadBranch(branches, openStateOf = () => "unknown") {
  return (
    branches.find((b) => openStateOf(b) === "open") ??
    branches.find((b) => openStateOf(b) !== "closed") ??
    branches[0]
  );
}

/**
 * How the contact card splits a chain's branches three ways.
 *
 *   { lead, near, rest, beyondDial }
 *
 * `lead` is the one branch shown expanded (leadBranch above). `near` is up to
 * NEAR_BRANCH_LIMIT more, collapsed to a single tappable row each so a different
 * branch is one step away. `rest` needs the second step ("Show all N"), which is
 * how a 7-branch chain stops flooding a 390 px screen.
 *
 * `thresholdKm` is the viewer's branch-proximity dial. Branches beyond it are
 * dropped from `near` **and** from `rest` — the owner's rule is that the fuller
 * list "would still be limited by the settings configuration". `beyondDial`
 * counts what that removed, because a cap the reader cannot see reads as "this
 * is all of them"; the UI says so and points at the setting.
 *
 * The lead always survives the dial. A card that can render empty is worse than
 * one that occasionally over-shows, and "your nearest is 40 km away" is a useful
 * answer where silence is not.
 *
 * With no distances at all (no captured location, or coordless branches) the
 * dial cannot be applied and nothing is dropped — an unknown distance is not
 * evidence of a far one. Order falls back to the data's own. Pure.
 */
export function branchCard(branches, thresholdKm, openStateOf = () => "unknown") {
  const lead = leadBranch(branches, openStateOf);
  const others = branches.filter((b) => b !== lead);
  const haveDistances = branches.some((b) => Number.isFinite(b.distanceKm));
  const within = haveDistances
    ? others.filter((b) => b.distanceKm <= thresholdKm)
    : others;
  return {
    lead,
    near: within.slice(0, NEAR_BRANCH_LIMIT),
    rest: within.slice(NEAR_BRANCH_LIMIT),
    beyondDial: others.length - within.length,
  };
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
