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
  activeFilters,
  DEFAULT_FILTERS,
  filterHref,
  filtersFromQuery,
} from "../site/js/filters.js";
// The closure fixture below is built through the REAL fold, not hand-written.
import { resolveRecord } from "../site/js/temporal.js";

// The ranker reads the clock per venue, in that venue's own zone (ADR 0043).
// These tests are about ordering, not timezones, so they hand it a stub that
// answers the same fixed moment for every zone — the shape `makeClock` returns.
const clockAt = (now) => ({ date: new Date(0), at: () => now });

// A small fixture that mirrors the real record shape (see ARCHITECTURE.md).
// `vibe` carries vocabulary KEYS (vibes.js), which is what validate.py enforces
// and what the data was migrated to in 37k — never the raw strings the corpus
// used to hold.
const FIXTURE = [
  { id: "cook", kind: "recipes", area: null, cuisine: [], services: [], vibe: ["sit-down"] },
  {
    id: "kk",
    name: "KK Malaysian",
    area: "Te Aro",
    cuisine: ["Malaysian"],
    services: ["dine-in", "takeaway"],
    vibe: ["sit-down", "byo"],
  },
  {
    id: "rs",
    name: "R & S",
    area: "Te Aro",
    cuisine: ["Malaysian", "Chinese"],
    services: ["dine-in", "takeaway"],
    vibe: ["quick-eats", "cheap-and-cheerful"],
  },
  {
    id: "ktc",
    name: "Khandallah Trading Co",
    area: "Khandallah",
    cuisine: ["Cafe"],
    services: ["dine-in"],
    vibe: ["sit-down", "dog-friendly"],
  },
  {
    id: "churton",
    name: "Takeaway @ Churton",
    area: "Churton Park",
    cuisine: ["Fish and chips"],
    services: ["takeaway"],
    // No `vibe` at all — the case that must not become a silent match.
  },
];

test("deriveFacets: sorted, de-duped, recipes excluded", () => {
  const { areas, cuisines } = deriveFacets(FIXTURE);
  assert.deepEqual(areas, ["Churton Park", "Khandallah", "Te Aro"]);
  // 'Malaysian' appears twice in the data but once in the facet.
  assert.deepEqual(cuisines, ["Cafe", "Chinese", "Fish and chips", "Malaysian"]);
});

test("deriveFacets: the recipes collection contributes no area or cuisine", () => {
  const { areas, cuisines, styles } = deriveFacets([
    { id: "cook", kind: "recipes", area: "Nowhere", cuisine: ["Ghost"], services: [], vibe: ["banquet"] },
  ]);
  assert.deepEqual(areas, []);
  assert.deepEqual(cuisines, []);
  // …and no style either: whatever Cook at Home is, it is not a way of dining
  // out, and an option that can only ever return nothing is a dead end.
  assert.deepEqual(styles, []);
});

test("deriveFacets: tolerates missing area/cuisine fields", () => {
  const { areas, cuisines, styles } = deriveFacets([{ id: "x", name: "X" }]);
  assert.deepEqual(areas, []);
  assert.deepEqual(cuisines, []);
  assert.deepEqual(styles, []);
});

// --- deriveFacets: the style axis (37k) --------------------------------------

test("deriveFacets: styles come back in VOCABULARY order, not alphabetical", () => {
  const { styles } = deriveFacets(FIXTURE);
  // vibes.js orders style by commitment (quick eats → … → fine dining), which
  // is the order a reader compares them in. Alphabetically this would be
  // ["Quick eats", "Sit-down"] too, so the fixture is not proof on its own —
  // the assertion below is.
  assert.deepEqual(styles, [
    { key: "quick-eats", label: "Quick eats" },
    { key: "sit-down", label: "Sit-down" },
  ]);
});

test("deriveFacets: vocabulary order is not alphabetical order", () => {
  const { styles } = deriveFacets([
    { id: "a", cuisine: [], services: [], vibe: ["fine-dining"] },
    { id: "b", cuisine: [], services: [], vibe: ["quick-eats"] },
    { id: "c", cuisine: [], services: [], vibe: ["banquet"] },
  ]);
  // Alphabetically: banquet, fine-dining, quick-eats. By commitment: the
  // reverse-ish order below. The two disagree, which is the point.
  assert.deepEqual(styles.map((s) => s.key), ["quick-eats", "banquet", "fine-dining"]);
});

