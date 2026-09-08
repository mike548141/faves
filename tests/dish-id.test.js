// dish-id.js — a dish can be renamed, but its identity must not move with it.
//
// The dish-level twin of renames.test.js, and written to read as its sibling.
// Every failure this file guards is silent: a shared `#dish-…` link that lands
// nowhere, a heart that quietly detaches on a family phone, a pick that stops
// matching, an order line that charges the wrong price. None of them raise an
// error anywhere, which is why they get tests rather than trust.
// Run: `node --test`.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { dishId, eachDish, findDish, migrateDishKeys } from "../site/js/dish-id.js";
import { migrateRatingKeys } from "../site/js/renames.js";
import { slug } from "../site/js/slug.js";

// ── The headline property ──────────────────────────────────────────────────
// ROADMAP Theme 25: "Absent = slug(name) … so nothing moves on the day it
// lands." Every other test here is detail; this is the one that says the
// migration was safe to ship. If it ever fails, 1733 dish rows change identity
// at once and every anchor, heart, rating and order line already in the wild
// stops matching the dish it was written for.

test("nothing moves on day one: a dish with no dishId is still slug(name)", () => {
  // Real corpus names, including the punctuation-heavy ones that are the only
  // places `slug` does anything interesting.
  assert.equal(dishId({ name: "Fish and Chips" }), "fish-and-chips");
  assert.equal(dishId({ name: "Cheeseburger" }), "cheeseburger");
  assert.equal(dishId({ name: "Mash and Gravy" }), "mash-and-gravy");
  assert.equal(
    dishId({ name: "Potato, Rosemary + Basil Pesto" }),
    "potato-rosemary-basil-pesto",
  );
  assert.equal(
    dishId({ name: "Southern Fried Cauliflower Bites" }),
    "southern-fried-cauliflower-bites",
  );
  // …and it is exactly what the anchor builder already computed, not merely
  // something that looks like it.
  for (const name of ["Fish and Chips", "Double Smoked Ham + Mushroom", "Arancini"])
    assert.equal(dishId({ name }), slug(name));
});

test("an explicit dishId wins over the name", () => {
  // This is the whole point of the field: the shop renames the dish, the id
  // stays pinned, and nothing anyone has shared or saved notices.
  assert.equal(dishId({ name: "Kids' Cheeseburger", dishId: "cheeseburger-kids" }), "cheeseburger-kids");
  assert.equal(dishId({ name: "Fish and Chips", dishId: "fish-and-chips-gold-card" }), "fish-and-chips-gold-card");
});

test("dishId survives junk rather than throwing at boot", () => {
  // `slug()` itself throws on a non-string, and this function reads records
  // straight off the network AND entries straight out of a phone's storage —
  // so one malformed row must not take the page down before it draws.
  assert.equal(dishId(null), "");
  assert.equal(dishId(undefined), "");
  assert.equal(dishId({}), "");
  assert.equal(dishId({ name: 42 }), "");
  assert.equal(dishId({ dishId: "" }), "", "an empty id falls through, it does not win");
  assert.doesNotThrow(() => [null, undefined, {}, { name: 42 }, { dishId: 5 }, "x", 7].map(dishId));
});

// ── eachDish ───────────────────────────────────────────────────────────────

const RECORD = {
  id: "fixture",
  menu: [
    { section: "Small Plates", items: [{ name: "Thick Cut Fries" }, { name: "Arancini" }] },
    { section: "Mains", items: [{ name: "Fish and Chips" }] },
    // Hidden from the menu (ADR 0049) but still linkable, heartable, rateable.
    { section: "Brunch Sides", addOnsOnly: true, items: [{ name: "Hash Brown" }] },
  ],
};

test("eachDish flattens every section in order, hidden ones included", () => {
  const flat = eachDish(RECORD);
  assert.deepEqual(
    flat.map((d) => d.item.name),
    ["Thick Cut Fries", "Arancini", "Fish and Chips", "Hash Brown"],
  );
  assert.deepEqual(flat.map((d) => d.section.section), [
    "Small Plates",
    "Small Plates",
    "Mains",
    "Brunch Sides",
  ]);
  // A row nobody renders still has to answer to a link, a heart and a rating,
  // so an add-ons-only section must NOT be filtered out here (ADR 0049).
  const hidden = flat.find((d) => d.item.name === "Hash Brown");
  assert.equal(hidden.section.addOnsOnly, true);
});

