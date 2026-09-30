// The home screen's search index is now a COMPACT file — dish identity and
// search text grouped once by venue/section (roadmap 510/020, ADR 0146's
// coordinator review) — that the browser turns back into search.js's own
// runtime `{ places, dishes }` shape with `rebuildIndex()`. This is the
// equivalence guard: a change to `buildIndex()`'s shape that isn't mirrored
// in `rebuildIndex()` (or in what `tools/gen_summaries.mjs` ships) would
// silently ship a search index that looks fine and finds less than it used
// to — exactly the class of bug the shipped generator is built to avoid, and
// exactly the class a browser check cannot see (the compact file and the
// runtime shape are both plain data to `search()`).
//
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, dishHay, placeEntry, rebuildIndex } from "../site/js/search.js";
import { dishId } from "../site/js/dish-id.js";

const FIXTURE = [
  {
    id: "kk-malaysian",
    name: "KK Malaysian",
    kind: "venue",
    area: "Te Aro",
    cuisine: ["Malaysian"],
    city: "Wellington",
    address: "ADDR-PLACEHOLDER",
    phone: "PHONE-PLACEHOLDER",
    services: ["dine-in", "takeaway"],
    vibe: [],
    closure: { state: "trading" },
    menu: [
      {
        section: "Noodles",
        items: [
          { name: "Mee Goreng", desc: "Spicy fried noodles", code: "14" },
          { name: "Char Kway Teow", desc: "Wok-fried flat rice noodles", dishId: "ckt" },
        ],
      },
      {
        section: "Soup",
        items: [{ name: "Won Ton Soup", ingredients: ["pork", "prawn"] }],
      },
    ],
  },
  {
    id: "cook-at-home",
    name: "Cook at Home",
    kind: "recipes",
    menu: [
      { section: "Mains", items: [{ name: "Pudding", dishId: "pudding", formerIds: ["old-pudding"] }] },
    ],
  },
  {
    // A stub with no menu at all — buildIndex contributes a place, no dishes.
    id: "stub-venue",
    name: "Stub Venue",
    kind: "venue",
  },
];

/** The compact search-index.json shape tools/gen_summaries.mjs ships, built
 *  here the same way it does — through `dishHay()`, never a re-derivation. */
function compactFrom(restaurants) {
  return {
    venues: restaurants.map((r) => ({
      id: r.id,
      sections: (r.menu || []).map((s) => ({
        section: s.section || "",
        items: (s.items || []).map((item) => {
          const out = { dishId: dishId(item), name: item.name };
          if (Array.isArray(item.formerIds) && item.formerIds.length) out.formerIds = item.formerIds;
          out.hay = dishHay(item, r);
          return out;
        }),
      })),
    })),
  };
}

/** The summary shape the home screen actually loads: every venue-level field,
 *  no menu (roadmap 510/020 — dish identity lives only in the search index). */
function summaryOf(restaurants) {
  return restaurants.map(({ menu, ...rest }) => rest);
}

test("rebuildIndex reconstructs buildIndex's exact runtime shape from the compact file", () => {
  const reference = buildIndex(FIXTURE);
  const rebuilt = rebuildIndex(compactFrom(FIXTURE), summaryOf(FIXTURE));
  assert.deepEqual(rebuilt, reference);
});

test("…including a recipe kind's dish href (itemPage, not #dish-anchor)", () => {
  const reference = buildIndex(FIXTURE);
  const rebuilt = rebuildIndex(compactFrom(FIXTURE), summaryOf(FIXTURE));
  const pudding = rebuilt.dishes.find((d) => d.venueId === "cook-at-home");
  assert.equal(pudding.href, "recipe.html?id=cook-at-home&dish=pudding");
  assert.equal(pudding.isRecipe, true);
  assert.deepEqual(pudding, reference.dishes.find((d) => d.venueId === "cook-at-home"));
});

test("a stub with no menu contributes a place and no dishes, same as buildIndex", () => {
  const rebuilt = rebuildIndex(compactFrom(FIXTURE), summaryOf(FIXTURE));
  assert.ok(rebuilt.places.some((p) => p.id === "stub-venue"));
  assert.equal(rebuilt.dishes.some((d) => d.venueId === "stub-venue"), false);
});

test("a venue named in the compact index but not in the loaded summaries is skipped, not thrown", () => {
  // The home screen's byId lookup is a `restaurants` array; a venue the
  // search index still names (a deploy race, a fixture) but that array
  // doesn't carry must not crash the whole rebuild.
  const compact = compactFrom(FIXTURE);
  const withoutStub = summaryOf(FIXTURE).filter((r) => r.id !== "stub-venue");
  const rebuilt = rebuildIndex(compact, withoutStub);
  assert.equal(rebuilt.dishes.some((d) => d.venueId === "stub-venue"), false);
  assert.equal(rebuilt.places.some((p) => p.id === "stub-venue"), false);
});

test("placeEntry reads only venue-level fields — byte-identical from a full record or its summary", () => {
  const full = FIXTURE[0];
  const { menu, ...summary } = full;
  assert.deepEqual(placeEntry(summary), placeEntry(full));
});

test("dishHay folds name, description, ingredients, code and diet labels", () => {
  const record = FIXTURE[0];
  const hay = dishHay(record.menu[0].items[0], record);
  assert.match(hay, /mee goreng/);
  assert.match(hay, /spicy fried noodles/);
  assert.match(hay, /14/);
});

test("dishHay reads ingredients even when the display text carries none", () => {
  const record = FIXTURE[0];
  const hay = dishHay(record.menu[1].items[0], record);
  assert.match(hay, /pork/);
  assert.match(hay, /prawn/);
});
