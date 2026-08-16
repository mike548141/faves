// Unit tests for the home-screen availability ranking (site/js/ranking.js):
// open/reachable venues float up, closed/faraway ones sink, and the picker's
// "available now" pool. Pure (hours + a fixed `now`, no DOM/geolocation).
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { availabilityTier, isAvailableNow, rankVenues, FAR_KM } from "../site/js/ranking.js";

// The ranker reads the clock per venue, in that venue's own zone (ADR 0043).
// These tests are about ordering, not timezones, so they hand it a stub that
// answers the same fixed moment for every zone — the shape `makeClock` returns.
const clockAt = (now) => ({ date: new Date(0), at: () => now });

// Whole-week hours helper (mirrors filters.test.js).
const week = (o, c) =>
  Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, [[o, c]]]));

const MON_NOON = { dow: 1, minutes: 12 * 60 };

// Venues around Wellington; QUEENSTOWN is ~480 km away (the "great when
// you're there" case).
const CBD = { lat: -41.2865, lng: 174.7762 };
const openNear = { id: "open-near", name: "Open Near", lat: -41.29, lng: 174.78, hours: week("09:00", "22:00") };
const openFar = { id: "open-far", name: "Open Far (Queenstown)", lat: -45.0312, lng: 168.6626, hours: week("09:00", "22:00") };
const closedNear = { id: "closed-near", name: "Closed Near", lat: -41.30, lng: 174.79, hours: week("18:00", "22:00") };
const soonNear = { id: "soon-near", name: "Opening Soon", lat: -41.28, lng: 174.77, hours: week("12:30", "22:00") };
const unknownNear = { id: "unknown-near", name: "Unknown Hours", lat: -41.29, lng: 174.76, hours: null };
const recipes = { id: "cook-at-home", name: "Cook at Home", kind: "recipes" };

test("availabilityTier: open, opening-soon, unknown, closed, recipes", () => {
  assert.equal(availabilityTier(openNear, clockAt(MON_NOON)), 0); // open
  assert.equal(availabilityTier(soonNear, clockAt(MON_NOON)), 1); // opens 12:30, 30 min away
  assert.equal(availabilityTier(unknownNear, clockAt(MON_NOON)), 2); // no hours
  assert.equal(availabilityTier(closedNear, clockAt(MON_NOON)), 3); // opens 18:00
  assert.equal(availabilityTier(recipes, clockAt(MON_NOON)), 0); // always an option
});

test("availabilityTier: 'closing soon' still counts as open (tier 0)", () => {
  // Open till 12:30, it's noon → 30 min left → closing-soon, but still serving.
  const closingSoon = { hours: week("09:00", "12:30") };
  assert.equal(availabilityTier(closingSoon, clockAt(MON_NOON)), 0);
});

test("rankVenues (no origin): open before opening-soon before closed", () => {
  const order = rankVenues([closedNear, openNear, soonNear], { clock: clockAt(MON_NOON) }).map((r) => r.id);
  assert.deepEqual(order, ["open-near", "soon-near", "closed-near"]);
});

test("rankVenues (no origin): curated order breaks ties within a tier", () => {
  const a = { id: "a", hours: week("09:00", "22:00") };
  const b = { id: "b", hours: week("09:00", "22:00") };
  // Both open → same tier → input (curated) order preserved.
  assert.deepEqual(rankVenues([a, b], { clock: clockAt(MON_NOON) }).map((r) => r.id), ["a", "b"]);
  assert.deepEqual(rankVenues([b, a], { clock: clockAt(MON_NOON) }).map((r) => r.id), ["b", "a"]);
});

test("rankVenues (no origin): distance does not apply, nothing is demoted", () => {
  // Queenstown venue is open, so with no location it ranks with the open set.
  const order = rankVenues([closedNear, openFar], { clock: clockAt(MON_NOON) }).map((r) => r.id);
  assert.deepEqual(order, ["open-far", "closed-near"]);
});

test("rankVenues (origin): nearest first within the open tier, distance attached", () => {
  const far = { id: "far", lat: -41.35, lng: 174.85, hours: week("09:00", "22:00") };
  const out = rankVenues([far, openNear], { clock: clockAt(MON_NOON), origin: CBD });
  assert.deepEqual(out.map((r) => r.id), ["open-near", "far"]);
  assert.equal(typeof out[0].distanceKm, "number");
});

test("rankVenues (origin): a faraway venue sinks below everything reachable", () => {
  // Open-but-Queenstown must rank below a closed-but-nearby place.
  const out = rankVenues([openFar, closedNear], { clock: clockAt(MON_NOON), origin: CBD });
  assert.deepEqual(out.map((r) => r.id), ["closed-near", "open-far"]);
});

