// Unit tests for the global search logic (site/js/search.js) — the home
// screen's one box that finds a place or a dish by name. Pure (no DOM,
// no I/O), so tested directly. Run: `node --test tests/`.
//
// The deep-link href is the load-bearing bit: a dish result must anchor to
// the exact row menu.js/recipe.js render, so we assert the id scheme here —
// including that a dish with no explicit id still anchors to its slugged name,
// which is what keeps every link shared before ADR 0051 working.

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
    menu: [
      { section: "Beer", items: [{ name: "Pilsner" }] },
      // Both spellings, as the corpus really has them (Kūmara ×5, kumara ×7).
      { section: "Sides", items: [{ name: "Kūmara fries", desc: "With aioli" }, { name: "Kumara wedges" }] },
    ],
  },
  { id: "pauatahanui-inn", name: "Pāuatahanui Inn", area: "Pāuatahanui", cuisine: ["Pub"] },
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
  assert.equal(index.places.length, 5);
  assert.equal(index.dishes.length, 6); // 2 + 3 + 1; the two stubs contribute none
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

test("search: macrons fold both ways — kumara finds kūmara and kūmara finds kumara", () => {
  // The corpus writes both spellings; an iOS keyboard needs a long-press for
  // ū. Before 2026-08-17 `norm` was toLowerCase() alone, so "kumara" found
  // 7 dishes and "kūmara" 3 different ones, and "pauatahanui" found nothing.
  for (const q of ["kumara", "kūmara", "KŪMARA"]) {
    const { dishes } = search(index, q);
    assert.deepEqual(dishes.items.map((d) => d.name).sort(), ["Kumara wedges", "Kūmara fries"], q);
  }
  const { places } = search(index, "pauatahanui");
  assert.equal(places.items[0]?.name, "Pāuatahanui Inn");
  // And the literal form handed back is sliced from the ORIGINAL text — the
  // reader sees the venue's own spelling, macron and all, never the fold.
  const hit = search(index, "kumara").dishes.items.find((d) => d.name === "Kūmara fries");
  assert.equal(hit.matchField, "name");
  assert.equal(hit.matchText, "Kūmara");
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

// ─── Dish identity in the deep link (ADR 0051) ──────────────────────────────
// A result's href is the only thing that gets the reader to the row they
// picked. Before dish ids, three "Cheeseburger" rows produced three identical
// hrefs and the browser could only ever reach the first.

test("search: same-named dishes deep-link to their own rows", () => {
  const idx = buildIndex([
    {
      id: "sprig",
      name: "Sprig",
      cuisine: [],
      menu: [
        {
          section: "Mains",
          items: [{ name: "Cheeseburger", price: 28 }],
        },
        {
          section: "Kids",
          // The FIRST row keeps the bare slug, so only the ones that were
          // unreachable move — see dish-id.js on why nothing shifts on day one.
          items: [{ name: "Cheeseburger", dishId: "cheeseburger-kids", price: 15 }],
        },
      ],
    },
  ]);
  const hrefs = search(idx, "cheeseburger").dishes.items.map((d) => d.href).sort();
  assert.deepEqual(hrefs, [
    "restaurant.html?id=sprig#dish-cheeseburger",
    "restaurant.html?id=sprig#dish-cheeseburger-kids",
  ]);
});

test("search: a recipe with an explicit id links by that id", () => {
  const idx = buildIndex([
    {
      id: "cook-at-home",
      kind: "recipes",
      name: "Cook at Home",
      cuisine: [],
      menu: [{ section: "Mains", items: [{ name: "Ribs", dishId: "shane-s-ribs" }] }],
    },
  ]);
  assert.equal(
    search(idx, "ribs").dishes.items[0].href,
    "recipe.html?id=cook-at-home&dish=shane-s-ribs",
  );
});

// ─── Theme 27b: say which field matched ─────────────────────────────────────
// The haystack stays wide (that's correct — "Charley Noble" is a fair answer
// to "Noble"), but the result row shouldn't let a name/address coincidence
// pass as a cuisine or area match. Every scored item carries `matchField`
// (and `matchText` when that field is one the row displays) so a caller can
// show the reader the real reason, not an implied one.

test("says a place hit is on its name — the roadmap's own 'Pub' finding", () => {
  // A venue named "…Pub" but not tagged as one: the field-priority check
  // must land on "name", never quietly present it as a cuisine match.
  const idx2 = buildIndex([
    { id: "local", name: "The Local Pub", area: "Newtown", cuisine: ["Cafe"], menu: [] },
  ]);
  const [hitPub] = search(idx2, "pub").places.items;
  assert.equal(hitPub.matchField, "name");
  assert.equal(hitPub.matchText, "Pub");
});

test("says a place hit is on area, not name, when only area carries it", () => {
  // "tawa" is also a substring of "Sprig + Fern Tawa"'s own name, so use the
  // WIDE fixture's "The Borough" (area Tawa, name doesn't contain it).
  const [hitArea] = hit("tawa").places.items;
  assert.equal(hitArea.matchField, "area");
  assert.equal(hitArea.matchText, "Tawa");
});

test("says a place hit is on cuisine, not name", () => {
  const [hitCuisine] = search(index, "gastropub").places.items;
  assert.equal(hitCuisine.matchField, "cuisine");
  assert.equal(hitCuisine.matchText, "Gastropub");
});

test("says a place hit found by address has no visible field to highlight", () => {
  const [hitAddress] = hit("cuba").places.items;
  assert.equal(hitAddress.matchField, "address");
  assert.equal(hitAddress.matchText, null);
});

test("says a place hit found by city has no visible field to highlight", () => {
  const [hitCity] = hit("wellington").places.items;
  assert.equal(hitCity.matchField, "city");
  assert.equal(hitCity.matchText, null);
});

test("says a place hit found by phone has no visible field to highlight", () => {
  const [hitPhone] = hit("232 1234").places.items; // leakscan:allow:nz-phone: synthetic fixture, not a real line
  assert.equal(hitPhone.matchField, "phone");
  assert.equal(hitPhone.matchText, null);
});

test("says a place hit found by service has no visible field to highlight", () => {
  const [hitService] = hit("takeaway").places.items;
  assert.equal(hitService.matchField, "service");
  assert.equal(hitService.matchText, null);
});

test("says a dish hit is on its name", () => {
  const [hitDishName] = search(index, "mee goreng").dishes.items;
  assert.equal(hitDishName.matchField, "name");
  assert.equal(hitDishName.matchText, "Mee Goreng");
});

test("says a dish hit found only via ingredients is not a false name match", () => {
  const [hitIngredient] = search(index, "lemon").dishes.items;
  assert.equal(hitIngredient.matchField, "details");
  assert.equal(hitIngredient.matchText, null);
});

test("says a dish hit found only via a diet label is not a false name match", () => {
  const [hitDiet] = hit("vegan").dishes.items;
  assert.equal(hitDiet.matchField, "details");
  assert.equal(hitDiet.matchText, null);
});

// ─── Vibes are searchable (owner request, 2026-08-17) ───────────────────────
// "Quick eats" and "dog friendly" were typed at the box and found nothing: the
// `vibe` vocabulary was in the data and on the cards, but not in the index.
// The style facet at least had a filter; the amenity and character facets —
// 21 of the corpus's 38 taggings — had no way in at all.

const VIBEY = [
  {
    id: "goldings",
    name: "Goldings Free Dive",
    area: "Te Aro",
    cuisine: ["Bar"],
    vibe: ["dog-friendly", "craft-beer", "wellington-icon"],
    menu: [],
  },
  {
    id: "marigold",
    name: "Marigold Takeaway",
    area: "Churton Park",
    cuisine: ["Fish and chips"],
    vibe: ["quick-eats", "family-friendly"],
    menu: [],
  },
  {
    id: "posh",
    name: "The Tasting Room",
    area: "Thorndon",
    cuisine: ["European"],
    vibe: ["fine-dining", "quiz-night"],
    menu: [],
  },
];
const vibey = buildIndex(VIBEY);
const vhit = (q) => search(vibey, q);

test("finds a place by a vibe, typed the way it is LABELLED", () => {
  assert.deepEqual(vhit("dog friendly").places.items.map((p) => p.id), ["goldings"]);
  assert.deepEqual(vhit("quick eats").places.items.map((p) => p.id), ["marigold"]);
  assert.deepEqual(vhit("craft beer").places.items.map((p) => p.id), ["goldings"]);
  assert.deepEqual(vhit("quiz night").places.items.map((p) => p.id), ["posh"]);
});

test("…and typed the way it is STORED — the kebab key a filter URL carries", () => {
  assert.deepEqual(vhit("dog-friendly").places.items.map((p) => p.id), ["goldings"]);
  assert.deepEqual(vhit("wellington-icon").places.items.map((p) => p.id), ["goldings"]);
});

test("a fragment of a vibe finds it — nobody types the whole label", () => {
  assert.deepEqual(vhit("dog").places.items.map((p) => p.id), ["goldings"]);
  assert.deepEqual(vhit("fine din").places.items.map((p) => p.id), ["posh"]);
});

test("the vibe synonyms map onto exactly one vocabulary label", () => {
  assert.deepEqual(vhit("silver service").places.items.map((p) => p.id), ["posh"], "37k's own phrase");
  assert.deepEqual(vhit("grab and go").places.items.map((p) => p.id), ["marigold"]);
  assert.deepEqual(vhit("quick lunch").places.items.map((p) => p.id), ["marigold"], "a former key's words");
  assert.deepEqual(vhit("pub quiz").places.items.map((p) => p.id), ["posh"]);
  assert.deepEqual(vhit("kids").places.items.map((p) => p.id), ["marigold"]);
  assert.deepEqual(vhit("dogs").places.items.map((p) => p.id), ["goldings"], "the plural can't substring-match");
});

test("'fast food' is NOT a synonym — it names a segment, not one of the styles", () => {
  // Deliberate omission, asserted so nobody adds it as an obvious oversight:
  // it would have to pick between quick-eats and counter-order, and picking is
  // guessing. The same bound the rest of SYNONYMS is held to.
  assert.equal(vhit("fast food").places.total, 0);
});

test("a value outside the vocabulary is not searchable", () => {
  // vibesFor() resolves through vibes.js, so data that slipped past
  // validate.py cannot invent a search term. `quick-lunch` is a FORMER key:
  // it must find nothing as a stored value, even though its WORDS are a
  // synonym for the value that replaced it.
  const rogue = buildIndex([{ id: "r", name: "R", cuisine: [], vibe: ["quick-lunch", "speakeasy"], menu: [] }]);
  assert.equal(search(rogue, "speakeasy").places.total, 0);
  assert.equal(search(rogue, "quick-lunch").places.total, 0);
});

test("a vibe hit reports the WHOLE label, so the row can show what matched", () => {
  // Unlike area/cuisine — already on screen, so a slice is enough to
  // highlight — a vibe is not in the row until it matches. app.js appends
  // `matchText` to the sub-line, so it has to be the full label, not the
  // fragment that was typed.
  const [g] = vhit("dog").places.items;
  assert.equal(g.matchField, "vibe");
  assert.equal(g.matchText, "Dog friendly");
  const [m] = vhit("grab and go").places.items;
  assert.equal(m.matchField, "vibe");
  assert.equal(m.matchText, "Quick eats", "a synonym reports the vocabulary's word, not the typed one");
});

test("a name or cuisine hit still wins over a vibe hit on the same place", () => {
  // Field priority, not score: "Marigold" is a name, and the row must not
  // claim a vibe answered a query its name did.
  assert.equal(vhit("marigold").places.items[0].matchField, "name");
  assert.equal(vhit("european").places.items[0].matchField, "cuisine");
});

test("every scored result carries a matchField — no silent gap", () => {
  // Invariant, not a spot check: nothing rank() scores should come back
  // without a stated reason. The "details" fallback exists precisely so a
  // multi-word query that only matches by spanning the space between two
  // adjacent haystack fields still reports something rather than undefined.
  for (const r of [search(index, "sprig"), hit("cuba"), hit("vegan"), hit("tawa")]) {
    for (const p of r.places.items) assert.ok(p.matchField, `place missing matchField for ${p.name}`);
    for (const d of r.dishes.items) assert.ok(d.matchField, `dish missing matchField for ${d.name}`);
  }
});
