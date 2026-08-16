// Unit tests for the home-screen ranking (site/js/ranking.js): ONE ranking, no
// modes. Availability leads, distance follows in FAV_TIE_KM-wide bands, and a
// heart only separates venues already inside the same band. Pure (hours + a
// fixed `now`, no DOM/geolocation). Run: `node --test`.
//
// ADR 0068 retired the two-mode design: a "Nearest first" branch that sorted on
// PURE distance (a closed shop 200 m away outranking an open one at 900 m) and
// a separate no-location default. Every test that asserted the distance-leads
// mode is DELETED rather than skipped — it encoded a design that no longer
// exists, and a skipped test is a design still on the books.
//
// This file is the guard ADR 0068 names. Two rules it exists to hold down:
//  - a heart is a TIEBREAK, not a credit. The retired design subtracted
//    FAV_BOOST_KM (10 km) from a favourite's distance, so a hearted venue 8 km
//    away beat a plain one at 2 km. That case is pinned below.
//  - availability outranks distance, always.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availabilityTier,
  isAvailableNow,
  rankVenues,
  FAR_KM,
  FAV_TIE_KM,
  FAV_BOOST_KM,
} from "../site/js/ranking.js";

// The ranker reads the clock per venue, in that venue's own zone (ADR 0043).
// These tests are about ordering, not timezones, so they hand it a stub that
// answers the same fixed moment for every zone — the shape `makeClock` returns.
const clockAt = (now) => ({ date: new Date(0), at: () => now });

// Whole-week hours helper (mirrors filters.test.js).
const week = (o, c) =>
  Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, [[o, c]]]));

const MON_NOON = { dow: 1, minutes: 12 * 60 };
const OPEN = week("09:00", "22:00"); // open at noon
const SHUT = week("18:00", "22:00"); // closed at noon

// Venues around Wellington; QUEENSTOWN is ~480 km away (the "great when
// you're there" case).
const CBD = { lat: -41.2865, lng: 174.7762 };

// An open venue at ~`km` straight-line north of CBD (1° lat ≈ 111.19 km).
const at = (km) => ({ lat: CBD.lat + km / 111.19, lng: CBD.lng, hours: OPEN });
// …and the same spot with the lights off.
const shutAt = (km) => ({ ...at(km), hours: SHUT });

const openNear = { id: "open-near", name: "Open Near", lat: -41.29, lng: 174.78, hours: OPEN };
const openFar = { id: "open-far", name: "Open Far (Queenstown)", lat: -45.0312, lng: 168.6626, hours: OPEN };
const closedNear = { id: "closed-near", name: "Closed Near", lat: -41.30, lng: 174.79, hours: SHUT };
const soonNear = { id: "soon-near", name: "Opening Soon", lat: -41.28, lng: 174.77, hours: week("12:30", "22:00") };
const unknownNear = { id: "unknown-near", name: "Unknown Hours", lat: -41.29, lng: 174.76, hours: null };
const recipes = { id: "cook-at-home", name: "Cook at Home", kind: "recipes" };

const ids = (list) => list.map((r) => r.id);
const rank = (list, opts) => ids(rankVenues(list, { clock: clockAt(MON_NOON), ...opts }));

// --- Availability tiers ---

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

// --- Availability leads distance (ADR 0068 decision 2) ---

test("availability beats distance: an OPEN venue at 900 m outranks a CLOSED one at 200 m", () => {
  // The headline reversal. Under the retired Nearest-first branch the closed
  // 200 m venue led; you cannot eat at the closed one, so it no longer does.
  const open900 = { id: "open-900", ...at(0.9) };
  const closed200 = { id: "closed-200", ...shutAt(0.2) };
  assert.deepEqual(rank([closed200, open900], { origin: CBD }), ["open-900", "closed-200"]);
});

test("availability leads even when the closed venue is nearer AND hearted", () => {
  // Belt and braces: neither key below availability can rescue a shut venue.
  const open900 = { id: "open-900", ...at(0.9) };
  const closedFav200 = { id: "closed-fav-200", ...shutAt(0.2) };
  assert.deepEqual(
    rank([closedFav200, open900], { origin: CBD, favouriteIds: new Set(["closed-fav-200"]) }),
    ["open-900", "closed-fav-200"]
  );
});

test("opening-soon still outranks closed, and both sink below open, at any distance", () => {
  const open = { id: "open-30", ...at(30) };
  const soon = { id: "soon-1", lat: at(1).lat, lng: at(1).lng, hours: week("12:30", "22:00") };
  const shut = { id: "shut-0", ...shutAt(0.1) };
  assert.deepEqual(rank([shut, soon, open], { origin: CBD }), ["open-30", "soon-1", "shut-0"]);
});

