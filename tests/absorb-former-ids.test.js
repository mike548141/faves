// A heart or a rating stored under a dish id the data has RETIRED lands on the
// dish whose `formerIds` claims it (roadmap 28l, ADR 0153). Run: `node --test`.
//
// The defect these pin: `findDish` resolved a retired id, so the heart was never
// called "No longer on the menu" — but the menu row lights on the RAW stored id,
// the rating reads the raw key, and the "favourites" query filters on the raw
// id, so the reader saw a dark heart, no rating, and their dish hidden by the
// filter that asks for it. Each store test below fails on a build without
// `absorb`; the pure ones fail without the moves.

import { test } from "node:test";
import assert from "node:assert/strict";
import { absorbFavourites, absorbRatings, formerIdMoves } from "../site/js/dish-id.js";
import { createFavourites, favouriteDishIds } from "../site/js/favourites.js";
import { createRatings } from "../site/js/ratings.js";

// One venue after a ladder merge: "Large Butter Chicken" was a row of its own
// and is now a size of "Butter Chicken", which claims its old id.
const RECORD = {
  id: "curry-house",
  name: "Curry House",
  menu: [
    {
      section: "Curries",
      items: [
        { name: "Butter Chicken", dishId: "butter-chicken", formerIds: ["large-butter-chicken"] },
        { name: "Lamb Korma", dishId: "lamb-korma" },
      ],
    },
  ],
};

const OLD = { type: "dish", venueId: "curry-house", venueName: "Curry House", name: "Large Butter Chicken", dishId: "large-butter-chicken" };
const LIVE = { type: "dish", venueId: "curry-house", venueName: "Curry House", name: "Butter Chicken", dishId: "butter-chicken" };

function fakeStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  let writes = 0;
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      writes++;
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
    get writes() {
      return writes;
    },
    raw: (k) => m.get(k),
  };
}

// --- the pure half ----------------------------------------------------------

test("formerIdMoves maps each retired id to the live dish claiming it", () => {
  const moves = formerIdMoves(RECORD);
  assert.deepEqual([...moves], [["curry-house large-butter-chicken", { dishId: "butter-chicken", name: "Butter Chicken" }]]);
});

test("formerIdMoves: a former id that is also a LIVE id is never a move (a live id wins)", () => {
  const rec = structuredClone(RECORD);
  rec.menu[0].items[1].formerIds = ["butter-chicken"]; // Korma claims Butter Chicken's live id
  const moves = formerIdMoves(rec);
  assert.equal(moves.has("curry-house butter-chicken"), false);
  assert.equal(moves.size, 1);
});

test("formerIdMoves: no venue id, no moves", () => {
  assert.equal(formerIdMoves({ menu: RECORD.menu }).size, 0);
  assert.equal(formerIdMoves(null).size, 0);
});

test("absorbFavourites moves a heart onto the live dish, under its live name", () => {
  const out = absorbFavourites([OLD], formerIdMoves(RECORD));
  assert.deepEqual(out, [{ ...OLD, dishId: "butter-chicken", name: "Butter Chicken" }]);
});

test("absorbFavourites: a heart already on the live dish is kept, the retired one folds into it", () => {
  const out = absorbFavourites([OLD, LIVE], formerIdMoves(RECORD));
  assert.deepEqual(out, [LIVE]);
  // …in either order
  assert.deepEqual(absorbFavourites([LIVE, OLD], formerIdMoves(RECORD)), [LIVE]);
});

test("absorbFavourites returns the SAME list when nothing moved, and is idempotent", () => {
  const list = [LIVE, { type: "venue", venueId: "curry-house" }];
  assert.equal(absorbFavourites(list, formerIdMoves(RECORD)), list);
  const once = absorbFavourites([OLD], formerIdMoves(RECORD));
  assert.equal(absorbFavourites(once, formerIdMoves(RECORD)), once);
});

test("absorbFavourites leaves another venue's heart on the same id alone", () => {
  const elsewhere = { ...OLD, venueId: "other-place" };
  const list = [elsewhere];
  assert.equal(absorbFavourites(list, formerIdMoves(RECORD)), list);
});

