// Unit tests for the favourites model (site/js/favourites.js). Storage is
// faked so no browser is needed. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFavourites,
  favKey,
  favHref,
  groupForShare,
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
  assert.equal(favKey(dish), "d:kk-malaysian mee-goreng");
});

test("favHref: venue, restaurant dish, and recipe dish", () => {
  assert.equal(favHref(venue), "restaurant.html?id=kk-malaysian");
  assert.equal(favHref(dish), "restaurant.html?id=kk-malaysian#dish-mee-goreng");
  assert.equal(favHref(recipe), "recipe.html?id=cook-at-home&dish=shane-s-ribs");
});

// --- dish ids (ADR 0051) --------------------------------------------------

const goldCard = {
  type: "dish", venueId: "sprig-and-fern", venueName: "Sprig & Fern",
  name: "Cheeseburger", dishId: "cheeseburger-gold-card",
};
const mainsBurger = { ...goldCard, dishId: undefined };
delete mainsBurger.dishId;

test("favKey keys on the id where the data gives one", () => {
  assert.equal(favKey(goldCard), "d:sprig-and-fern cheeseburger-gold-card");
  // …and on slug(name) where it doesn't — the key it always had, which is why
  // stored hearts need no migration (they are entries, not key strings).
  assert.equal(favKey(mainsBurger), "d:sprig-and-fern cheeseburger");
});

test("two same-named dishes with different ids heart independently", () => {
  const f = createFavourites(fakeStorage());
  f.toggle(mainsBurger);
  f.toggle(goldCard);
  assert.equal(f.count(), 2);
  assert.equal(f.has(mainsBurger), true);
  assert.equal(f.has(goldCard), true);
  f.toggle(goldCard);
  assert.equal(f.has(mainsBurger), true); // untouched by the other's toggle
  assert.equal(f.count(), 1);
});

test("a heart saved before ids existed reads back as itself", () => {
  // Exactly the JSON a pre-ADR-0051 build wrote: an entry object, no dishId.
  const stored = '[{"type":"dish","venueId":"kk-malaysian","venueName":"KK Malaysian","name":"Mee Goreng"}]';
  const f = createFavourites(fakeStorage(stored));
  assert.equal(f.has(dish), true);
  assert.equal(f.count(), 1);
});

test("favHref anchors on the id, so a disambiguated row is reachable", () => {
  assert.equal(favHref(goldCard), "restaurant.html?id=sprig-and-fern#dish-cheeseburger-gold-card");
  assert.equal(favHref(mainsBurger), "restaurant.html?id=sprig-and-fern#dish-cheeseburger");
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

test("merge adds only absent entries and returns the count added", () => {
  const f = createFavourites(fakeStorage());
  f.toggle(dish); // already have this one
  const added = f.merge([dish, venue, recipe]);
  assert.equal(added, 2); // venue + recipe are new; dish is skipped
  assert.equal(f.count(), 3);
  assert.equal(f.has(venue), true);
  assert.equal(f.has(recipe), true);
});

test("merge dedupes within the incoming list and is idempotent", () => {
  const f = createFavourites(fakeStorage());
  assert.equal(f.merge([venue, venue, dish]), 2); // duplicate venue counted once
  assert.equal(f.count(), 2);
  assert.equal(f.merge([venue, dish]), 0); // nothing new the second time
  assert.equal(f.count(), 2);
});

test("groupForShare groups by venue with venueFav and dish names", () => {
  const groups = groupForShare([venue, dish, recipe]);
  assert.equal(groups.length, 2); // kk-malaysian and cook-at-home
  const kk = groups[0];
  assert.equal(kk.venueId, "kk-malaysian");
  assert.equal(kk.venueName, "KK Malaysian");
  assert.equal(kk.venueFav, true); // the venue itself is hearted
  assert.deepEqual(kk.dishes, ["Mee Goreng"]);
  const cah = groups[1];
  assert.equal(cah.venueFav, false); // only a dish of it is hearted
  assert.equal(cah.isRecipe, true);
  assert.deepEqual(cah.dishes, ["Shane's Ribs"]);
});
