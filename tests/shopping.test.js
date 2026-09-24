// The shopping list's pure half (ROADMAP 17e, ADR 0124).
//
// WHAT IS DELIBERATELY NOT TESTED HERE. Gathering, grouping, totalling, the
// storage lifecycle, the corrupt-payload fallback and the subscriber model are
// `cart.js`'s, already covered by `tests/cart.test.js`, and re-asserting them
// against a second key would test the same code twice while looking like
// coverage of something new. What IS here is the four things this module
// actually decides: what a recipe puts on a list, when the list disagrees with
// the page, which ticks survive an update, and that a deliberate removal stays
// removed.
//
// The one assertion about cart.js is the one that is NEW: that two stores over
// one storage backend cannot see each other. The key became a parameter for
// this feature, and "the shopping list emptied my order" is the failure that
// change could have introduced.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createOrder } from "../site/js/cart.js";
import { parseRecipeId, recipeId } from "../site/js/checklist.js";
import {
  SHOPPING_KEY,
  linesFor,
  putRecipe,
  recipeLines,
  recipeState,
  removeRecipe,
} from "../site/js/shopping.js";

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
};

const RECIPE = {
  name: "Ginger Crunch",
  dishId: "ginger-crunch",
  ingredients: [
    "250g butter",
    "1 cup plain flour",
    "Pinch of salt",
    { component: "Ginger icing", items: ["125g butter", "2 tablespoons golden syrup"] },
  ],
};
const RID = recipeId("cook-at-home", RECIPE);

// --- what a recipe puts on a list ----------------------------------------

test("a line's identity is the RAW key while its text carries the amount", () => {
  const one = recipeLines(RECIPE, "one");
  const two = recipeLines(RECIPE, "double");
  assert.deepEqual(
    one.map((l) => l.key),
    two.map((l) => l.key),
    "the keys must not move with the scale — that is what makes ½× and 2× one line"
  );
  assert.equal(one[0].text, "250g butter");
  assert.equal(two[0].text, "500g butter");
});

test("a grouped line keeps its component on the DISPLAY text, not just the key", () => {
  const lines = recipeLines(RECIPE, "one");
  const icing = lines.find((l) => l.key.startsWith("Ginger icing:"));
  // Both butters are on one list under one heading; without the component the
  // shopper reads "250g butter" and "125g butter" with nothing saying they are
  // for different parts — and a recipe whose two parts want the SAME amount
  // would print the same line twice with no way to tell them apart.
  assert.equal(icing.text, "Ginger icing: 125g butter");
});

test("a line the scaler refuses is listed AS WRITTEN, never silently doubled", () => {
  const salt = recipeLines(RECIPE, "double").find((l) => l.key === "Pinch of salt");
  assert.equal(salt.text, "Pinch of salt");
});

test("a recipe with no ingredients puts nothing on the list", () => {
  assert.deepEqual(recipeLines({ name: "Toast" }, "one"), []);
  assert.deepEqual(recipeLines(undefined, "one"), []);
});

// --- does the list still agree with the page? -----------------------------

test("recipeState: absent, listed, then stale once the amounts disagree", () => {
  const store = createOrder(fakeStorage(), SHOPPING_KEY);
  const at1 = recipeLines(RECIPE, "one");
  assert.equal(recipeState(store.items(), RID, at1), "absent");

  putRecipe(store, { rid: RID, name: RECIPE.name, lines: at1 });
  assert.equal(recipeState(store.items(), RID, at1), "listed");

  // The reader taps 2× on the recipe page. The list has not moved, and saying
  // so is the whole safety claim: they would otherwise shop from 1× amounts
  // while reading 2× ones, in a supermarket with neither screen open.
  assert.equal(recipeState(store.items(), RID, recipeLines(RECIPE, "double")), "stale");
});

test("a line the shopper took off is NOT a disagreement", () => {
  const store = createOrder(fakeStorage(), SHOPPING_KEY);
  const at1 = recipeLines(RECIPE, "one");
  putRecipe(store, { rid: RID, name: RECIPE.name, lines: at1 });
  store.remove(RID, "250g butter"); // "I already have butter"
  // Were absence counted as a mismatch, the page would nag to re-add the very
  // thing the ✕ just removed, for ever, and the ✕ would read as broken.
  assert.equal(recipeState(store.items(), RID, at1), "listed");
  assert.equal(linesFor(store.items(), RID).length, at1.length - 1);
});

// --- updating the amounts -------------------------------------------------

