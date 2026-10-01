// The "anywhere" branch (ADR 0155; owner-ruled 2026-09-08, roadmap 470/050):
// Cook at Home's one public branch matches any address or GPS coordinate, and
// says so as a declared VALUE — `"address": { "anywhere": true }` — rather
// than as a missing field. Run: `node --test`.
//
// What these pin, reader by reader: the declared value is recognised EXACTLY
// (a near miss is not the wildcard); the one normalisation seam (data.js
// `load`) turns it into `address: null` + `anywhere: true` before any renderer
// sees it, so nothing can print it as a street or hand it to a map; the home
// summary keeps the flag so home can tell "everywhere" from "unknown"; and the
// branch has NO distance — Infinity, exactly what the coordless record measured
// before the branch existed. That last one is today's answer to a question the
// owner has not ruled on (whether a wildcard sorts at the reader's own
// position, 470/050's 📎); the test pins it so a change to it is deliberate.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  isAnywhere,
  isAnywhereBranch,
  normaliseBranch,
  hasPlaceDetails,
  branchPlaceLabel,
  branchAsPlace,
  nearestBranch,
  venueDistanceKm,
  orderedBranches,
  branchesOf,
} from "../site/js/locations.js";
import { load } from "../site/js/data.js";
import { thinBranch, summarise } from "../tools/gen_summaries.mjs";
import { buildIndex } from "../site/js/search.js";

const CBD = { lat: -41.2865, lng: 174.7762 };
const WILDCARD = () => ({ anywhere: true });

const kitchen = () => ({
  id: "kitchen",
  name: "Kitchen",
  kind: "recipes",
  cuisine: ["Home cooking"],
  area: "Home",
  city: null,
  address: null,
  phone: null,
  hours: null,
  lifecycle: { added: "2026-07-06" },
  status: "menu-complete",
  menu: [],
  locations: [{ label: "Anywhere", id: "anywhere", address: WILDCARD() }],
});

// ── the value itself ──────────────────────────────────────────────────────
test("isAnywhere: exactly { anywhere: true } is the wildcard", () => {
  assert.equal(isAnywhere({ anywhere: true }), true);
});

test("isAnywhere: every near miss is NOT the wildcard", () => {
  for (const v of [
    "anywhere",
    "Anywhere",
    "*",
    "",
    null,
    undefined,
    { anywhere: false },
    { anywhere: 1 },
    { anywhere: "true" },
    { Anywhere: true },
    { anywhere: true, lat: -41 },
    {},
    [true],
  ]) {
    assert.equal(isAnywhere(v), false, `${JSON.stringify(v)} must not read as the wildcard`);
  }
});

test("isAnywhereBranch: the raw declaration and its normalised form both read as anywhere", () => {
  assert.equal(isAnywhereBranch({ address: WILDCARD() }), true);
  assert.equal(isAnywhereBranch({ address: null, anywhere: true }), true);
  assert.equal(isAnywhereBranch({ address: "1 High St" }), false); // leakscan:allow:nz-address: synthetic fixture; no such venue
  assert.equal(isAnywhereBranch({ address: null }), false, "null is 'not captured', never 'anywhere'");
  assert.equal(isAnywhereBranch(null), false);
});

// ── the seam ──────────────────────────────────────────────────────────────
test("normaliseBranch: the wildcard becomes no address + the flag, and the input is not mutated", () => {
  const raw = { label: "Anywhere", id: "anywhere", address: WILDCARD() };
  const out = normaliseBranch(raw);
  assert.deepEqual(out, { label: "Anywhere", id: "anywhere", address: null, anywhere: true });
  assert.deepEqual(raw.address, { anywhere: true }, "the raw record keeps its declaration");
});

test("normaliseBranch: an ordinary branch comes back as the SAME object", () => {
  const b = { label: "Melling", id: "melling", address: "1 Melling Rd", lat: -41.2, lng: 174.9 }; // leakscan:allow:nz-address: synthetic fixture; no such venue
  assert.equal(normaliseBranch(b), b);
});

test("load(): the top level never inherits the wildcard object — address is null, not { anywhere }", () => {
  const r = load(kitchen());
  assert.equal(r.address, null);
  assert.equal(r.lat, null);
  assert.equal(r.lng, null);
  assert.equal(r.locations[0].anywhere, true);
  assert.equal(r.locations[0].address, null);
});

