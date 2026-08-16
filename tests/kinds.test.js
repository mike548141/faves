// kinds.js — what a `kind` of record can do, declared instead of asked.
//
// What these guard is a refactor's characteristic failure: a table that is
// *shaped* right but answers one question differently from the conditional it
// replaced. Every capability below was read off a live call site, so a wrong
// value here is a silently changed screen — a price on a recipe, a missing
// report button on a venue — with nothing throwing.
//
// The other half is the table's integrity: an absent `kind` (54 of our 55
// records) and an unknown one must both resolve, because the alternative is a
// blank page for a typo in the data.

import test from "node:test";
import assert from "node:assert/strict";
import {
  RECIPES,
  VENUE,
  isRecipeKind,
  kindId,
  kindIds,
  kindOf,
  labelsOf,
} from "../site/js/kinds.js";

const venue = { id: "kk", name: "KK Malaysian" }; // no `kind` — the common case
const explicitVenue = { id: "kk", kind: VENUE };
const recipes = { id: "cook-at-home", kind: RECIPES };

// ————————————————————— Resolving a kind —————————————————————

test("a record with no kind is a venue — 54 of 55 records omit the field", () => {
  assert.equal(kindId(venue), VENUE);
  assert.equal(kindOf(venue).id, VENUE);
});

test("an unknown kind falls back to venue rather than throwing", () => {
  // A typo in the data should cost a venue rendered as a venue, never a blank
  // screen — the whole page renders through this lookup.
  assert.equal(kindId({ kind: "restraunt" }), VENUE);
  assert.equal(kindId({ kind: 42 }), VENUE);
  assert.equal(kindId(null), VENUE);
  assert.equal(kindId(undefined), VENUE);
  assert.equal(kindOf(null).id, VENUE);
});

test("kindOf accepts a search-index entry, not just a record", () => {
  // search.js copies `kind` onto each place entry so the results list can ask
  // the same questions the home cards do; app.js reads the icon off it.
  assert.equal(kindOf({ id: "cook-at-home", name: "Cook at Home", kind: RECIPES }).id, RECIPES);
  assert.equal(kindOf({ id: "kk", name: "KK Malaysian", kind: undefined }).id, VENUE);
});

test("kindIds lists the table, and every id resolves to itself", () => {
  const ids = kindIds();
  assert.deepEqual(ids, [VENUE, RECIPES]);
  for (const id of ids) assert.equal(kindOf({ kind: id }).id, id);
});

// ————————————————————— The capabilities —————————————————————

test("a venue has everything the venue-shaped screens assume", () => {
  const k = kindOf(venue);
  assert.equal(k.hasLocation, true);
  assert.equal(k.hasHours, true);
  assert.equal(k.hasPrices, true);
  assert.equal(k.canOrder, true);
  assert.equal(k.canReport, true);
  assert.equal(k.hasFreshness, true);
  assert.equal(k.inFacets, true);
  assert.equal(k.hasContactCard, true);
  assert.equal(k.pinnedFirst, false);
  assert.equal(k.itemsHaveRecipeFields, false);
  assert.equal(k.itemPage, null);
});

test("a recipe collection relaxes exactly the venue-only fields ADR 0003 named", () => {
  const k = kindOf(recipes);
  assert.equal(k.hasLocation, false);
  assert.equal(k.hasHours, false);
  assert.equal(k.hasPrices, false);
  assert.equal(k.canOrder, false);
  assert.equal(k.canReport, false);
  assert.equal(k.hasFreshness, false);
  assert.equal(k.inFacets, false);
  assert.equal(k.hasContactCard, false);
  assert.equal(k.itemsHaveRecipeFields, true);
  assert.equal(k.itemPage, "recipe.html");
});

test("staying in is always an option, so only the recipes collection is pinned", () => {
  // The one capability that is an editorial call rather than a fact about the
  // data — recorded as such so a reader doesn't hunt for the field it derives
  // from. Ranking reads it as the FIRST sort key in every home mode.
  assert.equal(kindOf(recipes).pinnedFirst, true);
  assert.equal(kindOf(venue).pinnedFirst, false);
});

