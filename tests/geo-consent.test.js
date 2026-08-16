// Unit tests for site/js/geo-consent.js — the decision table behind the
// location ask (ADR 0082). Pure: a fake storage object, no DOM, no geolocation.
// Run: `node --test`.
//
// WHAT THESE GUARD, and why each is here rather than left to the browser check:
//
//  1. "Don't ask me again" means BOTH surfaces, forever. The owner's ruling was
//     explicit, and the failure mode is silent — a suppressed reader who still
//     gets a banner has been lied to by a checkbox, and nothing in the app would
//     report it. `askSurface` is where that promise is kept or broken.
//  2. A DENIED browser permission must never produce a dialog. The Allow button
//     in it provably cannot work, so the dialog would spend trust to deliver a
//     dead end — the decorative-control pattern applied to a permission.
//  3. Unreadable storage must fail OPEN, not closed. Locking someone out of a
//     feature forever because JSON.parse threw is the expensive direction; one
//     extra ask is the cheap one.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONSENT_KEY,
  readConsent,
  writeConsent,
  suppressAsk,
  declineAsk,
  resetAsk,
  askSurface,
} from "../site/js/geo-consent.js";

/** Minimal localStorage stand-in. `fail` makes every operation throw, which is
 *  Safari private mode and a cookies-blocked browser, not a hypothetical. */
function fakeStorage({ seed = null, fail = false } = {}) {
  const map = new Map(seed ? [[CONSENT_KEY, seed]] : []);
  return {
    getItem(k) {
      if (fail) throw new Error("blocked");
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (fail) throw new Error("blocked");
      map.set(k, v);
    },
    _raw: () => map.get(CONSENT_KEY),
  };
}

const FRESH = { suppressed: false, declined: false };

test("a fresh device is asked with the dialog", () => {
  assert.equal(askSurface("prompt", FRESH, false), "dialog");
});

test("granted asks nothing, whatever the consent record says", () => {
  assert.equal(askSurface("granted", FRESH, false), "none");
  assert.equal(askSurface("granted", { suppressed: true, declined: true }, false), "none");
});

test("an origin already in hand asks nothing", () => {
  // The session captured a location; asking would be a question already answered.
  assert.equal(askSurface("prompt", FRESH, true), "none");
});

test("denied never produces a dialog or a banner — only the blocked notice", () => {
  // The whole point: a dialog whose Allow button cannot work is worse than
  // silence. Checked across every consent state so no combination sneaks past.
  for (const consent of [FRESH, { suppressed: true, declined: true }, { suppressed: false, declined: true }]) {
    assert.equal(askSurface("denied", consent, false), "blocked");
  }
});

test("declining WITHOUT ticking demotes the dialog to the banner", () => {
  assert.equal(askSurface("prompt", { suppressed: false, declined: true }, false), "banner");
});

test("ticking 'don't ask again' silences the banner too — the whole promise", () => {
  // The tickbox says "don't keep prompting me". If this ever returns "banner",
  // a checkbox in the UI is telling the reader something untrue.
  assert.equal(askSurface("prompt", { suppressed: true, declined: true }, false), "none");
});

test("suppression outranks a pending decline, not the other way round", () => {
  // Order matters inside askSurface: `declined` is also set by suppressAsk, so
  // a banner check placed first would defeat the tickbox entirely.
  const consent = suppressAsk(fakeStorage());
  assert.equal(consent.suppressed, true);
  assert.equal(askSurface("prompt", consent, false), "none");
});

test("declineAsk records the decline without suppressing", () => {
  const store = fakeStorage();
  const consent = declineAsk(store);
  assert.deepEqual(consent, { suppressed: false, declined: true });
  assert.equal(askSurface("prompt", consent, false), "banner");
});

test("resetAsk clears BOTH flags, so Settings is a real way back", () => {
  const store = fakeStorage();
  suppressAsk(store);
  const consent = resetAsk(store);
  assert.deepEqual(consent, { suppressed: false, declined: false });
  assert.equal(askSurface("prompt", consent, false), "dialog");
});

test("consent survives a round trip through storage", () => {
  const store = fakeStorage();
  suppressAsk(store);
  assert.deepEqual(readConsent(store), { suppressed: true, declined: true });
});

test("garbage in storage fails OPEN, not locked-out", () => {
  // Every one of these has been a real shape at some point in a browser's life:
  // a truncated write, a value from a different app, an older schema.
  for (const junk of ["not json", "null", "[]", '"suppressed"', "{"]) {
    const store = fakeStorage({ seed: junk });
    assert.deepEqual(readConsent(store), FRESH, `junk: ${junk}`);
    assert.equal(askSurface("prompt", readConsent(store), false), "dialog");
  }
});

test("a storage that throws on every call still answers", () => {
  // Cookies blocked entirely: reading must not take the home screen down with
  // it, and the reader must not be silently locked out of the feature.
  const store = fakeStorage({ fail: true });
  assert.deepEqual(readConsent(store), FRESH);
  assert.doesNotThrow(() => suppressAsk(store));
});

test("an unsupported permissions API lands on the same branch as 'prompt'", () => {
  // app.js passes "prompt" when navigator.permissions is missing or rejects.
  // Degrading to the affordance is the safe direction; degrading to silence
  // would hide the feature on every engine without the API.
  assert.equal(askSurface(undefined, FRESH, false), "dialog");
});

test("writeConsent merges rather than replacing", () => {
  const store = fakeStorage();
  declineAsk(store);
  writeConsent({ suppressed: true }, store);
  assert.deepEqual(readConsent(store), { suppressed: true, declined: true });
});
