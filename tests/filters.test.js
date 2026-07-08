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
} from "../site/js/filters.js";

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
  const shown = applyFilters(OPEN_FIXTURE, { ...DEFAULT_FILTERS, openNow: true }, MON_NOON);
  assert.deepEqual(shown.map((r) => r.id), ["open"]);
});

test("openNow off (the default) keeps everything regardless of hours", () => {
  const shown = applyFilters(OPEN_FIXTURE, DEFAULT_FILTERS, MON_NOON);
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
