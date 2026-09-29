// The tag row's ORDER and COLLAPSE rules (tags.js, roadmap 350/020, owner-ruled
// 2026-09-28). Pure logic only — that the row renders, that the "+N" control
// opens and that a declared chip is on screen is tools/focus_check.mjs's job.

import { test } from "node:test";
import assert from "node:assert/strict";
import { orderTags, splitTags, moreLabel, isDeclared, tagTip, TAG_LIMIT, TAG_MIN_FOLD, traceEntries, liveTrace, traceLine } from "../site/js/tags.js";

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

// The owner's worked rule at N = 2 (2026-09-29): two chips both show; three or
// more fold the rest. Asserted on the SHIPPED constants, so moving either one
// is a decision this test makes somebody read.
test(`${TAG_LIMIT} chips all show; ${TAG_LIMIT + TAG_MIN_FOLD} fold ${TAG_MIN_FOLD}`, () => {
  const tags = ["contains-dairy", "contains-egg", "contains-gluten", "v", "gf"];
  const two = tags.slice(0, TAG_LIMIT);
  assert.deepEqual(splitTags(orderTags(two, none), none), { shown: orderTags(two, none), hidden: [] });
  const three = tags.slice(0, TAG_LIMIT + TAG_MIN_FOLD);
  const s = splitTags(orderTags(three, none), none);
  assert.equal(s.shown.length, TAG_LIMIT);
  assert.equal(s.hidden.length, TAG_MIN_FOLD);
});

test("minFold still stops a too-small collapse when set above 1", () => {
  const four = ["contains-dairy", "contains-egg", "contains-gluten", "v"];
  const opts = { ...none, limit: 3, minFold: 2 };
  assert.deepEqual(splitTags(orderTags(four, none), opts), { shown: orderTags(four, none), hidden: [] });
  const five = [...four, "gf"];
  assert.equal(splitTags(orderTags(five, none), opts).hidden.length, 2);
});

test("a declared tag never folds, even when only it would be past the limit", () => {
  const reader = { avoid: new Set(["contains-gluten"]), dietary: new Set() };
  const three = ["contains-dairy", "contains-egg", "contains-gluten"];
  const { shown, hidden } = splitTags(orderTags(three, reader), reader);
  assert.ok(shown.includes("contains-gluten"));
  assert.ok(!hidden.includes("contains-gluten"));
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

// ── The "may contain" tier (ADR 0136; owner rulings 110/020 and 350/020) ──
// The lava cakes as they now read: peanuts and nuts only on the Whittaker's
// label's "may be present", so they are TRACE, never tags.
const LAVA_NOW = ["v", "contains-gluten", "contains-dairy", "contains-egg", "contains-soy"];
const LAVA_TRACE = traceEntries({ trace: ["contains-peanuts", "contains-nuts"], traceSource: "Whittaker's label" });

test("an unflagged reader gets NO trace chip — the row is the present allergens only", () => {
  const o = orderTags(LAVA_NOW, { ...none, trace: LAVA_TRACE });
  assert.equal(o.some((t) => t.startsWith("trace:")), false);
  assert.equal(o.includes("contains-peanuts"), false);
});

test("a reader who FLAGGED a traced allergen gets a 'May contain' chip, after their present ones", () => {
  const reader = { avoid: new Set(["contains-peanuts", "contains-dairy"]), dietary: new Set() };
  const o = orderTags(LAVA_NOW, { ...reader, trace: LAVA_TRACE });
  assert.deepEqual(o.slice(0, 2), ["contains-dairy", "trace:contains-peanuts"]);
  // Only the flagged one: nuts is traced too, and this reader did not flag it.
  assert.equal(o.includes("trace:contains-nuts"), false);
});

test("a flagged trace chip is declared, so it is never folded behind the control", () => {
  const o = orderTags(LAVA_NOW, { ...peanutReader, trace: LAVA_TRACE });
  const { shown } = splitTags(o, { ...peanutReader, limit: 1 });
  assert.ok(shown.includes("trace:contains-peanuts"));
  assert.ok(isDeclared("trace:contains-peanuts", peanutReader.avoid, new Set()));
});

test("present wins: an allergen in the tags is never also 'may contain'", () => {
  const live = liveTrace(["contains-peanuts"], LAVA_TRACE);
  assert.deepEqual(live.map((e) => e.tag), ["contains-nuts"]);
  const o = orderTags(["contains-peanuts"], { ...peanutReader, trace: LAVA_TRACE });
  assert.deepEqual(o, ["contains-peanuts"]);
});

test("every tip on the dish carries the trace line, naming its source", () => {
  const live = liveTrace(LAVA_NOW, LAVA_TRACE);
  assert.equal(traceLine(live), "May contain traces of peanuts and nuts — Whittaker's label.");
  const tip = tagTip("contains-dairy", { ...none, recipe: true, note: "From the ingredients: butter.", trace: live });
  assert.match(tip, /^From the ingredients: butter\. May contain traces of peanuts and nuts — Whittaker's label\.$/);
  assert.match(tagTip("v", { ...none, recipe: true, trace: live }), /May contain traces of peanuts and nuts/);
});

test("the trace chip's own tip says it is a warning, not an ingredient", () => {
  const live = liveTrace(LAVA_NOW, LAVA_TRACE);
  const tip = tagTip("trace:contains-peanuts", { ...peanutReader, recipe: true, trace: live });
  // One sentence for the one source — the owner's complaint was the same
  // label named twice and the point made three times (2026-09-29).
  assert.equal(tip, "You avoid peanuts. Whittaker's label warns of possible traces of peanuts and nuts. Not an ingredient.");
  assert.equal(tip.split("Whittaker's label").length - 1, 1);
});

test("the trace chip's tip keeps two sources apart and adds the venue check off a recipe", () => {
  const live = liveTrace([], [
    { tag: "contains-nuts", source: "Label A" },
    { tag: "contains-sesame", source: "Label B" },
  ]);
  const tip = tagTip("trace:contains-sesame", { avoid: new Set(["contains-sesame"]), trace: live });
  assert.equal(tip, "You avoid sesame. Label B warns of possible traces of sesame. Label A warns of possible traces of nuts. Not an ingredient. If it matters, check with the venue.");
});

test("two sources are never merged into one claim neither made", () => {
  const live = liveTrace([], [
    { tag: "contains-nuts", source: "Label A" },
    { tag: "contains-sesame", source: "Label B" },
  ]);
  assert.equal(traceLine(live), "May contain traces of nuts — Label A. May contain traces of sesame — Label B.");
});

test("a dish with no trace carries no trace line — nothing moves for the other 4,000 dishes", () => {
  assert.equal(traceLine(liveTrace(LAVA_NOW, traceEntries({}))), "");
  assert.equal(tagTip("contains-dairy", { ...none, recipe: true, note: "x." }), "x.");
});
