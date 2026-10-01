// Unit tests for the favourites model (site/js/favourites.js). Storage is
// faked so no browser is needed. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFavourites,
  favKey,
  favHref,
  favouriteDishIds,
  groupFavourites,
  groupForShare,
  unresolvedReason,
  UNRESOLVED_VENUE,
  UNRESOLVED_DISH,
} from "../site/js/favourites.js";
import { encodeShortlist, decodeShare } from "../site/js/share-codec.js";

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

// `fixture-venue` and not `sprig-and-fern`: that id is RETIRED — renames.js
// maps it to `sprig-and-fern-tawa`. These tests exercise dish-id disambiguation
// (favKey/favHref/toggle), not the venue rename, so the venue id is arbitrary;
// a retired-but-live id here would quietly start exercising the rename path
// the day one of these tests grew a migration. See tests/share-codec.test.js
// for the same convention.
const goldCard = {
  type: "dish", venueId: "fixture-venue", venueName: "Sprig & Fern",
  name: "Cheeseburger", dishId: "cheeseburger-gold-card",
};
const mainsBurger = { ...goldCard, dishId: undefined };
delete mainsBurger.dishId;

test("favKey keys on the id where the data gives one", () => {
  assert.equal(favKey(goldCard), "d:fixture-venue cheeseburger-gold-card");
  // …and on slug(name) where it doesn't — the key it always had, which is why
  // stored hearts need no migration (they are entries, not key strings).
  assert.equal(favKey(mainsBurger), "d:fixture-venue cheeseburger");
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
  assert.equal(favHref(goldCard), "restaurant.html?id=fixture-venue#dish-cheeseburger-gold-card");
  assert.equal(favHref(mainsBurger), "restaurant.html?id=fixture-venue#dish-cheeseburger");
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
  assert.deepEqual(kk.dishes, [{ name: "Mee Goreng" }]);
  const cah = groups[1];
  assert.equal(cah.venueFav, false); // only a dish of it is hearted
  assert.equal(cah.isRecipe, true);
  assert.deepEqual(cah.dishes, [{ name: "Shane's Ribs" }]);
});

test("groupForShare carries a hearted dish's id, so a share can disambiguate it (ADR 0051)", () => {
  // Without this, share-codec.js's `k` array is packed from nothing — the id
  // the dish carries in storage never reaches the producer's `dishes` list.
  assert.deepEqual(groupForShare([goldCard])[0].dishes, [
    { name: "Cheeseburger", dishId: "cheeseburger-gold-card" },
  ]);
  // A dish with no id pushes without the key at all — never an explicit
  // `dishId: undefined`, which would fail deepEqual against a plain `{ name }`.
  assert.deepEqual(groupForShare([mainsBurger])[0].dishes, [{ name: "Cheeseburger" }]);
});

test("a hearted dish's id survives heart -> groupForShare -> wire -> favKey (ADR 0051 residue)", () => {
  // The end-to-end property the whole exercise is for: two dishes sharing a
  // name at the same venue stay two distinct favourites after a real
  // shortlist round-trip, not just at the in-memory model layer.
  const f = createFavourites(fakeStorage());
  f.toggle(mainsBurger);
  f.toggle(goldCard);
  const token = encodeShortlist({ groups: groupForShare(f.items()) });
  const decoded = decodeShare(token);
  assert.equal(decoded.type, "shortlist");
  assert.deepEqual(decoded.items.map(favKey).sort(), [
    "d:fixture-venue cheeseburger",
    "d:fixture-venue cheeseburger-gold-card",
  ]);
});

// --- reference integrity (ADR 0020) ---------------------------------------
//
// A heart saved months ago may name a venue or a dish the data no longer has.
// These cover the *local* half — deciding a row can't be matched — and, just as
// importantly, what that decision is NOT allowed to conclude. The network half
// (the only thing that may say "removed") is in tests/data-loader.test.js.

const RECORD = {
  id: "kk-malaysian",
  name: "KK Malaysian",
  menu: [
    {
      section: "Mains",
      items: [
        { name: "Mee Goreng", dishId: "mee-goreng", price: 18 },
        { name: "Cheeseburger", dishId: "cheeseburger-gold-card", price: 21 },
      ],
    },
  ],
};
const loaded = (...records) => new Map(records.map((r) => [r.id, r]));

test("unresolvedReason: a heart the loaded data covers is not marked", () => {
  const byId = loaded(RECORD);
  assert.equal(unresolvedReason(venue, byId), null);
  assert.equal(unresolvedReason(dish, byId), null);
});

test("unresolvedReason: the venue is missing entirely", () => {
  const byId = loaded({ id: "somewhere-else", menu: [] });
  assert.equal(unresolvedReason(venue, byId), UNRESOLVED_VENUE);
  // …and every dish of it inherits that, rather than claiming the dish went.
  assert.equal(unresolvedReason(dish, byId), UNRESOLVED_VENUE);
});

test("unresolvedReason: the venue is there, the dish isn't", () => {
  const byId = loaded({ ...RECORD, menu: [{ section: "Mains", items: [] }] });
  assert.equal(unresolvedReason(venue, byId), null); // the place is still fine
  assert.equal(unresolvedReason(dish, byId), UNRESOLVED_DISH);
});

test("unresolvedReason resolves by dish id, never by name (ADR 0051)", () => {
  // The venue's row is called "Cheeseburger" and so is the stored heart — but
  // they are different rows at different prices. Matching on the name would
  // call this resolved and re-open the collision ADR 0051 closed.
  const heart = { type: "dish", venueId: "kk-malaysian", name: "Cheeseburger", dishId: "cheeseburger-kids" };
  assert.equal(unresolvedReason(heart, loaded(RECORD)), UNRESOLVED_DISH);
  // The id the venue does carry resolves.
  assert.equal(
    unresolvedReason({ ...heart, dishId: "cheeseburger-gold-card" }, loaded(RECORD)),
    null
  );
});

