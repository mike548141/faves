// Unit tests for the global search logic (site/js/search.js) — the home
// screen's one box that finds a place or a dish by name. Pure (no DOM,
// no I/O), so tested directly. Run: `node --test tests/`.
//
// The deep-link href is the load-bearing bit: a dish result must anchor to
// the exact row menu.js/recipe.js render, so we assert the slug scheme here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, search } from "../site/js/search.js";

const FIXTURE = [
  {
    id: "kk-malaysian",
    name: "KK Malaysian",
    area: "Te Aro",
    cuisine: ["Malaysian"],
    menu: [
      {
        section: "Noodles",
        items: [
          { name: "Mee Goreng", desc: "Spicy fried noodles", code: "14" },
          { name: "Char Kway Teow", desc: "Wok-fried flat rice noodles" },
        ],
      },
    ],
  },
  {
    id: "sprig-and-fern-tawa",
    name: "Sprig + Fern Tawa",
    area: "Tawa",
    cuisine: ["Gastropub"],
    menu: [{ section: "Beer", items: [{ name: "Pilsner" }] }],
  },
  {
    id: "cook-at-home",
    kind: "recipes",
    name: "Cook at Home",
    cuisine: [],
    menu: [
      {
        section: "Mains",
        items: [
          { name: "Shane's Ribs", ingredients: ["pork ribs", "lemon", "honey"] },
        ],
      },
    ],
  },
  // A stub venue: name only, no menu — findable as a place, no dishes.
  { id: "simmer", name: "Simmer", area: "Churton Park", cuisine: ["Thai"] },
];

const index = buildIndex(FIXTURE);

test("buildIndex: one place per venue, one dish per menu item", () => {
  assert.equal(index.places.length, 4);
  assert.equal(index.dishes.length, 4); // 2 + 1 + 1; stub contributes none
});

test("search: matches a place by name", () => {
  const { places } = search(index, "sprig");
  assert.deepEqual(places.items.map((p) => p.id), ["sprig-and-fern-tawa"]);
});

test("search: matches a place by area and by cuisine", () => {
  assert.deepEqual(search(index, "tawa").places.items.map((p) => p.id).sort(), [
    "sprig-and-fern-tawa",
  ]);
  assert.deepEqual(search(index, "gastropub").places.items.map((p) => p.id), [
    "sprig-and-fern-tawa",
  ]);
});

test("search: matches a dish by name and deep-links with the shared slug", () => {
  const { dishes } = search(index, "mee goreng");
  assert.equal(dishes.total, 1);
  assert.equal(dishes.items[0].name, "Mee Goreng");
  assert.equal(dishes.items[0].href, "restaurant.html?id=kk-malaysian#dish-mee-goreng");
  assert.equal(dishes.items[0].venueName, "KK Malaysian");
});

test("search: a recipe dish deep-links to the recipe page", () => {
  const { dishes } = search(index, "ribs");
  assert.equal(dishes.items[0].href, "recipe.html?id=cook-at-home&dish=shane-s-ribs");
  assert.equal(dishes.items[0].isRecipe, true);
});

test("search: ingredients are searchable (menu.js parity)", () => {
  const { dishes } = search(index, "lemon");
  assert.deepEqual(dishes.items.map((d) => d.name), ["Shane's Ribs"]);
});

test("search: a venue order-code matches its dish", () => {
  // "two number 14s" off the board should find the dish carrying code "14".
  const { dishes } = search(index, "14");
  assert.deepEqual(dishes.items.map((d) => d.name), ["Mee Goreng"]);
});

test("search: name-start ranks above a later-word or description hit", () => {
  // "noodle" appears only in descriptions here; a name hit should still lead
  // when present. Query "char" hits the name start of Char Kway Teow.
  const { dishes } = search(index, "char");
  assert.equal(dishes.items[0].name, "Char Kway Teow");
});

test("search: queries under 2 chars match nothing", () => {
  const r = search(index, "m");
  assert.equal(r.places.total, 0);
  assert.equal(r.dishes.total, 0);
});