test("prices and ordering are two capabilities, not one", () => {
  // Owner ruling 2026-08-16: a recipe may one day carry the cost to make it.
  // The day it does, `hasPrices` flips and `canOrder` must not — which is only
  // expressible because they were never folded together.
  const k = kindOf(recipes);
  assert.equal(k.hasPrices, false);
  assert.equal(k.canOrder, false);
  assert.notEqual(Object.hasOwn(k, "hasPrices") && Object.hasOwn(k, "canOrder"), false);
});

test("every kind answers every capability — no undefined, which reads as false", () => {
  // A missing key and a `false` are indistinguishable at a call site written
  // `if (kindOf(r).hasHours)`, so a capability added to one kind and forgotten
  // on the other would silently take the other's screen away.
  const keys = Object.keys(kindOf(venue));
  for (const id of kindIds()) {
    const k = kindOf({ kind: id });
    assert.deepEqual(Object.keys(k).sort(), keys.slice().sort(), `kind ${id} has a different shape`);
    for (const key of keys) assert.notEqual(k[key], undefined, `${id}.${key} is undefined`);
  }
});

// ————————————————————— The words —————————————————————

test("each kind supplies its own icon, and they differ", () => {
  assert.equal(labelsOf(recipes).icon, "🏠");
  assert.equal(labelsOf(venue).icon, "🍽️");
});

test("a venue has no chip, tagline or noun of its own — its data says those", () => {
  const l = labelsOf(explicitVenue);
  assert.equal(l.chip, null);
  assert.equal(l.tagline, null);
  assert.equal(l.itemNoun, null);
  assert.equal(l.browseLabel, null);
  assert.equal(l.cardModifier, null);
  assert.equal(l.itemModifier, null);
  // An empty venue menu reads differently when we hold a phone number, so the
  // note stays menu.js's choice rather than being flattened into one string.
  assert.equal(l.emptyMenuNote, null);
});

test("the recipes collection carries the exact strings the screens used to inline", () => {
  const l = labelsOf(recipes);
  assert.equal(l.chip.text, "🏠 Recipes");
  assert.equal(l.chip.className, "chip-recipes");
  assert.equal(l.cardModifier, "card-recipes");
  assert.equal(l.itemModifier, "recipe");
  assert.equal(l.itemNoun, "recipe");
  assert.equal(l.browseLabel, "Cook at home");
  assert.equal(l.tagline, "Recipes for the nights you'd rather stay in");
  assert.equal(l.stubChip, "Recipes coming soon");
  assert.deepEqual(l.emptyMenuNote, { key: "recipe.stub", text: "Recipes coming soon." });
});

test("both kinds keep a search placeholder with its i18n key", () => {
  // The key travels with the text because reo.js swaps whole strings; a
  // placeholder that arrived without its key would render English forever.
  assert.deepEqual(labelsOf(recipes).searchPlaceholder, {
    text: "Search recipes…",
    key: "menu.search.recipes.ph",
  });
  assert.deepEqual(labelsOf(venue).searchPlaceholder, {
    text: "Search this menu…",
    key: "menu.search.ph",
  });
});

test("every kind's stub chip says what is coming, in its own noun", () => {
  assert.equal(labelsOf(venue).stubChip, "Menu coming soon");
  assert.equal(labelsOf(recipes).stubChip, "Recipes coming soon");
});

// ————————————————————— Identity, kept to one door —————————————————————

test("isRecipeKind answers the one question that is genuinely identity", () => {
  // It exists because the answer is PERSISTED — in stored favourites, in
  // stored ratings, and inside share URLs already in people's messages — and
  // is read back for rows whose record may not be loaded.
  assert.equal(isRecipeKind(recipes), true);
  assert.equal(isRecipeKind(venue), false);
  assert.equal(isRecipeKind(explicitVenue), false);
  assert.equal(isRecipeKind(null), false);
  assert.equal(isRecipeKind({ kind: "restraunt" }), false);
});

test("the capability table is not mutable through the accessors by accident", () => {
  // Two screens render from the same object in one pass; a call site that
  // wrote to it would change the other's answer with nothing to show for it.
  const a = kindOf(recipes);
  const b = kindOf({ kind: RECIPES });
  assert.equal(a, b, "kindOf returns the shared row, so it must never be written to");
});
