// Unit tests for the picker's weighted draw (site/js/picker.js): favourites
// get a small thumb on the scale ("favour the usual") without ever excluding
// the rest. Pure (no DOM) — rnd is injected. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { weightedPick, FAV_WEIGHT } from "../site/js/picker.js";

const items = ["a", "b", "c"];
const isFav = (x) => x === "b"; // b weighs FAV_WEIGHT, a and c weigh 1 each

test("weightedPick: empty list returns undefined", () => {
  assert.equal(weightedPick([], isFav, () => 0), undefined);
});

test("weightedPick: single item always returned regardless of weight", () => {
  assert.equal(weightedPick(["only"], () => true, () => 0.99), "only");
});

test("weightedPick: rnd=0 lands on the first item", () => {
  assert.equal(weightedPick(items, isFav, () => 0), "a");
});

test("weightedPick: favourite occupies its weighted slice of the range", () => {
  // total weight = 1 (a) + FAV_WEIGHT (b) + 1 (c) = 5. Slices: a=[0,1), b=[1,4), c=[4,5).
  const total = 2 + FAV_WEIGHT;
  const pickAt = (frac) => weightedPick(items, isFav, () => frac);
  assert.equal(pickAt(0.5 / total), "a"); // 0.5 → a
  assert.equal(pickAt(1.5 / total), "b"); // 1.5 → inside b's slice
  assert.equal(pickAt(3.9 / total), "b"); // still b near the top of its slice
  assert.equal(pickAt(4.5 / total), "c"); // 4.5 → c
});

test("weightedPick: a non-favourite can still win (not a hard filter)", () => {
  // Draw a value that falls in a's slice even though b is favoured.
  assert.equal(weightedPick(items, isFav, () => 0.01), "a");
});

test("weightedPick: default isFav treats everyone equally", () => {
  const total = items.length;
  assert.equal(weightedPick(items, undefined, () => 0.5 / total), "a");
  assert.equal(weightedPick(items, undefined, () => 1.5 / total), "b");
  assert.equal(weightedPick(items, undefined, () => 2.5 / total), "c");
});

test("weightedPick: rnd at the very top (→ total) falls through to last", () => {
  // Guards the floating-point edge where accumulated subtraction never goes < 0.
  assert.equal(weightedPick(items, isFav, () => 0.999999999), "c");
});