test("unresolvedReason follows a renamed venue id rather than dangling", () => {
  // `sprig-and-fern` is retired in renames.js; a heart still holding the old id
  // must find the record filed under the new one.
  const rec = { id: "sprig-and-fern-tawa", menu: [] };
  assert.equal(unresolvedReason({ type: "venue", venueId: "sprig-and-fern" }, loaded(rec)), null);
});

test("marking is not removal: the store still holds an unresolved heart", () => {
  // Invariant 1, at the layer where it could go wrong. The view marks; nothing
  // in the model drops. Re-resolving on read is the failure mode this guards.
  const f = createFavourites(fakeStorage());
  f.toggle(dish);
  const byId = loaded({ id: "somewhere-else", menu: [] });
  assert.equal(unresolvedReason(f.items()[0], byId), UNRESOLVED_VENUE);
  assert.equal(f.count(), 1, "an unresolved favourite must survive being unresolvable");
  assert.equal(f.items()[0].name, "Mee Goreng", "and still render from its own stored copy");
});

test("unresolvedReason answers null when it has nothing to check against", () => {
  // Offline first paint, or a screen that never loaded the index: no data is
  // not evidence of absence, so nothing gets marked.
  assert.equal(unresolvedReason(dish, null), null);
  assert.equal(unresolvedReason(null, loaded(RECORD)), null);
});

// Owner, 2026-09-28: "favourites" at KK offered "1 dish" and showed none, with
// four hearted rows. Pre-id entries carry no dishId, and `e.dishId || ""`
// collapsed all four into one empty string. The filter must key exactly as the
// row's heart does.
test("favouriteDishIds keys a pre-id heart by its name, exactly as the heart does", () => {
  const entries = [
    { type: "dish", venueId: "kk", name: "Chicken Curry" },
    { type: "dish", venueId: "kk", name: "Nasi Goreng" },
    { type: "dish", venueId: "kk", name: "Mocha", dishId: "mocha-hot" },
    { type: "dish", venueId: "other", name: "Roti" },
    { type: "venue", venueId: "kk" },
  ];
  const ids = favouriteDishIds(entries, "kk");
  assert.deepEqual([...ids].sort(), ["chicken-curry", "mocha-hot", "nasi-goreng"]);
  // …and every id is the one favKey (the heart) would light on.
  for (const e of entries.filter((x) => x.venueId === "kk" && x.type === "dish")) {
    assert.ok(ids.has(favKey(e).split(" ").slice(1).join(" ")));
  }
});

// --- groupFavourites: personal recipes live inside Cook at Home (510/290) ----

const mine = (name, dishId) => ({
  type: "dish", venueId: "u:mine", venueName: "My recipes", name, dishId, isRecipe: true,
});
const pub = (name) => ({
  type: "dish", venueId: "cook-at-home", venueName: "Cook at Home", name, isRecipe: true,
});

test("groupFavourites: a personal recipe joins the Cook at Home group, in the order hearted", () => {
  const items = [pub("Alpha Bake"), dish, mine("Zed Stew", "u:zed-stew"), pub("Beta Pie"), mine("Ace Soup", "u:ace-soup")];
  const groups = groupFavourites(items);
  assert.deepEqual(groups.map((g) => g.venueId), ["cook-at-home", "kk-malaysian"]);
  assert.deepEqual(groups[0].dishes.map((d) => d.name), ["Alpha Bake", "Zed Stew", "Beta Pie", "Ace Soup"]);
  assert.equal(groups.some((g) => g.venueId === "u:mine"), false, "no My recipes group");
});

test("groupFavourites: only personal recipes still make a Cook at Home group, never named My recipes", () => {
  const groups = groupFavourites([mine("Zed Stew", "u:zed-stew")]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].venueId, "cook-at-home");
  assert.equal(groups[0].venueName, "Cook at Home");
  assert.equal(groups[0].venue, null, "no place heart is invented");
  assert.equal(groups[0].isRecipe, true);
  assert.equal(groupFavourites([mine("Zed Stew", "u:zed-stew")], { cookAtHomeName: "Mahi Kāinga" })[0].venueName, "Mahi Kāinga");
});

test("groupFavourites: a personal entry never lends the group its name, whichever came first", () => {
  const groups = groupFavourites([mine("Zed Stew", "u:zed-stew"), pub("Alpha Bake")], { cookAtHomeName: "Fallback" });
  assert.equal(groups[0].venueName, "Cook at Home");
});

test("groupFavourites: the Cook at Home place heart stays its own entry, and counts are group and row counts", () => {
  const home = { type: "venue", venueId: "cook-at-home", venueName: "Cook at Home", isRecipe: true };
  const groups = groupFavourites([home, mine("Zed Stew", "u:zed-stew"), dish]);
  assert.equal(groups[0].venue, home);
  assert.equal(groups.length, 2); // places
  assert.equal(groups.reduce((n, g) => n + g.dishes.length, 0), 2); // the personal recipe is a dish
});

test("groupFavourites: a personal entry still links to its own recipe page", () => {
  assert.equal(favHref(mine("Zed Stew", "u:zed-stew")), "recipe.html?id=u:mine&dish=u:zed-stew");
});

test("groupFavourites: nothing hearted, nothing grouped", () => {
  assert.deepEqual(groupFavourites([]), []);
  assert.deepEqual(groupFavourites(null), []);
});
