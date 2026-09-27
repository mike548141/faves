// A dish with sizes — a `selects` group put on the order line (roadmap 28m,
// ADR 0130 for the shape, ADR 0133 for how it is priced and keyed).
//
// Every table a configured order line passes through is walked here with a
// variant on it: the price, the line's identity, the share link and the
// backup. The lesson this file is built on is that a whitelist sheds the field
// added after it — so the variant rides in the four fields every table already
// carries ({ group, id, name, price }), and these tests are what says it still
// arrives.
//
// No record in site/data carries a selects group yet (that is 28n); the ladder
// below is synthetic, in the shape validate.py accepts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupsFor,
  isSelects,
  defaultVariant,
  variantLabel,
  configuredPrice,
  lineOptions,
  selectionKey,
  selectionPrice,
  composeTags,
  optionId,
} from "../site/js/addons.js";
import { createOrder, lineKey, mergeItems } from "../site/js/cart.js";
import { encodeShare, decodeShare, CODEC_VERSION } from "../site/js/share-codec.js";
import {
  collectPersonalData,
  personalDataJson,
  parsePersonalData,
} from "../site/js/personal-data.js";

const fmt = (n) => `$${n}`;

const SIZE = {
  id: "size",
  name: "Size",
  kind: "selects",
  options: [
    { name: "Regular", id: "regular", dishPrice: 13, default: true, tags: ["v", "gf-option"] },
    { name: "Large", id: "large", dishPrice: 19.5, tags: ["v", "gf-option", "contains-sesame"] },
    // Unlabelled: the menu printed a third price and never said what it was.
    { id: "size-3", dishPrice: 24, tags: ["v", "gf-option"] },
  ],
};
const SIDES = {
  id: "sides",
  name: "Sides",
  select: "many",
  options: [{ name: "Bacon", id: "bacon", price: 6, tags: ["has-meat"] }],
};
const RECORD = { id: "fixture", addOnGroups: [SIDES, SIZE] };
const DISH = { name: "Eggs on Toast", dishId: "eggs-on-toast", price: 13, tags: ["v", "gf-option"], addOns: ["size"] };

/** A variant's selection entry exactly as addons-ui.js builds it. */
const pick = (option) => ({
  group: SIZE.id,
  id: optionId(option),
  name: variantLabel(SIZE, option, fmt),
  price: 0,
  dishPrice: option.dishPrice,
  isDefault: option.default === true,
  tags: option.tags,
});
const [REGULAR, LARGE, THIRD] = SIZE.options;
const BACON = { group: "sides", id: "bacon", name: "Bacon", price: 6, tags: ["has-meat"] };

const meta = (selection) => ({
  venueId: "fixture",
  venueName: "Fixture",
  name: DISH.name,
  dishId: DISH.dishId,
  price: configuredPrice(DISH.price, selection),
  options: lineOptions(selection),
});

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

// --- the group reaches the picker ------------------------------------------

test("groupsFor: a selects group is offered now that a screen draws it (28m)", () => {
  const got = groupsFor(RECORD, { addOns: ["sides"] }, DISH);
  assert.deepEqual(got.map((g) => g.id), ["sides", "size"]);
  assert.equal(isSelects(got[1]), true);
  assert.equal(isSelects(got[0]), false);
});

test("defaultVariant: the option marked default, never simply the first", () => {
  const reordered = { ...SIZE, options: [LARGE, REGULAR, THIRD] };
  assert.equal(defaultVariant(reordered), REGULAR);
  // A record that slipped past validate.py still renders with something chosen.
  assert.equal(defaultVariant({ options: [LARGE, THIRD] }), LARGE);
  assert.equal(defaultVariant({ options: [] }), null);
});

// --- what an unlabelled variant is called ------------------------------------

test("variantLabel: the menu's own name where it gave one", () => {
  assert.equal(variantLabel(SIZE, LARGE, fmt), "Large");
});

test("variantLabel: an unlabelled variant is named by its price and the group — nothing invented", () => {
  assert.equal(variantLabel(SIZE, THIRD, fmt), "$24 size");
});

test("variantLabel: two unlabelled variants at one price are still two things", () => {
  const twins = { ...SIZE, options: [REGULAR, { id: "a", dishPrice: 24 }, { id: "b", dishPrice: 24 }] };
  assert.equal(variantLabel(twins, twins.options[1], fmt), "$24 size (2)");
  assert.equal(variantLabel(twins, twins.options[2], fmt), "$24 size (3)");
});

// --- the price ---------------------------------------------------------------

test("configuredPrice: the variant's dishPrice REPLACES the dish's price — never added to it", () => {
  assert.equal(configuredPrice(13, [pick(REGULAR)]), 13);
  assert.equal(configuredPrice(13, [pick(LARGE)]), 19.5); // not 13 + 19.5
  assert.equal(configuredPrice(13, [pick(THIRD)]), 24);
});

test("configuredPrice: add-ons still surcharge on top of the chosen plate", () => {
  assert.equal(configuredPrice(13, [pick(LARGE), BACON]), 25.5);
  assert.equal(configuredPrice(13, [BACON]), 19);
  // A variant contributes nothing to the SURCHARGE sum — its price is the plate.
  assert.equal(selectionPrice([pick(LARGE), BACON]), 6);
});

test("configuredPrice: an unpriced dish stays unpriced until a plate with a price is chosen", () => {
  assert.equal(configuredPrice(null, []), null);
  assert.equal(configuredPrice(null, [BACON]), null);
  assert.equal(configuredPrice(null, [pick(LARGE)]), 19.5);
});

// --- the order line's identity ----------------------------------------------

