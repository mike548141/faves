// Minimum orders and per-unit prices (roadmap 200/170, ADR 0164): the pure rules,
// the order store starting a NEW line at the minimum, and recall bringing a saved
// quantity up to it. The stepper and the sheet are asserted in a real browser
// (tools/addon_check.mjs, block ab); this file is what they stand on.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  UNITS,
  unitOf,
  isWeighed,
  unitWords,
  minQtyOf,
  minWords,
  shortBy,
  raiseToMin,
  rulesOf,
  joinRules,
} from "../site/js/dish-rules.js";
import { createOrder, groupByVenue, orderTotal } from "../site/js/cart.js";
import { planRecall } from "../site/js/saved-recall.js";

const fakeStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

const RECORD = {
  id: "shellfish-bar",
  name: "Shellfish Bar",
  currency: "NZD",
  menu: [
    {
      section: "Raw",
      items: [
        { name: "Oysters", dishId: "oysters", price: 4, unit: "each", minQty: 3 },
        { name: "Wagyu", dishId: "wagyu", price: 26, unit: "per 100 g" },
        { name: "Dim sum", dishId: "dim-sum", price: 12, unit: "per person", minQty: 2 },
        { name: "Toast", dishId: "toast", price: 9 },
      ],
    },
  ],
};
const item = (id) => RECORD.menu[0].items.find((i) => i.dishId === id);

test("the unit vocabulary is closed: three words, one of them weighed", () => {
  assert.deepEqual(Object.keys(UNITS).sort(), ["each", "per 100 g", "per person"]);
  assert.equal(isWeighed(item("wagyu")), true);
  assert.equal(isWeighed(item("oysters")), false);
  assert.equal(isWeighed(item("dim-sum")), false);
});

test("an unknown unit says nothing, rather than being read as one", () => {
  for (const unit of ["per kg", "EACH", "", null, undefined, 7, "__proto__", "constructor"]) {
    assert.equal(unitOf({ unit }), null, String(unit));
    assert.equal(unitWords({ unit }), "");
    assert.equal(isWeighed({ unit }), false);
  }
  assert.equal(unitWords(item("wagyu")), "per 100 g");
});

test("minQtyOf: an integer of 2 or more is a minimum; anything else is no rule (1)", () => {
  assert.equal(minQtyOf(item("oysters")), 3);
  for (const minQty of [undefined, null, 0, 1, -3, 2.5, "3", NaN]) {
    assert.equal(minQtyOf({ minQty }), 1, String(minQty));
  }
  assert.equal(minQtyOf(null), 1);
});

test("the minimum is worded as a head-count when the unit is per person", () => {
  assert.equal(minWords(item("oysters")), "Minimum 3");
  assert.equal(minWords(item("dim-sum")), "Minimum 2 people");
  assert.equal(minWords(item("toast")), "");
});

test("shortBy and raiseToMin: only a quantity under the minimum is short", () => {
  assert.equal(shortBy(1, item("oysters")), 2);
  assert.equal(shortBy(3, item("oysters")), 0);
  assert.equal(shortBy(5, item("oysters")), 0);
  assert.equal(shortBy(0, item("oysters")), 0, "no line, nothing short");
  assert.equal(shortBy(1, item("toast")), 0);
  assert.deepEqual(raiseToMin(1, item("oysters")), { qty: 3, raised: 2 });
  assert.deepEqual(raiseToMin(4, item("oysters")), { qty: 4, raised: 0 });
  assert.deepEqual(raiseToMin(1, item("toast")), { qty: 1, raised: 0 });
});

test("rulesOf joins a line to the live record by dish id, and judges nothing it cannot find", () => {
  assert.deepEqual(rulesOf(RECORD, { dishId: "oysters" }), { minQty: 3, unit: "each", weighed: false });
  assert.deepEqual(rulesOf(RECORD, { dishId: "wagyu" }), { minQty: 1, unit: "per 100 g", weighed: true });
  assert.equal(rulesOf(RECORD, { dishId: "toast" }), null, "a plain dish carries no rules");
  assert.equal(rulesOf(RECORD, { dishId: "gone" }), null, "a dish that has left the menu");
  assert.equal(rulesOf(null, { dishId: "oysters" }), null, "no record loaded");
});

