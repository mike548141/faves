// Unit tests for the "Pick along a route" maths (site/js/route.js): the
// added-distance detour cost, best-branch-for-route resolution, the detour
// sort + its availability composition, and suburb centroids for the
// destination picker. Pure (fixed coordinates + a fixed `now`, no DOM /
// geolocation). Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detourKm,
  bestBranchForRoute,
  venueDetourKm,
  rankByDetour,
  areaCentroids,
} from "../site/js/route.js";
import { routeMapsUrlFor } from "../site/js/geo.js";

// The ranker reads the clock per venue, in that venue's own zone (ADR 0043).
// These tests are about ordering, not timezones, so they hand it a stub that
// answers the same fixed moment for every zone — the shape `makeClock` returns.
const clockAt = (now) => ({ date: new Date(0), at: () => now });

const week = (o, c) =>
  Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, [[o, c]]]));
const MON_NOON = { dow: 1, minutes: 12 * 60 };

// A north–south corridor: 1° of latitude ≈ 111.19 km, longitude fixed, so
// detours are easy to reason about. ORIGIN at 0, DEST 10 km north.
const ORIGIN = { lat: 0, lng: 0 };
const DEST = { lat: 10 / 111.19, lng: 0 };
// A venue at `km` north of ORIGIN, `east` km to the side (both along/across).
const pt = (north, east = 0) => ({
  lat: north / 111.19,
  lng: east / (111.19 * Math.cos(0)), // cos(0)=1 at the equator
});

// --- detourKm -------------------------------------------------------------

test("detourKm: a venue on the straight segment adds ~0 detour", () => {
  const onLine = pt(5); // halfway between origin and dest
  assert.ok(detourKm(ORIGIN, onLine, DEST) < 0.001, "≈0 on the line");
});

test("detourKm: endpoints themselves are zero detour", () => {
  assert.ok(detourKm(ORIGIN, ORIGIN, DEST) < 1e-9);
  assert.ok(detourKm(ORIGIN, DEST, DEST) < 1e-9);
});

test("detourKm: a venue behind the origin costs ~twice the backtrack", () => {
  const behind = pt(-3); // 3 km the wrong way
  // Go back 3, then forward 13 to dest = 16; direct = 10 → +6 detour.
  assert.ok(Math.abs(detourKm(ORIGIN, behind, DEST) - 6) < 0.05);
});

test("detourKm: a venue past the destination costs ~twice the overshoot", () => {
  const past = pt(14); // 4 km beyond the 10 km dest
  // 14 out + 4 back = 18; direct = 10 → +8 detour.
  assert.ok(Math.abs(detourKm(ORIGIN, past, DEST) - 8) < 0.05);
});

test("detourKm: a venue off to the side costs its there-and-back offset", () => {
  const beside = pt(5, 2); // halfway along, 2 km to the side
  const d = detourKm(ORIGIN, beside, DEST);
  assert.ok(d > 0, "a side trip is a real detour");
  assert.ok(d < 4.1, "but a 2 km side offset is well under a 4 km round trip");
});

test("detourKm: never negative (clamped)", () => {
  assert.ok(detourKm(ORIGIN, pt(5), DEST) >= 0);
});

// --- bestBranchForRoute (multi-location) ----------------------------------

const twoBranch = {
  id: "chain",
  name: "Two Spots",
  locations: [
    // Branch A: right by the origin but 1 km off to the side.
    { label: "A", lat: pt(1, 1).lat, lng: pt(1, 1).lng, hours: week("09:00", "22:00") },
    // Branch B: exactly on the line, halfway → essentially no detour.
    { label: "B", lat: pt(5).lat, lng: pt(5).lng, hours: week("18:00", "22:00") },
  ],
};

test("bestBranchForRoute: picks the least-detour branch, not the nearest to origin", () => {
  const best = bestBranchForRoute(twoBranch, ORIGIN, DEST);
  assert.equal(best.branch.label, "B"); // on-line beats the closer-but-offset A
  assert.ok(best.detourKm < 0.01);
  assert.equal(typeof best.distanceKm, "number");
});

