// Unit tests for the native-maps handoff (site/js/geo.js). Pure logic —
// platform detection takes an injectable navigator, and the URL builder is
// side-effect free — so both are testable without a browser.
// Run: `node --test tests/` (or `npm test`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform, mapsUrlFor } from "../site/js/geo.js";

const VENUE = { name: "KK Malaysian", address: "54 Ghuznee St, Wellington", lat: -41.2931, lng: 174.77551 };
const NO_COORDS = { name: "Somewhere", address: "1 Nowhere St, Wellington" };

test("detectPlatform: iPhone → apple", () => {
  assert.equal(detectPlatform({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }), "apple");
});

test("detectPlatform: iPadOS 13+ masquerading as Mac → apple", () => {
  assert.equal(detectPlatform({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", platform: "MacIntel" }), "apple");
});

test("detectPlatform: Android → android (not fooled by 'Linux' in UA)", () => {
  assert.equal(detectPlatform({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)" }), "android");
});

test("detectPlatform: Windows/Linux desktop → other", () => {
  assert.equal(detectPlatform({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32" }), "other");
  assert.equal(detectPlatform({ userAgent: "Mozilla/5.0 (X11; Linux x86_64)", platform: "Linux x86_64" }), "other");
});

test("detectPlatform: empty navigator → other, never throws", () => {
  assert.equal(detectPlatform({}), "other");
});

test("apple + coords → maps.apple.com pin at the exact lat,lng", () => {
  const url = mapsUrlFor(VENUE, "apple");
  assert.match(url, /^https:\/\/maps\.apple\.com\/\?ll=-41\.2931,174\.77551&q=/);
  assert.match(url, /q=KK%20Malaysian$/);
});

test("android + coords → geo: URI handing off to the default maps app", () => {
  const url = mapsUrlFor(VENUE, "android");
  assert.equal(url, "geo:-41.2931,174.77551?q=-41.2931,174.77551(KK%20Malaysian)");
});

test("other + coords → Google Maps web with coords", () => {
  assert.equal(mapsUrlFor(VENUE, "other"), "https://www.google.com/maps/search/?api=1&query=-41.2931,174.77551");
});

test("no coordinates → search by address on every platform", () => {
  assert.match(mapsUrlFor(NO_COORDS, "apple"), /^https:\/\/maps\.apple\.com\/\?q=1%20Nowhere/);
  assert.match(mapsUrlFor(NO_COORDS, "android"), /^geo:0,0\?q=1%20Nowhere/);
  assert.match(mapsUrlFor(NO_COORDS, "other"), /query=1%20Nowhere/);
});

test("non-http (geo:) links are distinguishable so the UI can skip target/rel", () => {
  assert.ok(!mapsUrlFor(VENUE, "android").startsWith("http"));
  assert.ok(mapsUrlFor(VENUE, "apple").startsWith("http"));
});