const meta = (over = {}) => ({
  venueId: "shellfish-bar", venueName: "Shellfish Bar", name: "Oysters", dishId: "oysters", price: 4, ...over,
});

test("a NEW line starts at the minimum; an existing one still grows by one", () => {
  const o = createOrder(fakeStorage());
  o.add(meta({ minQty: 3 }));
  assert.equal(o.items()[0].qty, 3, "Add puts the minimum on the sheet, not one");
  o.add(meta({ minQty: 3 }));
  assert.equal(o.items()[0].qty, 4);
  assert.equal(o.count(), 4);
});

test("the minimum is read, never stored on the line", () => {
  const o = createOrder(fakeStorage());
  o.add(meta({ minQty: 3 }));
  assert.equal("minQty" in o.items()[0], false);
  assert.equal("unit" in o.items()[0], false);
});

test("a dish with no minimum (or a nonsense one) starts at one, as it always has", () => {
  for (const minQty of [undefined, 1, 0, "3", 2.5]) {
    const o = createOrder(fakeStorage());
    o.add(meta({ minQty }));
    assert.equal(o.items()[0].qty, 1, String(minQty));
  }
});

const saved = (qty, id = "oysters") => ({
  id: "s1", venueId: "shellfish-bar", venueName: "Shellfish Bar", name: "Usual",
  lines: [{ dishId: id, name: "Oysters", qty, price: 4, currency: "NZD" }],
});

test("recall raises a saved quantity under today's minimum, and says so", () => {
  const { lines, raised, skipped } = planRecall(saved(1), RECORD);
  assert.equal(lines.length, 1, "landed, not dropped");
  assert.equal(lines[0].qty, 3);
  assert.deepEqual(skipped, []);
  assert.equal(raised.length, 1);
  assert.deepEqual([raised[0].name, raised[0].was, raised[0].now], ["Oysters", 1, 3]);
  assert.match(raised[0].text, /minimum order is 3, so 1 is now 3/);
});

test("recall leaves a quantity at or above the minimum, and a dish without one, alone", () => {
  for (const qty of [3, 5]) {
    const { lines, raised } = planRecall(saved(qty), RECORD);
    assert.equal(lines[0].qty, qty);
    assert.deepEqual(raised, []);
  }
  const plain = planRecall({ ...saved(1, "toast"), lines: [{ dishId: "toast", name: "Toast", qty: 1, price: 9, currency: "NZD" }] }, RECORD);
  assert.equal(plain.lines[0].qty, 1);
  assert.deepEqual(plain.raised, []);
});

test("a dish sold by weight has no honest total: the join gives it price null, and the sums skip it", () => {
  const lines = [
    { venueId: "v", venueName: "V", name: "Wagyu", dishId: "wagyu", price: 26, qty: 2, options: [] },
    { venueId: "v", venueName: "V", name: "Toast", dishId: "toast", price: 9, qty: 1, options: [] },
  ];
  const view = lines.map((l) => joinRules(RECORD, l));
  assert.equal(view[0].price, null);
  assert.equal(view[0].unitPrice, 26, "the unit price survives, to be shown as \"$26 per 100 g\"");
  assert.equal(orderTotal(view), 9, "the wagyu is left out, not multiplied");
  const [g] = groupByVenue(view);
  assert.equal(g.subtotal, 9);
  assert.equal(g.hasUnpriced, true, "so the subtotal and total carry their \"+\"");
  assert.equal(orderTotal(lines), 61, "and this is the fake total the join exists to prevent");
  assert.equal(lines[0].price, 26, "the stored line is untouched");
});

test("the join leaves a counted unit's price alone, carries the minimum, and passes unjudgeable lines through", () => {
  const o = joinRules(RECORD, { dishId: "oysters", price: 4, qty: 1 });
  assert.equal(o.price, 4);
  assert.equal(o.minQty, 3);
  assert.equal(o.rules.unit, "each");
  const plain = { dishId: "toast", price: 9, qty: 1 };
  assert.equal(joinRules(RECORD, plain), plain);
  assert.equal(joinRules(null, plain), plain);
});
