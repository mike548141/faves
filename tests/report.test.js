// Unit tests for site/js/report.js — the "tell us what's wrong" composer
// (ADR 0028). The value of reporting from the dish rather than a blank form is
// entirely in what the text carries, so these assert the *context* survives
// composition: venue id and name, dish name, the value the device is currently
// showing, the venue's verified date, and the installed version stamps.
//
// Two properties here are load-bearing rather than cosmetic:
//   • every report ends with the never-a-live-edit safety line, and
//   • an allergen report with no tags says "not stated", never "allergen-free".
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REPORT_TYPES,
  composeReport,
  money,
  reportSubject,
  reportType,
  typesForScope,
} from "../site/js/report.js";

const VENUE = { id: "kk-malaysian", name: "KK Malaysian", verified: "2026-07-10" };
const DISH = {
  name: "Char kway teow",
  price: 18.5,
  tags: ["contains-peanuts", "spicy-1"],
};
const VERSIONS = { shell: "2026-08-09.5", data: "2026-08-09.3" };

const priceReport = (over = {}) =>
  composeReport({ type: "price", venue: VENUE, dish: DISH, versions: VERSIONS, ...over });

test("a dish report carries the venue, the dish and the value on screen", () => {
  const text = priceReport({ url: "https://example.test/restaurant.html?id=kk-malaysian" });
  assert.match(text, /KK Malaysian/);
  assert.match(text, /kk-malaysian/);
  assert.match(text, /Char kway teow/);
  assert.match(text, /\$18\.50/);
  assert.match(text, /menu last checked: 2026-07-10/);
  assert.match(text, /app version: 2026-08-09\.5/);
  assert.match(text, /menu data: 2026-08-09\.3/);
  assert.match(text, /page: https:\/\/example\.test\/restaurant\.html\?id=kk-malaysian/);
});

test("the report says which stream it belongs to", () => {
  assert.match(priceReport(), /goes to: the menu data/);
  assert.match(
    composeReport({ type: "app", versions: VERSIONS }),
    /goes to: the app roadmap/
  );
});

// SAFETY. The whole feature is only acceptable because a report is a suggestion
// to a human, never an edit. If this line ever stops shipping, the UI is making
// a promise the pipeline doesn't keep.
test("every report type ends with the never-a-live-edit safety line", () => {
  for (const t of REPORT_TYPES) {
    const text = composeReport({ type: t.key, venue: VENUE, dish: DISH, versions: VERSIONS });
    assert.match(
      text,
      /Nothing in the app changes until a person checks it/,
      `${t.key} lost the safety line`
    );
    assert.match(text, /never edits a menu, a price or an allergen tag/, t.key);
  }
});

// "No tag = not stated" (ARCHITECTURE.md). Absence of an allergen tag must never
// be reported to the owner as absence of the allergen.
test("an allergen report with no tags says 'not stated', not 'allergen-free'", () => {
  const text = composeReport({
    type: "allergen",
    venue: VENUE,
    dish: { name: "Roti canai", price: 6, tags: [] },
    versions: VERSIONS,
  });
  assert.match(text, /no tag means not stated, not allergen-free/);
  assert.doesNotMatch(text, /has no allergens/);
});

test("an allergen report lists only the allergen tags in the human sentence", () => {
  const text = composeReport({ type: "allergen", venue: VENUE, dish: DISH, versions: VERSIONS });
  assert.match(text, /showing these allergen tags: contains-peanuts\./);
  // …while the machine block still carries every tag, spicy-1 included.
  assert.match(text, /tags shown: contains-peanuts, spicy-1/);
});

test("a missing price is reported as missing, never as $0", () => {
  const text = composeReport({
    type: "price",
    venue: VENUE,
    dish: { name: "Market fish", price: null, tags: [] },
    versions: VERSIONS,
  });
  assert.match(text, /no price recorded/);
  assert.match(text, /price shown: none recorded/);
  assert.doesNotMatch(text, /\$0/);
});

