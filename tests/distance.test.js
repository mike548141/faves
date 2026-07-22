// Unit tests for the distance maths (site/js/distance.js) — the haversine
// and formatter behind the home screen's distance ranking. Pure maths — no
// DOM, no geolocation — so it's testable directly. Ordering/sinking logic
// now lives in ranking.js (tests/ranking.test.js). Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm, formatDistance, estimateDriveMinutes, formatDriveTime } from "../site/js/distance.js";

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

test("estimateDriveMinutes: rough straight-line estimate (winding × urban speed)", () => {
  // 1.2 km × 1.3 / 30 km/h × 60 ≈ 3.1 → 3 min.
  assert.equal(estimateDriveMinutes(1.2), 3);
  // 13 km cross-town → 34 min in the ballpark.
  assert.ok(estimateDriveMinutes(13) >= 30 && estimateDriveMinutes(13) <= 40);
});

test("estimateDriveMinutes: floor of 1 min, never zero for a real distance", () => {
  assert.equal(estimateDriveMinutes(0), 1);
  assert.equal(estimateDriveMinutes(0.05), 1);
});

test("estimateDriveMinutes: null for null/NaN/negative", () => {
  assert.equal(estimateDriveMinutes(null), null);
  assert.equal(estimateDriveMinutes(NaN), null);
  assert.equal(estimateDriveMinutes(-1), null);
});

test("formatDriveTime: '~N min drive', empty for no distance", () => {
  assert.equal(formatDriveTime(1.2), "~3 min drive");
  assert.equal(formatDriveTime(null), "");
});
