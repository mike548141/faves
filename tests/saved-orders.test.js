// Saved orders (Theme 26a) — the store, the recall against a live menu, and the
// tables a NEW STORE has to be walked through (backup, sync, profile removal).
//
// The last group exists because this repo has been wrong about "the existing
// machinery already does the right thing" for a new store more than once (the
// sync code and the location flag both leaked into the backup through the
// catch-all sweep). A claim about a whitelist is asserted, not reasoned.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createOrder, lineKey } from "../site/js/cart.js";
import {
  SAVED_ORDERS_KEY,
  MAX_SAVED,
  createSavedOrders,
  linesToSave,
  normaliseName,
  sanitiseSavedOrders,
} from "../site/js/saved-orders.js";
import { planRecall } from "../site/js/saved-recall.js";
import { collectPersonalData, applyPersonalData, parsePersonalData } from "../site/js/personal-data.js";
import { createProfiles, scopeKey } from "../site/js/profiles.js";
import { mergePersonal } from "../site/js/sync-merge.js";
import { writeSnapshot } from "../site/js/sync.js";

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    _map: m,
  };
};

// A venue shaped like Subway: a size ladder (selects), sauces capped at 2, and a
// dish whose id differs from its name's slug.
const RECORD = {
  id: "sub-way",
  name: "Sub Way",
  currency: "NZD",
  addOnGroups: [
    {
      id: "size",
      name: "Size",
      kind: "selects",
      options: [
        { id: "six-inch", name: "6 inch", dishPrice: 9, default: true },
        { id: "footlong", name: "Footlong", dishPrice: 14 },
      ],
    },
    {
      id: "sauces",
      name: "Sauces",
      select: "many",
      max: 2,
      price: 0,
      options: [
        { id: "chipotle", name: "Chipotle", price: 0 },
        { id: "garlic", name: "Garlic aioli", price: 0.5 },
        { id: "bbq", name: "BBQ", price: 0 },
      ],
    },
  ],
  menu: [
    {
      name: "Subs",
      addOns: ["size", "sauces"],
      items: [
        { dishId: "meatball-marinara", name: "Meatball Marinara", price: 9 },
        { dishId: "veggie-delite", formerIds: ["veggie-delight"], name: "Veggie Delite", price: 8 },
      ],
    },
    { name: "Sides", items: [{ dishId: "cookie", name: "Cookie", price: 2.5 }] },
  ],
};

// The tally lines as the picker writes them (addons-ui.js `meta()`).
const tallyLines = () => {
  const s = fakeStorage();
  const o = createOrder(s);
  const base = { venueId: "sub-way", venueName: "Sub Way", currency: "NZD" };
  o.add({
    ...base,
    name: "Meatball Marinara",
    dishId: "meatball-marinara",
    price: 14.5,
    options: [
      { group: "size", id: "footlong", name: "Footlong", price: 0 },
      { group: "sauces", id: "garlic", name: "Garlic aioli", price: 0.5 },
    ],
  });
  o.add({
    ...base,
    name: "Meatball Marinara",
    dishId: "meatball-marinara",
    price: 14.5,
    options: [
      { group: "size", id: "footlong", name: "Footlong", price: 0 },
      { group: "sauces", id: "garlic", name: "Garlic aioli", price: 0.5 },
    ],
  });
  o.add({ ...base, name: "Cookie", dishId: "cookie", price: 2.5, note: "  warm  " });
  return o.items();
};

// --- the store ------------------------------------------------------------

test("save → list by venue → survives a reload from storage", () => {
  const s = fakeStorage();
  const a = createSavedOrders(s);
  const r = a.save({ venueId: "sub-way", venueName: "Sub Way", name: "  My   Subway ", lines: linesToSave(tallyLines()) });
  assert.equal(r.ok, true);
  assert.equal(r.saved.name, "My Subway");
  assert.equal(a.forVenue("sub-way").length, 1);
  assert.equal(a.forVenue("elsewhere").length, 0);

  const b = createSavedOrders(s); // a new page
  assert.deepEqual(b.all(), a.all());
});

