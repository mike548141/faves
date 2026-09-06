// Unit tests for the autocomplete ranker (site/js/suggest.js).
//
// Two things here are load-bearing and everything else is ordering detail:
//
//  1. A FILTER SUGGESTION NEVER REPLACES THE TEXT RESULTS. The whole reason
//     search suggests rather than commands is that "vegetarian" is a real dish
//     name in this corpus. The test below uses the actual dish names from
//     R & S Satay Noodle House and KK Malaysian, so if anyone ever "simplifies"
//     this into a command it fails against real data rather than a fixture.
//  2. NO SUGGESTION MAY ASSERT AN ALLERGEN IS ABSENT. "nut free" must find
//     nothing, for the same reason search.js's synonym map refuses it.
//
// Run: `node --test tests/`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_QUERY,
  filterCandidates,
  textCandidate,
  rankSuggestions,
} from "../site/js/suggest.js";

const FILTERS = [
  { key: "fav", label: "Favourites", icon: "♥" },
  { key: "v", label: "Vegetarian" },
  { key: "vg", label: "Vegan" },
  { key: "gf", label: "Gluten free" },
  { key: "df", label: "Dairy free" },
];

// Real rows from the corpus, not invented ones.
const DISHES = [
  "Vegetarian Satay",
  "Vegetarian Chew Kua Teaw",
  "Vegetarian Laksa",
  "Vegetarian Curry",
  "Mee Goreng",
  "Roti Chanai",
  "Kūmara fries",
];

const candidates = () => [
  ...filterCandidates(FILTERS),
  ...DISHES.map((d) => textCandidate({ id: `dish:${d}`, kind: "dish", label: d })),
];

// --- the threshold --------------------------------------------------
test("a query under MIN_QUERY opens nothing", () => {
  assert.equal(MIN_QUERY, 2);
  assert.deepEqual(rankSuggestions("v", candidates()), []);
  assert.deepEqual(rankSuggestions("", candidates()), []);
  assert.deepEqual(rankSuggestions("  ", candidates()), []);
});

// --- the whole point ------------------------------------------------
test("'vegetarian' offers the FILTER and still offers the dishes named Vegetarian", () => {
  const out = rankSuggestions("vegetarian", candidates(), { limit: 10 });
  assert.equal(out[0].kind, "filter", "the filter leads — nobody scrolls an autocomplete");
  assert.equal(out[0].key, "v");
  const dishNames = out.filter((c) => c.kind === "dish").map((c) => c.label);
  assert.deepEqual(dishNames, [
    "Vegetarian Chew Kua Teaw",
    "Vegetarian Curry",
    "Vegetarian Laksa",
    "Vegetarian Satay",
  ], "all four real dishes survive — this is what a command reading would destroy");
});

test("an alias finds the filter but the row still reads as the LABEL", () => {
  for (const [typed, key, label] of [
    ["veg", "v", "Vegetarian"],
    ["faves", "fav", "Favourites"],
    ["coeliac", "gf", "Gluten free"],
    ["plant based", "vg", "Vegan"],
    ["no dairy", "df", "Dairy free"],
    ["favorites", "fav", "Favourites"], // US spelling: what people type
  ]) {
    const out = rankSuggestions(typed, candidates(), { limit: 10 });
    const hit = out.find((c) => c.kind === "filter");
    assert.ok(hit, `"${typed}" found no filter`);
    assert.equal(hit.key, key, `"${typed}" found the wrong filter`);
    assert.equal(hit.label, label, `"${typed}" must display the chip's label, not the typed word`);
  }
});

// --- the safety line ------------------------------------------------
test("no suggestion asserts the ABSENCE of an allergen", () => {
  for (const q of ["nut free", "nut-free", "peanut free", "no nuts", "allergen free", "shellfish free"]) {
    const out = rankSuggestions(q, candidates(), { limit: 10 });
    assert.deepEqual(out.filter((c) => c.kind === "filter"), [],
      `"${q}" must offer no filter — this app never asserts an allergen is absent`);
  }
});

test("'gluten free' and 'dairy free' DO suggest — they are claims a venue made", () => {
  // The distinction the test above is protecting: gf/df are positive tags in
  // the data; "nut free" is not a tag and must never become one.
  assert.equal(rankSuggestions("gluten free", candidates())[0].key, "gf");
  assert.equal(rankSuggestions("dairy free", candidates())[0].key, "df");
});

// --- ranking ---------------------------------------------------------
test("a prefix beats a later word, which beats a mid-word hit", () => {
  const cands = [
    textCandidate({ id: "a", kind: "dish", label: "Laksa noodles" }),   // prefix
    textCandidate({ id: "b", kind: "dish", label: "Curry laksa" }),     // later word
    textCandidate({ id: "c", kind: "dish", label: "Belaksan paste" }),  // mid-word
  ];
  assert.deepEqual(rankSuggestions("laksa", cands, { limit: 3 }).map((c) => c.id), ["a", "b", "c"]);
});

test("macrons fold both ways, as they do in search", () => {
  const c = candidates();
  assert.ok(rankSuggestions("kumara", c).some((x) => x.label === "Kūmara fries"));
  assert.ok(rankSuggestions("kūmara", c).some((x) => x.label === "Kūmara fries"));
});

test("ties are stable between keystrokes — a list that reshuffles causes mis-taps", () => {
  const a = rankSuggestions("vegetarian", candidates(), { limit: 10 }).map((c) => c.id);
  const b = rankSuggestions("vegetarian", candidates(), { limit: 10 }).map((c) => c.id);
  assert.deepEqual(a, b);
});

test("limit is honoured", () => {
  assert.equal(rankSuggestions("vegetarian", candidates(), { limit: 2 }).length, 2);
});

test("filterCandidates offers only the filters it was handed", () => {
  // The availability/honesty rule: a menu with no vegan dish hands no vegan
  // filter in, so no amount of typing "vegan" can suggest one.
  const only = filterCandidates([{ key: "fav", label: "Favourites" }]);
  assert.deepEqual(rankSuggestions("vegan", only), []);
});

test("a candidate with no match is dropped, and junk input never throws", () => {
  assert.deepEqual(rankSuggestions("zzzz", candidates()), []);
  assert.deepEqual(rankSuggestions("veg", null), []);
  assert.deepEqual(rankSuggestions(null, candidates()), []);
});
