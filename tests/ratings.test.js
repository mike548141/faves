// Unit tests for the personal ratings model (site/js/ratings.js) — the
// device-local 1–3 marks. Storage is faked so no browser is needed; the
// per-profile scoping is exercised through the same scopeKey seam profiles.js
// uses. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRatings,
  ratingKey,
  clampRating,
  MIN,
  MAX,
} from "../site/js/ratings.js";
import { scopeKey } from "../site/js/profiles.js";

function fakeStorage(initial = null) {
  const m = new Map();
  if (initial != null) m.set("faves.ratings.v1", initial);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

const venue = { type: "venue", venueId: "kk-malaysian", venueName: "KK Malaysian" };
const dish = { type: "dish", venueId: "kk-malaysian", venueName: "KK Malaysian", name: "Mee Goreng" };

test("ratingKey: venue vs dish identity (mirrors favKey)", () => {
  assert.equal(ratingKey(venue), "v:kk-malaysian");
  assert.equal(ratingKey(dish), "d:kk-malaysian Mee Goreng");
});

test("clampRating: rounds, clamps to [MIN, MAX], and 0-clears the rest", () => {
  assert.equal(clampRating(1), 1);
  assert.equal(clampRating(3), 3);
  assert.equal(clampRating(4), 4); // 1..5 scale (ADR 0019)
  assert.equal(clampRating(5), 5);
  assert.equal(clampRating(2.4), 2); // rounds to nearest step
  assert.equal(clampRating(2.6), 3);
  assert.equal(clampRating(9), MAX); // over-range clamps down (MAX is now 5)
  assert.equal(clampRating(0), 0); // below MIN → unset
  assert.equal(clampRating(-5), 0);
  assert.equal(clampRating("lots"), 0); // non-numeric → unset
  assert.equal(clampRating(NaN), 0);
  assert.equal(clampRating(Infinity), 0); // not finite → unset, never a phantom MAX
});

test("set stores a score; get/has reflect it; count tracks", () => {
  const r = createRatings(fakeStorage());
  assert.equal(r.get(dish), 0);
  assert.equal(r.has(dish), false);
  assert.equal(r.set(dish, 2), 2);
  assert.equal(r.get(dish), 2);
  assert.equal(r.has(dish), true);
  assert.equal(r.count(), 1);
});

test("set clamps out-of-range values in", () => {
  const r = createRatings(fakeStorage());
  assert.equal(r.set(dish, 99), MAX);
  assert.equal(r.get(dish), MAX);
  assert.equal(r.set(dish, 2.6), 3);
});

test("set to a clamp-0 value clears; clear() removes; both idempotent", () => {
  const r = createRatings(fakeStorage());
  r.set(dish, 3);
  assert.equal(r.set(dish, 0), 0); // clears via set
  assert.equal(r.has(dish), false);
  assert.equal(r.count(), 0);
  assert.equal(r.clear(dish), false); // nothing to clear
  r.set(dish, 2);
  assert.equal(r.clear(dish), true);
  assert.equal(r.get(dish), 0);
});

test("re-setting the same value is a no-op (no subscriber churn)", () => {
  const r = createRatings(fakeStorage());
  let calls = 0;
  r.subscribe(() => calls++);
  r.set(dish, 2);
  r.set(dish, 2); // unchanged
  assert.equal(calls, 1);
});

test("a venue and its dish rate independently", () => {
  const r = createRatings(fakeStorage());
  r.set(venue, 3);
  r.set(dish, 1);
  assert.equal(r.get(venue), 3);
  assert.equal(r.get(dish), 1);
  assert.equal(r.count(), 2);
});

test("persistence: a fresh store over the same storage re-hydrates", () => {
  const storage = fakeStorage();
  createRatings(storage).set(dish, 2);
  assert.equal(createRatings(storage).get(dish), 2);
});

test("sanitises a corrupt or out-of-range stored payload on read", () => {
  assert.equal(createRatings(fakeStorage("nope {")).count(), 0);
  // Out-of-range / non-integer entries are dropped; valid ones survive.
  const r = createRatings(
    fakeStorage('{"v:a":9,"d:a X":0,"d:a Y":2,"d:a Z":"x"}')
  );
  assert.equal(r.count(), 2);
  assert.equal(r.get({ type: "venue", venueId: "a" }), MAX); // 9 clamped to MAX (5)
  assert.equal(r.get({ type: "dish", venueId: "a", name: "Y" }), 2);
  assert.equal(r.has({ type: "dish", venueId: "a", name: "X" }), false); // 0 dropped
});

test("subscribe fires on change; unsubscribe stops it", () => {
  const r = createRatings(fakeStorage());
  let calls = 0;
  const off = r.subscribe(() => calls++);
  r.set(dish, 1);
  r.clear(dish);
  assert.equal(calls, 2);
  off();
  r.set(dish, 3);
  assert.equal(calls, 2);
});

// --- Per-profile scoping ------------------------------------------------
// Ratings are per-profile via profileScopedStorage (ADR 0012). Model that seam:
// one device-backed Map, a scoping view whose key rewrites by the *active*
// profile id, and a store that reloads on a switch — so each profile's marks
// stay isolated and a switch re-points the whole store with no rewrite.

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

test("per-profile: two profiles keep disjoint ratings; a switch re-points", () => {
  const { view, device, switchTo } = scopedDevice();
  const r = createRatings(view);

  r.set(dish, 3); // default profile rates it 3
  switchTo("p-alex");
  r.reload(); // re-point at Alex's (empty) store
  assert.equal(r.get(dish), 0); // Alex hasn't rated it
  r.set(dish, 1); // Alex rates it 1

  // Both marks coexist under distinct namespaced keys.
  assert.equal(device.get(scopeKey("default", "faves.ratings.v1")), '{"d:kk-malaysian Mee Goreng":3}');
  assert.equal(device.get(scopeKey("p-alex", "faves.ratings.v1")), '{"d:kk-malaysian Mee Goreng":1}');

  switchTo("default");
  r.reload();
  assert.equal(r.get(dish), 3); // default's mark is untouched
});