test("the stored shape references dishes and options by ID, and carries no per-visit state", () => {
  const [l] = linesToSave(tallyLines());
  assert.equal(l.dishId, "meatball-marinara");
  assert.deepEqual(l.options.map((o) => [o.group, o.id]), [["size", "footlong"], ["sauces", "garlic"]]);
  assert.equal(l.qty, 2);
  for (const l2 of linesToSave(tallyLines())) {
    assert.equal("collected" in l2, false);
    assert.equal("phone" in l2, false);
  }
  assert.equal(linesToSave(tallyLines())[1].note, "warm", "the note is kept, normalised");
});

test("a line saved before option ids existed keys on slug(name), as every seeded id is", () => {
  const [l] = linesToSave([
    { venueId: "v", name: "Eggs", qty: 1, price: 1, options: [{ group: "sides", name: "Hash Brown", price: 3 }] },
  ]);
  assert.equal(l.options[0].id, "hash-brown");
  assert.equal(l.dishId, "eggs");
});

test("saving a name already used for that venue updates it; another venue's is separate", () => {
  const a = createSavedOrders(fakeStorage());
  const lines = linesToSave(tallyLines());
  const first = a.save({ venueId: "sub-way", venueName: "Sub Way", name: "My Subway", lines });
  const again = a.save({ venueId: "sub-way", venueName: "Sub Way", name: "my subway", lines: lines.slice(0, 1) });
  assert.equal(again.updated, true);
  assert.equal(again.saved.id, first.saved.id, "same order, same id");
  assert.equal(a.count(), 1);
  assert.equal(a.forVenue("sub-way")[0].lines.length, 1);
  a.save({ venueId: "other", venueName: "Other", name: "My Subway", lines });
  assert.equal(a.count(), 2);
});

test("delete removes only that one; deleting a missing id says so", () => {
  const a = createSavedOrders(fakeStorage());
  const lines = linesToSave(tallyLines());
  const x = a.save({ venueId: "sub-way", venueName: "S", name: "A", lines }).saved;
  const y = a.save({ venueId: "sub-way", venueName: "S", name: "B", lines }).saved;
  assert.equal(a.remove(x.id), true);
  assert.deepEqual(a.all().map((s) => s.id), [y.id]);
  assert.equal(a.remove("nope"), false);
});

test("nothing usable is refused with a reason, never stored", () => {
  const a = createSavedOrders(fakeStorage());
  const lines = linesToSave(tallyLines());
  assert.equal(a.save({ venueId: "v", name: "   ", lines }).reason, "name");
  assert.equal(a.save({ venueId: "v", name: "x", lines: [] }).reason, "empty");
  assert.equal(a.save({ venueId: "", name: "x", lines }).reason, "empty");
  assert.equal(a.count(), 0);
});

test("a person's list is capped", () => {
  const a = createSavedOrders(fakeStorage());
  const lines = linesToSave(tallyLines());
  for (let i = 0; i < MAX_SAVED; i += 1) assert.equal(a.save({ venueId: "v", name: `n${i}`, lines }).ok, true);
  assert.equal(a.save({ venueId: "v", name: "one too many", lines }).reason, "full");
  // …but updating one that is already there is not "one more".
  assert.equal(a.save({ venueId: "v", name: "n0", lines }).ok, true);
});

test("a corrupt or hand-edited payload starts clean and never reaches the screen", () => {
  const s = fakeStorage();
  s.setItem(SAVED_ORDERS_KEY, "{not json");
  assert.deepEqual(createSavedOrders(s).all(), []);
  s.setItem(
    SAVED_ORDERS_KEY,
    JSON.stringify([
      { id: "a", venueId: "v", name: "ok", lines: [{ dishId: "d", name: "D", qty: 2 }] },
      { id: "b", venueId: "v", name: "", lines: [{ dishId: "d", name: "D", qty: 2 }] }, // no name
      { id: "c", venueId: "v", name: "no lines", lines: [] },
      { id: "a", venueId: "v", name: "dup id", lines: [{ dishId: "d", name: "D", qty: 1 }] },
      { id: "e", venueId: "v", name: "bad qty", lines: [{ dishId: "d", name: "D", qty: -3 }] },
      "junk",
    ])
  );
  assert.deepEqual(createSavedOrders(s).all().map((x) => x.name), ["ok"]);
});

