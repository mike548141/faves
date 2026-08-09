// Unit tests for the distance maths (site/js/distance.js) — the haversine and
// the travel-time hints behind the home screen's distance ranking. Pure maths
// — no DOM, no geolocation — so it's testable directly. Ordering/sinking logic
// lives in ranking.js (tests/ranking.test.js); the human-readable formatter
// moved to units.js when metric/imperial arrived (tests/units.test.js).
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  haversineKm,
  estimateDriveMinutes,
  formatDriveTime,
  estimateWalkMinutes,
  travelHint,
} from "../site/js/distance.js";

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

test("estimateWalkMinutes: straight-line at 5 km/h, rounded to whole minutes", () => {
  // 1 km / 5 km/h × 60 = 12 min exactly.
  assert.equal(estimateWalkMinutes(1), 12);
  // 0.4 km → 4.8 → 5 min (rounds up); 0.42 km → 5.04 → 5 min (rounds down).
  assert.equal(estimateWalkMinutes(0.4), 5);
  assert.equal(estimateWalkMinutes(0.42), 5);
});

test("estimateWalkMinutes: floor of 1 min for a tiny distance, null for bad input", () => {
  assert.equal(estimateWalkMinutes(0), 1); // "100m walk away" never reads as 0 min
  assert.equal(estimateWalkMinutes(0.01), 1);
  assert.equal(estimateWalkMinutes(null), null);
  assert.equal(estimateWalkMinutes(NaN), null);
  assert.equal(estimateWalkMinutes(-1), null);
});

test("travelHint: walks when under the 2 km crossover, drives at/above it", () => {
  // Just below the crossover → walk.
  assert.equal(travelHint(1.99).mode, "walk");
  // Exactly at the crossover → drive (boundary is inclusive of drive).
  assert.equal(travelHint(2).mode, "drive");
  // Just above → drive.
  assert.equal(travelHint(2.01).mode, "drive");
});

test("travelHint: text and minutes match the picked mode", () => {
  const walk = travelHint(0.5); // 0.5 km ≈ 6 min walk
  assert.deepEqual(walk, { mode: "walk", minutes: 6, text: "~6 min walk" });
  const drive = travelHint(2); // 2 km × 1.3 / 30 × 60 = 5.2 → 5 min drive
  assert.equal(drive.mode, "drive");
  assert.equal(drive.text, `~${drive.minutes} min drive`);
});

test("travelHint: tiny distance still walks with a 1-min floor", () => {
  assert.deepEqual(travelHint(0), { mode: "walk", minutes: 1, text: "~1 min walk" });
});

test("travelHint: null for null/NaN/negative distance (no bogus hint)", () => {
  assert.equal(travelHint(null), null);
  assert.equal(travelHint(NaN), null);
  assert.equal(travelHint(-1), null);
});
