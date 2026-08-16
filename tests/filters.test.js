// Unit tests for the pure filter logic (site/js/filters.js) — the home
// screen's facets and the AND-combined filter used by both the card grid
// and the "Pick for us" shuffle. Run: `node --test tests/` (or `npm test`).
//
// filters.js is pure (no DOM, no I/O), so it's testable directly. Newly
// added pure logic should arrive with a test like this one.
//
// Discovery: `node --test` finds every *.test.js under the tree, so new
// test files just need that suffix.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveFacets,
  applyFilters,
  DEFAULT_FILTERS,
  filterHref,
  filtersFromQuery,
} from "../site/js/filters.js";

// The ranker reads the clock per venue, in that venue's own zone (ADR 0043).
// These tests are about ordering, not timezones, so they hand it a stub that
// answers the same fixed moment for every zone — the shape `makeClock` returns.
const clockAt = (now) => ({ date: new Date(0), at: () => now });

// A small fixture that mirrors the real record shape (see ARCHITECTURE.md).
const FIXTURE = [
  { id: "cook", kind: "recipes", area: null, cuisine: [], services: [] },
  {
    id: "kk",
    name: "KK Malaysian",
    area: "Te Aro",
    cuisine: ["Malaysian"],
    services: ["dine-in", "takeaway"],
  },
  {
    id: "rs",
    name: "R & S",
    area: "Te Aro",
    cuisine: ["Malaysian", "Chinese"],
    services: ["dine-in", "takeaway"],
  },
  {
    id: "ktc",
    name: "Khandallah Trading Co",
    area: "Khandallah",
    cuisine: ["Cafe"],
    services: ["dine-in"],
  },
  {
    id: "churton",
    name: "Takeaway @ Churton",
    area: "Churton Park",
    cuisine: ["Fish and chips"],
    services: ["takeaway"],
  },
];

test("deriveFacets: sorted, de-duped, recipes excluded", () => {
  const { areas, cuisines } = deriveFacets(FIXTURE);
  assert.deepEqual(areas, ["Churton Park", "Khandallah", "Te Aro"]);
  // 'Malaysian' appears twice in the data but once in the facet.
  assert.deepEqual(cuisines, ["Cafe", "Chinese", "Fish and chips", "Malaysian"]);
});

test("deriveFacets: the recipes collection contributes no area or cuisine", () => {
  const { areas, cuisines } = deriveFacets([
    { id: "cook", kind: "recipes", area: "Nowhere", cuisine: ["Ghost"], services: [] },
  ]);
  assert.deepEqual(areas, []);
  assert.deepEqual(cuisines, []);
});

test("deriveFacets: tolerates missing area/cuisine fields", () => {
  const { areas, cuisines } = deriveFacets([{ id: "x", name: "X" }]);
  assert.deepEqual(areas, []);
  assert.deepEqual(cuisines, []);
});

test("applyFilters: defaults return everything, including recipes", () => {
  const shown = applyFilters(FIXTURE, DEFAULT_FILTERS);
  assert.equal(shown.length, FIXTURE.length);
});

test("applyFilters: service=takeaway keeps only takeaway venues, drops recipes", () => {
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, service: "takeaway" });
  assert.deepEqual(shown.map((r) => r.id).sort(), ["churton", "kk", "rs"]);
});

test("applyFilters: service=dine-in", () => {
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, service: "dine-in" });
  assert.deepEqual(shown.map((r) => r.id).sort(), ["kk", "ktc", "rs"]);
});

test("applyFilters: area is an exact match", () => {
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, area: "Te Aro" });
  assert.deepEqual(shown.map((r) => r.id).sort(), ["kk", "rs"]);
});

test("applyFilters: cuisine matches any of a venue's cuisines", () => {
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, cuisine: "Chinese" });
  assert.deepEqual(shown.map((r) => r.id), ["rs"]);
});

test("applyFilters: clauses are AND-ed together", () => {
  const shown = applyFilters(FIXTURE, {
    service: "takeaway",
    area: "Te Aro",
    cuisine: "Malaysian",
  });
  assert.deepEqual(shown.map((r) => r.id).sort(), ["kk", "rs"]);
});

test("applyFilters: an over-constrained filter yields nothing", () => {
  const shown = applyFilters(FIXTURE, {
    ...DEFAULT_FILTERS,
    area: "Khandallah",
    cuisine: "Malaysian",
  });
  assert.deepEqual(shown, []);
});