test("a write by another tab is caught up with before this one writes over it", () => {
  const s = fakeStorage();
  const a = createSavedOrders(s);
  const b = createSavedOrders(s); // another tab
  const lines = linesToSave(tallyLines());
  a.save({ venueId: "v", name: "from A", lines });
  b.save({ venueId: "v", name: "from B", lines });
  assert.deepEqual(createSavedOrders(s).all().map((x) => x.name), ["from A", "from B"]);
});

test("a moved venue id still finds its saved orders (renames.js)", async () => {
  const { RENAMED } = await import("../site/js/renames.js");
  const [oldId, newId] = Object.entries(RENAMED)[0] ?? [];
  if (!oldId) return; // no rename on record today; nothing to assert
  const a = createSavedOrders(fakeStorage());
  a.save({ venueId: oldId, venueName: "Moved", name: "mine", lines: linesToSave(tallyLines()) });
  assert.equal(a.forVenue(newId).length, 1);
});

test("normaliseName caps and collapses", () => {
  assert.equal(normaliseName(" a   b "), "a b");
  assert.equal(normaliseName("x".repeat(100)).length, 40);
  assert.equal(normaliseName(5), "");
});

// --- recall against the live menu ------------------------------------------

const saved = () => ({ id: "s1", venueId: "sub-way", venueName: "Sub Way", name: "My Subway", lines: linesToSave(tallyLines()) });

test("recall rebuilds the tally lines: same identity, today's prices", () => {
  const s = saved();
  // The snapshot is stale on purpose: recall must not trust it.
  s.lines[0].price = 1;
  s.lines[0].options[1].price = 99;
  const { lines, skipped } = planRecall(s, RECORD);
  assert.deepEqual(skipped, []);
  assert.equal(lines[0].price, 14.5, "footlong 14 + garlic 0.50, from the LIVE menu");
  assert.equal(lines[0].qty, 2);
  assert.deepEqual(lines[0].options.map((o) => [o.group, o.id, o.price]), [["size", "footlong", 0], ["sauces", "garlic", 0.5]]);
  assert.equal(lines[1].note, "warm");
  assert.equal(lines[1].price, 2.5);

  // Identity: recalled into an empty tally, the lines key exactly as the originals did.
  const target = createOrder(fakeStorage());
  target.merge(lines);
  assert.deepEqual(target.items().map(lineKey).sort(), tallyLines().map(lineKey).sort());
  assert.equal(target.count(), 3);
});

test("a price the venue has changed is the price recalled, not the saved one", () => {
  const dearer = structuredClone(RECORD);
  dearer.addOnGroups[0].options[1].dishPrice = 16;
  const { lines } = planRecall(saved(), dearer);
  assert.equal(lines[0].price, 16.5);
});

test("a renamed option still resolves, under its new name (matched by id)", () => {
  const renamed = structuredClone(RECORD);
  renamed.addOnGroups[1].options[1].name = "Roasted garlic";
  const { lines, skipped } = planRecall(saved(), renamed);
  assert.deepEqual(skipped, []);
  assert.equal(lines[0].options[1].name, "Roasted garlic");
});

test("a dish retired under a former id still resolves; one whose NAME moved to a new id does not", () => {
  const s = { id: "s", venueId: "sub-way", name: "n", lines: [{ dishId: "veggie-delight", name: "Veggie Delight", qty: 1, price: 8 }] };
  const { lines, skipped } = planRecall(s, RECORD);
  assert.equal(skipped.length, 0);
  assert.equal(lines[0].dishId, "veggie-delite");
  const other = { ...s, lines: [{ dishId: "meatball-marinara", name: "Meatball Marinara", qty: 1, price: 9 }] };
  const renamedId = structuredClone(RECORD);
  renamedId.menu[0].items[0].dishId = "meatball-special"; // same name, NEW id: a different dish (ADR 0051)
  assert.equal(planRecall(other, renamedId).lines.length, 0);
});

test("a dish that has left the menu is skipped and NAMED; the rest still comes back", () => {
  const gone = structuredClone(RECORD);
  gone.menu[1].items = []; // no cookie
  const { lines, skipped } = planRecall(saved(), gone);
  assert.deepEqual(lines.map((l) => l.dishId), ["meatball-marinara"]);
  assert.deepEqual(skipped, [{ name: "Cookie", qty: 1, reason: "no longer on the menu" }]);
});

