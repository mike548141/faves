// Unit tests for how many a group asks for and what extras cost (ADR 0163,
// roadmap 200/140): `min` on a pick-many group, and `included` + `extraPrice`.
//
// The claim that matters most is the NEGATIVE one: a group that states none of
// the three behaves exactly as it did before they existed. Every positive case
// below is paired with that control.
//
// Run: `node --test tests/`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  minOf,
  owed,
  missingRequired,
  extraFee,
  ruleText,
  feeClause,
  owedSentence,
  configuredPrice,
  selectionAllowed,
  isMustSee,
  isRequired,
} from "../site/js/addons.js";
import { unfinishedOf, answeredBy, finishChoice } from "../site/js/order-finish.js";
import { planRecall } from "../site/js/saved-recall.js";

const opt = (id, extra = {}) => ({ name: id[0].toUpperCase() + id.slice(1), id, tags: [], ...extra });
const money = (n) => `$${n}`;

// The shapes the ruling names: "Choose two" (exactly 2), a sauce allowance with a
// fee ("1 included, then $4 each"), and the old uncapped / capped groups as the controls.
const TWO = { id: "cheese-two", name: "Choose two", select: "many", min: 2, max: 2, price: 0, options: [opt("brie"), opt("blue"), opt("cheddar")] };
const AT_LEAST = { id: "fill", name: "Fillings", select: "many", min: 1, price: 0, options: [opt("a"), opt("b"), opt("c")] };
const RANGE = { id: "rng", name: "Range", select: "many", min: 1, max: 3, price: 0, options: [opt("a"), opt("b"), opt("c"), opt("d")] };
const SAUCE = { id: "sauce", name: "Sauce", select: "many", max: 4, included: 1, extraPrice: 4, price: 0, options: [opt("a"), opt("b"), opt("c"), opt("d")] };
const UNCAPPED_FEE = { id: "dip", name: "Dips", select: "many", included: 2, extraPrice: 1.5, price: 0, options: [opt("a"), opt("b"), opt("c"), opt("d")] };
const PLAIN = { id: "sauces", name: "Sauces", select: "many", max: 3, price: 0, options: [opt("a"), opt("b"), opt("c"), opt("d")] };
const BARE = { id: "side", name: "Side", select: "many", options: [opt("a", { price: 2 })] };
const REQ = { id: "rs", name: "Sauce", select: "one", required: true, price: 0, options: [opt("a"), opt("b")] };

const pick = (g, ...ids) => ids.map((id) => ({ group: g.id, id, name: id, price: 0 }));

// --- min --------------------------------------------------------------

test("minOf: a pick-many group's min, else 0 - and a bad value gates nothing", () => {
  assert.equal(minOf(TWO), 2);
  assert.equal(minOf(PLAIN), 0, "control: a group with no min asks for none");
  assert.equal(minOf({ ...TWO, min: 0 }), 0);
  assert.equal(minOf({ ...TWO, min: "2" }), 0, "a string is not a minimum");
  assert.equal(minOf({ ...TWO, min: 1.5 }), 0);
  assert.equal(minOf({ ...TWO, select: "one" }), 0, "only a pick-many group has one");
  assert.equal(minOf({ ...TWO, kind: "selects" }), 0);
  assert.equal(minOf(undefined), 0);
});

test("owed / missingRequired: a group under its min owes the difference; a met or absent min owes nothing", () => {
  assert.equal(owed(TWO, []), 2);
  assert.equal(owed(TWO, pick(TWO, "brie")), 1);
  assert.equal(owed(TWO, pick(TWO, "brie", "blue")), 0);
  assert.equal(owed(PLAIN, []), 0, "control: an optional group owes nothing, as before");
  assert.equal(owed(REQ, []), 1, "a required pick-one group still owes its one");
  assert.equal(owed(REQ, pick(REQ, "a")), 0);
  assert.deepEqual(missingRequired([PLAIN, TWO, REQ], []).map((g) => g.id), ["cheese-two", "rs"]);
  assert.deepEqual(missingRequired([PLAIN, TWO, REQ], [...pick(TWO, "brie", "blue"), ...pick(REQ, "a")]), []);
  assert.deepEqual(missingRequired([PLAIN, BARE, SAUCE], []), [], "groups with no min never block Add");
  assert.deepEqual(missingRequired([TWO], pick(TWO, "brie")).map((g) => g.id), ["cheese-two"], "one of two is still owed");
});

