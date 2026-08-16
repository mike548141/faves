// Unit tests for the transfer-link slice builder (site/js/personal-io-ui.js).
// Run: `node --test`.
//
// activeSlice() drives real singletons (settings.js/profiles.js/favourites.js)
// rather than fakes: in Node there is no localStorage, so store.js's
// safeStorage() falls back to an in-memory Map, giving each of these a private,
// working store for the lifetime of this test file (node --test runs each file
// in its own process, so there is no cross-file bleed).

import { test } from "node:test";
import assert from "node:assert/strict";
import { activeSlice } from "../site/js/personal-io-ui.js";
import { settings, LOCAL } from "../site/js/settings.js";

// --- BUG A: a transfer link must not hard-resolve "follow me" -------------
//
// settings.get() resolves LOCAL to whatever this device concretely is (ADR
// 0045) — the right answer for rendering a price or a label, but wrong for a
// transfer, which is meant to carry the *preference* ("follow me wherever I
// am") onto the receiving device, not today's resolved snapshot of it.

test("a transfer slice carries the stored localisation preference, not today's resolved value", () => {
  settings.reset(); // DEFAULTS: lang/units/currency all LOCAL (settings.js)
  const slice = activeSlice();
  assert.equal(slice.settings.lang, LOCAL, "lang should stay 'local', not resolve to a concrete language");
  assert.equal(slice.settings.units, LOCAL, "units should stay 'local', not resolve to metric/imperial");
  // currency is never resolved by settings.get() (place.js resolves it per
  // price), so it was never at risk — asserted anyway so a future change to
  // that contract trips this test too.
  assert.equal(slice.settings.currency, LOCAL);
});

test("a transfer slice still carries an explicit (non-local) choice unchanged", () => {
  settings.set({ lang: "mi", units: "imperial", currency: "GBP" });
  const slice = activeSlice();
  assert.equal(slice.settings.lang, "mi");
  assert.equal(slice.settings.units, "imperial");
  assert.equal(slice.settings.currency, "GBP");
  settings.reset(); // leave the singleton clean for any later test in this file
});

test("a transfer slice matches settings.raw() exactly, not settings.get()", () => {
  settings.reset();
  const slice = activeSlice();
  assert.deepEqual(slice.settings, settings.raw());
});