test("lineOptions: the DEFAULT variant is the dish as listed, so it is not written on the line", () => {
  assert.deepEqual(lineOptions([pick(REGULAR)]), []);
  assert.deepEqual(lineOptions([pick(REGULAR), BACON]), [{ group: "sides", id: "bacon", name: "Bacon", price: 6 }]);
});

test("lineOptions: a non-default variant IS written, in the four fields every table carries", () => {
  assert.deepEqual(lineOptions([pick(LARGE)]), [{ group: "size", id: "large", name: "Large", price: 0 }]);
  assert.deepEqual(lineOptions([pick(THIRD)]), [{ group: "size", id: "size-3", name: "$24 size", price: 0 }]);
});

test("Small and Large of one dish are TWO order lines, each at its own whole price", () => {
  const order = createOrder(fakeStorage());
  order.add(meta([pick(REGULAR)]));
  order.add(meta([pick(LARGE)]));
  order.add(meta([pick(LARGE)]));
  const lines = order.items();
  assert.equal(lines.length, 2, JSON.stringify(lines));
  assert.deepEqual(lines.map((l) => [l.price, l.qty]), [[13, 1], [19.5, 2]]);
  assert.equal(order.total(), 13 + 19.5 * 2);
  assert.notEqual(lineKey(lines[0]), lineKey(lines[1]));
});

test("the default variant keys EXACTLY as the plain dish — a line stored before the ladder still merges", () => {
  // What a phone holds for this dish from before it had sizes: no options.
  const stored = [{ venueId: "fixture", venueName: "Fixture", name: DISH.name, dishId: DISH.dishId, price: 13, options: [], qty: 1, collected: false }];
  const s = fakeStorage();
  s.setItem("faves.order.v1", JSON.stringify(stored));
  const order = createOrder(s);
  order.add(meta([pick(REGULAR)]));
  assert.equal(order.items().length, 1);
  assert.equal(order.items()[0].qty, 2);
  // …and the control: Large does NOT merge into it.
  order.add(meta([pick(LARGE)]));
  assert.equal(order.items().length, 2);
});

test("a renamed variant keeps its line — the key is the option id (ADR 0126)", () => {
  const renamed = { ...LARGE, name: "Lg" };
  const before = selectionKey(lineOptions([pick(LARGE)]));
  const after = selectionKey(lineOptions([{ ...pick(renamed), name: variantLabel(SIZE, renamed, fmt) }]));
  assert.equal(before, after);
  // An unlabelled variant whose PRICE changes changes its label, not its key.
  const repriced = { ...THIRD, dishPrice: 26 };
  assert.equal(selectionKey(lineOptions([pick(THIRD)])), selectionKey(lineOptions([pick(repriced)])));
});

// --- composition -------------------------------------------------------------

test("a variant's allergen joins the dish (union), and a variant restating the claims leaves no residue", () => {
  const large = composeTags(DISH.tags, [pick(LARGE)]);
  assert.ok(large.tags.includes("contains-sesame"));
  assert.deepEqual(large.added, [{ tag: "contains-sesame", from: "Large" }]);
  assert.deepEqual(large.dropped, []);
  const regular = composeTags(DISH.tags, [pick(REGULAR)]);
  assert.deepEqual(regular.tags, DISH.tags);
  assert.deepEqual(regular.dropped, []);
});

// --- the share link ----------------------------------------------------------

const shared = (lines) => [{ venueId: "fixture", venueName: "Fixture", phone: null, items: lines }];

test("share: a variant rides the existing option tuple — CODEC_VERSION untouched, round trip exact", () => {
  assert.equal(CODEC_VERSION, 1);
  const line = { ...meta([pick(THIRD), BACON]), qty: 2 };
  const decoded = decodeShare(encodeShare({ groups: shared([line]) }));
  assert.ok(decoded);
  const got = decoded.items[0];
  assert.equal(got.price, 30); // 24 + 6, the configured unit price
  assert.deepEqual(got.options, [
    { group: "size", name: "$24 size", price: 0, id: "size-3" },
    { group: "sides", name: "Bacon", price: 6 },
  ]);
  // …and it lands on the SAME line the receiver's picker would make.
  assert.equal(selectionKey(got.options), selectionKey(line.options));
  const merged = mergeItems([{ ...line, qty: 1 }], decoded.items);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].qty, 3);
});

test("share: Small and Large stay two lines across a link", () => {
  const lines = [
    { ...meta([pick(REGULAR)]), qty: 1 },
    { ...meta([pick(LARGE)]), qty: 1 },
  ];
  const decoded = decodeShare(encodeShare({ groups: shared(lines) }));
  assert.equal(mergeItems([], decoded.items).length, 2);
  assert.deepEqual(decoded.items.map((i) => i.price), [13, 19.5]);
});

// --- the backup file ---------------------------------------------------------

test("backup: a variant line survives export and import with its id, name and price", () => {
  const s = fakeStorage();
  const order = createOrder(s);
  order.add(meta([pick(THIRD), BACON]));
  order.add(meta([pick(REGULAR)]));
  const r = parsePersonalData(personalDataJson(collectPersonalData(s, { exportedAt: "2026-09-28T00:00:00.000Z" })));
  assert.equal(r.ok, true, JSON.stringify(r));
  const lines = r.data.order;
  assert.equal(lines.length, 2);
  assert.equal(lines[0].price, 30);
  assert.deepEqual(lines[0].options, [
    { group: "size", name: "$24 size", price: 0, id: "size-3" },
    { group: "sides", name: "Bacon", price: 6, id: "bacon" },
  ]);
  assert.equal(selectionKey(lines[0].options), selectionKey(order.items()[0].options));
  // The default line comes back as the plain dish it always was.
  assert.equal(lines[1].options, undefined);
});
