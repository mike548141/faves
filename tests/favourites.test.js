// Unit tests for the favourites model (site/js/favourites.js). Storage is
// faked so no browser is needed. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFavourites,
  favKey,
  favHref,
} from "../site/js/favourites.js";

function fakeStorage(initial = null) {
  const m = new Map();
  if (initial != null) m.set("faves.favourites.v1", initial);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

const venue = { type: "venue", venueId: "kk-malaysian", venueName: "KK Malaysian" };
const dish = { type: "dish", venueId: "kk-malaysian", venueName: "KK Malaysian", name: "Mee Goreng" };
const recipe = { type: "dish", venueId: "cook-at-home", venueName: "Cook at Home", name: "Shane's Ribs", isRecipe: true };

test("favKey: venue vs dish identity", () => {
  assert.equal(favKey(venue), "v:kk-malaysian");
  assert.equal(favKey(dish), "d:kk-malaysian Mee Goreng");
});

test("favHref: venue, restaurant dish, and recipe dish", () => {
  assert.equal(favHref(venue), "restaurant.html?id=kk-malaysian");
  assert.equal(favHref(dish), "restaurant.html?id=kk-malaysian#dish-mee-goreng");
  assert.equal(favHref(recipe), "recipe.html?id=cook-at-home&dish=shane-s-ribs");
});

test("toggle adds then removes; has() tracks it", () => {
  const f = createFavourites(fakeStorage());
  assert.equal(f.has(dish), false);
  assert.equal(f.toggle(dish), true); // now on
  assert.equal(f.has(dish), true);
  assert.equal(f.count(), 1);
  assert.equal(f.toggle(dish), false); // now off
  assert.equal(f.has(dish), false);
  assert.equal(f.count(), 0);
});

test("venues() and dishes() partition the list", () => {
  const f = createFavourites(fakeStorage());
  f.toggle(venue);
  f.toggle(dish);
  f.toggle(recipe);
  assert.deepEqual(f.venues().map((v) => v.venueId), ["kk-malaysian"]);
  assert.deepEqual(f.dishes().map((d) => d.name), ["Mee Goreng", "Shane's Ribs"]);
});

test("removeKey drops a specific favourite", () => {
  const f = createFavourites(fakeStorage());
  f.toggle(venue);
  f.toggle(dish);
  f.removeKey(favKey(venue));
  assert.equal(f.count(), 1);
  assert.equal(f.has(dish), true);
});

test("a dish and its venue are independent favourites", () => {
  const f = createFavourites(fakeStorage());
  f.toggle(venue);
  f.toggle(dish);
  assert.equal(f.count(), 2); // same venueId, different type → distinct
});

test("persistence: re-hydrates in a fresh store over the same storage", () => {
  const storage = fakeStorage();
  const a = createFavourites(storage);
  a.toggle(dish);
  const b = createFavourites(storage);
  assert.equal(b.has(dish), true);
  assert.equal(b.count(), 1);
});

test("subscribe fires on toggle; unsubscribe stops it", () => {
  const f = createFavourites(fakeStorage());
  let calls = 0;
  const off = f.subscribe(() => calls++);
  f.toggle(dish);
  f.toggle(dish);
  assert.equal(calls, 2);
  off();
  f.toggle(dish);
  assert.equal(calls, 2);
});

test("tolerates a corrupt storage payload", () => {
  const f = createFavourites(fakeStorage("nope {"));
  assert.equal(f.count(), 0);
  f.toggle(dish);
  assert.equal(f.count(), 1);
});
