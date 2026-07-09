// Unit tests for the user settings model (site/js/settings.js) — the two
// distance dials behind the home ranking. Storage is faked; pure otherwise.
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createSettings, DEFAULTS, BOUNDS } from "../site/js/settings.js";

function fakeStorage(initial = null) {
  const m = new Map();
  if (initial != null) m.set("faves.settings.v1", initial);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

test("defaults when storage is empty", () => {
  const s = createSettings(fakeStorage());
  assert.deepEqual(s.get(), DEFAULTS);
});

test("set merges a partial patch and persists", () => {
  const storage = fakeStorage();
  const s = createSettings(storage);
  s.set({ favBoostKm: 15 });
  assert.equal(s.get().favBoostKm, 15);
  assert.equal(s.get().farKm, DEFAULTS.farKm); // untouched
  // A fresh store over the same storage re-hydrates the change.
  assert.equal(createSettings(storage).get().favBoostKm, 15);
});

test("values are clamped into bounds", () => {
  const s = createSettings(fakeStorage());
  s.set({ favBoostKm: 999, farKm: -4 });
  assert.equal(s.get().favBoostKm, BOUNDS.favBoostKm[1]);
  assert.equal(s.get().farKm, BOUNDS.farKm[0]);
});

test("non-numeric values fall back to the default", () => {
  const s = createSettings(fakeStorage());
  s.set({ favBoostKm: "lots", farKm: NaN });
  assert.deepEqual(s.get(), DEFAULTS);
});

test("reset restores defaults", () => {
  const s = createSettings(fakeStorage());
  s.set({ favBoostKm: 0, farKm: 200 });
  s.reset();
  assert.deepEqual(s.get(), DEFAULTS);
});

test("corrupt stored payload → defaults", () => {
  const s = createSettings(fakeStorage("{ broken"));
  assert.deepEqual(s.get(), DEFAULTS);
});

test("lang: defaults to English, keeps a known language, rejects an unknown one", () => {
  const s = createSettings(fakeStorage());
  assert.equal(s.get().lang, "en");
  s.set({ lang: "mi" });
  assert.equal(s.get().lang, "mi");
  s.set({ lang: "fr" }); // not in LANGS
  assert.equal(s.get().lang, "en");
});

test("diet: defaults to empty preference lists", () => {
  const s = createSettings(fakeStorage());
  assert.deepEqual(s.get().diet, { dietary: [], avoid: [] });
});

test("diet: keeps known keys, drops unknown, dedupes; persists", () => {
  const storage = fakeStorage();
  const s = createSettings(storage);
  s.set({
    diet: {
      dietary: ["vg", "vg", "gf", "bogus"],
      avoid: ["contains-nuts", "contains-nuts", "nope"],
    },
  });
  assert.deepEqual(s.get().diet.dietary, ["vg", "gf"]);
  assert.deepEqual(s.get().diet.avoid, ["contains-nuts"]);
  // Re-hydrates from the same storage.
  assert.deepEqual(createSettings(storage).get().diet.dietary, ["vg", "gf"]);
});

test("diet: a distance-only patch leaves preferences intact", () => {
  const s = createSettings(fakeStorage());
  s.set({ diet: { dietary: ["v"], avoid: [] } });
  s.set({ favBoostKm: 12 });
  assert.deepEqual(s.get().diet.dietary, ["v"]);
});

test("diet: reset clears preferences", () => {
  const s = createSettings(fakeStorage());
  s.set({ diet: { dietary: ["gf"], avoid: ["contains-soy"] } });
  s.reset();
  assert.deepEqual(s.get().diet, { dietary: [], avoid: [] });
});

test("diet: a non-array or corrupt value falls back to empty", () => {
  const s = createSettings(fakeStorage('{"diet":{"dietary":"gf","avoid":null}}'));
  assert.deepEqual(s.get().diet, { dietary: [], avoid: [] });
});

test("subscribe fires on change; unsubscribe stops it", () => {
  const s = createSettings(fakeStorage());
  let calls = 0;
  const off = s.subscribe(() => calls++);
  s.set({ farKm: 25 });
  assert.equal(calls, 1);
  off();
  s.set({ farKm: 30 });
  assert.equal(calls, 1);
});
