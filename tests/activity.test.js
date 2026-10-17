// The activity log's recorder (Theme 32a): the ring, the gate every entry passes
// through, the one rule that must never bend (a settings entry names a DIAL,
// never a value), and the events wired to it. The backup, sync and wipe tables
// (32d) are in activity-backup.test.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ACTIVITY_CAP,
  ACTIVITY_KEY,
  KINDS,
  SETTINGS_DIALS,
  changedDials,
  createActivity,
  makeEntry,
  sanitiseActivity,
} from "../site/js/activity.js";
import { createFavourites } from "../site/js/favourites.js";
import { createRatings } from "../site/js/ratings.js";
import { createOrder } from "../site/js/cart.js";
import {
  ALLERGEN_PREFS,
  DIETARY_PREFS,
  FOOD_PREFS,
  createSettings,
} from "../site/js/settings.js";
import { createProfiles } from "../site/js/profiles.js";

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    _map: m,
  };
};

// A clock that moves one second per call, so entries are ordered and distinct.
const ticker = (start = Date.UTC(2026, 9, 18, 8, 0, 0)) => {
  let t = start;
  return () => new Date((t += 1000));
};
const newLog = (storage = fakeStorage()) => createActivity(storage, { now: ticker() });

// Hands a store a `record` that collects what it was told.
const collector = () => {
  const told = [];
  return { told, record: (kind, subject, from, to) => void told.push({ kind, subject, from, to }) };
};

// --- the recorder ------------------------------------------------------------

test("the cap is 500 and is a constant the screen can state", () => {
  assert.equal(ACTIVITY_CAP, 500);
  assert.equal(newLog().cap, 500);
});

test("record appends an entry with the item's shape, label snapshotted at write time", () => {
  const log = newLog();
  assert.equal(log.record("rating.set", { venue: "kk-malaysian", dish: "fried-won-tons", label: "Fried Won Tons" }, null, 4), true);
  assert.deepEqual(log.entries(), [
    {
      at: "2026-10-18T08:00:01Z",
      kind: "rating.set",
      subject: { venue: "kk-malaysian", dish: "fried-won-tons", label: "Fried Won Tons" },
      from: null,
      to: 4,
    },
  ]);
});

test("entries come back in the order they happened, and as a copy nobody can edit the log through", () => {
  const log = newLog();
  log.record("favourite.add", { venue: "a", label: "A" });
  log.record("favourite.remove", { venue: "a", label: "A" });
  const got = log.entries();
  assert.deepEqual(got.map((e) => e.kind), ["favourite.add", "favourite.remove"]);
  got.pop();
  assert.throws(() => {
    got[0].kind = "rating.set";
  }, TypeError, "an entry is frozen: it can be read, never edited");
  assert.throws(() => {
    got[0].subject.label = "changed";
  }, TypeError);
  assert.deepEqual(log.entries().map((e) => e.kind), ["favourite.add", "favourite.remove"]);
});

test("the ring keeps the newest ACTIVITY_CAP entries and evicts the oldest", () => {
  const log = newLog();
  for (let i = 0; i < ACTIVITY_CAP + 25; i += 1) log.record("favourite.add", { venue: "v", dish: `d${i}`, label: `D${i}` });
  const got = log.entries();
  assert.equal(got.length, ACTIVITY_CAP);
  assert.equal(got[0].subject.dish, "d25", "the 25 oldest went");
  assert.equal(got.at(-1).subject.dish, `d${ACTIVITY_CAP + 24}`);
});

test("storage holds the capped list", () => {
  const s = fakeStorage();
  const log = newLog(s);
  for (let i = 0; i < ACTIVITY_CAP + 3; i += 1) log.record("order.clear", {}, 1, 0);
  assert.equal(JSON.parse(s.getItem(ACTIVITY_KEY)).length, ACTIVITY_CAP);
});

test("a vocabulary outside the closed list is refused", () => {
  const log = newLog();
  assert.equal(log.record("page.viewed", { venue: "v" }), false);
  assert.equal(log.count(), 0);
});

