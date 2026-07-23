// Unit tests for the native-maps handoff (site/js/geo.js). Pure logic —
// platform detection takes an injectable navigator, and the URL builder is
// side-effect free — so both are testable without a browser.
// Run: `node --test tests/` (or `npm test`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform, mapsUrlFor, routeMapsUrlFor } from "../site/js/geo.js";

const VENUE = { name: "KK Malaysian", address: "54 Ghuznee St, Wellington", lat: -41.2931, lng: 174.77551 };
const NO_COORDS = { name: "Somewhere", address: "1 Nowhere St, Wellington" };
const NO_ADDRESS = { name: "Coordsonly", lat: -41.2931, lng: 174.77551 };
const ADDR_ENC = encodeURIComponent(VENUE.address);

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

// Owner ruling 2026-07-23 (ADR 0016): the address tap shows the venue on a map
// (a pin), targeting the STREET ADDRESS string — not our stored lat/lng, which
// can sit ~100 m off (R & S Satay lands on Garrett St). Maps geocodes the
// address exactly, so even a venue WITH coords is pinned by its address.
test("apple → Apple Maps pin at the street address (not the coords)", () => {
  assert.equal(mapsUrlFor(VENUE, "apple"), `https://maps.apple.com/?q=${ADDR_ENC}`);
});

test("android → Google Maps search pin at the street address", () => {
  assert.equal(
    mapsUrlFor(VENUE, "android"),
    `https://www.google.com/maps/search/?api=1&query=${ADDR_ENC}`
  );
});

test("other → Google Maps search pin at the street address (desktop)", () => {
  assert.equal(
    mapsUrlFor(VENUE, "other"),
    `https://www.google.com/maps/search/?api=1&query=${ADDR_ENC}`
  );
});

test("no address (belt-and-braces) → pin falls back to the coords", () => {
  // validate.py requires an address, so this only guards a malformed record.
  assert.equal(mapsUrlFor(NO_ADDRESS, "apple"), "https://maps.apple.com/?q=-41.2931,174.77551");
  assert.equal(
    mapsUrlFor(NO_ADDRESS, "android"),
    "https://www.google.com/maps/search/?api=1&query=-41.2931,174.77551"
  );
});

test("address pin still works when a record has no coords at all", () => {
  const enc = encodeURIComponent(NO_COORDS.address);
  assert.equal(mapsUrlFor(NO_COORDS, "apple"), `https://maps.apple.com/?q=${enc}`);
  assert.equal(mapsUrlFor(NO_COORDS, "other"), `https://www.google.com/maps/search/?api=1&query=${enc}`);
});

test("every handoff is an http(s) link (the UI adds target/rel to those)", () => {
  assert.ok(mapsUrlFor(VENUE, "apple").startsWith("https"));
  assert.ok(mapsUrlFor(VENUE, "android").startsWith("https"));
  assert.ok(mapsUrlFor(VENUE, "other").startsWith("https"));
});

// --- Route via maps (ADR 0014) — stays ROUTED; venue leg now by address ---
const DEST = { lat: -41.32, lng: 174.8 }; // a suburb centroid / place: coords only

test("route via (google): real 3-point route, venue waypoint by street address", () => {
  // origin (current, omitted) → venue (waypoint = address) → destination (coords).
  assert.equal(
    routeMapsUrlFor(VENUE, DEST, "android"),
    `https://www.google.com/maps/dir/?api=1&destination=-41.32,174.8&waypoints=${ADDR_ENC}&travelmode=driving`
  );
  assert.equal(routeMapsUrlFor(VENUE, DEST, "other"), routeMapsUrlFor(VENUE, DEST, "android"));
});

test("route via (apple): no waypoint param → drive to the venue address, dest dropped", () => {
  // Still directions (the route feature stays routed), not a pin.
  assert.equal(routeMapsUrlFor(VENUE, DEST, "apple"), `https://maps.apple.com/?daddr=${ADDR_ENC}&dirflg=d`);
});

test("route via: no destination → plain directions to the venue address", () => {
  assert.equal(
    routeMapsUrlFor(VENUE, null, "android"),
    `https://www.google.com/maps/dir/?api=1&destination=${ADDR_ENC}&travelmode=driving`
  );
});