test("deriveFacets: only styles the data actually carries are offered", () => {
  const { styles } = deriveFacets([{ id: "a", cuisine: [], services: [], vibe: ["sit-down"] }]);
  assert.deepEqual(styles.map((s) => s.key), ["sit-down"]);
});

test("deriveFacets: an amenity or a character tag is not a style", () => {
  // The reason `vibe` is faceted at all: `craft-beer` and `wellington-icon` are
  // 21 of the corpus's 38 taggings, and a style vocabulary that swallowed them
  // would be lying about what it means (vibes.js).
  const { styles } = deriveFacets([
    { id: "a", cuisine: [], services: [], vibe: ["craft-beer", "wellington-icon", "byo"] },
  ]);
  assert.deepEqual(styles, []);
});

test("deriveFacets: a pre-migration string contributes no style", () => {
  // The data was rewritten from raw strings to keys in 37k. A record that
  // somehow still holds "quick-lunch" must not create a phantom option — it is
  // not in the vocabulary, so vibesFor drops it.
  const { styles } = deriveFacets([
    { id: "a", cuisine: [], services: [], vibe: ["quick-lunch", "craft beer"] },
  ]);
  assert.deepEqual(styles, []);
});

test("deriveFacets: tolerates vibe being absent, empty or not an array", () => {
  for (const vibe of [undefined, null, [], "sit-down", 7]) {
    const { styles } = deriveFacets([{ id: "a", cuisine: [], services: [], vibe }]);
    assert.deepEqual(styles, [], `vibe: ${JSON.stringify(vibe)}`);
  }
});

test("applyFilters: defaults return everything, including recipes", () => {
  const shown = applyFilters(FIXTURE, DEFAULT_FILTERS);
  assert.equal(shown.length, FIXTURE.length);
});

test("applyFilters: orderMode=takeaway keeps only takeaway venues, drops recipes", () => {
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, orderMode: "takeaway" });
  assert.deepEqual(shown.map((r) => r.id).sort(), ["churton", "kk", "rs"]);
});

test("applyFilters: orderMode=dine-in", () => {
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, orderMode: "dine-in" });
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

// --- applyFilters: style of dining (37k) ------------------------------------

test("applyFilters: style matches the venue's style facet, not its whole vibe", () => {
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, style: "sit-down" });
  assert.deepEqual(shown.map((r) => r.id).sort(), ["cook", "kk", "ktc"]);
});

test("applyFilters: a venue that is genuinely two styles answers to both", () => {
  // Not hypothetical: `regal-chinese` ships tagged `sit-down` AND `banquet`,
  // and it does both. Matching only the first in vocabulary order left the
  // card rendering a "Banquet" chip while "Banquet" was absent from the filter,
  // measured in real Chrome 2026-08-17 — a dead end in both directions.
  const two = [{ id: "regal", cuisine: [], services: [], vibe: ["sit-down", "banquet"] }];
  assert.deepEqual(applyFilters(two, { ...DEFAULT_FILTERS, style: "sit-down" }).map((r) => r.id), ["regal"]);
  assert.deepEqual(applyFilters(two, { ...DEFAULT_FILTERS, style: "banquet" }).map((r) => r.id), ["regal"]);
  // …and the dropdown offers both, so neither chip names an unreachable option.
  assert.deepEqual(deriveFacets(two).styles.map((s) => s.key), ["sit-down", "banquet"]);
});

test("applyFilters: an amenity cannot answer a style question", () => {
  // "byo" and "sit-down" sit in the same array on `kk`. Asking for a style must
  // read the style facet only — otherwise the vocabulary's facets are decoration.
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, style: "byo" });
  assert.deepEqual(shown, []);
});

test("applyFilters: a venue with no vibe is not silently a match", () => {
  // Same rule as Cheap eats and an unpriced venue: absence of a tag is not
  // evidence of the tag. `churton` carries no vibe at all.
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, style: "quick-eats" });
  assert.deepEqual(shown.map((r) => r.id), ["rs"]);
});