test("rankVenues: a favourite lifts above equal-availability non-favourites", () => {
  const a = { id: "a", hours: week("09:00", "22:00") };
  const b = { id: "b", hours: week("09:00", "22:00") }; // the favourite
  const c = { id: "c", hours: week("09:00", "22:00") };
  const order = rankVenues([a, b, c], { clock: clockAt(MON_NOON), favouriteIds: new Set(["b"]) });
  assert.deepEqual(order.map((r) => r.id), ["b", "a", "c"]); // b jumps its curated peers
});

test("rankVenues: favourites do NOT override availability (closed fav stays low)", () => {
  const openPlain = { id: "open", hours: week("09:00", "22:00") };
  const closedFav = { id: "closed-fav", hours: week("18:00", "22:00") };
  const order = rankVenues([closedFav, openPlain], {
    clock: clockAt(MON_NOON),
    favouriteIds: new Set(["closed-fav"]),
  }).map((r) => r.id);
  assert.deepEqual(order, ["open", "closed-fav"]); // open you can order from wins
});

test("rankVenues (origin): 'Nearest first' is pure distance — a heart earns no pull", () => {
  // Owner ruling 2026-07-23: a hearted farther venue no longer outranks a nearer
  // plain one. fav-far ≈ 4 km, near ≈ 0 km → the nearer plain one leads despite
  // the heart (which keeps its ♥ badge, just no ranking pull).
  const near = { id: "near", lat: -41.287, lng: 174.776, hours: week("09:00", "22:00") };
  const favFar = { id: "fav-far", lat: -41.32, lng: 174.80, hours: week("09:00", "22:00") };
  const order = rankVenues([near, favFar], {
    clock: clockAt(MON_NOON),
    origin: CBD,
    favouriteIds: new Set(["fav-far"]),
  }).map((r) => r.id);
  assert.deepEqual(order, ["near", "fav-far"]);
});

test("Nearest first: a hearted 10 km venue sits BELOW a plain 2.5 km one (owner ruling)", () => {
  // The ruling's regression: hearts get no distance pull in Nearest-first, so
  // pure distance decides — the 2.5 km plain venue wins over the 10 km heart.
  const favFar = { id: "fav-10", ...at(10) };
  const near = { id: "plain-2_5", ...at(2.5) };
  const order = rankVenues([favFar, near], {
    clock: clockAt(MON_NOON),
    origin: CBD,
    favouriteIds: new Set(["fav-10"]),
  }).map((r) => r.id);
  assert.deepEqual(order, ["plain-2_5", "fav-10"]);
});

test("Nearest first: availability stays the tiebreak once distance ties", () => {
  // Two venues the same distance out: the open one leads the closed one (a heart
  // does not enter here — no pull in this mode). Same lat/lng, different hours.
  const spot = at(3);
  const closed = { id: "closed-3", lat: spot.lat, lng: spot.lng, hours: week("18:00", "22:00") };
  const open = { id: "open-3", lat: spot.lat, lng: spot.lng, hours: week("09:00", "22:00") };
  const order = rankVenues([closed, open], {
    clock: clockAt(MON_NOON),
    origin: CBD,
    favouriteIds: new Set(["closed-3"]),
  }).map((r) => r.id);
  assert.deepEqual(order, ["open-3", "closed-3"]);
});

// A venue at ~`km` straight-line north of CBD (1° lat ≈ 111.19 km).
const at = (km) => ({ lat: CBD.lat + km / 111.19, lng: CBD.lng, hours: week("09:00", "22:00") });

test("Nearest first: a favourite 30 km away sits BELOW a non-favourite 2 km away", () => {
  const favFar = { id: "fav-30", ...at(30) };
  const near = { id: "plain-2", ...at(2) };
  const order = rankVenues([favFar, near], {
    clock: clockAt(MON_NOON),
    origin: CBD,
    favouriteIds: new Set(["fav-30"]),
  }).map((r) => r.id);
  // Pure distance: 2 km < 30 km → the near plain one wins (heart earns no pull).
  assert.deepEqual(order, ["plain-2", "fav-30"]);
});

test("Nearest first: between two favourites, the nearer one ranks higher", () => {
  const favNear = { id: "fav-2", ...at(2) };
  const favFar = { id: "fav-30", ...at(30) };
  const order = rankVenues([favFar, favNear], {
    clock: clockAt(MON_NOON),
    origin: CBD,
    favouriteIds: new Set(["fav-2", "fav-30"]),
  }).map((r) => r.id);
  assert.deepEqual(order, ["fav-2", "fav-30"]);
});