test("updating rewrites the amounts and keeps the group in the recipe's order", () => {
  const store = createOrder(fakeStorage(), SHOPPING_KEY);
  const at1 = recipeLines(RECIPE, "one");
  putRecipe(store, { rid: RID, name: RECIPE.name, lines: at1 });
  const at2 = recipeLines(RECIPE, "double");
  putRecipe(store, { rid: RID, name: RECIPE.name, lines: at2, onlyListed: true });

  assert.deepEqual(
    linesFor(store.items(), RID).map((i) => i.name),
    at2.map((l) => l.text),
    "amounts updated AND still in the order the recipe writes them"
  );
  assert.equal(recipeState(store.items(), RID, at2), "listed");
});

test("a tick survives an update where the amount did NOT move, and dies where it did", () => {
  const store = createOrder(fakeStorage(), SHOPPING_KEY);
  const at1 = recipeLines(RECIPE, "one");
  putRecipe(store, { rid: RID, name: RECIPE.name, lines: at1 });
  store.toggleCollected(RID, "Pinch of salt"); // unscalable — will not move
  store.toggleCollected(RID, "250g butter"); // will become 500g

  putRecipe(store, {
    rid: RID,
    name: RECIPE.name,
    lines: recipeLines(RECIPE, "double"),
    onlyListed: true,
  });
  const by = new Map(linesFor(store.items(), RID).map((i) => [i.dishId, i]));
  assert.equal(by.get("Pinch of salt").collected, true, "still in the trolley — nothing changed");
  // A tick against 250g says nothing about 500g, and a list claiming you have
  // twice what you have is worse than one that asks you to look again.
  assert.equal(by.get("250g butter").collected, false);
  assert.equal(by.get("250g butter").name, "500g butter");
});

test("an update adds nothing that was taken off", () => {
  const store = createOrder(fakeStorage(), SHOPPING_KEY);
  putRecipe(store, { rid: RID, name: RECIPE.name, lines: recipeLines(RECIPE, "one") });
  store.remove(RID, "Pinch of salt");
  putRecipe(store, {
    rid: RID,
    name: RECIPE.name,
    lines: recipeLines(RECIPE, "double"),
    onlyListed: true,
  });
  assert.equal(
    linesFor(store.items(), RID).some((i) => i.dishId === "Pinch of salt"),
    false
  );
});

// --- emptying -------------------------------------------------------------

test("a recipe can be taken off whole, leaving another recipe's lines alone", () => {
  const store = createOrder(fakeStorage(), SHOPPING_KEY);
  const other = { name: "Pikelets", dishId: "pikelets", ingredients: ["1 cup plain flour"] };
  const otherRid = recipeId("cook-at-home", other);
  putRecipe(store, { rid: RID, name: RECIPE.name, lines: recipeLines(RECIPE, "one") });
  putRecipe(store, { rid: otherRid, name: other.name, lines: recipeLines(other, "one") });

  removeRecipe(store, RID);
  assert.equal(linesFor(store.items(), RID).length, 0);
  // The two recipes both want "1 cup plain flour" and they are two lines, never
  // one — combining across recipes would mean unit arithmetic over prose, which
  // is what ADR 0076 refuses to trust even for scaling.
  assert.deepEqual(
    linesFor(store.items(), otherRid).map((i) => i.name),
    ["1 cup plain flour"]
  );
});

test("clear empties the whole list", () => {
  const store = createOrder(fakeStorage(), SHOPPING_KEY);
  putRecipe(store, { rid: RID, name: RECIPE.name, lines: recipeLines(RECIPE, "one") });
  store.clear();
  assert.equal(store.items().length, 0);
  assert.equal(store.count(), 0);
});

// --- the store's own new seam --------------------------------------------

test("two stores over ONE backend never see each other's lines", () => {
  const storage = fakeStorage();
  const order = createOrder(storage); // the tally, on its default key
  const shop = createOrder(storage, SHOPPING_KEY);

  order.add({ venueId: "takeaway", venueName: "Takeaway", name: "Chips", price: 5 });
  putRecipe(shop, { rid: RID, name: RECIPE.name, lines: recipeLines(RECIPE, "one") });

  assert.equal(order.items().length, 1);
  assert.equal(order.items()[0].name, "Chips");
  assert.equal(shop.items().some((i) => i.name === "Chips"), false);

  shop.clear();
  order.reload();
  assert.equal(order.count(), 1, "clearing the shopping list must not empty the order tally");
  assert.equal(storage.getItem("faves.order.v1") !== null, true);
  assert.equal(storage.getItem(SHOPPING_KEY), "[]");
});

// --- the recipe id, both ways --------------------------------------------

