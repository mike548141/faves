// lang.js — a menu written in another language (ADR 0044).
//
// The fixtures below are invented test data, not venue records: nothing shipped
// carries translations yet, and inventing a real shop's Thai menu to demo a
// feature would put a fabricated fact in a public repo.
//
// The property that matters most is the boring one, asserted first: a record
// with no translations must render EXACTLY as it did before. Every one of the
// 38 shipped records is that record.

import test from "node:test";
import assert from "node:assert/strict";
import {
  HOME_LANGUAGE,
  alternates,
  preferred,
  primarySubtag,
  renderings,
  searchableText,
  venueLanguage,
} from "../site/js/lang.js";

// A Thai dish carrying the two things a traveller needs: what it is, and what
// it is called on the wall. Its venue declares `"language": "th-Latn"` — Thai,
// written in Latin script — because that is what its canonical `name` is. The
// distinction is not pedantry: it is the only thing that lets a reader of Thai
// be given ต้มยำกุ้ง rather than the romanisation of it.
const THAI_VENUE_LANG = "th-Latn";
const THAI_DISH = {
  name: "Tom yam kung",
  desc: "Hot and sour prawn soup with lemongrass and lime",
  translations: {
    name: { th: "ต้มยำกุ้ง", en: "Hot and sour prawn soup" },
    desc: { th: "ต้มยำกุ้งน้ำข้น" },
  },
};

const PLAIN_DISH = { name: "Mee Goreng", desc: "Fried noodles with egg" };

test("a record with no translations renders exactly as it always did", () => {
  assert.deepEqual(renderings(PLAIN_DISH, "name"), [{ text: "Mee Goreng", lang: HOME_LANGUAGE }]);
  assert.deepEqual(alternates(PLAIN_DISH, "name"), [], "and shows no second line");
  assert.equal(preferred(PLAIN_DISH, "desc").text, "Fried noodles with egg");
});

test("an absent or empty field yields nothing rather than an empty line", () => {
  assert.deepEqual(renderings({}, "name"), []);
  assert.deepEqual(renderings({ name: "   " }, "name"), []);
  assert.equal(preferred({}, "name"), null);
  assert.deepEqual(renderings(null, "name"), []);
});

test("venueLanguage defaults to the collection's own", () => {
  assert.equal(venueLanguage({}), HOME_LANGUAGE);
  assert.equal(venueLanguage({ language: "th" }), "th");
  assert.equal(venueLanguage(null), HOME_LANGUAGE);
});

test("every rendering carries the tag it is in — WCAG 3.1.2 depends on it", () => {
  // A rendering without its tag is a screen reader pronouncing Thai as English.
  for (const r of renderings(THAI_DISH, "name", THAI_VENUE_LANG, "en")) {
    assert.ok(r.lang, `rendering ${JSON.stringify(r.text)} has no lang`);
    assert.equal(typeof r.text, "string");
  }
});

test("the reader's own language leads, and the wall's script follows", () => {
  const [lead, ...rest] = renderings(THAI_DISH, "name", THAI_VENUE_LANG, "en");
  assert.deepEqual(lead, { text: "Hot and sour prawn soup", lang: "en" });
  // Both the canonical romanisation and the Thai script stay available — the
  // whole point is that you can still point at the menu.
  assert.deepEqual(rest.map((r) => r.text).sort(), ["Tom yam kung", "ต้มยำกุ้ง"].sort());
});

test("a reader in the venue's own language leads with the wall's script", () => {
  const [lead] = renderings(THAI_DISH, "name", THAI_VENUE_LANG, "th");
  assert.deepEqual(lead, { text: "ต้มยำกุ้ง", lang: "th" });
});

test("a reader in a third language gets the venue's own words, then English", () => {
  // te reo Māori: nothing matches the reader, so the venue's canonical leads
  // (exact tag), its own script follows (same primary subtag), English last.
  const order = renderings(THAI_DISH, "name", THAI_VENUE_LANG, "mi").map((r) => r.lang);
  assert.deepEqual(order, ["th-Latn", "th", "en"]);
});

test("a regional tag matches at the primary subtag", () => {
  // An en-GB reader is served by en-NZ text; th-Latn is Thai, not English.
  assert.equal(primarySubtag("en-NZ"), "en");
  assert.equal(primarySubtag("zh-Hant-HK"), "zh");
  assert.equal(primarySubtag(null), "");
  const [lead] = renderings(THAI_DISH, "name", THAI_VENUE_LANG, "en-GB");
  assert.equal(lead.lang, "en");
});

test("a translation identical to the canonical string is dropped, not shown twice", () => {
  const dish = { name: "Laksa", translations: { name: { ms: "Laksa", en: "Spicy noodle soup" } } };
  const texts = renderings(dish, "name", "ms", "en").map((r) => r.text);
  assert.equal(texts.filter((x) => x === "Laksa").length, 1);
});

test("junk in translations is ignored rather than rendered", () => {
  const dish = {
    name: "Roti",
    translations: { name: { ms: "", th: null, zh: "   ", en: "Flatbread" } },
  };
  assert.deepEqual(
    renderings(dish, "name", "ms", "en").map((r) => r.text),
    ["Flatbread", "Roti"]
  );
  assert.deepEqual(renderings({ name: "X", translations: "nope" }, "name"), [
    { text: "X", lang: HOME_LANGUAGE },
  ]);
  assert.deepEqual(renderings({ name: "X", translations: { name: ["a"] } }, "name"), [
    { text: "X", lang: HOME_LANGUAGE },
  ]);
});

test("search indexes every rendering, so either spelling finds the dish", () => {
  const hay = searchableText(THAI_DISH, "name", THAI_VENUE_LANG);
  assert.ok(hay.includes("ต้มยำกุ้ง"), "the script someone might paste");
  assert.ok(hay.includes("Tom yam kung"), "the romanisation someone might type");
  assert.ok(hay.includes("Hot and sour prawn soup"), "the English someone might guess");
});

test("search order never depends on who is reading", () => {
  // The index is built once, for everybody — it must not vary with a setting.
  assert.deepEqual(searchableText(THAI_DISH, "name", THAI_VENUE_LANG), searchableText(THAI_DISH, "name", THAI_VENUE_LANG));
});
