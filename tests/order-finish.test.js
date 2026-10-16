// An order line missing a COMPULSORY choice, and finishing it in place (roadmap
// 200/130, ADR 0158) — the pure half. The sheet's wiring (the warning on screen,
// focus, the merge on a real page) is tools/addon_check.mjs's; these pin the
// verdict, the price, the merge and the safety composition, which a browser check
// cannot afford to enumerate.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createOrder, finishItems, lineKey } from "../site/js/cart.js";
import { unfinishedOf, finishChoice, answeredBy, selectionWithTags, summariseUnfinished } from "../site/js/order-finish.js";
import { configurationWarning } from "../site/js/addon-warning.js";
import { selectionKey } from "../site/js/addons.js";

const fakeStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};

// A stir fry with a compulsory sauce (one paid, one carrying peanuts) and an
// optional extra beside it — the shape of Satay Kingdom's.
const RECORD = {
  id: "wok-this-way",
  name: "Wok This Way",
  currency: "NZD",
  addOnGroups: [
    {
      id: "sauce",
      name: "Sauce",
      select: "one",
      required: true,
      options: [
        { id: "sweet-sour", name: "Sweet & sour", price: 0, tags: ["gf-option"] },
        { id: "satay", name: "Satay", price: 2, tags: ["contains-peanuts"] },
      ],
    },
    {
      id: "heat",
      name: "Heat",
      select: "one",
      required: true,
      options: [
        { id: "mild", name: "Mild", price: 0 },
        { id: "hot", name: "Hot", price: 0 },
      ],
    },
    {
      id: "extras",
      name: "Extras",
      select: "many",
      max: 2,
      options: [{ id: "egg", name: "Fried egg", price: 1.5, tags: ["contains-egg"] }],
    },
  ],
  menu: [
    {
      name: "Mains",
      addOns: ["extras"],
      items: [
        { dishId: "stir-fry-vegetables", name: "Stir Fry Vegetables", price: 18, tags: ["v", "gf"], addOns: ["sauce"] },
        { dishId: "rice", name: "Rice", price: 4, tags: ["vg"] },
        { dishId: "two-choices", name: "Two Choices", price: 10, addOns: ["sauce", "heat"] },
      ],
    },
  ],
};

const line = (over = {}) => ({
  venueId: "wok-this-way",
  venueName: "Wok This Way",
  currency: "NZD",
  name: "Stir Fry Vegetables",
  dishId: "stir-fry-vegetables",
  price: 18,
  options: [],
  qty: 1,
  collected: false,
  ...over,
});

// --- the verdict -------------------------------------------------------------

test("a line with no answer to a required group is unfinished, and names the group", () => {
  const info = unfinishedOf(RECORD, line());
  assert.deepEqual(info.groups.map((g) => g.id), ["sauce"]);
  assert.equal(info.item.name, "Stir Fry Vegetables");
});

test("a line that answers it is complete; an optional extra alone does not answer it", () => {
  assert.equal(unfinishedOf(RECORD, line({ options: [{ group: "sauce", id: "satay", name: "Satay", price: 2 }] })), null);
  const extraOnly = line({ options: [{ group: "extras", id: "egg", name: "Fried egg", price: 1.5 }] });
  assert.equal(unfinishedOf(RECORD, extraOnly).groups.length, 1, "an extra is not the sauce");
});

test("a dish with no required group, and a dish the menu no longer holds, are not judged", () => {
  assert.equal(unfinishedOf(RECORD, line({ name: "Rice", dishId: "rice", price: 4 })), null);
  assert.equal(unfinishedOf(RECORD, line({ dishId: "gone", name: "Gone" })), null);
  assert.equal(unfinishedOf(null, line()), null, "no record, no verdict");
});

test("a line stored before dish ids existed (name only) is judged by its slug", () => {
  const old = line();
  delete old.dishId;
  assert.equal(unfinishedOf(RECORD, old).groups[0].id, "sauce");
});