test("applyFilters: style 'all' (the default) keeps every venue, tagged or not", () => {
  assert.equal(applyFilters(FIXTURE, DEFAULT_FILTERS).length, FIXTURE.length);
});

test("applyFilters: a state with no style key at all is a safe no-op", () => {
  // Callers that predate this axis (and the older tests below) hand in a state
  // object without `style`. It must not filter everything out.
  const shown = applyFilters(FIXTURE, { orderMode: "all", area: "all", cuisine: "all" });
  assert.equal(shown.length, FIXTURE.length);
});

test("applyFilters: clauses are AND-ed together", () => {
  const shown = applyFilters(FIXTURE, {
    orderMode: "takeaway",
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

// "Open now" vs a venue that has SHUT DOWN (lifecycle closure, ADR 0023).
//
// LATENT: no venue in `site/data/` carries a closure event today, so this is
// unobservable in the app. The fixture goes through the real `resolveRecord`
// fold rather than hand-writing the `closure` object, so it cannot pass against
// a shape the app never emits.
const shutDown = (id, type) =>
  resolveRecord(
    {
      id,
      services: ["takeaway"],
      cuisine: [],
      hours: dailyHours("09:00", "22:00"), // the posted week still says open
      lifecycle: { added: "2026-07-06", events: [{ type, date: "2026-06-01" }] },
    },
    "2026-08-17"
  );

const CLOSURE_FIXTURE = [
  { id: "open", services: ["takeaway"], cuisine: [], hours: dailyHours("09:00", "22:00") },
  shutDown("gone", "closed-permanently"),
  shutDown("refit", "closed-temporarily"),
];

test("openNow: a shut-down venue drops out whatever its posted hours say", () => {
  const shown = applyFilters(
    CLOSURE_FIXTURE,
    { ...DEFAULT_FILTERS, openNow: true },
    clockAt(MON_NOON)
  );
  assert.deepEqual(shown.map((r) => r.id), ["open"]);
});

test("openNow off: a shut-down venue is STILL LISTED, wearing its badge", () => {
  // Closure demotes and disqualifies; it never hides. The card says
  // "Permanently closed" (closure-ui.js) and that news is the point of keeping
  // the venue on the list at all.
  const shown = applyFilters(CLOSURE_FIXTURE, DEFAULT_FILTERS, clockAt(MON_NOON));
  assert.deepEqual(shown.map((r) => r.id), ["open", "gone", "refit"]);
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
const FACETS = {
  areas: ["Johnsonville", "Te Aro"],
  cuisines: ["Malaysian", "Thai"],
  styles: [
    { key: "quick-eats", label: "Quick eats" },
    { key: "fine-dining", label: "Fine dining" },
  ],
};

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
  assert.deepEqual(got, {
    area: "Johnsonville",
    cuisine: "Malaysian",
    style: "all",
    orderMode: "all",
  });
});

test("filtersFromQuery reads a style KEY, and only a key", () => {
  assert.equal(filtersFromQuery("?style=fine-dining", FACETS).style, "fine-dining");
  // The label is not the value. A link carrying "Fine dining" is not a link the
  // <select> can honour, so it degrades to "all" rather than emptying the list
  // under a control that says nothing is wrong.
  assert.equal(filtersFromQuery("?style=Fine%20dining", FACETS).style, "all");
});

test("filtersFromQuery drops a style the data doesn't have, and a renamed one", () => {
  // "sit-down" is real vocabulary but no venue here carries it; "quick-lunch"
  // is a pre-migration string the vocabulary renamed (vibes.js FORMER_VIBES) —
  // exactly what a link shared before 37k would hold. Both mean "all".
  assert.equal(filtersFromQuery("?style=sit-down", FACETS).style, "all");
  assert.equal(filtersFromQuery("?style=quick-lunch", FACETS).style, "all");
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
  assert.deepEqual(filtersFromQuery("?cuisine=Klingon&area=Mars&style=drive-thru", FACETS), {
    area: "all",
    cuisine: "all",
    style: "all",
    orderMode: "all",
  });
});

test("filtersFromQuery is case- and whitespace-exact, not fuzzy", () => {
  assert.equal(filtersFromQuery("?cuisine=malaysian", FACETS).cuisine, "all");
});

test("filtersFromQuery: no query, empty query, or foreign params → defaults", () => {
  for (const q of ["", "?", "?utm_source=x", undefined]) {
    assert.deepEqual(filtersFromQuery(q, FACETS), {
      area: "all",
      cuisine: "all",
      style: "all",
      orderMode: "all",
    });
  }
});

test("filtersFromQuery survives facets with no areas, cuisines or styles", () => {
  assert.deepEqual(filtersFromQuery("?area=Johnsonville&style=quick-eats", {}), {
    area: "all",
    cuisine: "all",
    style: "all",
    orderMode: "all",
  });
});

// ---------------------------------------------------------------------------
// The order-mode rename's compatibility path (owner-ruled 2026-08-16).
//
// The axis was `service`. The ruling's condition on renaming it was that a URL
// written under the old key keep working — "read the old key, write only the new
// one" — because a link that silently loses its filter shows no error at all,
// just a different set of venues than the sender saw.
//
// ⚠️ Honest about what these guard: the ruling states the filter is "in URLs",
// and it is not — no version of filtersFromQuery has ever read this axis, and
// app.js's syncQuery deliberately never writes it (ADR 0050). So the legacy
// branch protects a link that cannot exist yet rather than one already out
// there. The assertions below are still real assertions about real behaviour —
// each one fails if the branch it names is removed (ADR 0072) — and the day this
// axis becomes shareable they are the reason the old spelling still lands.
// ---------------------------------------------------------------------------

test("filtersFromQuery reads the order-mode axis under its current key", () => {
  assert.equal(filtersFromQuery("?order-mode=takeaway", FACETS).orderMode, "takeaway");
  assert.equal(filtersFromQuery("?order-mode=dine-in", FACETS).orderMode, "dine-in");
});

test("filtersFromQuery: a URL written before the rename still filters (?service=)", () => {
  // THE compatibility assertion. Without the legacy branch this returns "all",
  // and an old link quietly widens to every venue with nothing on screen saying
  // the filter was dropped.
  assert.equal(filtersFromQuery("?service=takeaway", FACETS).orderMode, "takeaway");
  assert.equal(filtersFromQuery("?service=dine-in", FACETS).orderMode, "dine-in");
});

test("an old-key URL narrows the actual list, not just the state", () => {
  // The state value is only half the promise: end to end over the real fixture,
  // an old link must come back with the venues its sender saw.
  const { orderMode } = filtersFromQuery("?service=dine-in", FACETS);
  const shown = applyFilters(FIXTURE, { ...DEFAULT_FILTERS, orderMode });
  assert.deepEqual(shown.map((r) => r.id).sort(), ["kk", "ktc", "rs"]);
  assert.ok(shown.length < FIXTURE.length, "an honoured old link still shortens the list");
});

test("the new key wins when a URL somehow carries both spellings", () => {
  assert.equal(
    filtersFromQuery("?service=takeaway&order-mode=dine-in", FACETS).orderMode,
    "dine-in"
  );
});

test("order mode is validated against its vocabulary under either key", () => {
  // Same rule as the facets: a value no <option> carries means "all", never a
  // control reading "Any service" over a list filtered on something else.
  for (const q of ["?order-mode=delivery", "?service=delivery", "?order-mode=Takeaway"]) {
    assert.equal(filtersFromQuery(q, FACETS).orderMode, "all", q);
  }
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

// --- activeFilters: what the reader is told about a short list ---------------
//
// The filter controls live behind a sheet now, so nothing on the browse screen
// shows their state. Three things do — the "Filters (n)" badge, the chips beside
// the count, and the count itself — and all three read this one function. These
// tests hold the properties that make a hidden filter safe.

test("nothing on: no filters to name, and no badge", () => {
  assert.deepEqual(activeFilters({ ...DEFAULT_FILTERS }), []);
});

test("every kind of filter is named — none can be on and invisible", () => {
  const all = activeFilters({
    orderMode: "takeaway",
    area: "Johnsonville",
    cuisine: "Malaysian",
    style: "fine-dining",
    openNow: true,
    cheap: true,
  });
  assert.equal(all.length, 6);
  assert.deepEqual(
    all.map((f) => f.kind).sort(),
    ["area", "cheap", "cuisine", "openNow", "orderMode", "style"]
  );
  // Every entry can be shown to a person and cleared by its kind.
  for (const f of all) {
    assert.equal(typeof f.label, "string");
    assert.ok(f.label.length > 0);
  }
});

test("the two facets a URL can carry come first, so neither is ever the one folded away", () => {
  // ADR 0050: arriving from a venue's subheading narrows the list without the
  // reader touching this screen, so its escape must survive the chip row's cap.
  const kinds = activeFilters({
    orderMode: "dine-in",
    area: "Te Aro",
    cuisine: "Malaysian",
    style: "sit-down",
    openNow: true,
    cheap: true,
  }).map((f) => f.kind);
  assert.deepEqual(kinds.slice(0, 2), ["cuisine", "area"]);
  // Style is URL-carryable too, but no venue's subheading links one, so it does
  // not share their claim on the first chip slot — it sits third, ahead of the
  // controls a reader can only have set on this screen.
  assert.equal(kinds[2], "style");
});

test("an active style is named by its LABEL, never by its stored key", () => {
  const [f] = activeFilters({ ...DEFAULT_FILTERS, style: "fine-dining" });
  assert.equal(f.kind, "style");
  assert.equal(f.value, "fine-dining"); // what clears it, and what the URL holds
  assert.equal(f.label, "Fine dining"); // what a person reads on the chip
});

test("style 'all' is the absence of a filter, and so is a missing style key", () => {
  assert.deepEqual(activeFilters({ ...DEFAULT_FILTERS, style: "all" }), []);
  assert.deepEqual(activeFilters({ orderMode: "all", openNow: false, cheap: false }), []);
});

test("a sort mode is not a filter — it reorders, it never shortens (ADR 0014)", () => {
  const state = { ...DEFAULT_FILTERS, origin: { lat: -41, lng: 174 }, dest: { lat: -41.1, lng: 174.1 } };
  assert.deepEqual(activeFilters(state), []);
});

test("order mode 'all' is the absence of a filter, not a filter set to everything", () => {
  assert.deepEqual(activeFilters({ ...DEFAULT_FILTERS, orderMode: "all" }), []);
  assert.deepEqual(
    activeFilters({ ...DEFAULT_FILTERS, orderMode: "dine-in" }).map((f) => f.label),
    ["Dine-in"]
  );
});

test("the count matches what applyFilters actually did — badge and list agree", () => {
  // The property that keeps the badge honest: if activeFilters says nothing is
  // on, the list cannot be short.
  const facets = deriveFacets(FIXTURE);
  for (const state of [
    { ...DEFAULT_FILTERS },
    { ...DEFAULT_FILTERS, cuisine: facets.cuisines[0] },
    { ...DEFAULT_FILTERS, orderMode: "takeaway" },
    { ...DEFAULT_FILTERS, style: facets.styles[0].key },
    { ...DEFAULT_FILTERS, cheap: true },
  ]) {
    const shown = applyFilters(FIXTURE, state);
    const n = activeFilters(state).length;
    if (n === 0) assert.equal(shown.length, FIXTURE.length, "no filters ⇒ the whole list");
    else assert.ok(shown.length <= FIXTURE.length);
  }
});

test("a te reo key rides along for the filters that have one; facet values don't get invented ones", () => {
  const byKind = Object.fromEntries(
    activeFilters({
      orderMode: "takeaway",
      area: "Johnsonville",
      cuisine: "Malaysian",
      style: "fine-dining",
      openNow: true,
      cheap: true,
    }).map((f) => [f.kind, f])
  );
  // Chrome strings are translatable…
  assert.equal(byKind.orderMode.key, "orderMode.takeaway");
  assert.equal(byKind.openNow.key, "toggle.openNow");
  assert.equal(byKind.cheap.key, "toggle.cheapEats");
  // …place and cuisine names are content, and are shown as the venues wrote them.
  assert.equal(byKind.area.key, null);
  assert.equal(byKind.cuisine.key, null);
  // A vibe label is ours rather than the venue's, but reo.js carries no gloss
  // for one and inventing a key here would claim a translation that does not
  // exist — the same failure as a `data-i18n` pointing at a missing entry.
  assert.equal(byKind.style.key, null);
});