test("an option the venue no longer offers skips the WHOLE line — never the line without it", () => {
  const less = structuredClone(RECORD);
  less.addOnGroups[1].options = less.addOnGroups[1].options.filter((o) => o.id !== "garlic");
  const { lines, skipped } = planRecall(saved(), less);
  assert.deepEqual(lines.map((l) => l.dishId), ["cookie"], "no meatball marinara minus its sauce");
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].name, "Meatball Marinara");
  assert.match(skipped[0].reason, /Garlic aioli.*no longer offered/);
});

test("a selection the group's cap now refuses is skipped, not put on the sheet", () => {
  const s = saved();
  s.lines[0].options.push({ group: "sauces", id: "bbq", name: "BBQ", price: 0 });
  s.lines[0].options.push({ group: "sauces", id: "chipotle", name: "Chipotle", price: 0 }); // 3 > max 2
  const { lines, skipped } = planRecall(s, RECORD);
  assert.equal(lines.some((l) => l.dishId === "meatball-marinara"), false);
  assert.equal(skipped[0].reason, "its add-ons no longer fit together");
});

test("a saved order for a venue with nothing left recalls nothing and says so line by line", () => {
  const { lines, skipped } = planRecall(saved(), { ...RECORD, menu: [] });
  assert.equal(lines.length, 0);
  assert.equal(skipped.length, 2);
});

// --- the tables a new store has to be walked through ------------------------

function device() {
  const s = fakeStorage();
  createProfiles(s); // a registry with "default"
  return s;
}
const withSaved = (s) => {
  s.setItem(scopeKey("default", SAVED_ORDERS_KEY), JSON.stringify([saved()]));
  return s;
};

test("BACKUP: the file the person asks for carries saved orders, by person, not in the catch-all bag", () => {
  const s = withSaved(device());
  const data = collectPersonalData(s, { exportedAt: "2026-10-02T00:00:00Z", localOnly: true });
  assert.equal(data.profiles[0].savedOrders.length, 1);
  assert.equal(data.profiles[0].savedOrders[0].name, "My Subway");
  assert.equal(data.other, undefined, "not swept into the unnamed-store bag");
  assert.equal(data.stores.savedOrders, 1);
});

test("SYNC: the default collect — the one sync makes — carries no saved orders, with or without them present", () => {
  const s = withSaved(device());
  const data = collectPersonalData(s, { exportedAt: "x" });
  assert.equal("savedOrders" in data.profiles[0], false);
  assert.equal(data.other, undefined, "and the sweep does not hand the key to sync's `other` either");
  // The load-bearing half is the DEFAULT, because mergePersonal carries an unknown
  // profile field through (ADR 0146 §3): a snapshot that held it would be pushed.
  const merged = mergePersonal(data, data, data).merged;
  assert.equal("savedOrders" in merged.profiles[0], false);
  // …and that no sync call site opts in.
  const src = readFileSync(new URL("../site/js/sync.js", import.meta.url), "utf8");
  assert.equal(/localOnly/.test(src), false, "sync.js must never ask for the on-device-only stores");
});

test("SYNC: a pull leaves saved orders exactly as they are", () => {
  const s = withSaved(device());
  const before = s.getItem(scopeKey("default", SAVED_ORDERS_KEY));
  writeSnapshot(s, { profiles: [{ id: "default", name: "Me", favourites: [], ratings: {}, notes: {}, settings: {} }] });
  assert.equal(s.getItem(scopeKey("default", SAVED_ORDERS_KEY)), before);
});

test("SYNC: a pull that removes a person takes their saved orders with them", () => {
  const s = withSaved(device());
  s.setItem("faves.profiles.v1", JSON.stringify({ v: 1, activeId: "default", profiles: [{ id: "default", name: "Me" }, { id: "gone", name: "Gone" }] }));
  s.setItem(scopeKey("gone", SAVED_ORDERS_KEY), JSON.stringify([saved()]));
  writeSnapshot(s, { profiles: [{ id: "default", name: "Me", favourites: [], ratings: {}, notes: {}, settings: {} }] });
  assert.equal(s.getItem(scopeKey("gone", SAVED_ORDERS_KEY)), null);
  assert.notEqual(s.getItem(scopeKey("default", SAVED_ORDERS_KEY)), null);
});

