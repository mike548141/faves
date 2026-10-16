// Moving ONE unit of an order line to another configuration (cart.js
// `moveOneItem`, roadmap 200/120, ADR 0159): the picker that opens on Add updates
// the dish just added instead of leaving the default ordered beside the choice.
//
// Run: `node --test tests/`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createOrder, moveOneItem, dishQtyTotal, lineKey } from "../site/js/cart.js";
import { selectionKey } from "../site/js/addons.js";

const FULL = [{ group: "portion", id: "full", name: "Full", price: 0, dishPrice: 20 }];
const HALF = [{ group: "portion", id: "half", name: "Half", price: 0, dishPrice: 12 }];
const line = (over = {}) => ({
  venueId: "v", venueName: "V", currency: "NZD", phone: null, name: "Tikka",
  dishId: "tikka", price: 20, options: FULL, qty: 1, collected: false, ...over,
});

test("moves the only unit: one line becomes the new configuration, at its price", () => {
  const items = [line()];
  const out = moveOneItem(items, lineKey(items[0]), { options: HALF, price: 12 });
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].qty, 1);
  assert.equal(out.items[0].price, 12);
  assert.equal(lineKey(out.items[0]), out.key);
  assert.deepEqual(items, [line()], "the input is untouched");
});

test("moves ONE unit of several, never the whole line", () => {
  const items = [line({ qty: 3 })];
  const out = moveOneItem(items, lineKey(items[0]), { options: HALF, price: 12 });
  assert.deepEqual(out.items.map((i) => [i.options[0].id, i.qty, i.price]), [["full", 2, 20], ["half", 1, 12]]);
  assert.equal(dishQtyTotal(out.items, "v", "tikka"), 3, "the dish's total is conserved");
});

test("joins an existing destination line and keeps THAT line's price", () => {
  const items = [line(), line({ options: HALF, price: 12.5, qty: 2 })];
  const out = moveOneItem(items, lineKey(items[0]), { options: HALF, price: 12 });
  assert.equal(out.items.length, 1);
  assert.deepEqual([out.items[0].qty, out.items[0].price], [3, 12.5]);
});

test("a split into an existing destination leaves the source one smaller", () => {
  const items = [line({ qty: 2 }), line({ options: HALF, price: 12, qty: 1 })];
  const out = moveOneItem(items, lineKey(items[0]), { options: HALF, price: 12 });
  assert.deepEqual(out.items.map((i) => [i.options[0].id, i.qty]), [["full", 1], ["half", 2]]);
});

test("ticked-off survives a merge only if both halves had it", () => {
  const a = moveOneItem([line({ collected: true }), line({ options: HALF, collected: false })], lineKey(line()), { options: HALF, price: 12 });
  assert.equal(a.items[0].collected, false);
  const b = moveOneItem([line({ collected: true }), line({ options: HALF, collected: true })], lineKey(line()), { options: HALF, price: 12 });
  assert.equal(b.items[0].collected, true);
});

test("the note stays on the unit it moves with, and a noted line is a different line", () => {
  const noted = line({ note: "no mint" });
  const out = moveOneItem([noted], lineKey(noted), { options: HALF, price: 12 });
  assert.equal(out.items[0].note, "no mint");
  // The un-noted key does not find the noted line: nothing to move.
  assert.equal(moveOneItem([noted], lineKey(line()), { options: HALF, price: 12 }), null);
});

test("nothing to move, or no change of configuration, is null", () => {
  assert.equal(moveOneItem([], "v\ntikka\nx\n", { options: HALF, price: 12 }), null);
  const items = [line()];
  assert.equal(moveOneItem(items, lineKey(items[0]), { options: FULL, price: 20 }), null);
});

test("the store: moveOne commits once, returns the new key, and dishQty is conserved", () => {
  const store = createOrder({ getItem: () => null, setItem() {}, removeItem() {} });
  store.add({ venueId: "v", venueName: "V", name: "Tikka", dishId: "tikka", price: 20, options: FULL });
  store.add({ venueId: "v", venueName: "V", name: "Tikka", dishId: "tikka", price: 20, options: FULL });
  let notified = 0;
  store.subscribe(() => notified++);
  const full = selectionKey(FULL);
  const half = selectionKey(HALF);
  const key = store.moveOne("v", "tikka", full, "", { options: HALF, price: 12 });
  assert.equal(notified, 1);
  assert.equal(store.qtyOf("v", "tikka", half), 1);
  assert.equal(store.qtyOf("v", "tikka", full), 1);
  assert.equal(store.dishQty("v", "tikka"), 2);
  assert.equal(key, `v\ntikka\n${half}\n`);
  assert.equal(store.moveOne("v", "tikka", "gone", "", { options: HALF, price: 12 }), null);
});
