// Unit tests for the pure dish/diet safety predicates (site/js/dietary.js) —
// the single source of truth for "is this dish flagged for an allergen the
// viewer avoids?" and "does it satisfy the active dietary filters?". menu.js
// uses these at both the initial render AND the live re-apply (on a Settings
// change / profile switch), so covering them here guards the two paths against
// divergence — a stale or missing allergen highlight would be a safety bug.
//
// Run: `node --test tests/` (or `npm test`). Discovery: any *.test.js under the
// tree is picked up.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dishFlagged, dishSatisfiesDiet, DIET_FILTERS } from "../site/js/dietary.js";

// --- dishFlagged ----------------------------------------------------
test("dishFlagged: no flagged allergens ⇒ never flagged", () => {
  assert.equal(dishFlagged(["contains-nuts"], new Set()), false);
  assert.equal(dishFlagged(["contains-nuts"], null), false);
  assert.equal(dishFlagged(["contains-nuts"], undefined), false);
});

test("dishFlagged: true only when a tag matches an avoided allergen", () => {
  const avoid = new Set(["contains-peanuts", "contains-shellfish"]);
  assert.equal(dishFlagged(["contains-peanuts"], avoid), true);
  assert.equal(dishFlagged(["v", "gf", "contains-shellfish"], avoid), true);
  assert.equal(dishFlagged(["contains-nuts", "v"], avoid), false); // nuts ≠ peanuts
});

test("dishFlagged: missing/empty tags never flag (no tag = not stated)", () => {
  const avoid = new Set(["contains-nuts"]);
  assert.equal(dishFlagged([], avoid), false);
  assert.equal(dishFlagged(null, avoid), false);
  assert.equal(dishFlagged(undefined, avoid), false);
});

// --- dishSatisfiesDiet ----------------------------------------------
test("dishSatisfiesDiet: no active filters ⇒ every dish qualifies", () => {
  assert.equal(dishSatisfiesDiet([], new Set()), true);
  assert.equal(dishSatisfiesDiet(["contains-nuts"], new Set()), true);
  assert.equal(dishSatisfiesDiet([], null), true);
});

test("dishSatisfiesDiet: vegetarian is satisfied by v, vg, or v-option", () => {
  const veg = new Set(["v"]);
  assert.equal(dishSatisfiesDiet(["v"], veg), true);
  assert.equal(dishSatisfiesDiet(["vg"], veg), true);
  assert.equal(dishSatisfiesDiet(["v-option"], veg), true);
  assert.equal(dishSatisfiesDiet(["gf"], veg), false);
});

test("dishSatisfiesDiet: vegan needs vg (not plain v)", () => {
  const vegan = new Set(["vg"]);
  assert.equal(dishSatisfiesDiet(["vg"], vegan), true);
  assert.equal(dishSatisfiesDiet(["v"], vegan), false);
  assert.equal(dishSatisfiesDiet(["v-option"], vegan), false);
});

test("dishSatisfiesDiet: gluten free is satisfied by gf or gf-option", () => {
  const gf = new Set(["gf"]);
  assert.equal(dishSatisfiesDiet(["gf"], gf), true);
  assert.equal(dishSatisfiesDiet(["gf-option"], gf), true);
  assert.equal(dishSatisfiesDiet(["df"], gf), false);
});

test("dishSatisfiesDiet: multiple active filters are AND-ed", () => {
  const vgGf = new Set(["vg", "gf"]);
  assert.equal(dishSatisfiesDiet(["vg", "gf"], vgGf), true);
  assert.equal(dishSatisfiesDiet(["vg"], vgGf), false); // missing gf
  assert.equal(dishSatisfiesDiet(["gf"], vgGf), false); // missing vg
});

test("dishSatisfiesDiet: an unknown filter key can never be satisfied", () => {
  assert.equal(dishSatisfiesDiet(["v", "gf"], new Set(["bogus"])), false);
});

test("DIET_FILTERS exposes the four expected keys", () => {
  assert.deepEqual(DIET_FILTERS.map((f) => f.key), ["v", "vg", "gf", "df"]);
});