// --- The band: a heart breaks a near-tie and nothing more (decision 3) ---

test("inside one band the heart decides — a hearted 500 m venue beats a plain 300 m one", () => {
  // Both land in band 1 (0.3/0.4 → 1, 0.5/0.4 → 1), so distance ties and the
  // heart speaks. The hearted venue is the FARTHER of the two on purpose:
  // if it were the nearer, distance alone would explain the result.
  const plain300 = { id: "plain-300", ...at(0.3) };
  const fav500 = { id: "fav-500", ...at(0.5) };
  assert.deepEqual(
    rank([plain300, fav500], { origin: CBD, favouriteIds: new Set(["fav-500"]) }),
    ["fav-500", "plain-300"]
  );
  // Control: with no heart in play, the same pair orders by raw distance.
  assert.deepEqual(rank([fav500, plain300], { origin: CBD }), ["plain-300", "fav-500"]);
});

test("outside the band distance wins — a plain 300 m venue beats a hearted 2 km one", () => {
  const plain300 = { id: "plain-300", ...at(0.3) };
  const fav2k = { id: "fav-2k", ...at(2) };
  assert.deepEqual(
    rank([fav2k, plain300], { origin: CBD, favouriteIds: new Set(["fav-2k"]) }),
    ["plain-300", "fav-2k"]
  );
});

test("a hearted venue 8 km away does NOT beat a plain one 2 km away (the 10 km defect)", () => {
  // The exact case ADR 0068 was written to prevent, quoted from the commit that
  // introduced the old credit: "a favourite 8 km away beats a plain place 2 km
  // away." It must not, at any favBoostKm setting — that dial is inert now.
  const fav8 = { id: "fav-8", ...at(8) };
  const plain2 = { id: "plain-2", ...at(2) };
  const opts = { origin: CBD, favouriteIds: new Set(["fav-8"]) };
  for (const favBoostKm of [0, 0.4, 10, 1000]) {
    assert.deepEqual(rank([fav8, plain2], { ...opts, favBoostKm }), ["plain-2", "fav-8"], `favBoostKm=${favBoostKm}`);
  }
});

test("the band is a band, not a radius — venues either side of a boundary are not tied", () => {
  // Consequence of ADR 0068's own formula, pinned so it is a known property and
  // not a surprise: buckets partition space at fixed edges, they do not measure
  // the gap between two venues. 100 m → band 0, 300 m → band 1, so a 200 m gap
  // straddling the 200 m edge is decided by distance and the heart cannot act.
  const plain100 = { id: "plain-100", ...at(0.1) };
  const fav300 = { id: "fav-300", ...at(0.3) };
  assert.deepEqual(
    rank([fav300, plain100], { origin: CBD, favouriteIds: new Set(["fav-300"]) }),
    ["plain-100", "fav-300"]
  );
});

test("between two favourites, the nearer one still leads", () => {
  const favNear = { id: "fav-2", ...at(2) };
  const favFar = { id: "fav-30", ...at(30) };
  assert.deepEqual(
    rank([favFar, favNear], { origin: CBD, favouriteIds: new Set(["fav-2", "fav-30"]) }),
    ["fav-2", "fav-30"]
  );
});

test("favourites do NOT override availability (a closed favourite stays low)", () => {
  const openPlain = { id: "open", hours: OPEN };
  const closedFav = { id: "closed-fav", hours: SHUT };
  assert.deepEqual(
    rank([closedFav, openPlain], { favouriteIds: new Set(["closed-fav"]) }),
    ["open", "closed-fav"]
  );
});

test("FAV_TIE_KM is a tiebreak's size, and is NOT the branch dial", () => {
  // Finding 2 of ADR 0068: FAV_BOOST_KM is the branch-proximity cutoff now and
  // keeps its 10 km. Re-tuning it to serve the ranking would hide almost every
  // branch of every chain, so these two must never converge.
  assert.ok(FAV_TIE_KM > 0 && FAV_TIE_KM <= 1, "a few hundred metres, not a preference weighting");
  assert.notEqual(FAV_TIE_KM, FAV_BOOST_KM);
  assert.equal(FAV_BOOST_KM, 10);
});

// --- Distance itself ---

test("distance sorts NUMERICALLY (2.5 km before 10 km, not text order)", () => {
  // Regression for the owner's report: under a lexicographic compare of the
  // formatted labels, "10 km" < "2.5 km" (‘1’ < ‘2’) would float 10 km up.
  const near = { id: "near-2_5", ...at(2.5) };
  const far = { id: "far-10", ...at(10) };
  assert.deepEqual(rank([far, near], { origin: CBD }), ["near-2_5", "far-10"]);
});

