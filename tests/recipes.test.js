// Personal recipes: the record, the store and the virtual collection
// (roadmap 510/050). Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RECIPES_KEY,
  MY_RECIPES,
  MAX_RECIPE_CHARS,
  createRecipes,
  isPersonalId,
  isPersonalVenue,
  personalCollection,
  sanitiseRecipe,
  sanitiseRecipes,
} from "../site/js/recipes.js";
import { findDish, dishId } from "../site/js/dish-id.js";
import { favHref, favKey } from "../site/js/favourites.js";
import { recipeId, parseRecipeId } from "../site/js/checklist.js";
import { readFileSync } from "node:fs";

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _map: m };
}

const R = (over = {}) => ({
  dishId: "u:ginger-crunch",
  name: "Ginger Crunch",
  ingredients: ["125g butter", "1 cup flour"],
  steps: ["Mix.", "Bake."],
  tags: ["v", "contains-gluten"],
  ...over,
});

test("a personal id is `u:` then a slug, and can never be a published dish id", () => {
  assert.equal(isPersonalId("u:ginger-crunch"), true);
  for (const bad of ["ginger-crunch", "u:", "u:Ginger", "u:a b", "u:-x", "u:x-", "cook-at-home", null, 7]) {
    assert.equal(isPersonalId(bad), false, String(bad));
  }
  assert.equal(isPersonalVenue(MY_RECIPES), true);
  assert.equal(isPersonalVenue("cook-at-home"), false);
  // Every published dish id is a slug — no colon — so none is personal.
  const published = JSON.parse(readFileSync(new URL("../site/data/restaurants/cook-at-home.json", import.meta.url)));
  for (const s of published.menu) for (const d of s.items) assert.equal(isPersonalId(dishId(d)), false);
});

test("a record keeps every field, drops a wrong-typed one, and is refused past its size", () => {
  const r = sanitiseRecipe(R({ futureField: { a: 1 }, steps: ["ok", 7, ""], serves: "lots", prepMinutes: -3 }));
  assert.deepEqual(r.futureField, { a: 1 }, "an unknown field is carried, not shed");
  assert.deepEqual(r.steps, ["ok"]);
  assert.equal(r.serves, "lots");
  assert.equal("prepMinutes" in r, false);
  assert.equal(sanitiseRecipe(R({ carried: "x".repeat(MAX_RECIPE_CHARS) })), null, "an over-size record is refused, not clipped");
  assert.equal(sanitiseRecipe(R({ desc: "x".repeat(5000) })).desc.length, 2000);
  assert.equal(sanitiseRecipe(R({ name: "" })), null);
  assert.equal(sanitiseRecipe(R({ dishId: "ginger-crunch" })), null);
});

test("a stored record cannot put code on the page: only http(s) links, only site paths or https images", () => {
  const r = sanitiseRecipe(R({ attributionUrl: "javascript:alert(1)", image: "javascript:alert(1)" }));
  assert.equal("attributionUrl" in r, false);
  assert.equal("image" in r, false);
  const ok = sanitiseRecipe(R({ attributionUrl: "https://example.com/r", image: "images/recipes/ginger.jpg" }));
  assert.equal(ok.attributionUrl, "https://example.com/r");
  assert.equal(ok.image, "images/recipes/ginger.jpg");
  assert.equal(sanitiseRecipe(R({ image: "../../etc" })).image, undefined);
  const proto = sanitiseRecipe(JSON.parse('{"dishId":"u:x","name":"X","__proto__":{"polluted":1}}'));
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(proto, "__proto__"), false);
});

test("a store files each record under its own id, in sorted order", () => {
  const clean = sanitiseRecipes({ wrong: R(), "u:b": R({ dishId: "u:b", name: "B" }), junk: 5 });
  assert.deepEqual(Object.keys(clean), ["u:b", "u:ginger-crunch"]);
});

test("the store puts, removes, reloads and notifies", () => {
  const st = fakeStorage();
  const store = createRecipes(st);
  let n = 0;
  store.subscribe(() => (n += 1));
  assert.equal(store.put({ dishId: "nope", name: "x" }), null);
  store.put(R());
  assert.equal(store.count(), 1);
  assert.deepEqual(Object.keys(JSON.parse(st.getItem(RECIPES_KEY))), ["u:ginger-crunch"]);
  assert.equal(store.remove("u:ginger-crunch"), true);
  assert.equal(store.remove("u:ginger-crunch"), false);
  st.setItem(RECIPES_KEY, JSON.stringify({ "u:x": R({ dishId: "u:x", name: "X" }) }));
  store.reload();
  assert.equal(store.get("u:x").name, "X");
  assert.equal(n, 3);
  // Corrupt storage reads as an empty cookbook, never a throw.
  st.setItem(RECIPES_KEY, "{not json");
  store.reload();
  assert.equal(store.count(), 0);
});

test("the personal collection resolves like a published one, and every link builder already points at it", () => {
  const c = personalCollection({ "u:ginger-crunch": sanitiseRecipe(R({ section: "Baking & sweets" })) });
  assert.equal(c.id, MY_RECIPES);
  assert.equal(findDish(c, "u:ginger-crunch").item.name, "Ginger Crunch");
  assert.equal(c.menu[0].section, "Baking & sweets");
  const heart = { type: "dish", venueId: MY_RECIPES, dishId: "u:ginger-crunch", name: "Ginger Crunch", isRecipe: true };
  assert.equal(favKey(heart), "d:u:mine u:ginger-crunch");
  assert.equal(favHref(heart), "recipe.html?id=u:mine&dish=u:ginger-crunch");
  const rid = recipeId(MY_RECIPES, { dishId: "u:ginger-crunch" });
  assert.deepEqual(parseRecipeId(rid), { venueId: MY_RECIPES, dishId: "u:ginger-crunch" });
  // The URL survives a round trip through the query string.
  const q = new URLSearchParams(favHref(heart).split("?")[1]);
  assert.equal(q.get("id"), MY_RECIPES);
  assert.equal(q.get("dish"), "u:ginger-crunch");
});
