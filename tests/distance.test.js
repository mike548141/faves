// Unit tests for the distance sort (site/js/distance.js) behind the home
// screen's "Near me" mode. Pure maths — no DOM, no geolocation — so it's
// testable directly. Run: `node --test tests/` (or `npm test`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm, sortByDistance, formatDistance } from "../site/js/distance.js";

// Reference points around Wellington (from the real venue data).
const CBD = { lat: -41.2865, lng: 174.7762 }; // ~Post Office Square
const KK = { name: "KK Malaysian", lat: -41.2931, lng: 174.77551 };
const TAWA = { name: "Sprig + Fern Tawa", lat: -41.17564, lng: 174.82473 };

test("haversineKm: zero distance for identical points", () => {
  assert.equal(haversineKm(KK, KK), 0);
});

test("haversineKm: symmetric and roughly right (CBD→Tawa ~13 km)", () => {
  const there = haversineKm(CBD, TAWA);
  const back = haversineKm(TAWA, CBD);
  assert.ok(Math.abs(there - back) < 1e-9, "distance is symmetric");
  assert.ok(there > 11 && there < 15, `expected ~13 km, got ${there.toFixed(2)}`);
});

test("haversineKm: one degree of latitude ≈ 111 km", () => {
  const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(Math.abs(d - 111.19) < 0.5, `got ${d.toFixed(2)}`);
});

test("sortByDistance: nearest first, and attaches distanceKm", () => {
  const out = sortByDistance([TAWA, KK], CBD);
  assert.deepEqual(out.map((r) => r.name), ["KK Malaysian", "Sprig + Fern Tawa"]);
  assert.equal(typeof out[0].distanceKm, "number");
  assert.ok(out[0].distanceKm < out[1].distanceKm);
});

test("sortByDistance: coordless records sink to the end, keeping their order", () => {
  const recipes = { id: "cook-at-home", name: "Cook at Home" };
  const stub = { id: "stub", name: "Ungeocoded" };
  const out = sortByDistance([recipes, TAWA, stub, KK], CBD);
  assert.deepEqual(out.map((r) => r.name), [
    "KK Malaysian",
    "Sprig + Fern Tawa",
    "Cook at Home", // tail preserves input order (recipes before stub)
    "Ungeocoded",
  ]);
  assert.equal(out[2].distanceKm, undefined, "coordless records gain no distance");
});

test("sortByDistance: does not mutate the input array or its objects", () => {
  const input = [TAWA, KK];
  const snapshot = JSON.stringify(input);
  sortByDistance(input, CBD);
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(KK.distanceKm, undefined);
});

test("formatDistance: metres under 1 km (nearest 50 m, floor 50)", () => {
  assert.equal(formatDistance(0.45), "450 m");
  assert.equal(formatDistance(0.12), "100 m");
  assert.equal(formatDistance(0.01), "50 m"); // never "0 m"
});

test("formatDistance: one decimal under 10 km, whole km beyond", () => {
  assert.equal(formatDistance(1.23), "1.2 km");
  assert.equal(formatDistance(13.6), "14 km");
});

test("formatDistance: empty string for null/NaN", () => {
  assert.equal(formatDistance(null), "");
  assert.equal(formatDistance(NaN), "");
});
