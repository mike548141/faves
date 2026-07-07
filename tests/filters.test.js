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