test("search: no match yields empty groups, not an error", () => {
  const r = search(index, "zzzzz");
  assert.deepEqual(r.places.items, []);
  assert.deepEqual(r.dishes.items, []);
});

test("search: dish limit caps items but total reflects the full count", () => {
  const many = [
    {
      id: "big",
      name: "Big",
      menu: [
        {
          section: "S",
          items: Array.from({ length: 25 }, (_, i) => ({ name: `Noodle ${i}` })),
        },
      ],
    },
  ];
  const { dishes } = search(buildIndex(many), "noodle", { dishLimit: 20 });
  assert.equal(dishes.total, 25);
  assert.equal(dishes.items.length, 20);
});

// ─── The widened searchable surface (owner steer, 2026-08-16) ───────────────
// The box should find a place by the street you remember it on, by "takeaway",
// or by the number in your call history — and a dish by the diet it satisfies,
// not only by the code the data stores it under.

const WIDE = [
  {
    id: "borough-tawa",
    name: "The Borough",
    area: "Tawa",
    city: "Wellington",
    cuisine: ["Cafe"],
    address: "5 Cuba Street, Tawa", // leakscan:allow:nz-address: synthetic fixture; no such venue
    phone: "04 232 1234", // leakscan:allow:nz-phone: synthetic test fixture, not a real line
    services: ["takeaway", "dine-in"],
    menu: [
      {
        section: "Brunch",
        items: [
          { name: "Kumara Hash", tags: ["vg", "gf"] },
          { name: "Bacon Butty", tags: ["contains-gluten"] },
        ],
      },
    ],
  },
];

const wide = buildIndex(WIDE);
const hit = (q) => search(wide, q);

test("finds a place by a fragment of its address", () => {
  assert.equal(hit("cuba").places.total, 1);
  assert.equal(hit("cuba").places.items[0].name, "The Borough");
});

test("finds a place by city", () => {
  assert.equal(hit("wellington").places.total, 1);
});

test("finds a place by phone number, however it is punctuated", () => {
  assert.equal(hit("232 1234").places.total, 1, "as written"); // leakscan:allow:nz-phone: synthetic fixture
  assert.equal(hit("042321234").places.total, 1, "run together"); // leakscan:allow:nz-phone: synthetic fixture
  assert.equal(hit("04-232-1234").places.total, 1, "hyphenated"); // leakscan:allow:nz-phone: synthetic fixture
});

test("finds a place by service", () => {
  assert.equal(hit("takeaway").places.total, 1);
  assert.equal(hit("dine in").places.total, 1, "typed as two words");
  assert.equal(hit("eat in").places.total, 1, "and by synonym");
});

test("finds a dish by the diet it satisfies, not the stored code", () => {
  assert.equal(hit("vegan").dishes.total, 1);
  assert.equal(hit("vegan").dishes.items[0].name, "Kumara Hash");
  assert.equal(hit("gluten free").dishes.total, 1);
});

test("'plant based' finds vegan and vegetarian dishes", () => {
  assert.equal(hit("plant based").dishes.total, 1);
  assert.equal(hit("plant based").dishes.items[0].name, "Kumara Hash");
});

test("'coeliac' finds gluten free", () => {
  assert.equal(hit("coeliac").dishes.total, 1);
});

test("no synonym asserts the ABSENCE of an allergen", () => {
  // The data records what a shop claims (gf), never that something is free of
  // an allergen we merely failed to see. A search that appeared to answer
  // "nut free" would be a safety claim with nothing behind it.
  assert.equal(hit("nut free").dishes.total, 0);
  assert.equal(hit("peanut free").dishes.total, 0);
});

test("a direct name hit still outranks a synonym hit", () => {
  const idx = buildIndex([
    {
      id: "x",
      name: "X",
      cuisine: [],
      menu: [
        {
          section: "S",
          items: [
            { name: "Vegetarian Pie", tags: [] },
            { name: "Kumara Hash", tags: ["vg"] },
          ],
        },
      ],
    },
  ]);
  assert.equal(search(idx, "veg").dishes.items[0].name, "Vegetarian Pie");
});
