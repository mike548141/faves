// Unit tests for the user settings model (site/js/settings.js) — the two
// distance dials behind the home ranking. Storage is faked; pure otherwise.
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createSettings, DEFAULTS, BOUNDS, LANGS, LOCAL, AS_CHARGED } from "../site/js/settings.js";

// `get()` returns settings with every LOCAL already resolved to a concrete
// value, which is what every consumer wants and what makes "local" invisible to
// them (ADR 0045). `raw()` is the stored preference. So a test about DEFAULTS —
// which now hold LOCAL — compares against raw(); a test about behaviour reads
// get().

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
  assert.deepEqual(s.raw(), DEFAULTS);
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
  assert.deepEqual(s.raw(), DEFAULTS);
});

test("reset restores defaults", () => {
  const s = createSettings(fakeStorage());
  s.set({ favBoostKm: 0, farKm: 200 });
  s.reset();
  assert.deepEqual(s.raw(), DEFAULTS);
});

test("corrupt stored payload → defaults", () => {
  const s = createSettings(fakeStorage("{ broken"));
  assert.deepEqual(s.raw(), DEFAULTS);
});

test("lang: defaults to local, keeps a known language, rejects an unknown one", () => {
  const s = createSettings(fakeStorage());
  // Same reasoning as units below: the default resolves from the device, so the
  // stored value is what this can assert. A resolved language is always one
  // Faves actually speaks, whatever the machine's locale says.
  assert.equal(s.raw().lang, LOCAL);
  assert.ok(LANGS.includes(s.get().lang));
  s.set({ lang: "mi" });
  assert.equal(s.get().lang, "mi");
  s.set({ lang: "fr" }); // not in LANGS
  assert.equal(s.raw().lang, LOCAL);
});

test("mapsApp: defaults to auto, keeps a known provider, rejects an unknown one", () => {
  const s = createSettings(fakeStorage());
  assert.equal(s.get().mapsApp, "auto");
  s.set({ mapsApp: "waze" });
  assert.equal(s.get().mapsApp, "waze");
  s.set({ mapsApp: "bingmaps" }); // not in MAPS_APPS
  assert.equal(s.get().mapsApp, "auto");
});

test("units: defaults to local, keeps imperial, rejects anything else", () => {
  const storage = fakeStorage();
  const s = createSettings(storage);
  // The DEFAULT is "local" (ADR 0045). What that resolves to depends on the
  // machine, so this asserts the stored preference and leaves the resolution to
  // locale.test.js, which feeds it explicit signals. Asserting "metric" here
  // passed in Wellington and failed on a US-locale CI runner — which was the
  // resolver working correctly, and the test making a claim it couldn't keep.
  assert.equal(s.raw().units, LOCAL);
  assert.ok(["metric", "imperial"].includes(s.get().units), "always resolves to a real system");
  s.set({ units: "imperial" });
  assert.equal(s.get().units, "imperial");
  assert.equal(createSettings(storage).get().units, "imperial"); // persists
  s.set({ units: "furlongs" });
  assert.equal(s.raw().units, LOCAL);
});

test("units: a display choice never touches the stored distances", () => {
  const s = createSettings(fakeStorage());
  s.set({ favBoostKm: 12, farKm: 40 });
  s.set({ units: "imperial" });
  assert.equal(s.get().favBoostKm, 12); // still kilometres, unconverted
  assert.equal(s.get().farKm, 40);
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

// ——————————————————— "Local" and currency (ADR 0045) ———————————————————

test("the three localisation settings default to local, and resolve away", () => {
  const s = createSettings(fakeStorage());
  assert.equal(s.raw().lang, LOCAL);
  assert.equal(s.raw().units, LOCAL);
  assert.equal(s.raw().currency, LOCAL);
  // No consumer should ever see the word "local" in a resolved value...
  assert.notEqual(s.get().lang, LOCAL);
  assert.ok(["metric", "imperial"].includes(s.get().units));
  // ...except currency, which cannot be resolved without knowing WHICH venue's
  // price is being rendered and which rates loaded. place.js does that per price.
  assert.equal(s.get().currency, LOCAL);
});

test("an explicit choice survives resolution untouched", () => {
  const s = createSettings(fakeStorage());
  s.set({ lang: "mi", units: "imperial", currency: "GBP" });
  assert.equal(s.get().lang, "mi");
  assert.equal(s.get().units, "imperial");
  assert.equal(s.get().currency, "GBP");
  assert.deepEqual(s.raw(), { ...s.raw(), lang: "mi", units: "imperial", currency: "GBP" });
});

test("currency accepts local, as-charged, and any ISO-shaped code", () => {
  const s = createSettings(fakeStorage());
  for (const v of [LOCAL, AS_CHARGED, "GBP", "JPY", "XPF"]) {
    s.set({ currency: v });
    assert.equal(s.raw().currency, v, `${v} should be accepted`);
  }
});

test("a junk currency falls back rather than persisting", () => {
  // Shape-checked only: WHICH codes are offered depends on the rate table that
  // loaded, and a store must not silently reset a viewer's choice because a
  // data file was slow.
  const s = createSettings(fakeStorage());
  for (const v of ["gbp", "pounds", "", 42, null, "GBPX"]) {
    s.set({ currency: v });
    assert.equal(s.raw().currency, DEFAULTS.currency, `${JSON.stringify(v)} should be rejected`);
  }
});

test("a stored setting from before local existed still loads", () => {
  // Someone who set "metric" and "en" by hand last week keeps them.
  const storage = fakeStorage();
  storage.setItem("faves.settings.v1", JSON.stringify({ lang: "mi", units: "imperial" }));
  const s = createSettings(storage);
  assert.equal(s.raw().lang, "mi");
  assert.equal(s.raw().units, "imperial");
  assert.equal(s.raw().currency, LOCAL, "and gains the new setting's default");
});

test("picksClosed: defaults to empty, keeps ids, dedupes, persists", () => {
  const storage = fakeStorage();
  const s = createSettings(storage);
  assert.deepEqual(s.get().picksClosed, []);
  s.set({ picksClosed: ["cook-at-home", "tj-katsu", "cook-at-home"] });
  assert.deepEqual(s.get().picksClosed, ["cook-at-home", "tj-katsu"]);
  assert.deepEqual(createSettings(storage).get().picksClosed, ["cook-at-home", "tj-katsu"]);
});

test("picksClosed: anything that isn't an id shape is dropped, never thrown on", () => {
  // Fail-soft, like cleanKeys: a hand-edited or imported file costs a forgotten
  // dismissal, not a store that won't load.
  const s = createSettings(fakeStorage());
  s.set({ picksClosed: ["ok-id", "Has Caps", "-leading", "sp ace", "", 42, null, {}, "x".repeat(65)] });
  assert.deepEqual(s.get().picksClosed, ["ok-id"]);
  s.set({ picksClosed: "cook-at-home" });
  assert.deepEqual(s.get().picksClosed, [], "a bare string is not a list of ids");
});

test("picksClosed: a corrupt payload can't grow the store without bound", () => {
  const s = createSettings(fakeStorage());
  s.set({ picksClosed: Array.from({ length: 900 }, (_, i) => `venue-${i}`) });
  assert.equal(s.get().picksClosed.length, 500);
});

test("picksClosed: a distance-only patch leaves the closed list intact", () => {
  const s = createSettings(fakeStorage());
  s.set({ picksClosed: ["cook-at-home"] });
  s.set({ farKm: 12 });
  assert.deepEqual(s.get().picksClosed, ["cook-at-home"]);
});