test("the price range of what is owed: a paid option makes the stored price a floor", () => {
  const info = unfinishedOf(RECORD, line());
  assert.deepEqual(info.extra, { min: 0, max: 2 });
  const two = unfinishedOf(RECORD, line({ dishId: "two-choices", name: "Two Choices", price: 10 }));
  assert.deepEqual(two.groups.map((g) => g.id), ["sauce", "heat"]);
  assert.deepEqual(two.extra, { min: 0, max: 2 });
  // Free options only: the choice cannot move the total.
  const free = { ...RECORD, addOnGroups: RECORD.addOnGroups.map((g) => (g.id === "sauce" ? { ...g, options: g.options.map((o) => ({ ...o, price: 0 })) } : g)) };
  assert.deepEqual(unfinishedOf(free, line()).extra, { min: 0, max: 0 });
});

// --- finishing ---------------------------------------------------------------

test("finishing adds the option and moves the price by exactly its cost", () => {
  const res = finishChoice(RECORD, line(), { sauce: "satay" });
  assert.equal(res.ok, true);
  assert.deepEqual(res.options, [{ group: "sauce", id: "satay", name: "Satay", price: 2 }]);
  assert.equal(res.price, 20);
  assert.equal(res.options[0].tags, undefined, "tags are for the composer, not stored on the line");
});

test("finishing keeps the options the line already had, and adds to ITS price (not a re-price)", () => {
  const withEgg = line({ price: 19.5, options: [{ group: "extras", id: "egg", name: "Fried egg", price: 1.5 }] });
  const res = finishChoice(RECORD, withEgg, { sauce: "sweet-sour" });
  assert.deepEqual(res.options.map((o) => o.id), ["egg", "sweet-sour"]);
  assert.equal(res.price, 19.5);
  // Floating point does not leak into a price.
  assert.equal(finishChoice(RECORD, line({ price: 0.1 }), { sauce: "satay" }).price, 2.1);
});

test("an unpriced line stays unpriced; nothing is guessed", () => {
  assert.equal(finishChoice(RECORD, line({ price: null }), { sauce: "satay" }).price, null);
});

test("an unanswered group, or an answer that is not on offer, finishes nothing", () => {
  assert.deepEqual(finishChoice(RECORD, line(), {}).missing.map((g) => g.id), ["sauce"]);
  assert.equal(finishChoice(RECORD, line(), { sauce: "ranch" }).ok, false);
  const two = line({ dishId: "two-choices", name: "Two Choices", price: 10 });
  const half = finishChoice(RECORD, two, { sauce: "satay" });
  assert.equal(half.ok, false);
  assert.deepEqual(half.missing.map((g) => g.id), ["heat"]);
  assert.equal(answeredBy(unfinishedOf(RECORD, two), { sauce: "satay" }).added.length, 1, "a half-made choice is still composable");
});

test("a complete line cannot be 'finished' (nothing to answer)", () => {
  const done = line({ options: [{ group: "sauce", id: "satay", name: "Satay", price: 2 }] });
  assert.equal(finishChoice(RECORD, done, { sauce: "sweet-sour" }).ok, false);
});

// --- the line's identity moves; an identical line absorbs it ------------------

test("finishing moves the line to its new key", () => {
  const items = [line()];
  const res = finishChoice(RECORD, items[0], { sauce: "satay" });
  const out = finishItems(items, lineKey(items[0]), { options: res.options, price: res.price });
  assert.equal(out.items.length, 1);
  assert.equal(lineKey(out.items[0]), out.key);
  assert.equal(out.items[0].price, 20);
  assert.equal(unfinishedOf(RECORD, out.items[0]), null, "the warning clears");
  assert.equal(items[0].options.length, 0, "the input was not mutated");
});

test("MERGE: finishing onto an identical existing line adds the quantities and keeps that line's price", () => {
  const finished = line({ price: 20, qty: 2, options: [{ group: "sauce", id: "satay", name: "Satay", price: 2 }] });
  const open = line({ qty: 3 });
  const items = [open, finished];
  const res = finishChoice(RECORD, open, { sauce: "satay" });
  const out = finishItems(items, lineKey(open), { options: res.options, price: res.price });
  assert.equal(out.items.length, 1, "two lines became one");
  assert.equal(out.items[0].qty, 5);
  assert.equal(out.key, lineKey(finished));
});

test("MERGE keeps the note apart: a noted line does not merge into the plain one", () => {
  const open = line({ note: "no onion" });
  const plainDone = line({ price: 20, options: [{ group: "sauce", id: "satay", name: "Satay", price: 2 }] });
  const res = finishChoice(RECORD, open, { sauce: "satay" });
  const out = finishItems([open, plainDone], lineKey(open), { options: res.options, price: res.price });
  assert.equal(out.items.length, 2);
});