test("Nearest first: favBoostKm no longer reorders — a heart never jumps a nearer plain venue", () => {
  // Post-ruling: whatever the favBoostKm dial is set to, a hearted 8 km venue
  // stays below a plain 2 km one (the boost is neutralised in this mode).
  const fav8 = { id: "fav-8", ...at(8) };
  const plain2 = { id: "plain-2", ...at(2) };
  const opts = { clock: clockAt(MON_NOON), origin: CBD, favouriteIds: new Set(["fav-8"]) };
  assert.deepEqual(
    rankVenues([fav8, plain2], { ...opts, favBoostKm: 0 }).map((r) => r.id),
    ["plain-2", "fav-8"]
  );
  assert.deepEqual(
    rankVenues([fav8, plain2], { ...opts, favBoostKm: 10 }).map((r) => r.id),
    ["plain-2", "fav-8"]
  );
});

test("Near me: nearest sorts first NUMERICALLY (2.5 km before 10 km, not text order)", () => {
  // Regression for the owner's report. Under a lexicographic compare of the
  // formatted labels, "10 km" < "2.5 km" (‘1’ < ‘2’) would float the 10 km
  // venue up. Both open (same tier) so distance alone decides — nearest wins.
  const near = { id: "near-2_5", ...at(2.5) };
  const far = { id: "far-10", ...at(10) };
  assert.deepEqual(
    rankVenues([far, near], { clock: clockAt(MON_NOON), origin: CBD }).map((r) => r.id),
    ["near-2_5", "far-10"]
  );
});

test("Near me: a nearer CLOSED venue outranks a farther OPEN one ('Nearest first' = distance leads)", () => {
  // The exact reported case: with "Nearest first" on, distance is the primary
  // key, so a 2.5 km closed venue sits above a 10 km open one (availability is
  // still shown as a badge and has its own "Open now" filter). Fails under the
  // old availability-before-distance order.
  const closedNear2 = { id: "closed-2_5", lat: at(2.5).lat, lng: at(2.5).lng, hours: week("18:00", "22:00") };
  const openFar10 = { id: "open-10", lat: at(10).lat, lng: at(10).lng, hours: week("09:00", "22:00") };
  assert.deepEqual(
    rankVenues([openFar10, closedNear2], { clock: clockAt(MON_NOON), origin: CBD }).map((r) => r.id),
    ["closed-2_5", "open-10"]
  );
});

test("Default order (no location) still floats open above closed regardless of distance", () => {
  // Without an origin we can't measure distance, so availability leads — a
  // closed venue must not jump an open one just because it's listed first.
  const openV = { id: "open", hours: week("09:00", "22:00") };
  const closedV = { id: "closed", hours: week("18:00", "22:00") };
  assert.deepEqual(
    rankVenues([closedV, openV], { clock: clockAt(MON_NOON) }).map((r) => r.id),
    ["open", "closed"]
  );
});

test("farKm param overrides the default reachability gate", () => {
  const near = { id: "near", ...at(2) };
  const mid = { id: "mid", ...at(40) };
  // Default 50 km: 40 km is reachable, so distance orders them (near first).
  assert.deepEqual(
    rankVenues([mid, near], { clock: clockAt(MON_NOON), origin: CBD }).map((r) => r.id),
    ["near", "mid"]
  );
  // farKm 20: 40 km is now "too far" → sinks below the reachable near one.
  const tight = rankVenues([mid, near], { clock: clockAt(MON_NOON), origin: CBD, farKm: 20 });
  assert.deepEqual(tight.map((r) => r.id), ["near", "mid"]);
  assert.equal(isAvailableNow(mid, { clock: clockAt(MON_NOON), origin: CBD, farKm: 20 }), false);
  assert.equal(isAvailableNow(mid, { clock: clockAt(MON_NOON), origin: CBD }), true);
});

test("rankVenues: no favouriteIds → favourites are simply ignored", () => {
  const a = { id: "a", hours: week("09:00", "22:00") };
  const b = { id: "b", hours: week("09:00", "22:00") };
  assert.deepEqual(rankVenues([a, b], { clock: clockAt(MON_NOON) }).map((r) => r.id), ["a", "b"]);
});

test("isAvailableNow: open/opening-soon/unknown are available; closed is not", () => {
  assert.equal(isAvailableNow(openNear, { clock: clockAt(MON_NOON) }), true);
  assert.equal(isAvailableNow(soonNear, { clock: clockAt(MON_NOON) }), true);
  assert.equal(isAvailableNow(unknownNear, { clock: clockAt(MON_NOON) }), true);
  assert.equal(isAvailableNow(recipes, { clock: clockAt(MON_NOON) }), true);
  assert.equal(isAvailableNow(closedNear, { clock: clockAt(MON_NOON) }), false);
});