test("PROFILES: deleting a person purges their saved orders", () => {
  const s = withSaved(device());
  const p = createProfiles(s);
  const id = p.create("Sam");
  s.setItem(scopeKey(id, SAVED_ORDERS_KEY), JSON.stringify([saved()]));
  assert.equal(p.remove(id), true);
  assert.equal(s.getItem(scopeKey(id, SAVED_ORDERS_KEY)), null);
});

test("RESTORE: replace puts them back for the right person, and merge keeps yours", () => {
  const src = withSaved(device());
  const data = collectPersonalData(src, { exportedAt: "x", localOnly: true });

  const fresh = device();
  const out = applyPersonalData(fresh, data, { mode: "replace" });
  assert.equal(out.ok, true, out.error);
  assert.equal(out.savedOrdersAdded, 1);
  const id = JSON.parse(fresh.getItem("faves.profiles.v1")).activeId;
  assert.equal(JSON.parse(fresh.getItem(scopeKey(id, SAVED_ORDERS_KEY)))[0].name, "My Subway");

  // Merge into a device that already has a "My Subway" of its own: its own wins,
  // and re-importing the same file adds nothing.
  const mine = device();
  const edited = { ...saved(), id: "mine", lines: saved().lines.slice(0, 1) };
  mine.setItem(scopeKey("default", SAVED_ORDERS_KEY), JSON.stringify([edited]));
  const m = applyPersonalData(mine, data, { mode: "merge" });
  assert.equal(m.savedOrdersAdded, 0);
  assert.equal(JSON.parse(mine.getItem(scopeKey("default", SAVED_ORDERS_KEY))).length, 1);
  assert.equal(JSON.parse(mine.getItem(scopeKey("default", SAVED_ORDERS_KEY)))[0].id, "mine");

  const empty = device();
  assert.equal(applyPersonalData(empty, data, { mode: "merge" }).savedOrdersAdded, 1);
  assert.equal(applyPersonalData(empty, data, { mode: "merge" }).savedOrdersAdded, 0, "idempotent");
});

test("REPLACE wipes a saved-orders key even when storage cannot enumerate", () => {
  const s = withSaved(device());
  const noEnum = {
    getItem: (k) => s.getItem(k),
    setItem: (k, v) => s.setItem(k, v),
    removeItem: (k) => s.removeItem(k),
  };
  const data = collectPersonalData(device(), { exportedAt: "x", localOnly: true });
  applyPersonalData(noEnum, data, { mode: "replace" });
  assert.equal(s.getItem(scopeKey("default", SAVED_ORDERS_KEY)), null);
});

test("IMPORT cleans a hostile file: junk dropped, lines clipped, ids re-derived", () => {
  const file = {
    format: "faves.personal-data",
    v: 1,
    profiles: [
      {
        id: "p",
        name: "Me",
        savedOrders: [
          { id: "x", venueId: "v", name: "ok", lines: [{ dishId: "d", name: "D".repeat(500), qty: 9999, options: [{ group: "g", name: "Opt" }] }] },
          { id: "y", venueId: "v", name: "<img onerror=1>", lines: "nope" },
        ],
      },
    ],
  };
  const r = parsePersonalData(file);
  assert.equal(r.ok, true);
  const [o] = r.data.profiles[0].savedOrders;
  assert.equal(r.data.profiles[0].savedOrders.length, 1);
  assert.equal(o.lines[0].qty, 99);
  assert.equal(o.lines[0].name.length, 200);
  assert.equal(o.lines[0].options[0].id, "opt");
});

test("IMPORT keeps, cleaned, a raw saved-orders key an older build's catch-all put in the `other` bag", () => {
  const key = scopeKey("p", SAVED_ORDERS_KEY);
  const file = {
    format: "faves.personal-data",
    v: 1,
    profiles: [{ id: "p", name: "Me" }],
    other: { [key]: JSON.stringify([{ id: "x", venueId: "v", name: "ok", lines: [{ dishId: "d", name: "D", qty: 1 }] }, { junk: 1 }]) },
  };
  const r = parsePersonalData(file);
  assert.deepEqual(JSON.parse(r.data.other[key]).map((s) => s.id), ["x"]);
});

test("sanitiseSavedOrders is idempotent", () => {
  const once = sanitiseSavedOrders([saved()]);
  assert.deepEqual(sanitiseSavedOrders(once), once);
});
