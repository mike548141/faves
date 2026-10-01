// Unit tests for personal notes on a recipe (site/js/notes.js, ROADMAP 17e,
// ADR 0131) — "used half the sugar, better". Storage is faked so no browser is
// needed; the per-profile scoping is exercised through the same scopeKey seam
// profiles.js uses, mirroring tests/ratings.test.js. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createNotes,
  normaliseNoteText,
  recipeId,
  MAX_NOTE,
  NOTES_KEY,
} from "../site/js/notes.js";
import { scopeKey } from "../site/js/profiles.js";

function fakeStorage(initial = null) {
  const m = new Map();
  if (initial != null) m.set(NOTES_KEY, initial);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

const item = { name: "Ginger Crunch", dishId: "gingernut" };
const rid = recipeId("cook-at-home", item);

test("recipeId keys on the dish id, not the name — a rename keeps the key (ADR 0051)", () => {
  assert.equal(rid, "cook-at-home gingernut");
  assert.equal(recipeId("cook-at-home", { ...item, name: "Ginger Slice" }), rid);
});

// --- normaliseNoteText -----------------------------------------------------

test("normaliseNoteText: collapses whitespace, trims, caps length", () => {
  assert.equal(normaliseNoteText("  used   half the sugar  "), "used half the sugar");
  assert.equal(normaliseNoteText(""), "");
  assert.equal(normaliseNoteText(null), "");
  assert.equal(normaliseNoteText(42), "");
  const long = "x".repeat(MAX_NOTE + 50);
  assert.equal(normaliseNoteText(long).length, MAX_NOTE);
});

test("normaliseNoteText never parses markup — it is characters, always", () => {
  const crafted = "<img src=x onerror=alert(1)>";
  assert.equal(normaliseNoteText(crafted), crafted); // untouched, not stripped or escaped
});

// --- the store --------------------------------------------------------------

test("set stores a note; get/has reflect it; count tracks", () => {
  const n = createNotes(fakeStorage());
  assert.equal(n.get(rid), "");
  assert.equal(n.has(rid), false);
  assert.equal(n.set(rid, "used half the sugar, better"), "used half the sugar, better");
  assert.equal(n.get(rid), "used half the sugar, better");
  assert.equal(n.has(rid), true);
  assert.equal(n.count(), 1);
});

test("set normalises before storing (whitespace collapsed, trimmed)", () => {
  const n = createNotes(fakeStorage());
  n.set(rid, "  no walnuts —   used pecans  ");
  assert.equal(n.get(rid), "no walnuts — used pecans");
});

test("saving an over-length note is capped, not refused", () => {
  const n = createNotes(fakeStorage());
  const long = "y".repeat(MAX_NOTE + 100);
  const stored = n.set(rid, long);
  assert.equal(stored.length, MAX_NOTE);
  assert.equal(n.get(rid).length, MAX_NOTE);
});

test("setting to empty (or whitespace-only) clears the note", () => {
  const n = createNotes(fakeStorage());
  n.set(rid, "a note");
  assert.equal(n.set(rid, "   "), "");
  assert.equal(n.has(rid), false);
  assert.equal(n.count(), 0);
});

test("clear() removes; both clear and re-clear are idempotent", () => {
  const n = createNotes(fakeStorage());
  assert.equal(n.clear(rid), false); // nothing to clear
  n.set(rid, "a note");
  assert.equal(n.clear(rid), true);
  assert.equal(n.get(rid), "");
  assert.equal(n.clear(rid), false);
});

test("re-setting the same (normalised) text is a no-op — no subscriber churn", () => {
  const n = createNotes(fakeStorage());
  let calls = 0;
  n.subscribe(() => calls++);
  n.set(rid, "used half the sugar");
  n.set(rid, "  used   half the sugar  "); // normalises to the same text
  assert.equal(calls, 1);
});

test("two recipes hold independent notes", () => {
  const n = createNotes(fakeStorage());
  const other = recipeId("cook-at-home", { name: "Pavlova", dishId: "pavlova" });
  n.set(rid, "note one");
  n.set(other, "note two");
  assert.equal(n.get(rid), "note one");
  assert.equal(n.get(other), "note two");
  assert.equal(n.count(), 2);
});

test("persistence: a fresh store over the same storage re-hydrates", () => {
  const storage = fakeStorage();
  createNotes(storage).set(rid, "keeper");
  assert.equal(createNotes(storage).get(rid), "keeper");
});

test("sanitises a corrupt or malformed stored payload on read", () => {
  assert.equal(createNotes(fakeStorage("nope {")).count(), 0);
  const n = createNotes(
    fakeStorage(JSON.stringify({ [rid]: "fine", bad: 42, "": "no key", empty: "   " }))
  );
  assert.equal(n.count(), 1);
  assert.equal(n.get(rid), "fine");
});

test("subscribe fires on change; unsubscribe stops it", () => {
  const n = createNotes(fakeStorage());
  let calls = 0;
  const off = n.subscribe(() => calls++);
  n.set(rid, "one");
  n.clear(rid);
  assert.equal(calls, 2);
  off();
  n.set(rid, "two");
  assert.equal(calls, 2);
});

// --- Per-profile scoping ------------------------------------------------
// Mirrors ratings.test.js's scopedDevice() rig: notes are per-profile via
// profileScopedStorage (ADR 0012), so two profiles must keep disjoint notes
// and a switch must re-point the whole store with no rewrite.

function scopedDevice() {
  const device = new Map();
  let activeId = "default";
  const view = {
    getItem: (k) => {
      const sk = scopeKey(activeId, k);
      return device.has(sk) ? device.get(sk) : null;
    },
    setItem: (k, v) => device.set(scopeKey(activeId, k), String(v)),
    removeItem: (k) => device.delete(scopeKey(activeId, k)),
  };
  return { view, device, switchTo: (id) => (activeId = id) };
}

test("per-profile: two profiles keep disjoint notes; a switch re-points", () => {
  const { view, device, switchTo } = scopedDevice();
  const n = createNotes(view);

  n.set(rid, "default's note");
  switchTo("p-alex");
  n.reload(); // re-point at Alex's (empty) store
  assert.equal(n.get(rid), ""); // Alex hasn't written one
  n.set(rid, "alex's note");

  assert.equal(
    device.get(scopeKey("default", NOTES_KEY)),
    JSON.stringify({ [rid]: "default's note" })
  );
  assert.equal(device.get(scopeKey("p-alex", NOTES_KEY)), JSON.stringify({ [rid]: "alex's note" }));

  switchTo("default");
  n.reload();
  assert.equal(n.get(rid), "default's note"); // default's note is untouched
});

// --- two pages over one storage (roadmap 510/320) ---------------------------

test("a page loaded before another page's note does not write its old notes back", () => {
  const st = fakeStorage(JSON.stringify({ [rid]: "old" }));
  const stalePage = createNotes(st);
  const other = createNotes(st);
  other.clear(rid);
  other.set("u:mine u:pudding", "moved");
  stalePage.set("cook-at-home other", "new here");
  assert.deepEqual(JSON.parse(st.getItem(NOTES_KEY)), { "u:mine u:pudding": "moved", "cook-at-home other": "new here" });
});