test("isAvailableNow: with a location, a faraway open venue is not available", () => {
  assert.equal(isAvailableNow(openFar, { clock: clockAt(MON_NOON) }), true); // no origin → can't tell
  assert.equal(isAvailableNow(openFar, { clock: clockAt(MON_NOON), origin: CBD }), false); // too far
  assert.equal(isAvailableNow(openNear, { clock: clockAt(MON_NOON), origin: CBD }), true);
});

test("FAR_KM is a sane regional threshold (keeps Wellington, drops Queenstown)", () => {
  assert.ok(FAR_KM >= 30 && FAR_KM <= 100);
});

test("rankVenues does not mutate its input", () => {
  const input = [closedNear, openNear];
  const snap = JSON.stringify(input);
  rankVenues(input, { clock: clockAt(MON_NOON), origin: CBD });
  assert.equal(JSON.stringify(input), snap);
});

// --- Pinning + stubs (menu-less "coming soon" venues) ---

test("rankVenues: Cook at Home (recipes) is pinned to the very top", () => {
  // Even against an open, nearby venue, the recipes collection anchors #1.
  const order = rankVenues([openNear, recipes], { clock: clockAt(MON_NOON), origin: CBD }).map((r) => r.id);
  assert.deepEqual(order, ["cook-at-home", "open-near"]);
});

test("rankVenues: menu-less stubs sink below everything orderable", () => {
  // An OPEN stub still ranks below a CLOSED orderable venue — you can't order
  // from a stub, so availability doesn't rescue it.
  const openStub = { id: "open-stub", status: "stub", lat: -41.29, lng: 174.78, hours: week("09:00", "22:00") };
  const order = rankVenues([openStub, closedNear], { clock: clockAt(MON_NOON) }).map((r) => r.id);
  assert.deepEqual(order, ["closed-near", "open-stub"]);
});

test("rankVenues (origin): among stubs, the nearer one wins even if it's closed", () => {
  // The reported bug: a closed stub 400 m away sat below an unknown-hours stub
  // 2.4 km away, because "unknown" (tier 2) beat "closed" (tier 3). For stubs
  // that tier is ignored, so distance decides.
  const closedNearStub = { id: "simmer", status: "stub", lat: -41.287, lng: 174.776, hours: week("18:00", "22:00") };
  const unknownFarStub = { id: "marigold", status: "stub", lat: -41.32, lng: 174.8, hours: null };
  const order = rankVenues([unknownFarStub, closedNearStub], { clock: clockAt(MON_NOON), origin: CBD }).map((r) => r.id);
  assert.deepEqual(order, ["simmer", "marigold"]);
});

test("isAvailableNow: a stub is never available (nothing to order)", () => {
  const openStub = { id: "s", status: "stub", hours: week("09:00", "22:00") };
  assert.equal(isAvailableNow(openStub, { clock: clockAt(MON_NOON) }), false);
});

// --- Multi-location venues (locations[] branches, ADR 0011) ---
// A two-branch chain: a near branch open at noon, a far branch closed at noon.
const chain = {
  id: "chain",
  locations: [
    { label: "near", lat: -41.29, lng: 174.78, hours: week("09:00", "22:00") },
    { label: "far", lat: -45.0312, lng: 168.6626, hours: week("18:00", "22:00") },
  ],
};

test("availabilityTier: a multi-location venue uses the nearest branch's hours", () => {
  // No origin → primary (near, open) → tier 0.
  assert.equal(availabilityTier(chain, clockAt(MON_NOON)), 0);
  // Origin by the near branch → its open hours → tier 0.
  assert.equal(availabilityTier(chain, clockAt(MON_NOON), CBD), 0);
  // Origin down in Queenstown → the far branch (closed at noon) → tier 3.
  assert.equal(availabilityTier(chain, clockAt(MON_NOON), { lat: -45.03, lng: 168.66 }), 3);
});

test("rankVenues: distance + card hours come from the nearest branch", () => {
  const [out] = rankVenues([chain], { clock: clockAt(MON_NOON), origin: CBD });
  // Distance is to the near branch (~a few km), not the Queenstown one.
  assert.ok(out.distanceKm < 5);
  // The card is handed the near branch's (open) hours.
  assert.deepEqual(out.hours, week("09:00", "22:00"));
});

test("rankVenues: a nearby-open branch floats the chain above a closed single venue", () => {
  const order = rankVenues([closedNear, chain], { clock: clockAt(MON_NOON), origin: CBD }).map((r) => r.id);
  assert.deepEqual(order, ["chain", "closed-near"]);
});

test("isAvailableNow: a multi-location venue is available when its nearest branch is open", () => {
  assert.equal(isAvailableNow(chain, { clock: clockAt(MON_NOON), origin: CBD }), true);
  // Nearest branch is the far one (closed at noon) → not available.
  assert.equal(isAvailableNow(chain, { clock: clockAt(MON_NOON), origin: { lat: -45.03, lng: 168.66 } }), false);
});