test("selectionAllowed is the UPPER bound only - a selection under its min is legal to hold", () => {
  assert.equal(selectionAllowed(TWO, 1), true);
  assert.equal(selectionAllowed(TWO, 2), true);
  assert.equal(selectionAllowed(TWO, 3), false);
  assert.equal(selectionAllowed(AT_LEAST, 99), true, "min with no max is uncapped");
  assert.equal(selectionAllowed(PLAIN, 3), true);
  assert.equal(selectionAllowed(PLAIN, 4), false, "control: the old cap is unchanged");
});

test("isMustSee: a group with a min is never must-see (Add already waits), as a required one is not", () => {
  assert.equal(isMustSee({ ...TWO, mustSee: true }), false);
  assert.equal(isMustSee({ ...PLAIN, mustSee: true }), true, "control: an optional flagged group still is");
  assert.equal(isRequired(TWO), false, "`required` stays a pick-one word; a min is its own field");
});

// --- the words ----------------------------------------------------------

test("ruleText: the legend says exactly-N, a range and at-least in words", () => {
  assert.equal(ruleText(TWO, money), "Required — choose 2");
  assert.equal(ruleText(RANGE, money), "Required — choose 1 to 3");
  assert.equal(ruleText(AT_LEAST, money), "Required — choose at least 1");
});

test("ruleText: a group with none of the new fields reads byte-for-byte as it did", () => {
  assert.equal(ruleText(PLAIN, money), "Choose up to 3");
  assert.equal(ruleText(BARE, money), "Choose any");
  assert.equal(ruleText({ select: "one", options: [] }, money), "Choose one");
  assert.equal(ruleText(REQ, money), "Required — choose one");
});

test("ruleText / feeClause: an allowance is said as '1 included, then $4 each'", () => {
  assert.equal(ruleText(SAUCE, money), "Choose up to 4 · 1 included, then $4 each");
  assert.equal(ruleText(UNCAPPED_FEE, money), "Choose any · 2 included, then $1.5 each");
  assert.equal(ruleText({ ...SAUCE, min: 1 }, money), "Required — choose 1 to 4 · 1 included, then $4 each");
  assert.equal(feeClause(PLAIN, money), "", "control: no allowance, no clause");
  assert.equal(feeClause({ ...SAUCE, extraPrice: 0 }, money), "", "a free extra says nothing");
});

test("owedSentence: required pick-one keeps its words; a min says how many, and 'more' once started", () => {
  assert.equal(owedSentence([REQ], []), "choose one under “Sauce”");
  assert.equal(owedSentence([REQ, { ...REQ, name: "Side" }], []), "choose one under “Sauce” and “Side”");
  assert.equal(owedSentence([TWO], []), "choose 2 under “Choose two”");
  assert.equal(owedSentence([TWO], pick(TWO, "brie")), "choose 1 more under “Choose two”");
  assert.equal(owedSentence([REQ, TWO], []), "choose one under “Sauce” and 2 under “Choose two”");
});

// --- the fee -----------------------------------------------------------

test("extraFee: nothing up to the allowance, then extraPrice for each pick beyond it", () => {
  assert.equal(extraFee(SAUCE, 0), 0);
  assert.equal(extraFee(SAUCE, 1), 0);
  assert.equal(extraFee(SAUCE, 2), 4);
  assert.equal(extraFee(SAUCE, 4), 12);
  assert.equal(extraFee(UNCAPPED_FEE, 5), 4.5);
  assert.equal(extraFee({ ...UNCAPPED_FEE, extraPrice: 1.1 }, 5), 3.3, "rounded to the cent, not 3.3000000000000003");
});

