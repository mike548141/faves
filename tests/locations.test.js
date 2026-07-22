// Unit tests for multi-location venue resolution (site/js/locations.js): the
// canonical branch list, nearest-branch selection, and the per-branch hours /
// distance / display ordering that the ranking and menu screens build on. Pure
// (no DOM, no geolocation), driven with fixed coordinates. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  branchesOf,
  branchCoords,
  nearestBranch,
  venueDistanceKm,
  venueHours,
  orderedBranches,
  isMultiLocation,
  branchAsPlace,
} from "../site/js/locations.js";

const week = (o, c) =>
  Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, [[o, c]]]));

const CBD = { lat: -41.2865, lng: 174.7762 };

// A two-branch venue: one in the CBD (open late), one out in the Hutt (closes
// earlier). Shared name/menu; per-branch address/coords/phone/hours.
const chain = {
  id: "chain",
  name: "Two Scoops",
  locations: [
    { label: "Courtenay Place", address: "29 Courtenay Pl", lat: -41.2939, lng: 174.7821, phone: "+64 4 111 1111", hours: week("08:00", "22:00") },
    { label: "Lower Hutt", address: "1 High St, Lower Hutt", lat: -41.21, lng: 174.905, phone: "+64 4 222 2222", hours: week("09:00", "17:00") },
  ],
};

const single = {
  id: "single",
  name: "One Spot",
  address: "10 Ghuznee St",
  lat: -41.2931,
  lng: 174.7755,
  phone: "+64 4 333 3333",
  hours: week("11:00", "21:00"),
};

test("branchesOf: a single-location record synthesises one branch from top-level", () => {
  const [b] = branchesOf(single);
  assert.equal(branchesOf(single).length, 1);
  assert.equal(b.address, "10 Ghuznee St");
  assert.equal(b.lat, -41.2931);
  assert.equal(b.phone, "+64 4 333 3333");
  assert.deepEqual(b.hours, single.hours);
  assert.equal(b.label, null);
});

test("branchesOf: a multi-location record returns its own branches", () => {
  assert.equal(branchesOf(chain).length, 2);
  assert.equal(branchesOf(chain)[0].label, "Courtenay Place");
});

test("branchesOf: a coordless single record yields a branch with null coords", () => {
  const [b] = branchesOf({ id: "x", name: "X", address: "Somewhere" });
  assert.equal(b.lat, null);
  assert.equal(b.lng, null);
  assert.equal(branchCoords(b), null);
});

test("branchCoords: numbers → point; missing/partial → null", () => {
  assert.deepEqual(branchCoords({ lat: -41, lng: 174 }), { lat: -41, lng: 174 });
  assert.equal(branchCoords({ lat: -41 }), null);
  assert.equal(branchCoords({}), null);
  assert.equal(branchCoords(null), null);
});

test("nearestBranch: with no origin, the first branch is the default (distance Infinity)", () => {
  const nb = nearestBranch(chain);
  assert.equal(nb.index, 0);
  assert.equal(nb.branch.label, "Courtenay Place");
  assert.equal(nb.distanceKm, Infinity);
});

test("nearestBranch: with an origin, the geographically nearest branch wins", () => {
  const nb = nearestBranch(chain, CBD); // CBD is next to Courtenay Place
  assert.equal(nb.index, 0);
  assert.equal(nb.branch.label, "Courtenay Place");
  assert.ok(nb.distanceKm < 2);
});

test("nearestBranch: an origin out in the Hutt selects the Hutt branch", () => {
  const nb = nearestBranch(chain, { lat: -41.21, lng: 174.90 });
  assert.equal(nb.branch.label, "Lower Hutt");
});

test("nearestBranch: a coordless branch never beats a located one", () => {
  const mixed = {
    name: "Mixed",
    locations: [
      { label: "No pin", address: "A" },
      { label: "Pinned", address: "B", lat: -41.29, lng: 174.78 },
    ],
  };
  const nb = nearestBranch(mixed, CBD);
  assert.equal(nb.branch.label, "Pinned");
});

test("venueDistanceKm: nearest-branch distance, or Infinity without an origin", () => {
  assert.equal(venueDistanceKm(chain), Infinity);
  assert.ok(venueDistanceKm(chain, CBD) < 2);
});

test("venueHours: the nearest branch's hours when located, primary otherwise", () => {
  // No origin → primary (Courtenay Place, closes 22:00).
  assert.deepEqual(venueHours(chain), week("08:00", "22:00"));
  // Origin in the Hutt → the Hutt branch (closes 17:00) drives the status.
  assert.deepEqual(venueHours(chain, { lat: -41.21, lng: 174.90 }), week("09:00", "17:00"));
  // Single-location → its own hours regardless.
  assert.deepEqual(venueHours(single, CBD), single.hours);
});

test("orderedBranches: nearest first with distances when located", () => {
  const out = orderedBranches(chain, CBD);
  assert.deepEqual(out.map((b) => b.label), ["Courtenay Place", "Lower Hutt"]);
  assert.ok(out[0].distanceKm < out[1].distanceKm);
});

test("orderedBranches: data order (distances Infinity) without an origin", () => {
  const out = orderedBranches(chain);
  assert.deepEqual(out.map((b) => b.label), ["Courtenay Place", "Lower Hutt"]);
  assert.equal(out[0].distanceKm, Infinity);
});

test("orderedBranches: coordless branches sort after located ones, keeping order", () => {
  const v = {
    name: "V",
    locations: [
      { label: "no-pin", address: "A" },
      { label: "far", address: "B", lat: -41.21, lng: 174.90 },
      { label: "near", address: "C", lat: -41.2939, lng: 174.7821 },
    ],
  };
  const out = orderedBranches(v, CBD);
  assert.deepEqual(out.map((b) => b.label), ["near", "far", "no-pin"]);
});

test("orderedBranches does not mutate the record's branches", () => {
  const snap = JSON.stringify(chain);
  orderedBranches(chain, CBD);
  assert.equal(JSON.stringify(chain), snap);
});

test("isMultiLocation: true only for 2+ branches", () => {
  assert.equal(isMultiLocation(chain), true);
  assert.equal(isMultiLocation(single), false);
  assert.equal(isMultiLocation({ name: "one", locations: [{ address: "A" }] }), false);
});

test("branchAsPlace: carries the venue name onto the branch for the maps handoff", () => {
  const place = branchAsPlace(chain, chain.locations[1]);
  assert.deepEqual(place, { name: "Two Scoops", address: "1 High St, Lower Hutt", lat: -41.21, lng: 174.905 });
});