test("bestBranchForRoute / venueDetourKm: Infinity without both endpoints", () => {
  assert.equal(venueDetourKm(twoBranch, ORIGIN, null), Infinity);
  assert.equal(venueDetourKm(twoBranch, null, DEST), Infinity);
  const nb = bestBranchForRoute(twoBranch);
  assert.equal(nb.index, 0); // first branch is the default
  assert.equal(nb.detourKm, Infinity);
});

test("venueDetourKm: a coordless venue has Infinity detour", () => {
  assert.equal(venueDetourKm({ id: "x", name: "X", address: "somewhere" }, ORIGIN, DEST), Infinity);
});

// --- rankByDetour ---------------------------------------------------------

const onLine = { id: "on-line", lat: pt(5).lat, lng: pt(5).lng, hours: week("09:00", "22:00") };
const beside = { id: "beside", lat: pt(5, 2).lat, lng: pt(5, 2).lng, hours: week("09:00", "22:00") };
const wayOff = { id: "way-off", lat: pt(5, 20).lat, lng: pt(5, 20).lng, hours: week("09:00", "22:00") };

test("rankByDetour: least detour leads", () => {
  const order = rankByDetour([wayOff, beside, onLine], {
    clock: clockAt(MON_NOON),
    origin: ORIGIN,
    dest: DEST,
  }).map((r) => r.id);
  assert.deepEqual(order, ["on-line", "beside", "way-off"]);
});

test("rankByDetour: attaches a detourKm field for the card", () => {
  const [first] = rankByDetour([onLine], { clock: clockAt(MON_NOON), origin: ORIGIN, dest: DEST });
  assert.equal(typeof first.detourKm, "number");
  assert.ok(first.detourKm < 0.01);
});

test("rankByDetour: detour leads, availability is only the secondary key", () => {
  // A closed venue on the line beats an open one that's a big detour: the mode
  // honours its headline metric (like 'Nearest first'), it doesn't float a
  // far-off open place above a barely-detour closed one.
  const closedOnLine = { id: "closed-on-line", lat: pt(5).lat, lng: pt(5).lng, hours: week("18:00", "22:00") };
  const openWayOff = { id: "open-way-off", lat: pt(5, 20).lat, lng: pt(5, 20).lng, hours: week("09:00", "22:00") };
  const order = rankByDetour([openWayOff, closedOnLine], {
    clock: clockAt(MON_NOON),
    origin: ORIGIN,
    dest: DEST,
  }).map((r) => r.id);
  assert.deepEqual(order, ["closed-on-line", "open-way-off"]);
});

test("rankByDetour: among near-equal detours, the open one wins (availability breaks the tie)", () => {
  // Two venues both on the line at the same spot: availability decides.
  const openHere = { id: "open-here", lat: pt(5).lat, lng: pt(5).lng, hours: week("09:00", "22:00") };
  const closedHere = { id: "closed-here", lat: pt(5).lat, lng: pt(5).lng, hours: week("18:00", "22:00") };
  const order = rankByDetour([closedHere, openHere], {
    clock: clockAt(MON_NOON),
    origin: ORIGIN,
    dest: DEST,
  }).map((r) => r.id);
  assert.deepEqual(order, ["open-here", "closed-here"]);
});

test("rankByDetour: recipes pinned to the very top despite Infinity detour", () => {
  const recipes = { id: "cook-at-home", name: "Cook at Home", kind: "recipes" };
  const order = rankByDetour([onLine, recipes], {
    clock: clockAt(MON_NOON),
    origin: ORIGIN,
    dest: DEST,
  }).map((r) => r.id);
  assert.deepEqual(order, ["cook-at-home", "on-line"]);
});

