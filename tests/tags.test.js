// The tag row's ORDER and COLLAPSE rules (tags.js, roadmap 350/020, owner-ruled
// 2026-09-28). Pure logic only — that the row renders, that the "+N" control
// opens and that a declared chip is on screen is tools/focus_check.mjs's job.

import { test } from "node:test";
import assert from "node:assert/strict";
import { orderTags, splitTags, moreLabel, isDeclared, tagTip, TAG_LIMIT } from "../site/js/tags.js";

const LAVA = ["v", "contains-gluten", "contains-dairy", "contains-egg", "contains-nuts", "contains-peanuts", "contains-soy"];
const none = { avoid: new Set(), dietary: new Set() };
const peanutReader = { avoid: new Set(["contains-peanuts"]), dietary: new Set() };

test("allergens come before food preferences", () => {
  const o = orderTags(["v", "spicy-2", "contains-soy", "gf"], none);
  assert.deepEqual(o.slice(0, 1), ["contains-soy"]);
  assert.ok(o.indexOf("contains-soy") < o.indexOf("v"));
});

test("the owner's worked example: his flagged peanut allergy leads the lava cakes' row", () => {
  // Alphabetical alone would put peanuts FIFTH (dairy, egg, gluten, nuts,
  // peanuts). It leads only because it is his — the flagged-first rule.
  const o = orderTags(LAVA, peanutReader);
  assert.equal(o[0], "contains-peanuts");
  assert.deepEqual(o.slice(1, 6), ["contains-dairy", "contains-egg", "contains-gluten", "contains-nuts", "contains-soy"]);
  assert.equal(o[6], "v");
});

test("within each group the order is alphabetical by the words on the chip", () => {
  assert.deepEqual(orderTags(LAVA, none).slice(0, 6), [
    "contains-dairy", "contains-egg", "contains-gluten", "contains-nuts", "contains-peanuts", "contains-soy",
  ]);
  // "DF" < "GF" < "Veg" by label, not by tag id.
  assert.deepEqual(orderTags(["v", "gf", "df"], none), ["df", "gf", "v"]);
});

test("a preference the reader selected leads the preferences", () => {
  const vegan = { avoid: new Set(), dietary: new Set(["vg"]) };
  // `vg-option` serves a declared vegan need, so it leads `gf` and `v`.
  assert.deepEqual(orderTags(["gf", "v", "vg-option"], vegan), ["vg-option", "gf", "v"]);
});

test("heat has no setting, so it sorts with the unselected preferences", () => {
  const o = orderTags(["spicy-1", "v", "contains-soy"], { avoid: new Set(), dietary: new Set(["v"]) });
  assert.deepEqual(o, ["contains-soy", "v", "spicy-1"]);
});

test("non-chip vocabulary is dropped, never painted raw (ADR 0096)", () => {
  assert.deepEqual(orderTags(["has-meat", "has-fish", "contains-fish"], none), ["contains-fish"]);
});

test(`past ${TAG_LIMIT} chips the rest collapse — and a declared allergen NEVER does`, () => {
  const { shown, hidden } = splitTags(orderTags(LAVA, peanutReader), peanutReader);
  assert.equal(shown.length, TAG_LIMIT);
  assert.equal(shown[0], "contains-peanuts");
  assert.equal(hidden.length, LAVA.length - TAG_LIMIT);
  assert.ok(!hidden.includes("contains-peanuts"));
});

test("declared tags are shown even past the limit", () => {
  const many = { avoid: new Set(["contains-dairy", "contains-egg", "contains-gluten", "contains-nuts"]), dietary: new Set() };
  const { shown, hidden } = splitTags(orderTags(LAVA, many), many);
  for (const t of many.avoid) assert.ok(shown.includes(t), `${t} was hidden`);
  assert.ok(hidden.every((t) => !isDeclared(t, many.avoid, many.dietary)));
});

test("no collapse that would hide only one chip — a '+1' costs the space it saves", () => {
  const four = ["contains-dairy", "contains-egg", "contains-gluten", "v"];
  assert.deepEqual(splitTags(orderTags(four, none), none), { shown: orderTags(four, none), hidden: [] });
  // …while five collapses two.
  const five = [...four, "gf"];
  assert.equal(splitTags(orderTags(five, none), none).hidden.length, 2);
});

test("the control SAYS what it hides, so a hidden allergen is never silent", () => {
  assert.equal(moreLabel(["contains-soy", "contains-nuts"]), "⚠ +2 allergens");
  assert.equal(moreLabel(["contains-soy"]), "⚠ +1 allergen");
  assert.equal(moreLabel(["contains-soy", "contains-nuts", "v"]), "⚠ +2 allergens, 1 more");
  assert.equal(moreLabel(["v", "gf"]), "+2 more");
});

test("a tip quotes the dish's own note, and says only 'recorded' without one", () => {
  const note = "The menu says “aioli” — an egg emulsion.";
  assert.equal(tagTip("contains-egg", { note }), `${note} If it matters, check with the venue.`);
  assert.equal(tagTip("contains-egg", {}), "Recorded when this menu was entered. If it matters, check with the venue.");
  assert.equal(tagTip("contains-egg", { recipe: true }), "Marked on this recipe.");
});

test("a tip leads with the reader's own reason, and names an add-on's tag as the add-on's", () => {
  const avoid = new Set(["contains-egg"]);
  assert.match(tagTip("contains-egg", { avoid, recipe: true }), /^You asked to avoid this\. /);
  assert.match(tagTip("contains-fish", { fromAddOn: true, note: "ignored" }), /^From an add-on you picked\./);
});