// "Open now" filter — needs the hours engine + a fixed `now`.
const dailyHours = (o, c) =>
  Object.fromEntries(["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, [[o, c]]]));

const OPEN_FIXTURE = [
  { id: "open", services: ["takeaway"], cuisine: [], hours: dailyHours("09:00", "22:00") },
  { id: "shut", services: ["takeaway"], cuisine: [], hours: dailyHours("18:00", "22:00") },
  { id: "nohours", services: ["takeaway"], cuisine: [], hours: null },
  { id: "cook", kind: "recipes", services: [], cuisine: [] },
];
const MON_NOON = { dow: 1, minutes: 12 * 60 };

test("openNow: keeps only currently-open venues; unknown-hours + recipes drop", () => {
  const shown = applyFilters(OPEN_FIXTURE, { ...DEFAULT_FILTERS, openNow: true }, clockAt(MON_NOON));
  assert.deepEqual(shown.map((r) => r.id), ["open"]);
});

test("openNow off (the default) keeps everything regardless of hours", () => {
  const shown = applyFilters(OPEN_FIXTURE, DEFAULT_FILTERS, clockAt(MON_NOON));
  assert.equal(shown.length, 4);
});

test("openNow with no `now` is a safe no-op", () => {
  const shown = applyFilters(OPEN_FIXTURE, { ...DEFAULT_FILTERS, openNow: true });
  assert.equal(shown.length, 4);
});

// "Cheap eats" filter — needs priced menus (see price.isCheapEats: $ band only).
const menuOf = (...prices) => [{ section: "All", items: prices.map((price, i) => ({ name: `d${i}`, price })) }];
const CHEAP_FIXTURE = [
  { id: "cheap", services: [], cuisine: [], menu: menuOf(8, 10, 12) }, // median 10 → $
  { id: "mid", services: [], cuisine: [], menu: menuOf(18, 24, 30) }, // $$
  { id: "thin", services: [], cuisine: [], menu: menuOf(6, 6) }, // < 3 priced → no band
  { id: "cook", kind: "recipes", services: [], cuisine: [], menu: menuOf(5, 5, 5) },
];

test("cheap: keeps only $ venues; unpriced/thin/recipes drop out", () => {
  const shown = applyFilters(CHEAP_FIXTURE, { ...DEFAULT_FILTERS, cheap: true });
  assert.deepEqual(shown.map((r) => r.id), ["cheap"]);
});

test("cheap off (the default) keeps every venue regardless of price", () => {
  const shown = applyFilters(CHEAP_FIXTURE, DEFAULT_FILTERS);
  assert.equal(shown.length, 4);
});

// Facet links: a menu page's subheading routes back into this list carrying a
// filter (`index.html?cuisine=Malaysian`). menu.js writes those URLs and app.js
// reads them, so both ends are tested here against the one pair of helpers.
const FACETS = { areas: ["Johnsonville", "Te Aro"], cuisines: ["Malaysian", "Thai"] };

test("filterHref points at the home list with the facet as a query param", () => {
  assert.equal(filterHref("cuisine", "Malaysian"), "index.html?cuisine=Malaysian");
  assert.equal(filterHref("area", "Te Aro"), "index.html?area=Te%20Aro");
});

test("filterHref escapes values that would otherwise break the URL", () => {
  // A cuisine with an ampersand ("Fish & chips") would truncate the query.
  assert.equal(filterHref("cuisine", "Fish & chips"), "index.html?cuisine=Fish%20%26%20chips");
});

test("filtersFromQuery reads a known area and cuisine back out", () => {
  const got = filtersFromQuery("?cuisine=Malaysian&area=Johnsonville", FACETS);
  assert.deepEqual(got, { area: "Johnsonville", cuisine: "Malaysian" });
});

test("filtersFromQuery round-trips what filterHref wrote, escaping included", () => {
  const href = filterHref("area", "Te Aro");
  const got = filtersFromQuery(href.slice(href.indexOf("?")), FACETS);
  assert.equal(got.area, "Te Aro");
});

test("filtersFromQuery drops a value the data doesn't have", () => {
  // The trap this exists for: a <select> with no matching <option> falls back
  // to "All cuisines" while the state filters on the unknown value — a control
  // that says one thing over a list doing another. Unknown must mean "all".
  assert.deepEqual(filtersFromQuery("?cuisine=Klingon&area=Mars", FACETS), {
    area: "all",
    cuisine: "all",
  });
});

test("filtersFromQuery is case- and whitespace-exact, not fuzzy", () => {
  assert.equal(filtersFromQuery("?cuisine=malaysian", FACETS).cuisine, "all");
});

test("filtersFromQuery: no query, empty query, or foreign params → defaults", () => {
  for (const q of ["", "?", "?utm_source=x", undefined]) {
    assert.deepEqual(filtersFromQuery(q, FACETS), { area: "all", cuisine: "all" });
  }
});

test("filtersFromQuery survives facets with no areas or cuisines", () => {
  assert.deepEqual(filtersFromQuery("?area=Johnsonville", {}), {
    area: "all",
    cuisine: "all",
  });
});

test("a filterHref value always filters to venues that actually carry it", () => {
  // End to end over the real fixture: link built from a venue's own facet →
  // parsed → applied → that venue is in the result.
  const kk = FIXTURE.find((r) => r.id === "kk");
  const facets = deriveFacets(FIXTURE);
  const href = filterHref("cuisine", kk.cuisine[0]);
  const parsed = filtersFromQuery(href.slice(href.indexOf("?")), facets);
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, ...parsed });
  assert.ok(shown.some((r) => r.id === "kk"));
  assert.ok(shown.every((r) => r.cuisine.includes("Malaysian")));
});