test("rankByDetour: menu-less stubs sink below everything orderable", () => {
  const stub = { id: "stub", status: "stub", lat: pt(5).lat, lng: pt(5).lng, hours: week("09:00", "22:00") };
  const order = rankByDetour([stub, wayOff], { clock: clockAt(MON_NOON), origin: ORIGIN, dest: DEST }).map((r) => r.id);
  // Even though the stub is dead on the line, it can't be ordered from → below.
  assert.deepEqual(order, ["way-off", "stub"]);
});

test("rankByDetour: coordless venues sink to the bottom", () => {
  const noPin = { id: "no-pin", name: "No Pin", address: "unknown", hours: week("09:00", "22:00") };
  const order = rankByDetour([noPin, onLine], { clock: clockAt(MON_NOON), origin: ORIGIN, dest: DEST }).map((r) => r.id);
  assert.deepEqual(order, ["on-line", "no-pin"]);
});

test("rankByDetour: favourite is only a tiebreak (no distance boost off-route)", () => {
  // A hearted way-off venue must NOT jump an on-line plain one — a favourite
  // off your route isn't 'on the way'.
  const order = rankByDetour([wayOff, onLine], {
    clock: clockAt(MON_NOON),
    origin: ORIGIN,
    dest: DEST,
    favouriteIds: new Set(["way-off"]),
  }).map((r) => r.id);
  assert.deepEqual(order, ["on-line", "way-off"]);
});

test("rankByDetour: multi-location venue ranks on its best branch", () => {
  const [out] = rankByDetour([twoBranch], { clock: clockAt(MON_NOON), origin: ORIGIN, dest: DEST });
  assert.ok(out.detourKm < 0.01); // branch B (on the line) chosen
  // Card hours come from that branch (B, closed at noon).
  assert.deepEqual(out.hours, week("18:00", "22:00"));
});

test("rankByDetour does not mutate its input", () => {
  const input = [wayOff, onLine];
  const snap = JSON.stringify(input);
  rankByDetour(input, { clock: clockAt(MON_NOON), origin: ORIGIN, dest: DEST });
  assert.equal(JSON.stringify(input), snap);
});

// --- areaCentroids --------------------------------------------------------

test("areaCentroids: mean of each suburb's located venues, sorted by name", () => {
  const data = [
    { id: "a1", area: "Aro", lat: 0, lng: 0 },
    { id: "a2", area: "Aro", lat: 2, lng: 2 },
    { id: "b1", area: "Brooklyn", lat: 10, lng: 10 },
    { id: "recipe", kind: "recipes", area: null },
    { id: "nopin", area: "Nowhere" }, // no coords → skipped
  ];
  const out = areaCentroids(data);
  assert.deepEqual(out.map((a) => a.area), ["Aro", "Brooklyn"]);
  assert.deepEqual(out[0], { area: "Aro", lat: 1, lng: 1, n: 2 });
  assert.equal(out[1].n, 1);
});

// --- routeMapsUrlFor (waypoint reality) -----------------------------------

const venuePlace = { name: "KK", lat: -41.2931, lng: 174.7755 };
const homeDest = { lat: -41.24, lng: 174.79 };

test("routeMapsUrlFor: Google gets a real waypoint (origin→venue→dest)", () => {
  const url = routeMapsUrlFor(venuePlace, homeDest, "android");
  assert.match(url, /destination=-41\.24,174\.79/);
  assert.match(url, /waypoints=-41\.2931,174\.7755/);
  assert.match(url, /travelmode=driving/);
});

test("routeMapsUrlFor: Apple drops the endpoint (no waypoint param) → venue directions", () => {
  const url = routeMapsUrlFor(venuePlace, homeDest, "apple");
  assert.match(url, /maps\.apple\.com/);
  assert.match(url, /daddr=-41\.2931,174\.7755/);
  assert.doesNotMatch(url, /waypoints/);
});

test("routeMapsUrlFor: no destination → plain venue directions on every platform", () => {
  assert.doesNotMatch(routeMapsUrlFor(venuePlace, null, "android"), /waypoints/);
  assert.doesNotMatch(routeMapsUrlFor(venuePlace, null, "apple"), /waypoints/);
});
