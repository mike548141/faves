// Unit tests for the home-screen availability ranking (site/js/ranking.js):
// open/reachable venues float up, closed/faraway ones sink, and the picker's
// "available now" pool. Pure (hours + a fixed `now`, no DOM/geolocation).
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { availabilityTier, isAvailableNow, rankVenues, FAR_KM } from "../site/js/ranking.js";

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
  assert.equal(availabilityTier(openNear, MON_NOON), 0); // open
  assert.equal(availabilityTier(soonNear, MON_NOON), 1); // opens 12:30, 30 min away
  assert.equal(availabilityTier(unknownNear, MON_NOON), 2); // no hours
  assert.equal(availabilityTier(closedNear, MON_NOON), 3); // opens 18:00
  assert.equal(availabilityTier(recipes, MON_NOON), 0); // always an option
});

test("availabilityTier: 'closing soon' still counts as open (tier 0)", () => {
  // Open till 12:30, it's noon → 30 min left → closing-soon, but still serving.
  const closingSoon = { hours: week("09:00", "12:30") };
  assert.equal(availabilityTier(closingSoon, MON_NOON), 0);
});

test("rankVenues (no origin): open before opening-soon before closed", () => {
  const order = rankVenues([closedNear, openNear, soonNear], { now: MON_NOON }).map((r) => r.id);
  assert.deepEqual(order, ["open-near", "soon-near", "closed-near"]);
});

test("rankVenues (no origin): curated order breaks ties within a tier", () => {
  const a = { id: "a", hours: week("09:00", "22:00") };
  const b = { id: "b", hours: week("09:00", "22:00") };
  // Both open → same tier → input (curated) order preserved.
  assert.deepEqual(rankVenues([a, b], { now: MON_NOON }).map((r) => r.id), ["a", "b"]);
  assert.deepEqual(rankVenues([b, a], { now: MON_NOON }).map((r) => r.id), ["b", "a"]);
});

test("rankVenues (no origin): distance does not apply, nothing is demoted", () => {
  // Queenstown venue is open, so with no location it ranks with the open set.
  const order = rankVenues([closedNear, openFar], { now: MON_NOON }).map((r) => r.id);
  assert.deepEqual(order, ["open-far", "closed-near"]);
});

test("rankVenues (origin): nearest first within the open tier, distance attached", () => {
  const far = { id: "far", lat: -41.35, lng: 174.85, hours: week("09:00", "22:00") };
  const out = rankVenues([far, openNear], { now: MON_NOON, origin: CBD });
  assert.deepEqual(out.map((r) => r.id), ["open-near", "far"]);
  assert.equal(typeof out[0].distanceKm, "number");
});

test("rankVenues (origin): a faraway venue sinks below everything reachable", () => {
  // Open-but-Queenstown must rank below a closed-but-nearby place.
  const out = rankVenues([openFar, closedNear], { now: MON_NOON, origin: CBD });
  assert.deepEqual(out.map((r) => r.id), ["closed-near", "open-far"]);
});

test("rankVenues: a favourite lifts above equal-availability non-favourites", () => {
  const a = { id: "a", hours: week("09:00", "22:00") };
  const b = { id: "b", hours: week("09:00", "22:00") }; // the favourite
  const c = { id: "c", hours: week("09:00", "22:00") };
  const order = rankVenues([a, b, c], { now: MON_NOON, favouriteIds: new Set(["b"]) });
  assert.deepEqual(order.map((r) => r.id), ["b", "a", "c"]); // b jumps its curated peers
});

test("rankVenues: favourites do NOT override availability (closed fav stays low)", () => {
  const openPlain = { id: "open", hours: week("09:00", "22:00") };
  const closedFav = { id: "closed-fav", hours: week("18:00", "22:00") };
  const order = rankVenues([closedFav, openPlain], {
    now: MON_NOON,
    favouriteIds: new Set(["closed-fav"]),
  }).map((r) => r.id);
  assert.deepEqual(order, ["open", "closed-fav"]); // open you can order from wins
});

test("rankVenues (origin): a favourite outranks a nearer non-favourite when both open", () => {
  const near = { id: "near", lat: -41.287, lng: 174.776, hours: week("09:00", "22:00") };
  const favFar = { id: "fav-far", lat: -41.32, lng: 174.80, hours: week("09:00", "22:00") };
  const order = rankVenues([near, favFar], {
    now: MON_NOON,
    origin: CBD,
    favouriteIds: new Set(["fav-far"]),
  }).map((r) => r.id);
  // fav-far ≈ 4 km; boosted by the default 10 km → −6, beats near at ~0 km.
  assert.deepEqual(order, ["fav-far", "near"]);
});

// A venue at ~`km` straight-line north of CBD (1° lat ≈ 111.19 km).
const at = (km) => ({ lat: CBD.lat + km / 111.19, lng: CBD.lng, hours: week("09:00", "22:00") });

test("weighted: a favourite 30 km away sits BELOW a non-favourite 2 km away", () => {
  const favFar = { id: "fav-30", ...at(30) };
  const near = { id: "plain-2", ...at(2) };
  const order = rankVenues([favFar, near], {
    now: MON_NOON,
    origin: CBD,
    favouriteIds: new Set(["fav-30"]),
  }).map((r) => r.id);
  // 30 − 10 boost = 20 effective, still worse than 2 → the near plain one wins.
  assert.deepEqual(order, ["plain-2", "fav-30"]);
});