test("extraFee: a group without the pair, or with half of it, charges nothing", () => {
  assert.equal(extraFee(PLAIN, 3), 0);
  assert.equal(extraFee(BARE, 9), 0);
  assert.equal(extraFee({ ...SAUCE, extraPrice: undefined }, 4), 0);
  assert.equal(extraFee({ ...SAUCE, included: undefined }, 4), 0);
  assert.equal(extraFee({ ...SAUCE, extraPrice: 0 }, 4), 0);
  assert.equal(extraFee({ ...SAUCE, included: 0 }, 4), 0);
  assert.equal(extraFee(undefined, 4), 0);
});

test("configuredPrice: the fee lands on the line beyond the allowance, and only then", () => {
  assert.equal(configuredPrice(20, pick(SAUCE, "a"), [SAUCE]), 20, "within the allowance: the dish's own price");
  assert.equal(configuredPrice(20, pick(SAUCE, "a", "b"), [SAUCE]), 24);
  assert.equal(configuredPrice(20, pick(SAUCE, "a", "b", "c"), [SAUCE]), 28);
  assert.equal(configuredPrice(20, [], [SAUCE]), 20);
  assert.equal(configuredPrice(null, pick(SAUCE, "a", "b"), [SAUCE]), null, "an unpriced dish stays unpriced");
});

test("configuredPrice: with no groups, or groups that state no fee, prices exactly as before", () => {
  const sel = [{ group: "side", id: "a", name: "A", price: 2 }, ...pick(PLAIN, "a", "b", "c")];
  assert.equal(configuredPrice(10, sel), 12, "the old two-argument call");
  assert.equal(configuredPrice(10, sel, [BARE, PLAIN]), 12, "groups with no fee add nothing");
  assert.equal(configuredPrice(10, sel, undefined), 12);
});

test("configuredPrice: option prices and the fee are separate lines on the same bill", () => {
  const g = { ...SAUCE, price: undefined };
  const sel = [{ group: g.id, id: "a", name: "A", price: 0 }, { group: g.id, id: "b", name: "B", price: 0 }, { group: "side", id: "x", name: "X", price: 3 }];
  assert.equal(configuredPrice(10, sel, [g, BARE]), 17);
});

// --- the order sheet: a line short of its min ---------------------------

const RECORD = {
  id: "v",
  name: "V",
  currency: "NZD",
  addOnGroups: [TWO, SAUCE, REQ],
  menu: [
    {
      section: "S",
      sectionId: "s",
      items: [
        { name: "Cheese Two", dishId: "cheese-two-dish", price: 24, tags: [], addOns: ["cheese-two"] },
        { name: "Grill", dishId: "grill", price: 52, tags: [], addOns: ["sauce"] },
        { name: "Plain", dishId: "plain", price: 9, tags: [] },
      ],
    },
  ],
};
const line = (dishId, options, price) => ({ venueId: "v", dishId, name: dishId, price, qty: 1, options });
const lo = (g, ...ids) => ids.map((id) => ({ group: g.id, id, name: id, price: 0 }));

test("unfinishedOf: a line holding no cheese, or one of two, owes the difference; two is complete", () => {
  const none = unfinishedOf(RECORD, line("cheese-two-dish", [], 24));
  assert.deepEqual(none.groups.map((g) => g.id), ["cheese-two"]);
  assert.deepEqual(none.owed, { "cheese-two": 2 });
  assert.deepEqual(none.have, { "cheese-two": 0 });
  const one = unfinishedOf(RECORD, line("cheese-two-dish", lo(TWO, "brie"), 24));
  assert.deepEqual(one.owed, { "cheese-two": 1 });
  assert.deepEqual(one.held, { "cheese-two": ["brie"] });
  assert.equal(unfinishedOf(RECORD, line("cheese-two-dish", lo(TWO, "brie", "blue"), 24)), null);
  assert.equal(unfinishedOf(RECORD, line("grill", [], 52)), null, "control: a group with only a fee owes nothing");
  assert.equal(unfinishedOf(RECORD, line("plain", [], 9)), null);
});

