// The move map: a published recipe moved into a person's own recipes carries
// its hearts, ratings, notes, ticks and shopping lines to the `u:` id
// (site/js/recipe-move.js, roadmap 510/050, ADR 0146 §4). Synthetic ids only:
// which real recipes move is the owner's list to give. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { moveMapOf, moveSnapshot, moveStep, moveStorageKeys, toPersonalRecipe } from "../site/js/recipe-move.js";
import { MY_RECIPES, RECIPES_KEY, personalCollection } from "../site/js/recipe-record.js";
import { favKey } from "../site/js/favourites.js";
import { ratingKey } from "../site/js/ratings.js";
import { recipeId } from "../site/js/checklist.js";
import { findDish } from "../site/js/dish-id.js";
import { upgradePersonalData, upgradeStorage } from "../site/js/user-schema.js";

const V = "test-kitchen"; // a synthetic published collection
const MOVES = [
  { from: { venueId: V, dishId: "alpha-bake" }, to: "u:alpha-bake" },
  { from: { venueId: V, dishId: "beta-stew" }, to: "u:beta-stew" },
];
const ALPHA = { name: "Alpha Bake", dishId: "alpha-bake", steps: ["Mix.", "Bake."], goesWith: ["Beta Stew", "Gamma Salad"], formerIds: ["alpha"] };
const BETA = { name: "Beta Stew", dishId: "beta-stew", steps: ["Simmer."] };
const moved = new Set(["Alpha Bake", "Beta Stew"]);
const COPIES = {
  "u:alpha-bake": toPersonalRecipe(ALPHA, { venueId: V, section: "Baking", to: "u:alpha-bake", movedNames: moved }),
  "u:beta-stew": toPersonalRecipe(BETA, { venueId: V, section: "Dinners", to: "u:beta-stew", movedNames: moved }),
};

const heart = (venueId, dishId, name) => ({ type: "dish", venueId, venueName: "x", name, dishId, isRecipe: true });
const P = "faves.p.default.";

function deviceKeys() {
  return {
    [`${P}favourites.v1`]: JSON.stringify([
      heart(V, "alpha-bake", "Alpha Bake"),
      heart(V, "gamma-salad", "Gamma Salad"),
      { type: "venue", venueId: V, venueName: "Test Kitchen" },
    ]),
    [`${P}ratings.v1`]: JSON.stringify({ [`d:${V} alpha-bake`]: 5, [`d:${V} gamma-salad`]: 2, [`v:${V}`]: 4 }),
    [`${P}notes.v1`]: JSON.stringify({ [`${V} alpha-bake`]: "less sugar", [`${V} gamma-salad`]: "fine" }),
    [`${P}checklist.v1`]: JSON.stringify({ [`${V} alpha-bake`]: { at: 1, t: ["i:1"] } }),
    "faves.shopping.v1": JSON.stringify([{ venueId: `${V} alpha-bake`, venueName: "Alpha Bake", dishId: "i:1", name: "flour" }]),
    "faves.sync.base.v1": JSON.stringify({ untouched: true }),
  };
}

test("the personal copy keeps the recipe, takes the u: id, and re-points refs that did not move", () => {
  const a = COPIES["u:alpha-bake"];
  assert.equal(a.dishId, "u:alpha-bake");
  assert.equal(a.section, "Baking");
  assert.equal(a.movedFrom, `${V} alpha-bake`);
  assert.deepEqual(a.goesWith, ["Beta Stew", `${V}#Gamma Salad`]);
  assert.equal("formerIds" in a, false);
  // It resolves in the personal collection by its new id, and its moved
  // partner resolves there by name.
  const c = personalCollection(COPIES);
  assert.equal(findDish(c, "u:alpha-bake").item.name, "Alpha Bake");
  assert.equal(findDish(c, "Beta Stew").item.dishId, "u:beta-stew");
});

test("a move plan refuses a non-personal target and a personal source", () => {
  const m = moveMapOf([
    ...MOVES,
    { from: { venueId: V, dishId: "x" }, to: "not-personal" },
    { from: { venueId: MY_RECIPES, dishId: "u:y" }, to: "u:z" },
    { from: { venueId: V, dishId: "alpha-bake" }, to: "u:second" },
    null,
  ]);
  assert.deepEqual([...m.entries()], [[`${V} alpha-bake`, "u:alpha-bake"], [`${V} beta-stew`, "u:beta-stew"]]);
});

