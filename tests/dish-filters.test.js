// Unit tests for the menu page's dish filters (site/js/dish-filters.js) — the
// single definition of "does this dish survive the reader's filters?", shared
// by the initial render, the live re-apply and the search suggestions.
//
// The tests that matter most here are the NEGATIVE ones. This module took a
// filter from "dims a row" to "removes a row", and the safety line it must not
// cross is that an allergen never removes anything (ADR 0025, ROADMAP 22d).
// A regression in that direction is silent — the menu just looks tidier.
//
// Run: `node --test tests/`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FAVOURITES,
  availableDishFilters,
  matchesDishFilters,
  summarise,
} from "../site/js/dish-filters.js";

const tags = (...t) => new Set(t);

// --- availableDishFilters -------------------------------------------
test("availableDishFilters: a diet chip appears only when the menu can satisfy it", () => {
  const out = availableDishFilters(tags("v", "contains-gluten"), 0);
  assert.deepEqual(out.map((f) => f.key), ["v"]);
});

test("availableDishFilters: option tags count — a venue that WILL make it vegan offers the chip", () => {
  const out = availableDishFilters(tags("vg-option"), 0);
  assert.deepEqual(out.map((f) => f.key), ["vg"]);
});

test("availableDishFilters: favourites appears only when this reader hearted a dish HERE", () => {
  assert.equal(availableDishFilters(tags(), 0).length, 0);
  const out = availableDishFilters(tags(), 3);
  assert.deepEqual(out.map((f) => f.key), [FAVOURITES]);
});

test("availableDishFilters: favourites leads, then DIET_FILTERS order — the row never reshuffles", () => {
  const out = availableDishFilters(tags("v", "vg", "gf", "df"), 1);
  assert.deepEqual(out.map((f) => f.key), [FAVOURITES, "v", "vg", "gf", "df"]);
});

test("availableDishFilters: an allergen tag never produces a filter", () => {
  // The load-bearing one. Every contains-* tag in the vocabulary, and not one
  // of them may become a control that removes rows.
  const allergens = tags(
    "contains-nuts", "contains-peanuts", "contains-shellfish", "contains-fish",
    "contains-egg", "contains-dairy", "contains-gluten", "contains-soy",
    "contains-sesame"
  );
  assert.deepEqual(availableDishFilters(allergens, 0), []);
});

// --- matchesDishFilters ---------------------------------------------
test("matchesDishFilters: no active filters ⇒ everything matches", () => {
  assert.equal(matchesDishFilters({ dishId: "x", tags: [] }, new Set()), true);
  assert.equal(matchesDishFilters({ dishId: "x", tags: [] }, null), true);
});

test("matchesDishFilters: favourites resolves by dish id, never by name", () => {
  const ctx = { favouriteIds: new Set(["cheeseburger-gold-card"]) };
  const active = new Set([FAVOURITES]);
  assert.equal(matchesDishFilters({ dishId: "cheeseburger-gold-card" }, active, ctx), true);
  // Same printed name, different row — the ADR 0051 collision.
  assert.equal(matchesDishFilters({ dishId: "cheeseburger" }, active, ctx), false);
});

test("matchesDishFilters: filters AND together — each chip narrows, never widens", () => {
  const ctx = { favouriteIds: new Set(["a", "b"]) };
  const active = new Set([FAVOURITES, "v"]);
  assert.equal(matchesDishFilters({ dishId: "a", tags: ["v"] }, active, ctx), true);
  assert.equal(matchesDishFilters({ dishId: "a", tags: [] }, active, ctx), false, "hearted but not vegetarian");
  assert.equal(matchesDishFilters({ dishId: "z", tags: ["v"] }, active, ctx), false, "vegetarian but not hearted");
});

test("matchesDishFilters: a vegan dish satisfies the vegetarian filter", () => {
  // The entailment dietary.js owns; asserted here so this module can never
  // grow a second, drifting copy of it.
  assert.equal(matchesDishFilters({ dishId: "a", tags: ["vg"] }, new Set(["v"]), {}), true);
});

test("matchesDishFilters: an allergen tag NEVER removes a dish", () => {
  // 🛑 The safety assertion. There is no allergen filter key, so the only way
  // this could break is somebody adding one — and then this fails.
  const dish = { dishId: "satay", tags: ["contains-peanuts", "v"] };
  assert.equal(matchesDishFilters(dish, new Set(["v"]), {}), true);
  assert.equal(matchesDishFilters(dish, new Set(["contains-peanuts"]), {}), false,
    "an unknown key must not silently pass — it narrows to nothing rather than being ignored");
});

test("matchesDishFilters: missing tags/ctx never throw", () => {
  assert.equal(matchesDishFilters({}, new Set([FAVOURITES]), {}), false);
  assert.equal(matchesDishFilters(null, new Set(["v"]), {}), false);
});

// --- summarise ------------------------------------------------------
test("summarise: states both numbers, so 'did the menu shrink?' is answered unasked", () => {
  const s = summarise(12, 47);
  assert.equal(s.text, "Showing 12 of 47 dishes");
  assert.equal(s.hidden, 35);
  assert.equal(s.filtering, true);
});

test("summarise: nothing withheld ⇒ still a true summary, but filtering is false", () => {
  const s = summarise(47, 47);
  assert.equal(s.filtering, false);
  assert.equal(s.hidden, 0);
});

test("summarise: never reports negative hidden", () => {
  assert.equal(summarise(5, 3).hidden, 0);
});