test("eachDish survives a record with holes in it", () => {
  assert.deepEqual(eachDish(null), []);
  assert.deepEqual(eachDish(undefined), []);
  assert.deepEqual(eachDish({}), [], "a record with no menu");
  assert.deepEqual(eachDish({ menu: [{ section: "Empty" }] }), [], "a section with no items");
  assert.deepEqual(eachDish({ menu: null }), []);
});

// ── findDish, and its match order ──────────────────────────────────────────

const REFS = {
  id: "fixture",
  menu: [
    {
      section: "Mains",
      items: [
        // A live id that is ALSO some other dish's retired id.
        { name: "Chicken Burger", dishId: "burger" },
        // An explicit id that is ALSO some other dish's display name.
        { name: "The Big One", dishId: "bastard" },
        { name: "Bastard" },
        // Explicit id that its own name does not slug to — the only way to
        // exercise the name rung on its own.
        { name: "Kids' Cheeseburger", dishId: "cheeseburger-kids" },
        { name: "Loaded Fries", dishId: "loaded-fries", formerIds: ["dirty-fries"] },
        { name: "Mee Goreng" },
      ],
    },
    { section: "Retired-ish", items: [{ name: "Old Thing", formerIds: ["burger"] }] },
  ],
};

const found = (ref) => findDish(REFS, ref)?.item.name ?? null;

test("a live id beats another dish's formerIds entry", () => {
  // The dangerous ordering bug: if formerIds were tried first, retiring an id
  // on one dish would hijack every link to a dish that still exists.
  assert.equal(found("burger"), "Chicken Burger");
});

test("an explicit id beats a name", () => {
  // `picks` are written as names, so a name must never outrank a real id —
  // otherwise adding a pick could silently redirect a shared link.
  assert.equal(found("bastard"), "The Big One");
  assert.equal(found("Bastard"), "The Big One", "a name-shaped ref still slugs into the id rung");
});

test("a name-form ref resolves — this is how picks work today", () => {
  assert.equal(found("Fish and Chips"), null, "not in this fixture");
  assert.equal(found("Mee Goreng"), "Mee Goreng", "via slug(ref) against the default id");
  assert.equal(found("Kids' Cheeseburger"), "Kids' Cheeseburger", "via the name rung proper");
});

test("a formerIds ref resolves, in exact form and via slug(ref)", () => {
  // An old shared link holds a slug; an owner writing the migration by hand
  // may well type the old display name. Both have to land.
  assert.equal(found("dirty-fries"), "Loaded Fries");
  assert.equal(found("Dirty Fries"), "Loaded Fries");
});

test("findDish returns null rather than throwing on anything it can't resolve", () => {
  assert.equal(findDish(REFS, "never-on-this-menu"), null);
  assert.equal(findDish(REFS, ""), null);
  assert.equal(findDish(REFS, null), null);
  assert.equal(findDish(REFS, undefined), null);
  assert.equal(findDish(REFS, 42), null, "a non-string ref must not reach slug()");
  assert.equal(findDish(null, "burger"), null, "nor must a missing record");
});

// ── migrateDishKeys — the personal-data migration ──────────────────────────

// `fixture-venue` and not `sprig-and-fern`: these tests exercise the DISH-key
// migration only, not the venue rename (renames.js maps the retired
// `sprig-and-fern` to `sprig-and-fern-tawa`), so the venue id here is
// arbitrary — a retired-but-live id in a fixture that isn't testing the
// rename would quietly start exercising that path the day one of these tests
// grew a migration. See tests/share-codec.test.js for the same convention.
// (The venue+dish composition test below DOES exercise the rename, on
// purpose, and keeps `sprig-and-fern`.)

test("a stored heart keyed by dish name moves to the dish id", () => {
  const before = { "d:fixture-venue Fish and Chips": 5, "v:fixture-venue": 4 };
  assert.deepEqual(migrateDishKeys(before), {
    "v:fixture-venue": 4,
    "d:fixture-venue fish-and-chips": 5,
  });
});