test("with an origin, the nearest branch's distance is attached for the card", () => {
  const far = { id: "far", lat: -41.35, lng: 174.85, hours: OPEN };
  const out = rankVenues([far, openNear], { clock: clockAt(MON_NOON), origin: CBD });
  assert.deepEqual(ids(out), ["open-near", "far"]);
  assert.equal(typeof out[0].distanceKm, "number");
});

test("a faraway venue sinks below everything reachable, open or not", () => {
  // Open-but-Queenstown must rank below a closed-but-nearby place: farKm is
  // above availability, so "another town" is decided before anything else.
  assert.deepEqual(rank([openFar, closedNear], { origin: CBD }), ["closed-near", "open-far"]);
});

test("farKm param overrides the default reachability gate", () => {
  const near = { id: "near", ...at(2) };
  const mid = { id: "mid", ...at(40) };
  // Default 50 km: 40 km is reachable, so distance orders them (near first).
  assert.deepEqual(rank([mid, near], { origin: CBD }), ["near", "mid"]);
  // farKm 20: 40 km is now "too far" → sinks below the reachable near one.
  assert.deepEqual(rank([mid, near], { origin: CBD, farKm: 20 }), ["near", "mid"]);
  assert.equal(isAvailableNow(mid, { clock: clockAt(MON_NOON), origin: CBD, farKm: 20 }), false);
  assert.equal(isAvailableNow(mid, { clock: clockAt(MON_NOON), origin: CBD }), true);
});

test("the reachability gate outranks the heart: a hearted venue in another town still sinks", () => {
  const favFar = { id: "fav-60", ...at(60) };
  const plainNear = { id: "plain-3", ...at(3) };
  assert.deepEqual(
    rank([favFar, plainNear], { origin: CBD, favouriteIds: new Set(["fav-60"]) }),
    ["plain-3", "fav-60"]
  );
});

// --- No origin: the permission-refused path, which must not regress ---

test("no origin: order is availability → favourite → curated, exactly as before", () => {
  // The geolocation-refused fallback. Every distance is Infinity, so every band
  // is Infinity too: both distance keys tie for everyone and the order falls
  // through to precisely the keys it used before ADR 0068.
  const openA = { id: "open-a", hours: OPEN };
  const openFav = { id: "open-fav", hours: OPEN };
  const openB = { id: "open-b", hours: OPEN };
  const soon = { id: "soon", hours: week("12:30", "22:00") };
  const unknown = { id: "unknown", hours: null };
  const shut = { id: "shut", hours: SHUT };
  const shutFav = { id: "shut-fav", hours: SHUT };
  assert.deepEqual(
    rank([shut, openA, unknown, openFav, soon, shutFav, openB], {
      favouriteIds: new Set(["open-fav", "shut-fav"]),
    }),
    ["open-fav", "open-a", "open-b", "soon", "unknown", "shut-fav", "shut"]
  );
});

test("no origin: open before opening-soon before closed", () => {
  assert.deepEqual(rank([closedNear, openNear, soonNear]), ["open-near", "soon-near", "closed-near"]);
});

test("no origin: curated order breaks ties within a tier", () => {
  const a = { id: "a", hours: OPEN };
  const b = { id: "b", hours: OPEN };
  // Both open → same tier → input (curated) order preserved, either way round.
  assert.deepEqual(rank([a, b]), ["a", "b"]);
  assert.deepEqual(rank([b, a]), ["b", "a"]);
});

test("no origin: distance does not apply, nothing is demoted for being far", () => {
  // Queenstown venue is open, so with no location it ranks with the open set.
  assert.deepEqual(rank([closedNear, openFar]), ["open-far", "closed-near"]);
});

test("no origin: no distanceKm is invented, and the record is handed back untouched", () => {
  const [out] = rankVenues([openNear], { clock: clockAt(MON_NOON) });
  assert.equal(out, openNear); // same object, not a patched copy
  assert.equal("distanceKm" in out, false);
});

test("no favouriteIds → favourites are simply ignored", () => {
  const a = { id: "a", hours: OPEN };
  const b = { id: "b", hours: OPEN };
  assert.deepEqual(rank([a, b]), ["a", "b"]);
});

// --- Infinity distances must never become NaN ---

test("coordless venues (Infinity distance) sort last among equals, not randomly", () => {
  // Both bands are Infinity for a coordless venue, and Infinity − Infinity is
  // NaN. Ranking it forwards and backwards is the honest check: a comparator
  // that mishandles NaN gives an order that depends on input order, so if the
  // two disagree the sort is unstable regardless of which one "looks" right.
  // (This pair passes under subtraction too — see the note on `cmp`.)
  const coordless = { id: "coordless", hours: OPEN };
  const near = { id: "near-1", ...at(1) };
  const forward = rank([coordless, near], { origin: CBD });
  const reverse = rank([near, coordless], { origin: CBD });
  assert.deepEqual(forward, ["near-1", "coordless"]);
  assert.deepEqual(reverse, forward, "input order must not change the result");
});