test("absorbRatings re-keys a rating; a rating already on the live key wins", () => {
  const moves = formerIdMoves(RECORD);
  assert.deepEqual(absorbRatings({ "d:curry-house large-butter-chicken": 4 }, moves), { "d:curry-house butter-chicken": 4 });
  assert.deepEqual(
    absorbRatings({ "d:curry-house large-butter-chicken": 4, "d:curry-house butter-chicken": 2 }, moves),
    { "d:curry-house butter-chicken": 2 }
  );
  const untouched = { "v:curry-house": 5, "d:curry-house lamb-korma": 3 };
  assert.equal(absorbRatings(untouched, moves), untouched);
});

// --- the stores: what the menu row reads ------------------------------------

test("favourites.absorb: the row's heart lights, and the favourites query keeps the row", () => {
  const storage = fakeStorage({ "faves.favourites.v1": JSON.stringify([OLD]) });
  const favs = createFavourites(storage);
  // Before: the stored id is the retired one, so the live row is dark.
  assert.equal(favs.has(LIVE), false);
  assert.equal(favouriteDishIds(favs.dishes(), "curry-house").has("butter-chicken"), false);
  assert.equal(favs.absorb(RECORD), true);
  assert.equal(favs.has(LIVE), true, "the live row's heart lights");
  assert.deepEqual([...favouriteDishIds(favs.dishes(), "curry-house")], ["butter-chicken"], "the favourites query keeps the live row");
});

test("favourites.absorb writes NOTHING; the person's next write persists the move", () => {
  const storage = fakeStorage({ "faves.favourites.v1": JSON.stringify([OLD]) });
  const favs = createFavourites(storage);
  favs.absorb(RECORD);
  assert.equal(storage.writes, 0, "an app-side rewrite of stored data is the upgrade chain's alone (ADR 0152)");
  favs.toggle({ type: "venue", venueId: "curry-house", venueName: "Curry House" });
  const stored = JSON.parse(storage.raw("faves.favourites.v1"));
  assert.equal(stored.some((e) => e.dishId === "large-butter-chicken"), false);
  assert.equal(stored.some((e) => e.dishId === "butter-chicken"), true);
});

test("favourites: un-hearting the absorbed row removes it — never adds a second heart", () => {
  const storage = fakeStorage({ "faves.favourites.v1": JSON.stringify([OLD]) });
  const favs = createFavourites(storage);
  favs.absorb(RECORD);
  assert.equal(favs.toggle(LIVE), false, "the tap turns the lit heart OFF");
  assert.deepEqual(JSON.parse(storage.raw("faves.favourites.v1")), []);
});

test("favourites: a heart arriving later under the retired id (sync, import) is absorbed on read", () => {
  const storage = fakeStorage({ "faves.favourites.v1": "[]" });
  const favs = createFavourites(storage);
  favs.absorb(RECORD);
  storage.setItem("faves.favourites.v1", JSON.stringify([OLD])); // another tab / a sync pull
  favs.reload();
  assert.equal(favs.has(LIVE), true);
});

test("favourites.absorb tells subscribers only when something moved", () => {
  const storage = fakeStorage({ "faves.favourites.v1": JSON.stringify([LIVE]) });
  const favs = createFavourites(storage);
  let told = 0;
  favs.subscribe(() => told++);
  assert.equal(favs.absorb(RECORD), false);
  assert.equal(told, 0);
});

test("ratings.absorb: a rating on a retired id reads on the live row, writes nothing until the next rating", () => {
  const storage = fakeStorage({ "faves.ratings.v1": JSON.stringify({ "d:curry-house large-butter-chicken": 4 }) });
  const r = createRatings(storage);
  assert.equal(r.get(LIVE), 0, "before: the live row reads unrated");
  assert.equal(r.absorb(RECORD), true);
  assert.equal(r.get(LIVE), 4, "after: the live row reads the rating");
  assert.equal(storage.writes, 0);
  r.set({ type: "venue", venueId: "curry-house" }, 5);
  assert.deepEqual(JSON.parse(storage.raw("faves.ratings.v1")), { "d:curry-house butter-chicken": 4, "v:curry-house": 5 });
});