test("answeredBy / finishChoice: a pick-many group is answered by at least what it owes, never past its max", () => {
  const info = unfinishedOf(RECORD, line("cheese-two-dish", [], 24));
  assert.deepEqual(answeredBy(info, {}).missing.map((g) => g.id), ["cheese-two"]);
  assert.deepEqual(answeredBy(info, { "cheese-two": ["brie"] }).missing.map((g) => g.id), ["cheese-two"], "one of two is not an answer");
  assert.deepEqual(answeredBy(info, { "cheese-two": ["brie", "ghost"] }).missing.map((g) => g.id), ["cheese-two"], "an id not on offer does not count");
  assert.deepEqual(answeredBy(info, { "cheese-two": ["brie", "brie"] }).missing.map((g) => g.id), ["cheese-two"], "the same cheese twice is one");
  assert.deepEqual(answeredBy(info, { "cheese-two": ["brie", "blue", "cheddar"] }).missing.map((g) => g.id), ["cheese-two"], "three is past max 2");
  const ok = finishChoice(RECORD, line("cheese-two-dish", [], 24), { "cheese-two": ["brie", "blue"] });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.options.map((o) => o.id), ["brie", "blue"]);
  assert.equal(ok.price, 24, "free cheeses: the price does not move");
});

test("finishChoice: finishing the second cheese keeps the first, and offers it no second time", () => {
  const l = line("cheese-two-dish", lo(TWO, "brie"), 24);
  const info = unfinishedOf(RECORD, l);
  assert.deepEqual(answeredBy(info, { "cheese-two": ["brie"] }).missing.map((g) => g.id), ["cheese-two"], "the one it holds is not an answer");
  const ok = finishChoice(RECORD, l, { "cheese-two": ["blue"] });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.options.map((o) => o.id), ["brie", "blue"]);
});

test("a required pick-one answer on the sheet is unchanged", () => {
  const rec = { ...RECORD, menu: [{ section: "S", sectionId: "s", items: [{ name: "R", dishId: "r", price: 5, tags: [], addOns: ["rs"] }] }] };
  const l = line("r", [], 5);
  const info = unfinishedOf(rec, l);
  assert.deepEqual(info.owed, { rs: 1 });
  const ok = finishChoice(rec, l, { rs: "b" });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.options.map((o) => o.id), ["b"]);
  assert.equal(finishChoice(rec, l, {}).ok, false);
});

test("unfinishedOf: the sheet's 'short by' range includes the fee a minimum can start", () => {
  const g = { ...SAUCE, min: 2, max: 4 };
  const rec = { ...RECORD, addOnGroups: [g] };
  const info = unfinishedOf(rec, line("grill", [], 52));
  // 2 owed, 1 included: one pick is charged $4, so the total is short by exactly that.
  assert.deepEqual(info.extra, { min: 4, max: 4 });
  const ok = finishChoice(rec, line("grill", [], 52), { sauce: ["a", "b"] });
  assert.equal(ok.price, 56);
});

// --- recall --------------------------------------------------------------

test("planRecall: a saved line short of a min lands UNFINISHED, with today's fee in its price", () => {
  const saved = {
    lines: [
      { dishId: "cheese-two-dish", name: "Cheese Two", qty: 1, options: lo(TWO, "brie"), price: 24 },
      { dishId: "cheese-two-dish", name: "Cheese Two", qty: 1, options: lo(TWO, "brie", "blue"), price: 24 },
    ],
  };
  const plan = planRecall(saved, RECORD);
  assert.equal(plan.lines.length, 2);
  assert.equal(plan.skipped.length, 0);
  assert.deepEqual(plan.unfinished.map((u) => u.groups), [["Choose two"]], "only the short line is flagged");
});

test("planRecall: past the cap is still skipped, and the fee is priced from the live group", () => {
  const over = { lines: [{ dishId: "cheese-two-dish", name: "C", qty: 1, options: lo(TWO, "brie", "blue", "cheddar"), price: 24 }] };
  const plan = planRecall(over, RECORD);
  assert.equal(plan.skipped.length, 1);
  const fee = { lines: [{ dishId: "grill", name: "Grill", qty: 2, options: lo(SAUCE, "a", "b", "c"), price: 52 }] };
  const p2 = planRecall(fee, RECORD);
  assert.equal(p2.lines[0].price, 60, "52 + 2 beyond the 1 included x $4");
  assert.equal(p2.changed.length, 1, "and it is reported against the 52 the reader saved");
});
