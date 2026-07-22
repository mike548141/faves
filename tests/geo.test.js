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

test("apple + coords → Apple Maps driving directions to the exact lat,lng", () => {
  // daddr = destination, dirflg=d = drive; no saddr so it routes from the
  // viewer's current location. The maps app then shows the real drive time.
  assert.equal(mapsUrlFor(VENUE, "apple"), "https://maps.apple.com/?daddr=-41.2931,174.77551&dirflg=d");
});

test("android + coords → Google Maps driving directions to the coords", () => {
  assert.equal(
    mapsUrlFor(VENUE, "android"),
    "https://www.google.com/maps/dir/?api=1&destination=-41.2931,174.77551&travelmode=driving"
  );
});

test("other + coords → Google Maps driving directions (desktop)", () => {
  assert.equal(
    mapsUrlFor(VENUE, "other"),
    "https://www.google.com/maps/dir/?api=1&destination=-41.2931,174.77551&travelmode=driving"
  );
});

test("no coordinates → directions to the address text on every platform", () => {
  assert.match(mapsUrlFor(NO_COORDS, "apple"), /^https:\/\/maps\.apple\.com\/\?daddr=1%20Nowhere.*&dirflg=d$/);
  assert.match(mapsUrlFor(NO_COORDS, "android"), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=1%20Nowhere/);
  assert.match(mapsUrlFor(NO_COORDS, "other"), /destination=1%20Nowhere/);
});

test("every handoff is an http(s) link (the UI adds target/rel to those)", () => {
  assert.ok(mapsUrlFor(VENUE, "apple").startsWith("https"));
  assert.ok(mapsUrlFor(VENUE, "android").startsWith("https"));
  assert.ok(mapsUrlFor(VENUE, "other").startsWith("https"));
});
