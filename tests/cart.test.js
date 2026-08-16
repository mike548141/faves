// Unit tests for the order tally model (site/js/cart.js). The maths is
// pure; the store is exercised over a fake storage so no browser/DOM is
// needed. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createOrder,
  orderCount,
  orderTotal,
  groupByVenue,
  mergeItems,
} from "../site/js/cart.js";

// A Map-backed stand-in for localStorage.
function fakeStorage(initial = null) {
  const m = new Map();
  if (initial != null) m.set("faves.order.v1", initial);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    _raw: () => m.get("faves.order.v1"),
  };
}

const kk = { venueId: "kk", venueName: "KK Malaysian", phone: "04 555", name: "Mee Goreng", price: 18 };
const kk2 = { venueId: "kk", venueName: "KK Malaysian", phone: "04 555", name: "Roti", price: 6 };
const sf = { venueId: "sf", venueName: "Sprig + Fern", name: "Pilsner", price: 12 };

// The lookup API addresses a line by dish id (ADR 0051). A meta with no explicit
// `dishId` resolves to slug(name), which is what these fixtures rely on.
test("add: new items, then increment on repeat add", () => {
  const o = createOrder(fakeStorage());
  o.add(kk);
  o.add(kk);
  o.add(kk2);
  assert.equal(o.qtyOf("kk", "mee-goreng"), 2);
  assert.equal(o.qtyOf("kk", "roti"), 1);
  assert.equal(o.count(), 3);
});

test("total: sums price × qty; unpriced items count as 0", () => {
  const o = createOrder(fakeStorage());
  o.add(kk); // 18
  o.add(kk); // 36
  o.add({ venueId: "kk", venueName: "KK Malaysian", name: "Market fish" }); // null price
  assert.equal(o.total(), 36);
});

test("setQty: changes quantity; 0 removes the line", () => {
  const o = createOrder(fakeStorage());
  o.add(kk);
  o.setQty("kk", "mee-goreng", 5);
  assert.equal(o.qtyOf("kk", "mee-goreng"), 5);
  o.setQty("kk", "mee-goreng", 0);
  assert.equal(o.qtyOf("kk", "mee-goreng"), 0);
  assert.equal(o.items().length, 0);
});

test("remove and clear", () => {
  const o = createOrder(fakeStorage());
  o.add(kk);
  o.add(sf);
  o.remove("kk", "mee-goreng");
  assert.equal(o.count(), 1);
  o.clear();
  assert.equal(o.count(), 0);
});

test("toggleCollected flips the flag", () => {
  const o = createOrder(fakeStorage());
  o.add(kk);
  o.toggleCollected("kk", "mee-goreng");
  assert.equal(o.items()[0].collected, true);
  o.toggleCollected("kk", "mee-goreng");
  assert.equal(o.items()[0].collected, false);
});

test("groupByVenue: groups, subtotals, counts, phone and unpriced flag", () => {
  const items = [
    { venueId: "kk", venueName: "KK", phone: "04 555", name: "Mee Goreng", price: 18, qty: 2 },
    { venueId: "kk", venueName: "KK", phone: "04 555", name: "Market fish", price: null, qty: 1 },
    { venueId: "sf", venueName: "Sprig + Fern", phone: null, name: "Pilsner", price: 12, qty: 3 },
  ];
  const groups = groupByVenue(items);
  assert.equal(groups.length, 2);
  const [g1, g2] = groups;
  assert.equal(g1.venueId, "kk");
  assert.equal(g1.count, 3);
  assert.equal(g1.subtotal, 36);
  assert.equal(g1.hasUnpriced, true);
  assert.equal(g1.phone, "04 555");
  assert.equal(g2.subtotal, 36);
  assert.equal(g2.hasUnpriced, false);
});

test("persistence: writes to storage and re-hydrates in a new store", () => {
  const storage = fakeStorage();
  const a = createOrder(storage);
  a.add(kk);
  a.add(sf);
  // A fresh store over the same storage sees the saved order.
  const b = createOrder(storage);
  assert.equal(b.count(), 2);
  assert.equal(b.qtyOf("kk", "mee-goreng"), 1);
});

test("subscribe fires on mutation and unsubscribe stops it", () => {
  const o = createOrder(fakeStorage());
  let calls = 0;
  const off = o.subscribe(() => calls++);
  o.add(kk);
  o.add(kk);
  assert.equal(calls, 2);
  off();
  o.add(kk);
  assert.equal(calls, 2);
});

test("tolerates a corrupt storage payload (starts empty)", () => {
  const o = createOrder(fakeStorage("{ not valid json"));
  assert.equal(o.count(), 0);
  o.add(kk);
  assert.equal(o.count(), 1);
});

// --- mergeItems: the receive side of group ordering (Theme 1b) ------------

const line = (over = {}) => ({
  venueId: "kk", venueName: "KK", phone: "04 555", name: "Mee Goreng",
  price: 18, qty: 1, collected: false, ...over,
});

test("mergeItems into an empty order just adds the incoming lines", () => {
  const out = mergeItems([], [line({ qty: 2 })]);
  assert.equal(out.length, 1);
  assert.equal(out[0].qty, 2);
  assert.equal(out[0].collected, false);
});

