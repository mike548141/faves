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

test("dishSatisfiesDiet: dairy free is satisfied by df or df-option", () => {
  const df = new Set(["df"]);
  assert.equal(dishSatisfiesDiet(["df"], df), true);
  assert.equal(dishSatisfiesDiet(["df-option"], df), true);
  // Charley Noble's flat white: dairy today, oat milk on request. It must reach
  // a reader filtering for dairy free — the case the tag was added for.
  assert.equal(dishSatisfiesDiet(["contains-dairy", "df-option"], df), true);
  assert.equal(dishSatisfiesDiet(["gf-option"], df), false);
  assert.equal(dishSatisfiesDiet(["contains-dairy"], df), false);
});

test("dishSatisfiesDiet: vegan is satisfied by vg or vg-option", () => {
  const vegan = new Set(["vg"]);
  assert.equal(dishSatisfiesDiet(["vg-option"], vegan), true);
  // 1841's nachos: `v` and "Vegan on request", so the vegan filter keeps it.
  assert.equal(dishSatisfiesDiet(["v", "gf", "contains-dairy", "vg-option"], vegan), true);
  assert.equal(dishSatisfiesDiet(["v"], vegan), false);
});

// The decision recorded in dietary.js's comment, pinned as behaviour: plain
// `vg` satisfies the vegetarian filter (a vegan dish IS vegetarian) but
// `vg-option` deliberately does NOT, so that no tag but `vg` is claimed by two
// filter keys. If someone later reopens that call, this test is what tells
// them they are changing a decision rather than fixing an omission.
test("dishSatisfiesDiet: vg-option satisfies vegan only, NOT vegetarian", () => {
  assert.equal(dishSatisfiesDiet(["vg-option"], new Set(["vg"])), true);
  assert.equal(dishSatisfiesDiet(["vg-option"], new Set(["v"])), false);
  // …while plain `vg` still satisfies both, which is the asymmetry on purpose.
  assert.equal(dishSatisfiesDiet(["vg"], new Set(["v"])), true);
});

// The gap this whole change existed to close: two of the four dietary claims
// could say "available on request" and two could not, and nothing anywhere
// asserted that they should match. A structural test rather than four literal
// ones, because the literal kind is exactly what was already passing while
// `df-option` and `vg-option` did not exist.
test("DIET_FILTERS: every dietary claim has an `-option` form", () => {
  for (const f of DIET_FILTERS) {
    assert.ok(
      f.satisfies.includes(`${f.key}-option`),
      `${f.key} has no ${f.key}-option in its satisfies list`,
    );
  }
});

// addons.js `composeTags` maps a claim tag back to a filter key with
// `DIET_KEYS.find(...)`, which silently takes the FIRST key whose list holds
// the tag — so a tag in two lists is checked against the wrong CONTRADICTS row.
// `vg` is the one tag that is already in two lists (see dietary.js's comment).
// This pins that it stays the ONLY one: the next tag added to two lists breaks
// this test instead of quietly acquiring the wrong contradiction set.
test("DIET_FILTERS: no tag but `vg` is claimed by two filter keys", () => {
  const owners = new Map();
  for (const f of DIET_FILTERS) {
    for (const tag of f.satisfies) {
      owners.set(tag, [...(owners.get(tag) || []), f.key]);
    }
  }
  const shared = [...owners].filter(([, keys]) => keys.length > 1).map(([tag]) => tag);
  assert.deepEqual(shared, ["vg"]);
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