test("MERGE: ticked-off only if both halves were", () => {
  const done = (collected) => line({ price: 20, collected, options: [{ group: "sauce", id: "satay", name: "Satay", price: 2 }] });
  const open = line({ collected: true });
  const res = finishChoice(RECORD, open, { sauce: "satay" });
  assert.equal(finishItems([open, done(false)], lineKey(open), res).items[0].collected, false);
  assert.equal(finishItems([open, done(true)], lineKey(open), res).items[0].collected, true);
});

test("the store: finish() rewrites storage, notifies once, and returns the new key", () => {
  const s = fakeStorage();
  const o = createOrder(s);
  o.add({ venueId: "wok-this-way", venueName: "Wok This Way", name: "Stir Fry Vegetables", dishId: "stir-fry-vegetables", price: 18, options: [] });
  let calls = 0;
  o.subscribe(() => calls++);
  const res = finishChoice(RECORD, o.items()[0], { sauce: "satay" });
  const key = o.finish("wok-this-way", "stir-fry-vegetables", selectionKey([]), "", { options: res.options, price: res.price });
  assert.equal(calls, 1);
  assert.equal(key, lineKey(o.items()[0]));
  assert.equal(o.qtyOf("wok-this-way", "stir-fry-vegetables", selectionKey(res.options)), 1);
  assert.equal(JSON.parse(s.getItem("faves.order.v1"))[0].price, 20);
  assert.equal(o.finish("wok-this-way", "nothing", "", "", { options: [], price: 1 }), null);
});

// --- safety: finishing composes exactly as the picker does --------------------

test("SAFETY: the finished dish is composed by the picker's own function — peanuts union in, the claims intersect", () => {
  const item = unfinishedOf(RECORD, line()).item;
  const picked = answeredBy(unfinishedOf(RECORD, line()), { sauce: "satay" }).added;
  const w = configurationWarning(item.tags, [...selectionWithTags(RECORD, line()), ...picked], new Set(["contains-peanuts"]));
  assert.ok(w.tags.includes("contains-peanuts"));
  assert.ok(!w.tags.includes("gf") && !w.tags.includes("v"), "a sauce that states neither claim costs the dish both");
  assert.equal(w.flagged, true, "a reader who avoids peanuts is told, before committing");
  assert.match(w.lines.join(" "), /Satay contains peanuts — you asked to avoid it/);
  // …and it is the SAME answer the menu's picker gets for the same configuration.
  const direct = configurationWarning(item.tags, [{ group: "sauce", id: "satay", name: "Satay", price: 2, tags: ["contains-peanuts"] }], new Set(["contains-peanuts"]));
  assert.deepEqual(w, direct);
});

test("SAFETY: existing extras compose too — their tags are read from the live record, not lost", () => {
  const withEgg = line({ options: [{ group: "extras", id: "egg", name: "Fried egg", price: 1.5 }] });
  const sel = selectionWithTags(RECORD, withEgg);
  assert.deepEqual(sel[0].tags, ["contains-egg"]);
  const picked = answeredBy(unfinishedOf(RECORD, withEgg), { sauce: "sweet-sour" }).added;
  const w = configurationWarning(["v", "gf"], [...sel, ...picked], new Set());
  assert.match(w.lines.join(" "), /Fried egg contains egg/);
});

test("SAFETY: an option the menu no longer holds composes with no tags (fail-safe), it does not throw", () => {
  const stale = line({ options: [{ group: "extras", id: "retired", name: "Retired", price: 1 }] });
  assert.deepEqual(selectionWithTags(RECORD, stale)[0].tags, []);
});

// --- the sheet's total -------------------------------------------------------

test("the summary says whether the total is short, and only when a choice can cost", () => {
  const info = unfinishedOf(RECORD, line());
  assert.deepEqual(summariseUnfinished([{ line: line({ qty: 2 }), info }, { line: line(), info: null }]), { count: 1, qty: 2, shortBy: true });
  const free = { item: info.item, groups: info.groups, extra: { min: 0, max: 0 } };
  assert.deepEqual(summariseUnfinished([{ line: line(), info: free }]), { count: 1, qty: 1, shortBy: false });
  assert.deepEqual(summariseUnfinished([]), { count: 0, qty: 0, shortBy: false });
});