test("mergeItems sums quantities of a matching (venueId, name) line", () => {
  const base = [line({ qty: 2, collected: true })];
  const out = mergeItems(base, [line({ qty: 3 })]);
  assert.equal(out.length, 1);
  assert.equal(out[0].qty, 5);
  // an existing collected flag is preserved, not reset by the merge
  assert.equal(out[0].collected, true);
});

test("mergeItems appends a same-name dish from a different venue", () => {
  const out = mergeItems([line()], [line({ venueId: "sf", venueName: "Sprig + Fern" })]);
  assert.equal(out.length, 2);
});

test("mergeItems does not mutate its inputs", () => {
  const base = [line({ qty: 1 })];
  const incoming = [line({ qty: 4 })];
  const snapshot = JSON.stringify(base);
  mergeItems(base, incoming);
  assert.equal(JSON.stringify(base), snapshot);
  assert.equal(incoming[0].qty, 4);
});

test("order.merge folds a decoded share into the store and persists", () => {
  const o = createOrder(fakeStorage());
  o.add(kk); // 1× Mee Goreng
  o.merge([
    { venueId: "kk", venueName: "KK Malaysian", phone: "04 555", name: "Mee Goreng", price: 18, qty: 2 },
    { venueId: "sf", venueName: "Sprig + Fern", phone: null, name: "Pilsner", price: 12, qty: 1 },
  ]);
  assert.equal(o.qtyOf("kk", "mee-goreng"), 3);
  assert.equal(o.qtyOf("sf", "pilsner"), 1);
  assert.equal(o.count(), 4);
});

// --- dish ids: the $56 bug (ADR 0051) -------------------------------------
// Sprig & Fern prints "Cheeseburger" three times at three prices. While the
// name was the line's identity, adding the $28 Mains one and the $21 Gold Card
// one produced ONE line of 2 × $28 and charged $56 for a $49 pair. Ids are
// passed explicitly here so the test proves the model, not the menu data.

const burger = (over) => ({
  venueId: "sprig-and-fern-tawa", venueName: "Sprig & Fern", name: "Cheeseburger", ...over,
});
const mains = burger({ dishId: "cheeseburger", price: 28 });
const goldCard = burger({ dishId: "cheeseburger-gold-card", price: 21 });

test("two same-named dishes with different ids are two lines at the right total", () => {
  const o = createOrder(fakeStorage());
  o.add(mains);
  o.add(goldCard);
  assert.equal(o.items().length, 2); // was 1 — the bug
  assert.equal(o.total(), 49); // was 56 — the money
  assert.equal(o.qtyOf("sprig-and-fern-tawa", "cheeseburger"), 1);
  assert.equal(o.qtyOf("sprig-and-fern-tawa", "cheeseburger-gold-card"), 1);
});

test("the id, not the name, decides which line a stepper moves", () => {
  const o = createOrder(fakeStorage());
  o.add(mains);
  o.add(goldCard);
  o.setQty("sprig-and-fern-tawa", "cheeseburger-gold-card", 3);
  assert.equal(o.total(), 28 + 63);
  o.remove("sprig-and-fern-tawa", "cheeseburger");
  assert.equal(o.items().length, 1);
  assert.equal(o.items()[0].dishId, "cheeseburger-gold-card");
});

test("a line records its id, so it survives storage and a fresh store", () => {
  const storage = fakeStorage();
  createOrder(storage).add(goldCard);
  const b = createOrder(storage);
  assert.equal(b.qtyOf("sprig-and-fern-tawa", "cheeseburger-gold-card"), 1);
  assert.equal(b.qtyOf("sprig-and-fern-tawa", "cheeseburger"), 0); // not the other row
});

test("an id-less line keys exactly as it did before ids existed", () => {
  // The ADR 0048 §4 property, restated for ids: nothing already in a family's
  // browser moves, because dishId() falls through to slug(name).
  const o = createOrder(fakeStorage('[{"venueId":"kk","venueName":"KK","name":"Mee Goreng","price":18,"qty":2,"collected":false}]'));
  assert.equal(o.qtyOf("kk", "mee-goreng"), 2);
  o.add(kk); // the same dish, added the new way, still finds the stored line
  assert.equal(o.items().length, 1);
  assert.equal(o.qtyOf("kk", "mee-goreng"), 3);
});

test("mergeItems keeps two same-named incoming lines apart and carries the id", () => {
  const out = mergeItems([], [
    { ...mains, qty: 1 },
    { ...goldCard, qty: 2 },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].dishId, "cheeseburger");
  assert.equal(out[1].dishId, "cheeseburger-gold-card");
  // …and an id-less line still merges by name-as-slug, adding no stray field.
  const plain = mergeItems([], [line({ qty: 1 })]);
  assert.equal("dishId" in plain[0], false);
});

test("orderCount / orderTotal helpers are pure", () => {
  const items = [
    { price: 10, qty: 2 },
    { price: null, qty: 1 },
    { price: 5, qty: 3 },
  ];
  assert.equal(orderCount(items), 6);
  assert.equal(orderTotal(items), 35);
});