test("a coordless venue keeps its band tie, so the heart can still break it", () => {
  // Two coordless venues with an origin known: distance can't separate them, so
  // this is the no-origin logic operating on a subset — the heart floats.
  const a = { id: "a", hours: OPEN };
  const favB = { id: "fav-b", hours: OPEN };
  assert.deepEqual(
    rank([a, favB], { origin: CBD, favouriteIds: new Set(["fav-b"]) }),
    ["fav-b", "a"]
  );
});

test("no NaN leaks into the output: coordless venues gain no distanceKm", () => {
  const coordless = { id: "coordless", hours: OPEN };
  const [out] = rankVenues([coordless], { clock: clockAt(MON_NOON), origin: CBD });
  assert.equal("distanceKm" in out, false);
});

test("a coordless venue is never demoted for reach, however tight farKm is", () => {
  const coordless = { id: "coordless", hours: OPEN };
  const near = { id: "near-1", ...at(1) };
  // farKm 0.5 puts the 1 km venue in "another town"; the coordless one has no
  // known distance to judge, so it must not be gated out with it.
  assert.deepEqual(rank([near, coordless], { origin: CBD, farKm: 0.5 }), ["coordless", "near-1"]);
});

test("FAR_KM is a sane regional threshold (keeps Wellington, drops Queenstown)", () => {
  assert.ok(FAR_KM >= 30 && FAR_KM <= 100);
});

test("rankVenues does not mutate its input", () => {
  const input = [closedNear, openNear];
  const snap = JSON.stringify(input);
  rankVenues(input, { clock: clockAt(MON_NOON), origin: CBD });
  assert.equal(JSON.stringify(input), snap);
  assert.deepEqual(ids(input), ["closed-near", "open-near"]); // and not reordered
});

// --- Pinning + stubs (menu-less "coming soon" venues) ---

test("rankVenues: Cook at Home (recipes) is pinned to the very top", () => {
  // Even against an open, nearby venue, the recipes collection anchors #1 —
  // and it is coordless, so this also pins that Infinity can't sink it.
  assert.deepEqual(rank([openNear, recipes], { origin: CBD }), ["cook-at-home", "open-near"]);
});

test("rankVenues: menu-less stubs sink below everything orderable", () => {
  // An OPEN stub still ranks below a CLOSED orderable venue — you can't order
  // from a stub, so availability doesn't rescue it.
  const openStub = { id: "open-stub", status: "stub", lat: -41.29, lng: 174.78, hours: OPEN };
  assert.deepEqual(rank([openStub, closedNear]), ["closed-near", "open-stub"]);
});

test("rankVenues (origin): among stubs, the nearer one wins even if it's closed", () => {
  // The reported bug: a closed stub 400 m away sat below an unknown-hours stub
  // 2.4 km away, because "unknown" (tier 2) beat "closed" (tier 3). For stubs
  // that tier is zeroed, so distance decides.
  const closedNearStub = { id: "simmer", status: "stub", lat: -41.287, lng: 174.776, hours: SHUT };
  const unknownFarStub = { id: "marigold", status: "stub", lat: -41.32, lng: 174.8, hours: null };
  assert.deepEqual(rank([unknownFarStub, closedNearStub], { origin: CBD }), ["simmer", "marigold"]);
});

test("isAvailableNow: a stub is never available (nothing to order)", () => {
  const openStub = { id: "s", status: "stub", hours: OPEN };
  assert.equal(isAvailableNow(openStub, { clock: clockAt(MON_NOON) }), false);
});

// --- isAvailableNow (the "Pick for us" pool) ---

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

// --- Multi-location venues (locations[] branches, ADR 0011) ---
// A two-branch chain: a near branch open at noon, a far branch closed at noon.
const chain = {
  id: "chain",
  locations: [
    { label: "near", lat: -41.29, lng: 174.78, hours: OPEN },
    { label: "far", lat: -45.0312, lng: 168.6626, hours: SHUT },
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
  assert.deepEqual(out.hours, OPEN);
});

test("rankVenues: a nearby-open branch floats the chain above a closed single venue", () => {
  assert.deepEqual(rank([closedNear, chain], { origin: CBD }), ["chain", "closed-near"]);
});

test("isAvailableNow: a multi-location venue is available when its nearest branch is open", () => {
  assert.equal(isAvailableNow(chain, { clock: clockAt(MON_NOON), origin: CBD }), true);
  // Nearest branch is the far one (closed at noon) → not available.
  assert.equal(isAvailableNow(chain, { clock: clockAt(MON_NOON), origin: { lat: -45.03, lng: 168.66 } }), false);
});