test("migrateDishKeys is idempotent — safe to run on every read, forever", () => {
  // There is no "have I migrated yet" flag to get wrong, so the only thing
  // making that safe is that a second pass is a no-op. Same object out, the
  // way renames.js signals "nothing moved".
  const once = migrateDishKeys({ "d:fixture-venue Fish and Chips": 5 });
  assert.deepEqual(once, { "d:fixture-venue fish-and-chips": 5 });
  assert.equal(migrateDishKeys(once), once, "a second pass returns the same object");
});

test("venue keys, unrecognised keys and values are all left alone", () => {
  const before = {
    "v:burgerfuel": 5,
    "weird-key": 1,
    "d:burgerfuel bastard": { stars: 3, note: "as-is" },
    "d:burgerfuel Bastard Burger": 2,
  };
  const after = migrateDishKeys(before);
  assert.equal(after["v:burgerfuel"], 5);
  assert.equal(after["weird-key"], 1);
  assert.equal(after["d:burgerfuel bastard"], before["d:burgerfuel bastard"], "the value object itself, not a copy");
  assert.equal(after["d:burgerfuel bastard-burger"], 2);
  assert.equal("d:burgerfuel Bastard Burger" in after, false, "the old key is gone");
});

test("a map with nothing to move is returned as the same object", () => {
  const map = { "v:kk-malaysian": 3, "d:kk-malaysian mee-goreng": 5 };
  assert.equal(migrateDishKeys(map), map);
});

test("a collision keeps the entry already in id form", () => {
  // Both keys point at the same dish. The one already in id form was written
  // by a build that understood ids — i.e. more recently — so it is the honest
  // survivor. Same rule as renames.js, for the same reason.
  const before = { "d:fixture-venue Fish and Chips": 2, "d:fixture-venue fish-and-chips": 5 };
  assert.deepEqual(migrateDishKeys(before), { "d:fixture-venue fish-and-chips": 5 });
});

test("migrateDishKeys survives junk rather than throwing at boot", () => {
  assert.equal(migrateDishKeys(null), null);
  assert.equal(migrateDishKeys(undefined), undefined);
  assert.equal(migrateDishKeys([1, 2]).length, 2, "an array is not a rating map");
  const empty = {};
  assert.equal(migrateDishKeys(empty), empty);
});

test("the venue migration and the dish migration compose, neither clobbering the other", () => {
  // Both halves of the key are stale: the venue was renamed (renames.js) and
  // the dish half is still a display name (this module). A phone that has been
  // offline since before either landed hits exactly this on first read.
  const before = { "d:sprig-and-fern Fish and Chips": 5 };
  const after = migrateDishKeys(migrateRatingKeys(before));
  assert.deepEqual(after, { "d:sprig-and-fern-tawa fish-and-chips": 5 });
});

// ── The measured fact the whole migration rests on ─────────────────────────