test("load(): a record with no wildcard keeps its own branch objects", () => {
  const raw = {
    id: "chain",
    name: "Chain",
    lifecycle: { added: "2026-07-06" },
    menu: [],
    locations: [{ label: "A", id: "a", address: "1 A St", lat: -41.29, lng: 174.78 }],
  };
  const r = load(raw);
  assert.equal(r.address, "1 A St");
  assert.equal(r.locations[0].anywhere, undefined);
});

// ── every reader of an address or a coordinate ────────────────────────────
test("distance: an anywhere branch has none — Infinity with or without an origin (today's answer; the owner's fork)", () => {
  const r = load(kitchen());
  assert.equal(venueDistanceKm(r, null), Infinity);
  assert.equal(venueDistanceKm(r, CBD), Infinity);
  assert.equal(nearestBranch(r, CBD).distanceKm, Infinity);
  assert.equal(orderedBranches(r, CBD)[0].distanceKm, Infinity);
});

test("maps: an anywhere branch gives a map nothing to search for, even un-normalised", () => {
  const raw = kitchen();
  assert.deepEqual(branchAsPlace(raw, raw.locations[0]), { name: "Kitchen", address: null, lat: null, lng: null });
  const r = load(kitchen());
  assert.deepEqual(branchAsPlace(r, r.locations[0]), { name: "Kitchen", address: null, lat: null, lng: null });
});

test("hasPlaceDetails: an anywhere branch is not a place detail; a real branch still is", () => {
  assert.equal(hasPlaceDetails(load(kitchen())), false);
  assert.equal(hasPlaceDetails({ locations: [{ label: "Anywhere", anywhere: true }] }), false, "the home summary's thinned shape");
  assert.equal(hasPlaceDetails({ locations: [{ label: "Melling" }] }), true);
  assert.equal(hasPlaceDetails({ address: "1 A St" }), true);
  assert.equal(hasPlaceDetails({ id: "bare" }), false);
});

test("search: the wildcard never becomes a searchable address", () => {
  const { places } = buildIndex([load(kitchen())]);
  const [place] = places;
  assert.equal(place.address, "");
  assert.ok(!/object/i.test(place.hay), `the haystack must not carry a stringified object: ${place.hay}`);
});

test("summary: the thinned branch keeps the flag (so home can tell anywhere from unknown) and drops the address", () => {
  assert.deepEqual(thinBranch({ label: "Anywhere", id: "anywhere", address: null, anywhere: true }), {
    label: "Anywhere",
    anywhere: true,
  });
  assert.deepEqual(thinBranch({ label: "Melling", address: "1 Melling Rd", lat: 1, lng: 2 }), { // leakscan:allow:nz-address: synthetic fixture; no such venue
    label: "Melling",
    lat: 1,
    lng: 2,
  });
  const s = summarise(load(kitchen()));
  assert.equal(s.address, null);
  assert.deepEqual(s.locations, [{ label: "Anywhere", anywhere: true }]);
});

test("branchPlaceLabel: the home card's suburb slot never shows an anywhere branch's label", () => {
  assert.equal(branchPlaceLabel({ label: "Anywhere", anywhere: true }), null);
  assert.equal(branchPlaceLabel({ label: "Anywhere", address: WILDCARD() }), null);
  assert.equal(branchPlaceLabel({ label: "Melling" }), "Melling");
  assert.equal(branchPlaceLabel({ label: null }), null);
  assert.equal(branchPlaceLabel(null), null);
});

// ── the shipped record ────────────────────────────────────────────────────
test("Cook at Home's shipped record: ONE branch, declared anywhere, carrying no coordinate or phone", () => {
  const raw = JSON.parse(readFileSync(new URL("../site/data/restaurants/cook-at-home.json", import.meta.url), "utf8"));
  assert.equal(raw.locations?.length, 1);
  const [b] = raw.locations;
  assert.deepEqual(b.address, { anywhere: true });
  assert.equal(typeof b.id, "string");
  for (const k of ["lat", "lng", "phone"]) assert.equal(b[k] ?? null, null, `${k} must be absent`);
  const r = load(raw);
  assert.equal(r.address, null);
  assert.equal(venueDistanceKm(r, CBD), Infinity);
  assert.equal(branchesOf(r).length, 1);
});
