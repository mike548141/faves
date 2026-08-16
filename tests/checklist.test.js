// Ticking off a recipe (ROADMAP 17e) — the model half. What a browser cannot
// show cheaply lives here: the keying rules, the expiry clock, and that a
// blocked storage still leaves the boxes working for the session.
//
// What these CANNOT prove, and cook_check.mjs does: that a tick survives a real
// reload, that the boxes are real checkboxes with a 44px target, and that
// rebuilding the ingredient list never drops focus out of the dialog.

import test from "node:test";
import assert from "node:assert/strict";

import {
  CHECKLIST_KEY,
  STALE_MS,
  createChecklist,
  lineId,
  recipeId,
  sanitiseTicks,
} from "../site/js/checklist.js";

const fakeStorage = (seed = {}) => {
  const mem = new Map(Object.entries(seed));
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    _mem: mem,
  };
};

// --- Identity -------------------------------------------------------------

test("a line is keyed on its text, not its position", () => {
  assert.equal(lineId("i", "100g butter"), lineId("i", "100g butter"));
  assert.notEqual(lineId("i", "100g butter"), lineId("i", "100g sugar"));
});

test("a step and an ingredient reading the same are two different ticks", () => {
  assert.notEqual(lineId("s", "Chill the dough"), lineId("i", "Chill the dough"));
});

test("whitespace is normalised — a reflowed data file is not an edit", () => {
  assert.equal(lineId("i", " 2  cups\nflour "), lineId("i", "2 cups flour"));
});

test("a recipe is keyed on venue + dish id, never on its name", () => {
  const item = { name: "Ginger Crunch", dishId: "gingernut" };
  assert.equal(recipeId("cook-at-home", item), "cook-at-home gingernut");
  // A rename must not move the key: the id is the identity (ADR 0051).
  assert.equal(recipeId("cook-at-home", { ...item, name: "Ginger Slice" }), "cook-at-home gingernut");
  // Two collections with the same dish id stay two recipes.
  assert.notEqual(recipeId("cook-at-home", item), recipeId("other", item));
});

test("a dish with no stored id falls back to its slugged name, like everything else", () => {
  assert.equal(recipeId("c", { name: "Ginger Crunch" }), "c ginger-crunch");
});

// --- Reading what is on disk ----------------------------------------------

test("sanitiseTicks drops anything that isn't a live record", () => {
  const now = 1_000_000;
  const out = sanitiseTicks(
    {
      good: { at: now - 1000, t: ["i:a", "i:a", "s:b"] },
      empty: { at: now, t: [] },
      undated: { t: ["i:c"] }, // no clock ⇒ cannot age ⇒ treated as expired
      stale: { at: now - STALE_MS - 1, t: ["i:d"] },
      junk: "nope",
    },
    { now }
  );
  assert.deepEqual(Object.keys(out), ["good"]);
  assert.deepEqual(out.good.t, ["i:a", "s:b"]); // duplicates collapsed
});

test("a corrupt blob reads as no ticks rather than throwing", () => {
  const c = createChecklist(fakeStorage({ [CHECKLIST_KEY]: "{not json" }));
  assert.equal(c.count("r"), 0);
});

// --- Ticking --------------------------------------------------------------

test("a tick survives a reload — a fresh store over the same storage sees it", () => {
  const s = fakeStorage();
  const a = createChecklist(s);
  a.set("r", "i:1", true);
  const b = createChecklist(s);
  assert.equal(b.has("r", "i:1"), true);
  assert.equal(b.count("r"), 1);
});

test("set writes the state given, so two boxes for one line cannot argue", () => {
  const c = createChecklist(fakeStorage());
  c.set("r", "i:1", true);
  c.set("r", "i:1", true); // a second box reporting the same thing
  assert.equal(c.count("r"), 1);
  c.set("r", "i:1", false);
  assert.equal(c.has("r", "i:1"), false);
});

test("unticking the last line removes the record rather than leaving it empty", () => {
  const s = fakeStorage();
  const c = createChecklist(s);
  c.set("r", "i:1", true);
  c.set("r", "i:1", false);
  assert.deepEqual(JSON.parse(s.getItem(CHECKLIST_KEY)), {});
});

test("ticks are scoped per recipe — one recipe's clear leaves the other alone", () => {
  const c = createChecklist(fakeStorage());
  c.set("a", "i:1", true);
  c.set("b", "i:1", true);
  c.clear("a");
  assert.equal(c.count("a"), 0);
  assert.equal(c.count("b"), 1);
});

test("clear on a recipe with nothing ticked is a silent no-op", () => {
  const c = createChecklist(fakeStorage());
  assert.equal(c.clear("r"), false);
});

test("ticked() hands back a set the caller cannot use to mutate the store", () => {
  const c = createChecklist(fakeStorage());
  c.set("r", "i:1", true);
  const set = c.ticked("r");
  set.add("i:2");
  assert.equal(c.has("r", "i:2"), false);
});

test("subscribers are told on every write and on reload", () => {
  const c = createChecklist(fakeStorage());
  let calls = 0;
  const off = c.subscribe(() => calls++);
  c.set("r", "i:1", true);
  c.clear("r");
  c.reload();
  assert.equal(calls, 3);
  off();
  c.set("r", "i:2", true);
  assert.equal(calls, 3);
});

// --- The clock ------------------------------------------------------------

test("a recipe cooked yesterday does not start half-ticked today", () => {
  const s = fakeStorage();
  let now = 1_000_000_000;
  const a = createChecklist(s, () => now);
  a.set("r", "i:1", true);
  now += STALE_MS + 1;
  const b = createChecklist(s, () => now);
  assert.equal(b.count("r"), 0);
});

test("ticks do not expire under a session that is still open", () => {
  const s = fakeStorage();
  let now = 1_000_000_000;
  const c = createChecklist(s, () => now);
  c.set("r", "i:1", true);
  now += STALE_MS * 3; // a page left open all day
  assert.equal(c.has("r", "i:1"), true); // still there — expiry is on read from disk
  c.reload();
  assert.equal(c.has("r", "i:1"), false); // …and only then
});

test("touching a recipe refreshes its clock, so a long cook cannot age out", () => {
  const s = fakeStorage();
  let now = 1_000_000_000;
  const a = createChecklist(s, () => now);
  a.set("r", "i:1", true);
  now += STALE_MS - 1000;
  a.set("r", "i:2", true); // still cooking
  now += 2000; // the first tick is now older than STALE_MS on its own
  const b = createChecklist(s, () => now);
  assert.equal(b.count("r"), 2);
});

// --- A locked-down browser -------------------------------------------------

test("storage that refuses to write still leaves the boxes working this session", () => {
  const blocked = {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceeded");
    },
    removeItem: () => {},
  };
  const c = createChecklist(blocked);
  assert.doesNotThrow(() => c.set("r", "i:1", true));
  assert.equal(c.has("r", "i:1"), true);
});