test("hearts, ratings, notes, ticks and shopping lines follow the recipe; nothing else moves", () => {
  const out = moveStorageKeys(deviceKeys(), MOVES, COPIES);
  const favs = JSON.parse(out[`${P}favourites.v1`]).map(favKey);
  assert.deepEqual(favs, [`d:${MY_RECIPES} u:alpha-bake`, `d:${V} gamma-salad`, `v:${V}`]);
  const newHeart = JSON.parse(out[`${P}favourites.v1`])[0];
  assert.equal(ratingKey(newHeart), `d:${MY_RECIPES} u:alpha-bake`, "the heart and its rating share one key");

  assert.deepEqual(JSON.parse(out[`${P}ratings.v1`]), {
    [`d:${V} gamma-salad`]: 2,
    [`v:${V}`]: 4,
    [`d:${MY_RECIPES} u:alpha-bake`]: 5,
  });
  const rid = recipeId(MY_RECIPES, { dishId: "u:alpha-bake" });
  assert.equal(JSON.parse(out[`${P}notes.v1`])[rid], "less sugar");
  assert.equal(JSON.parse(out[`${P}notes.v1`])[`${V} gamma-salad`], "fine");
  assert.deepEqual(JSON.parse(out[`${P}checklist.v1`])[rid], { at: 1, t: ["i:1"] });
  assert.equal(JSON.parse(out["faves.shopping.v1"])[0].venueId, rid);
  assert.equal(out["faves.sync.base.v1"], deviceKeys()["faves.sync.base.v1"], "the sync base is the snapshot half's");
  // "referenced": only the recipe this device held something about.
  assert.deepEqual(Object.keys(JSON.parse(out[RECIPES_KEY])), ["u:alpha-bake"]);
  // "all": every moved recipe (the owner's own devices).
  assert.deepEqual(Object.keys(JSON.parse(moveStorageKeys(deviceKeys(), MOVES, COPIES, { add: "all" })[RECIPES_KEY])), [
    "u:alpha-bake",
    "u:beta-stew",
  ]);
});

test("a move never overwrites what is already under the new id, and is idempotent", () => {
  const keys = deviceKeys();
  keys[`${P}ratings.v1`] = JSON.stringify({ [`d:${V} alpha-bake`]: 5, [`d:${MY_RECIPES} u:alpha-bake`]: 3 });
  keys[RECIPES_KEY] = JSON.stringify({ "u:alpha-bake": { dishId: "u:alpha-bake", name: "Mine already" } });
  const out = moveStorageKeys(keys, MOVES, COPIES);
  assert.deepEqual(JSON.parse(out[`${P}ratings.v1`]), { [`d:${MY_RECIPES} u:alpha-bake`]: 3 });
  assert.equal(JSON.parse(out[RECIPES_KEY])["u:alpha-bake"].name, "Mine already");
  assert.deepEqual(moveStorageKeys(out, MOVES, COPIES), out, "running it twice changes nothing");
  // No moves, no change; the input is never mutated.
  const before = JSON.stringify(keys);
  assert.deepEqual(moveStorageKeys(keys, [], COPIES), keys);
  assert.equal(JSON.stringify(keys), before);
});

test("a backup taken before the move lands its hearts on the personal copy", () => {
  const snap = {
    format: "faves.personal-data",
    v: 1,
    profiles: [
      {
        id: "default",
        name: "Me",
        favourites: [heart(V, "beta-stew", "Beta Stew")],
        ratings: { [`d:${V} beta-stew`]: 4 },
        notes: { [`${V} beta-stew`]: "more salt" },
        future: { kept: true },
      },
    ],
    shelf: 1,
  };
  const out = moveSnapshot(snap, MOVES, COPIES);
  const p = out.profiles[0];
  assert.deepEqual(p.favourites.map(favKey), [`d:${MY_RECIPES} u:beta-stew`]);
  assert.deepEqual(p.ratings, { [`d:${MY_RECIPES} u:beta-stew`]: 4 });
  assert.deepEqual(p.notes, { [`${MY_RECIPES} u:beta-stew`]: "more salt" });
  assert.deepEqual(p.future, { kept: true }, "a field it does not name is carried");
  assert.equal(out.shelf, 1);
  assert.deepEqual(Object.keys(out.recipes), ["u:beta-stew"]);
});

test("as an upgrade step, the move runs through the real chain on both halves", () => {
  const steps = { 1: moveStep(MOVES, COPIES) };
  // The snapshot half — a backup, the sync copy or the sync base.
  const up = upgradePersonalData(
    { v: 1, profiles: [{ id: "default", name: "Me", favourites: [heart(V, "alpha-bake", "Alpha Bake")] }] },
    { steps, target: 2 }
  );
  assert.equal(up.ok, true);
  assert.equal(up.data.v, 2);
  assert.deepEqual(up.data.profiles[0].favourites.map(favKey), [`d:${MY_RECIPES} u:alpha-bake`]);
  // The storage half — this device's own keys.
  const m = new Map(Object.entries({ "faves.schema.v1": "1", ...deviceKeys() }));
  const storage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
  const res = upgradeStorage(storage, { steps, target: 2, now: () => "2026-09-30T00:00:00Z" });
  assert.equal(res.status, "upgraded");
  assert.deepEqual(JSON.parse(m.get(RECIPES_KEY))["u:alpha-bake"].name, "Alpha Bake");
  assert.equal(JSON.parse(m.get(`${P}notes.v1`))[`${MY_RECIPES} u:alpha-bake`], "less sugar");
});