test("the free-text note is included when given and absent when not", () => {
  assert.match(priceReport({ note: "  it’s $19.50 now  " }), /My note:\nit’s \$19\.50 now/);
  assert.doesNotMatch(priceReport({ note: "   " }), /My note:/);
  assert.doesNotMatch(priceReport(), /My note:/);
});

test("a suggest-a-place report carries no venue or dish lines", () => {
  const text = composeReport({
    type: "suggest",
    note: "Little Penang on Dixon St",
    versions: VERSIONS,
  });
  assert.match(text, /Suggest a place for Faves/);
  assert.match(text, /Little Penang on Dixon St/);
  assert.doesNotMatch(text, /^venue:/m);
  assert.doesNotMatch(text, /^dish:/m);
  assert.doesNotMatch(text, /^price shown:/m);
});

// A device that has never stored the app offline has no version stamps. Say so
// rather than omitting the line — "unknown" is information; silence is ambiguous
// with "the reporter stripped it".
test("unknown version stamps say so", () => {
  const text = composeReport({ type: "app", versions: { shell: null, data: null } });
  assert.match(text, /app version: unknown/);
  assert.match(text, /menu data: unknown/);
});

test("a venue report keeps the venue context without inventing a dish", () => {
  const text = composeReport({ type: "venue-other", venue: VENUE, versions: VERSIONS });
  assert.match(text, /venue: KK Malaysian \(kk-malaysian\)/);
  assert.doesNotMatch(text, /^dish:/m);
  assert.doesNotMatch(text, /^tags shown:/m);
});

test("the dish's order code rides along when the venue takes orders by number", () => {
  const text = composeReport({
    type: "price",
    venue: VENUE,
    dish: { ...DISH, code: "14" },
    versions: VERSIONS,
  });
  assert.match(text, /order code: #14/);
});

// No recipient is baked in anywhere (the repo is publication-bound and the
// audience already has a channel to whoever shared Faves with them).
test("no contact detail is baked into any report", () => {
  for (const t of REPORT_TYPES) {
    const text = composeReport({ type: t.key, venue: VENUE, dish: DISH, versions: VERSIONS });
    assert.doesNotMatch(text, /@/, `${t.key} contains an @`);
    assert.doesNotMatch(text, /\+?\d[\d ]{7,}/, `${t.key} contains a phone-like number`);
    assert.match(text, /whoever shared Faves with you/, `${t.key} lost the "send it to" line`);
  }
});

test("scopes decide what each entry point offers", () => {
  assert.deepEqual(
    typesForScope("dish").map((t) => t.key),
    ["price", "allergen", "gone", "dish-other"]
  );
  assert.deepEqual(typesForScope("venue").map((t) => t.key), ["venue-other", "app"]);
  assert.deepEqual(typesForScope("app").map((t) => t.key), ["suggest", "app"]);
  assert.equal(typesForScope("nope").length, 0);
});

// The allergen label must NOT carry a reo key — reo.js's safety boundary keeps
// allergen wording English until a native review, and it does that by having no
// key to look up.
test("the allergen type has no reo key (safety boundary)", () => {
  assert.equal(reportType("allergen").i18n, undefined);
  for (const t of REPORT_TYPES) {
    if (t.key !== "allergen") assert.ok(t.i18n, `${t.key} should have a reo key`);
  }
});

test("money mirrors the menu's own formatting", () => {
  assert.equal(money(18.5), "$18.50");
  assert.equal(money(18), "$18");
  assert.equal(money(0), "$0");
  assert.equal(money(null), null);
  assert.equal(money(undefined), null);
});

test("the share-sheet subject names what it's about without claiming it's wrong", () => {
  assert.equal(
    reportSubject({ type: "price", venue: VENUE, dish: DISH }),
    "Faves — The price is wrong: Char kway teow, KK Malaysian"
  );
  assert.equal(reportSubject({ type: "suggest" }), "Faves — Suggest a place for Faves");
  assert.equal(reportSubject({}), "Faves — Faves feedback");
});
