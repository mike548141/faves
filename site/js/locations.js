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
import { isBranchTrading } from "./temporal.js";

// ——————————————————————— The "anywhere" branch (ADR 0155) ———————————————————————
// Owner-ruled 2026-09-08 (roadmap 470/050): Cook at Home's one PUBLIC branch
// "should match any address or GPS coordinate so that it can be used by
// anyone". In the data that is a declared VALUE in the address slot —
// exactly `"address": { "anywhere": true }` — never an absent field or a null,
// which already mean "nobody has captured this yet". An object rather than a
// word on purpose: a misspelt word ("Anywhere", "*") is still a valid-looking
// street address that would render and become a maps search, where any
// misspelling of the object is not a string at all, so validate.py refuses it.
//
// The raw object never reaches a renderer. `normaliseBranch` (called from
// data.js's one normalisation seam) turns it into `address: null` plus
// `anywhere: true`, so every reader that asks "is there an address to show or
// map?" gets no, and a reader that needs to tell "everywhere" from "unknown"
// asks `isAnywhereBranch`. It carries no coordinate, so its distance is
// Infinity — exactly what the coordless record measured before the branch
// existed. Whether it should instead sort at the reader's own position is an
// open question for the owner (470/050's 📎), deliberately NOT answered here.

/** True for exactly the wildcard address value `{ anywhere: true }` — one
 *  own key, the boolean `true`. Anything near it is not the wildcard. Pure. */
export function isAnywhere(address) {
  return (
    !!address &&
    typeof address === "object" &&
    !Array.isArray(address) &&
    Object.keys(address).length === 1 &&
    address.anywhere === true
  );
}

/** True for a branch that matches any address or coordinate — in its raw
 *  (declared) form or its normalised (`anywhere: true`) form. Pure. */
export function isAnywhereBranch(b) {
  return !!b && typeof b === "object" && (b.anywhere === true || isAnywhere(b.address));
}

/** One raw branch as the app reads it: the wildcard becomes `address: null`
 *  and `anywhere: true`; every other branch is returned as the SAME object.
 *  Pure — the input is never mutated. */
export function normaliseBranch(b) {
  if (!b || typeof b !== "object" || !isAnywhere(b.address)) return b;
  return { ...b, address: null, anywhere: true };
}

/** The name a branch gives the PLACE it is in — its label — or null for an
 *  "anywhere" branch, whose label names no place (the home card's suburb slot
 *  then falls back to the venue's own area). Pure. */
export function branchPlaceLabel(b) {
  if (!b || isAnywhereBranch(b)) return null;
  return b.label || null;
}

/**
 * Does this venue hold any place detail worth opening a stub's page for — an
 * address, a phone, hours, a coordinate, or a branch that is somewhere in
 * particular? An "anywhere" branch is none of those: it says where you can cook,
 * not where to go. Read by the home card (app.js) to decide whether a stub links
 * anywhere. Pure.
 */
export function hasPlaceDetails(r) {
  if (!r) return false;
  return !!(
    r.hours ||
    r.address ||
    r.phone ||
    r.lat != null ||
    (Array.isArray(r.locations) && r.locations.some((b) => !isAnywhereBranch(b)))
  );
}

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
  // A branch that has SHUT (its own lifecycle, ADR 0132) is not a candidate
  // while a trading one exists: this is the branch whose hours drive the home
  // card's badge, "Open now" and the ranking tier, and a shut branch's posted
  // week would otherwise print "Open · until 9pm" for a door that is locked —
  // on the home screen, while the menu page's card led with a different branch.
  // When NOTHING trades (a venue-level closure, or every branch shut) every
  // branch stays a candidate, exactly as before: the closure is then stated by
  // the closure badge, and the pick only has to be the nearest.
  const live = branches.map((branch, index) => ({ branch, index })).filter(({ branch }) => isBranchTrading(r, branch));
  const pool = live.length ? live : branches.map((branch, index) => ({ branch, index }));
  let best = { branch: pool[0].branch, index: pool[0].index, distanceKm: Infinity };
  if (!origin) return best;
  pool.forEach(({ branch, index }) => {
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
 * It may also return `"shut"` — the branch has stopped TRADING (a lifecycle
 * closure, ADR 0132), which is not the same as closed tonight.
 *
 * So the preference runs in four tiers, each nearest-first:
 *   1. a branch we know is **open**
 *   2. a branch whose hours we **don't have** — unverified beats known-shut,
 *      because it may well be open and we have no evidence either way
 *   3. a branch that still trades, even though we know it is closed right now
 *   4. the nearest branch, even though it has shut — only when EVERY branch has
 *      (a venue-level closure), so there is nothing better to offer
 *
 * `branches` must already be nearest-first (orderedBranches). Pure.
 */
export function leadBranch(branches, openStateOf = () => "unknown") {
  // hours.js `openStatus` answers in FIVE states; the rule reads three. The
  // transitional pair fold in here rather than at every caller: "closing-soon"
  // IS open (a branch closing in 30 minutes is the one whose chip says so, and
  // it still leads over a farther one), "opening-soon" IS closed. Until
  // 2026-08-17 menu.js passed the raw state through, so at 8:30pm the nearest
  // branch closing at 9pm lost the lead to a farther one open till 11pm —
  // ranking.js already folds the pair this way for the home list.
  //
  // "shut" is the fourth answer (ADR 0132): the BRANCH has stopped trading — a
  // lifecycle closure, its own or its venue's — which is a different fact from
  // "closed tonight". It never leads while any branch that still trades exists,
  // even one whose hours say it is shut right now: a branch you can go to
  // tomorrow is a better offer than one you can never go to again.
  const isOpen = (s) => s === "open" || s === "closing-soon";
  const isShut = (s) => s === "shut";
  const isClosed = (s) => s === "closed" || s === "opening-soon" || isShut(s);
  return (
    branches.find((b) => isOpen(openStateOf(b))) ??
    branches.find((b) => !isClosed(openStateOf(b))) ??
    branches.find((b) => !isShut(openStateOf(b))) ??
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
  // Only a STRING is an address a map can search for. The wildcard (ADR 0155)
  // is an object, and an object handed on would become "[object Object]" in a
  // maps URL — so a branch that reached here un-normalised still yields none.
  const address = typeof b.address === "string" ? b.address : null;
  return { name: r.name, address, lat: b.lat ?? null, lng: b.lng ?? null };
}