test("record never throws: a refusing storage keeps the entry for this session only", () => {
  const s = fakeStorage();
  s.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  const log = newLog(s);
  assert.doesNotThrow(() => log.record("favourite.add", { venue: "v", label: "V" }));
  assert.equal(log.count(), 1, "still drives this session");
  const broken = createActivity({ getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  assert.doesNotThrow(() => broken.record("favourite.add", { venue: "v" }));
  assert.doesNotThrow(() => broken.record("rating.set", null, "x", {}));
});

test("a listener that throws does not stop the entry or the others hearing", () => {
  const log = newLog();
  let heard = 0;
  log.subscribe(() => {
    throw new Error("boom");
  });
  log.subscribe(() => void (heard += 1));
  assert.equal(log.record("favourite.add", { venue: "v" }), true);
  assert.equal(heard, 1);
});

test("a write made elsewhere is caught up with before appending (another tab, a profile switch)", () => {
  const s = fakeStorage();
  const a = newLog(s);
  const b = newLog(s);
  a.record("favourite.add", { venue: "one" });
  b.record("favourite.add", { venue: "two" });
  assert.deepEqual(a.entries().map((e) => e.subject.venue), ["one", "two"]);
});

test("there is no way to remove one entry, only to clear the lot", () => {
  const log = newLog();
  log.record("favourite.add", { venue: "v" });
  log.record("favourite.remove", { venue: "v" });
  assert.equal(log.remove, undefined);
  assert.equal(log.delete, undefined);
  assert.equal(log.forget, undefined);
  assert.equal(log.clear(), 2);
  assert.equal(log.count(), 0);
});

test("a removal appears as a removal: removing a favourite leaves its add in the log", () => {
  const log = newLog();
  const fav = createFavourites(fakeStorage(), { record: log.record });
  const entry = { type: "dish", venueId: "v", venueName: "V", name: "Pie" };
  fav.toggle(entry);
  fav.toggle(entry);
  assert.deepEqual(log.entries().map((e) => e.kind), ["favourite.add", "favourite.remove"]);
});

// --- the gate every entry passes through --------------------------------------

test("makeEntry demands an ISO time with a zone and a known kind", () => {
  const ok = { at: "2026-10-18T08:00:00Z", kind: "favourite.add", subject: { venue: "v" } };
  assert.ok(makeEntry(ok));
  assert.ok(makeEntry({ ...ok, at: "2026-10-18T20:00:00+13:00" }));
  for (const at of ["2026-10-18", "yesterday", "2026-10-18T08:00:00", 5, null, "2026-13-45T99:99:99Z"]) {
    assert.equal(makeEntry({ ...ok, at }), null, String(at));
  }
  assert.equal(makeEntry({ ...ok, kind: "x" }), null);
  assert.equal(makeEntry(), null);
});

test("every kind in the vocabulary is accepted by the gate, and the vocabulary is the item's", () => {
  assert.deepEqual([...KINDS], [
    "favourite.add",
    "favourite.remove",
    "rating.set",
    "rating.clear",
    "report.sent",
    "order.add",
    "order.remove",
    "order.clear",
    "profile.switch",
    "settings.change",
    "reset.performed",
    "data.updated",
    "app.updated",
    "cache.refreshed",
  ]);
});

test("strings are bounded and values are typed by kind", () => {
  const e = makeEntry({
    at: "2026-10-18T08:00:00Z",
    kind: "rating.set",
    subject: { venue: "v".repeat(500), dish: "d", label: "L".repeat(500), junk: "x" },
    from: "4",
    to: 9.4,
  });
  assert.equal(e.subject.venue.length, 200);
  assert.equal(e.subject.label.length, 200);
  assert.equal("junk" in e.subject, false);
  assert.equal(e.from, null, "a string where a score belongs is not a score");
  assert.equal(e.to, 9);
  // A kind with no value carries none, whatever the caller handed over.
  const f = makeEntry({ at: "2026-10-18T08:00:00Z", kind: "favourite.add", subject: { venue: "v" }, from: "x", to: { a: 1 } });
  assert.equal(f.from, null);
  assert.equal(f.to, null);
});

test("sanitiseActivity drops junk, keeps the newest cap, and is idempotent", () => {
  const good = (i) => ({ at: `2026-10-18T08:00:${String(i % 60).padStart(2, "0")}Z`, kind: "order.clear", subject: {}, from: i % 9, to: 0 });
  const list = [null, 7, "x", { kind: "nope" }, ...Array.from({ length: ACTIVITY_CAP + 10 }, (_, i) => good(i))];
  const once = sanitiseActivity(list);
  assert.equal(once.length, ACTIVITY_CAP);
  assert.deepEqual(sanitiseActivity(once), once);
  assert.deepEqual(sanitiseActivity("nope"), []);
  assert.deepEqual(sanitiseActivity({}), []);
});

// --- 🛑 settings.change names the dial, never the value ------------------------

test("settings.change accepts a dial's name and nothing else", () => {
  const at = "2026-10-18T08:00:00Z";
  assert.deepEqual(makeEntry({ at, kind: "settings.change", subject: { label: "diet" } }).subject, { label: "diet" });
  for (const bad of ["contains-peanuts", "peanuts", "halal", "", "picksClosed", "somethingNew", undefined]) {
    assert.equal(makeEntry({ at, kind: "settings.change", subject: { label: bad } }), null, String(bad));
  }
});

test("a caller cannot smuggle a value through a settings entry: from, to, venue and dish are thrown away", () => {
  const log = newLog();
  log.record("settings.change", { label: "diet", venue: "contains-peanuts", dish: "contains-shellfish" }, ["contains-peanuts"], { avoid: ["contains-nuts"] });
  const [e] = log.entries();
  assert.deepEqual(e.subject, { label: "diet" });
  assert.equal(e.from, null);
  assert.equal(e.to, null);
  assert.equal(JSON.stringify(log.entries()).includes("contains"), false);
});

test("a hand-edited backup cannot put a value into a settings entry either", () => {
  const dirty = [
    { at: "2026-10-18T08:00:00Z", kind: "settings.change", subject: { label: "diet", dish: "contains-peanuts" }, from: "contains-peanuts", to: ["contains-fish"] },
    { at: "2026-10-18T08:00:01Z", kind: "settings.change", subject: { label: "contains-peanuts" } },
  ];
  const clean = sanitiseActivity(dirty);
  assert.equal(clean.length, 1);
  assert.equal(JSON.stringify(clean).includes("contains"), false);
});

test("NO allergen, diet or food-preference value ever reaches the log through the settings store", () => {
  const log = newLog();
  const store = createSettings(fakeStorage(), { record: log.record });
  // Every dial the screen has: flag each allergen and diet in turn, then clear them.
  for (const a of ALLERGEN_PREFS) store.set({ diet: { dietary: [], avoid: [a.key] } });
  for (const d of DIETARY_PREFS) store.set({ diet: { dietary: [d.key], avoid: [] } });
  store.set({ diet: { dietary: DIETARY_PREFS.map((d) => d.key), avoid: ALLERGEN_PREFS.map((a) => a.key) } });
  for (const f of FOOD_PREFS) store.set({ foodPrefs: [f.key] });
  store.set({ lang: "mi", units: "imperial", currency: "AUD", mapsApp: "waze", favBoostKm: 7, farKm: 33 });
  store.reset();
  const text = JSON.stringify(log.entries());
  assert.ok(log.count() > ALLERGEN_PREFS.length, "the test actually changed things");
  // (Keys of three letters or fewer — "v", "vg", "gf", "df" — are skipped: they
  // are substrings of ordinary words. Their labels are not.)
  const words = [...ALLERGEN_PREFS, ...DIETARY_PREFS, ...FOOD_PREFS].flatMap((p) => [p.key, p.label]).filter((w) => w.length > 3);
  assert.ok(words.includes("contains-peanuts") && words.includes("Vegetarian") && words.includes("halal"));
  for (const word of words) {
    assert.equal(text.includes(word), false, `"${word}" reached the activity log`);
  }
  assert.equal(/imperial|AUD|waze|"mi"/.test(text), false, "no other dial's value either");
  assert.ok(log.entries().every((e) => e.from === null && e.to === null), "no value at all on any settings entry");
});

test("settings names exactly the dials that changed, once each, and nothing for a no-op", () => {
  const log = newLog();
  const store = createSettings(fakeStorage(), { record: log.record });
  store.set({ farKm: 30 });
  store.set({ farKm: 30 });
  store.set({ lang: "mi", units: "imperial" });
  store.set({ picksClosed: ["some-venue"] });
  assert.deepEqual(log.entries().map((e) => e.subject.label), ["farKm", "lang", "units"]);
  assert.deepEqual(changedDials({ diet: { a: 1 }, farKm: 1 }, { diet: { a: 2 }, farKm: 1 }), ["diet"]);
});

test("reset records THAT settings were reset, not what they were", () => {
  const log = newLog();
  const store = createSettings(fakeStorage(), { record: log.record });
  store.set({ diet: { dietary: [], avoid: ["contains-peanuts"] } });
  store.reset();
  assert.deepEqual(log.entries().map((e) => [e.kind, e.subject.label]), [["settings.change", "diet"], ["reset.performed", "settings"]]);
});

test("every dial the log may name is a real settings field", () => {
  const s = createSettings(fakeStorage()).raw();
  for (const d of SETTINGS_DIALS) assert.ok(d in s, d);
});

// --- the events that are wired ------------------------------------------------

const dish = { type: "dish", venueId: "kk", venueName: "KK Malaysian", name: "Fried Won Tons", dishId: "fried-won-tons" };
const venue = { type: "venue", venueId: "kk", venueName: "KK Malaysian" };

test("favourites: a heart on, off, a forgotten row and a received shortlist are each recorded", () => {
  const { told, record } = collector();
  const fav = createFavourites(fakeStorage(), { record });
  fav.toggle(dish);
  fav.toggle(venue);
  fav.toggle(dish);
  fav.removeKey("v:kk");
  fav.merge([dish, venue, dish]);
  assert.deepEqual(
    told.map((t) => [t.kind, t.subject.dish ?? null, t.subject.label]),
    [
      ["favourite.add", "fried-won-tons", "Fried Won Tons"],
      ["favourite.add", null, "KK Malaysian"],
      ["favourite.remove", "fried-won-tons", "Fried Won Tons"],
      ["favourite.remove", null, "KK Malaysian"],
      ["favourite.add", "fried-won-tons", "Fried Won Tons"],
      ["favourite.add", null, "KK Malaysian"],
    ]
  );
  assert.ok(told.every((t) => t.subject.venue === "kk"));
});

test("favourites: nothing changed, nothing recorded; and a store built without a recorder records nothing", () => {
  const { told, record } = collector();
  const fav = createFavourites(fakeStorage(), { record });
  fav.merge([]);
  fav.removeKey("v:nothing-here");
  assert.deepEqual(told, []);
  const plain = createFavourites(fakeStorage());
  assert.doesNotThrow(() => plain.toggle(dish));
});

test("favourites: a recorder that throws cannot stop a heart saving, and the heart is written BEFORE the entry", () => {
  const s = fakeStorage();
  let seenWhenRecorded = null;
  const fav = createFavourites(s, {
    record: () => {
      seenWhenRecorded = s.getItem("faves.favourites.v1");
      throw new Error("log is broken");
    },
  });
  assert.equal(fav.toggle(dish), true);
  assert.ok(JSON.parse(s.getItem("faves.favourites.v1")).length === 1, "the heart saved");
  assert.ok(seenWhenRecorded?.includes("fried-won-tons"), "the real write came first");
});

test("favourites: a full activity log storage does not stop the heart (real singletons' shape)", () => {
  const hearts = fakeStorage();
  const full = fakeStorage();
  full.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  const log = createActivity(full);
  const fav = createFavourites(hearts, { record: log.record });
  assert.equal(fav.toggle(dish), true);
  assert.equal(JSON.parse(hearts.getItem("faves.favourites.v1")).length, 1);
});

test("ratings: set records from→to, a change keeps the old score, 0 and clear are both a clear", () => {
  const { told, record } = collector();
  const r = createRatings(fakeStorage(), { record });
  r.set(dish, 4);
  r.set(dish, 4); // no-op
  r.set(dish, 2);
  r.set(dish, 0);
  r.clear(dish); // nothing to clear
  r.set(venue, 5);
  r.clear(venue);
  assert.deepEqual(
    told.map((t) => [t.kind, t.subject.label, t.from, t.to]),
    [
      ["rating.set", "Fried Won Tons", null, 4],
      ["rating.set", "Fried Won Tons", 4, 2],
      ["rating.clear", "Fried Won Tons", 2, null],
      ["rating.set", "KK Malaysian", null, 5],
      ["rating.clear", "KK Malaysian", 5, null],
    ]
  );
});

test("order: add, step up, step down, remove, clear and a received order — quantity before and after", () => {
  const { told, record } = collector();
  const o = createOrder(fakeStorage(), "faves.order.v1", { record });
  const meta = { venueId: "kk", venueName: "KK", name: "Fried Won Tons", dishId: "fried-won-tons", price: 9 };
  o.add(meta);
  o.add(meta);
  o.setQty("kk", "fried-won-tons", 5);
  o.setQty("kk", "fried-won-tons", 4);
  o.setQty("kk", "fried-won-tons", 4); // unchanged
  o.setQty("kk", "fried-won-tons", 0);
  o.add(meta);
  o.remove("kk", "fried-won-tons");
  o.remove("kk", "fried-won-tons"); // already gone
  o.add(meta);
  o.merge([{ ...meta, qty: 2 }, { venueId: "kk", venueName: "KK", name: "Rice", price: 3, qty: 1 }]);
  o.clear();
  o.clear(); // already empty
  assert.deepEqual(
    told.map((t) => [t.kind, t.subject.label || "", t.from, t.to]),
    [
      ["order.add", "Fried Won Tons", 0, 1],
      ["order.add", "Fried Won Tons", 1, 2],
      ["order.add", "Fried Won Tons", 2, 5],
      ["order.remove", "Fried Won Tons", 5, 4],
      ["order.remove", "Fried Won Tons", 4, 0],
      ["order.add", "Fried Won Tons", 0, 1],
      ["order.remove", "Fried Won Tons", 1, 0],
      ["order.add", "Fried Won Tons", 0, 1],
      ["order.add", "Fried Won Tons", 1, 3],
      ["order.add", "Rice", 0, 1],
      ["order.clear", "", 4, 0],
    ]
  );
});

test("the shopping list shares the order code and is NOT the person's activity", () => {
  const src = readFileSync(new URL("../site/js/shopping.js", import.meta.url), "utf8");
  assert.equal(/record/.test(src.replace(/\/\/.*$/gm, "")), false, "shopping.js must not hand createOrder a recorder");
});

test("choosing a profile is recorded in the log of the profile chosen", () => {
  const s = fakeStorage();
  const p = createProfiles(s);
  const told = [];
  p.onSwitch((who) => told.push(who));
  const sam = p.create("Sam");
  p.setActive("default");
  p.setActive("default"); // already active
  p.rename(sam, "Samuel");
  p.setActive(sam);
  p.remove(sam); // the active one goes: another becomes active
  p.remove("nobody");
  assert.deepEqual(told, [
    { id: sam, name: "Sam" },
    { id: "default", name: "Me" },
    { id: sam, name: "Samuel" },
    { id: "default", name: "Me" },
  ]);
});

test("a listener that throws cannot stop a profile switching", () => {
  const p = createProfiles(fakeStorage());
  p.onSwitch(() => {
    throw new Error("boom");
  });
  const id = p.create("Sam");
  assert.equal(p.activeId(), id);
});