test("parseRecipeId inverts recipeId, and refuses anything that is not a pair", () => {
  assert.deepEqual(parseRecipeId(recipeId("cook-at-home", RECIPE)), {
    venueId: "cook-at-home",
    dishId: "ginger-crunch",
  });
  for (const bad of ["", "no-space", " leading", "trailing ", null, undefined, 7]) {
    assert.deepEqual(parseRecipeId(bad), { venueId: null, dishId: null }, `refused: ${bad}`);
  }
});

// --- the tables a NEW STORE has to be walked through ----------------------
//
// ADR 0124 adds a store, not a field, and the list of tables it had to be
// weighed against is in the ADR. These are the two where the answer is "the
// existing machinery already does the right thing" — which is a claim, and a
// claim about a whitelist is exactly the one this repo has been wrong about
// twice (sync code leaked into the backup; the geo-consent flag did too, both
// through this same sweep). So it is asserted here rather than reasoned about.

test("the backup carries the shopping list, and an import puts it back", async () => {
  const { collectPersonalData, applyPersonalData } = await import("../site/js/personal-data.js");
  const storage = fakeStorage();
  // localStorage's enumeration API, which `listStoredKeys` needs and the plain
  // fake above does not have.
  Object.defineProperty(storage, "length", { get: () => storage._map.size });
  storage.key = (i) => [...storage._map.keys()][i] ?? null;

  const shop = createOrder(storage, SHOPPING_KEY);
  putRecipe(shop, { rid: RID, name: RECIPE.name, lines: recipeLines(RECIPE, "one") });

  const data = collectPersonalData(storage, { exportedAt: "2026-09-24T00:00:00Z" });
  // It rides the catch-all sweep rather than a named field — that sweep exists
  // so "everything you put in" stays true without personal-data.js being
  // edited for every new store, and this is a store it was written for.
  assert.ok(data.other && data.other[SHOPPING_KEY], "the shopping list reached the backup");
  assert.equal(JSON.parse(data.other[SHOPPING_KEY]).length, recipeLines(RECIPE, "one").length);
  assert.equal(SHOPPING_KEY in (data.excluded || {}), false, "it is not on the refusal list");

  // A replace import wipes everything under `faves.` and then restores the
  // payload, so this is the harder direction: it proves the list comes BACK
  // rather than merely surviving.
  const fresh = fakeStorage();
  Object.defineProperty(fresh, "length", { get: () => fresh._map.size });
  fresh.key = (i) => [...fresh._map.keys()][i] ?? null;
  const out = applyPersonalData(fresh, data, { mode: "replace" });
  assert.equal(out.ok, true, out.error);
  assert.equal(
    createOrder(fresh, SHOPPING_KEY).items().length,
    recipeLines(RECIPE, "one").length
  );
});

test("sync leaves the shopping list alone, exactly as it leaves the order tally", async () => {
  const { writeSnapshot } = await import("../site/js/sync.js");
  const { SCOPED_BASE_KEYS } = await import("../site/js/profiles.js");
  // The shopping list is DEVICE-level (ADR 0012's reasoning for the tally), so
  // it is not among the per-profile stores sync carries — and sync's own
  // docstring says an unknown store is left exactly as it is.
  assert.equal(SCOPED_BASE_KEYS.includes(SHOPPING_KEY), false);

  const storage = fakeStorage();
  const shop = createOrder(storage, SHOPPING_KEY);
  putRecipe(shop, { rid: RID, name: RECIPE.name, lines: recipeLines(RECIPE, "one") });
  const before = storage.getItem(SHOPPING_KEY);

  writeSnapshot(storage, {
    profiles: [{ id: "default", name: "Me", favourites: [], ratings: {}, settings: {} }],
  });
  assert.equal(storage.getItem(SHOPPING_KEY), before, "a pull must not touch it");
});

test("deleting a profile does not take the household's shopping list with it", async () => {
  const { createProfiles } = await import("../site/js/profiles.js");
  const storage = fakeStorage();
  const reg = createProfiles(storage);
  const id = reg.create("Ruth");
  const shop = createOrder(storage, SHOPPING_KEY);
  putRecipe(shop, { rid: RID, name: RECIPE.name, lines: recipeLines(RECIPE, "one") });

  assert.equal(reg.remove(id), true);
  // The purge walks the leaving profile's NAMESPACED keys. A device-level store
  // has none, which is the whole reason "where it lives" was a decision: one
  // person leaving must not empty the list the household shops from.
  assert.equal(createOrder(storage, SHOPPING_KEY).items().length > 0, true);
});