test("within a venue, no two DIFFERENT dish names slug to the same value", () => {
  // migrateDishKeys is only safe because of this. If a future menu edit adds a
  // name that slugs onto an existing, differently-spelled one, then two hearts
  // that were distinct on a phone silently merge into one on the next read —
  // and nothing else in the repo would notice. This test is that alarm.
  //
  // Genuine duplicate names (Sprig & Fern prints "Cheeseburger" three times)
  // are NOT a failure here: they already shared one key, so the migration
  // cannot make them worse. Only distinct names colliding is a problem.
  const dir = fileURLToPath(new URL("../site/data/restaurants/", import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 40, `expected the whole corpus, saw ${files.length} files`);

  const clashes = [];
  for (const file of files) {
    const record = JSON.parse(readFileSync(dir + file, "utf8"));
    const byId = new Map(); // id → set of the distinct names that produced it
    for (const { item } of eachDish(record)) {
      if (typeof item?.name !== "string") continue;
      const id = dishId(item);
      if (!byId.has(id)) byId.set(id, new Set());
      byId.get(id).add(item.name);
    }
    for (const [id, names] of byId)
      if (names.size > 1) clashes.push(`${file}: ${id} ← ${[...names].join(" / ")}`);
  }
  assert.deepEqual(clashes, [], `distinct dish names sharing one id:\n${clashes.join("\n")}`);
});

// ———————— a cross-record pairing chip must not dead-end (490/100 · 5) ————————
//
// REPRODUCED FIRST, and the reproduction is what these tests encode. A
// `goesWith` chip pointing at another venue is written "venue-id#Dish Name",
// and menu.js can only anchor it at `#dish-<slug(name)>` — resolving it
// properly would mean fetching the other record to draw a chip. On the target
// page the browser looks for an element with that id and, failing, `scrollToHash`
// hands the same string to `findDish`. Measured 2026-09-08 against these
// modules, for a dish named "Fish and Chips" carrying `dishId:
// "fish-and-chips-mains"`:
//
//   chip href       restaurant.html?id=b#dish-fish-and-chips
//   element id      dish-fish-and-chips-mains        ← no such element
//   findDish(B, "fish-and-chips")  →  null           ← and no recovery
//
// 85 of the corpus's 3,506 dishes carry an id that is not their name's slug, so
// 85 are unreachable this way. There are 0 cross-record pairings today, so this
// is latent — but the identical shape reaches any link SHARED before ADR 0051,
// which held a name's slug and nothing else.
//
// The render half of that chain is page code and is not exported, so it is
// mirrored here with the same `slug` menu.js calls rather than driven. What is
// driven is the half that can recover: the resolver on the target page.
const crossRecordTarget = {
  id: "b",
  menu: [
    {
      section: "Mains",
      sectionId: "mains",
      items: [{ name: "Fish and Chips", dishId: "fish-and-chips-mains" }],
    },
  ],
};

test("a cross-record chip's anchor still resolves when the target's id is not its slug", () => {
  const target = crossRecordTarget.menu[0].items[0];
  const anchor = slug("Fish and Chips"); // exactly what menu.js builds
  // The premise, asserted rather than assumed: no element carries that id, so
  // the browser's own anchor cannot do this and the resolver has to.
  assert.notEqual(`dish-${anchor}`, `dish-${dishId(target)}`);
  // …and the four strict tiers cannot recover it, which is the defect verbatim.
  assert.equal(findDish(crossRecordTarget, anchor), null);
  assert.equal(findDish(crossRecordTarget, anchor, { byNameSlug: true })?.item, target);
});

// 🛑 THE TIER IS OPT-IN BECAUSE THE FIRST VERSION WAS NOT, AND THAT BROKE
// something real inside the hour: data.js asks this same resolver whether a
// hearted dish is still on the live menu, and an always-on name tier answered
// "present" for a menu that now prints the same name under a NEW id — a
// different dish (ADR 0051), a stale heart, and the exact collision ADR 0051
// exists to close. tests/data-loader.test.js caught it. This is that boundary,
// pinned here as well, because the test that caught it is three modules away
// and names none of this.
test("the name tier is OFF for an identity question — a moved id is still absent", () => {
  const renamed = {
    menu: [{ section: "Mains", items: [{ name: "Mee Goreng", dishId: "mee-goreng-2" }] }],
  };
  assert.equal(findDish(renamed, "mee-goreng"), null);
  assert.equal(findDish(renamed, "mee-goreng", { byNameSlug: true })?.item.name, "Mee Goreng");
});

test("…and a stored id still beats a name that merely slugs to it", () => {
  // The tier order is the whole safety property: the new tier is DERIVED, so it
  // must never take a link away from a dish that declares the id outright.
  const record = {
    menu: [
      { section: "A", items: [{ name: "Fish and Chips", dishId: "fish-and-chips-mains" }] },
      { section: "B", items: [{ name: "Battered snapper", dishId: "fish-and-chips" }] },
    ],
  };
  assert.equal(findDish(record, "fish-and-chips", { byNameSlug: true })?.item.name, "Battered snapper");
});

test("…and a declared former id beats it too", () => {
  const record = {
    menu: [
      { section: "A", items: [{ name: "Fish and Chips", dishId: "fish-and-chips-mains" }] },
      { section: "B", items: [{ name: "Snapper", dishId: "snapper", formerIds: ["fish-and-chips"] }] },
    ],
  };
  assert.equal(findDish(record, "fish-and-chips", { byNameSlug: true })?.item.name, "Snapper");
});

test("a ref that matches nothing at all is still null", () => {
  // The tier is a fallback, not a fuzzy match: an unknown ref must not start
  // resolving to whichever dish happens to come first.
  assert.equal(findDish(crossRecordTarget, "pavlova", { byNameSlug: true }), null);
});