test("weighted: between two favourites, the nearer one ranks higher", () => {
  const favNear = { id: "fav-2", ...at(2) };
  const favFar = { id: "fav-30", ...at(30) };
  const order = rankVenues([favFar, favNear], {
    now: MON_NOON,
    origin: CBD,
    favouriteIds: new Set(["fav-2", "fav-30"]),
  }).map((r) => r.id);
  assert.deepEqual(order, ["fav-2", "fav-30"]);
});

test("weighted: a bigger favBoostKm can push a favourite above a nearer plain venue", () => {
  const fav8 = { id: "fav-8", ...at(8) };
  const plain2 = { id: "plain-2", ...at(2) };
  const opts = { now: MON_NOON, origin: CBD, favouriteIds: new Set(["fav-8"]) };
  // boost 0 → distance rules → plain-2 first
  assert.deepEqual(
    rankVenues([fav8, plain2], { ...opts, favBoostKm: 0 }).map((r) => r.id),
    ["plain-2", "fav-8"]
  );
  // boost 10 → fav-8 counts as −2 → it leads
  assert.deepEqual(
    rankVenues([fav8, plain2], { ...opts, favBoostKm: 10 }).map((r) => r.id),
    ["fav-8", "plain-2"]
  );
});

test("farKm param overrides the default reachability gate", () => {
  const near = { id: "near", ...at(2) };
  const mid = { id: "mid", ...at(40) };
  // Default 50 km: 40 km is reachable, so distance orders them (near first).
  assert.deepEqual(
    rankVenues([mid, near], { now: MON_NOON, origin: CBD }).map((r) => r.id),
    ["near", "mid"]
  );
  // farKm 20: 40 km is now "too far" → sinks below the reachable near one.
  const tight = rankVenues([mid, near], { now: MON_NOON, origin: CBD, farKm: 20 });
  assert.deepEqual(tight.map((r) => r.id), ["near", "mid"]);
  assert.equal(isAvailableNow(mid, { now: MON_NOON, origin: CBD, farKm: 20 }), false);
  assert.equal(isAvailableNow(mid, { now: MON_NOON, origin: CBD }), true);
});

test("rankVenues: no favouriteIds → favourites are simply ignored", () => {
  const a = { id: "a", hours: week("09:00", "22:00") };
  const b = { id: "b", hours: week("09:00", "22:00") };
  assert.deepEqual(rankVenues([a, b], { now: MON_NOON }).map((r) => r.id), ["a", "b"]);
});

test("isAvailableNow: open/opening-soon/unknown are available; closed is not", () => {
  assert.equal(isAvailableNow(openNear, { now: MON_NOON }), true);
  assert.equal(isAvailableNow(soonNear, { now: MON_NOON }), true);
  assert.equal(isAvailableNow(unknownNear, { now: MON_NOON }), true);
  assert.equal(isAvailableNow(recipes, { now: MON_NOON }), true);
  assert.equal(isAvailableNow(closedNear, { now: MON_NOON }), false);
});

test("isAvailableNow: with a location, a faraway open venue is not available", () => {
  assert.equal(isAvailableNow(openFar, { now: MON_NOON }), true); // no origin → can't tell
  assert.equal(isAvailableNow(openFar, { now: MON_NOON, origin: CBD }), false); // too far
  assert.equal(isAvailableNow(openNear, { now: MON_NOON, origin: CBD }), true);
});

test("FAR_KM is a sane regional threshold (keeps Wellington, drops Queenstown)", () => {
  assert.ok(FAR_KM >= 30 && FAR_KM <= 100);
});

test("rankVenues does not mutate its input", () => {
  const input = [closedNear, openNear];
  const snap = JSON.stringify(input);
  rankVenues(input, { now: MON_NOON, origin: CBD });
  assert.equal(JSON.stringify(input), snap);
});

// --- Pinning + stubs (menu-less "coming soon" venues) ---

test("rankVenues: Cook at Home (recipes) is pinned to the very top", () => {
  // Even against an open, nearby venue, the recipes collection anchors #1.
  const order = rankVenues([openNear, recipes], { now: MON_NOON, origin: CBD }).map((r) => r.id);
  assert.deepEqual(order, ["cook-at-home", "open-near"]);
});

test("rankVenues: menu-less stubs sink below everything orderable", () => {
  // An OPEN stub still ranks below a CLOSED orderable venue — you can't order
  // from a stub, so availability doesn't rescue it.
  const openStub = { id: "open-stub", status: "stub", lat: -41.29, lng: 174.78, hours: week("09:00", "22:00") };
  const order = rankVenues([openStub, closedNear], { now: MON_NOON }).map((r) => r.id);
  assert.deepEqual(order, ["closed-near", "open-stub"]);
});

test("rankVenues (origin): among stubs, the nearer one wins even if it's closed", () => {
  // The reported bug: a closed stub 400 m away sat below an unknown-hours stub
  // 2.4 km away, because "unknown" (tier 2) beat "closed" (tier 3). For stubs
  // that tier is ignored, so distance decides.
  const closedNearStub = { id: "simmer", status: "stub", lat: -41.287, lng: 174.776, hours: week("18:00", "22:00") };
  const unknownFarStub = { id: "marigold", status: "stub", lat: -41.32, lng: 174.8, hours: null };
  const order = rankVenues([unknownFarStub, closedNearStub], { now: MON_NOON, origin: CBD }).map((r) => r.id);
  assert.deepEqual(order, ["simmer", "marigold"]);
});

test("isAvailableNow: a stub is never available (nothing to order)", () => {
  const openStub = { id: "s", status: "stub", hours: week("09:00", "22:00") };
  assert.equal(isAvailableNow(openStub, { now: MON_NOON }), false);
});
