// Unit tests for the personal-layer collector (site/js/personal-data.js) —
// what a data export actually contains. Storage is faked; pure otherwise.
// Run: `node --test`.
//
// The load-bearing property under test is COMPLETENESS: an export that
// quietly held one profile's data, or dropped a store added after this module
// was written, would look like a backup and not be one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { PROFILES_KEY, scopeKey } from "../site/js/profiles.js";
import {
  FORMAT,
  FORMAT_VERSION,
  ORDER_KEY,
  collectPersonalData,
  listStoredKeys,
  personalDataFilename,
  personalDataJson,
  summarisePersonalData,
} from "../site/js/personal-data.js";

/** Fake storage with the enumeration surface (`length`/`key`) that the real
 *  localStorage has — `enumerable: false` mimics the in-memory shim
 *  `safeStorage()` degrades to when a browser blocks storage. */
function fakeStorage(initial = {}, { enumerable = true } = {}) {
  const m = new Map(Object.entries(initial));
  const s = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
  if (enumerable) {
    Object.defineProperty(s, "length", { get: () => m.size });
    s.key = (i) => [...m.keys()][i] ?? null;
  }
  return s;
}

const AT = "2026-08-08T04:05:06.000Z";

function seeded() {
  return fakeStorage({
    [PROFILES_KEY]: JSON.stringify({
      v: 1,
      activeId: "p2",
      profiles: [
        { id: "default", name: "Me" },
        { id: "p2", name: "Sam" },
      ],
    }),
    [scopeKey("default", "faves.favourites.v1")]: JSON.stringify([
      { type: "venue", venueId: "kk-malaysian", venueName: "KK Malaysian" },
    ]),
    [scopeKey("default", "faves.ratings.v1")]: JSON.stringify({ "v:kk-malaysian": 5 }),
    [scopeKey("default", "faves.settings.v1")]: JSON.stringify({ lang: "mi", farKm: 20 }),
    [scopeKey("p2", "faves.favourites.v1")]: JSON.stringify([
      { type: "dish", venueId: "kk-malaysian", name: "Roti Canai" },
      { type: "venue", venueId: "gold-lining-cafe", venueName: "Gold Lining Cafe" },
    ]),
    [scopeKey("p2", "faves.ratings.v1")]: JSON.stringify({
      "d:kk-malaysian Roti Canai": 4,
      "v:gold-lining-cafe": 3,
    }),
    [ORDER_KEY]: JSON.stringify([
      { venueId: "kk-malaysian", venueName: "KK Malaysian", name: "Roti Canai", price: 8.5, qty: 2 },
    ]),
  });
}

// --- completeness -----------------------------------------------------

test("collects every profile, not just the active one", () => {
  const data = collectPersonalData(seeded(), { exportedAt: AT });
  assert.deepEqual(
    data.profiles.map((p) => p.name),
    ["Me", "Sam"]
  );
  // The active profile is marked, but both carry their own data.
  assert.deepEqual(
    data.profiles.map((p) => p.active),
    [false, true]
  );
  assert.equal(data.profiles[0].favourites.length, 1);
  assert.equal(data.profiles[1].favourites.length, 2);
  assert.equal(data.profiles[1].ratings["d:kk-malaysian Roti Canai"], 4);
});

test("per-profile stores land on readable field names", () => {
  const data = collectPersonalData(seeded(), { exportedAt: AT });
  assert.deepEqual(Object.keys(data.profiles[0]).sort(), [
    "active",
    "favourites",
    "id",
    "name",
    "ratings",
    "settings",
  ]);
  assert.deepEqual(data.profiles[0].settings, { lang: "mi", farKm: 20 });
});

test("carries the device-shared order tally", () => {
  const data = collectPersonalData(seeded(), { exportedAt: AT });
  assert.equal(data.order.length, 1);
  assert.equal(data.order[0].name, "Roti Canai");
});

test("sweeps up an unknown faves.* store so a new feature can't be silently dropped", () => {
  const storage = seeded();
  storage.setItem("faves.recipes.v1", JSON.stringify([{ name: "Ginger Crunch" }]));
  const data = collectPersonalData(storage, { exportedAt: AT });
  assert.equal(data.other["faves.recipes.v1"], JSON.stringify([{ name: "Ginger Crunch" }]));
});

test("no unknown stores means no empty `other` key", () => {
  assert.equal("other" in collectPersonalData(seeded(), { exportedAt: AT }), false);
});

test("ignores keys outside the faves. namespace", () => {
  const storage = seeded();
  storage.setItem("someone-elses.thing", "nope");
  const data = collectPersonalData(storage, { exportedAt: AT });
  assert.equal("other" in data, false);
});

// --- envelope + honesty ------------------------------------------------

test("stamps the format marker, version and export time", () => {
  const data = collectPersonalData(seeded(), { exportedAt: AT });
  assert.equal(data.format, FORMAT);
  assert.equal(data.v, FORMAT_VERSION);
  assert.equal(data.exportedAt, AT);
});

test("names what it deliberately left out", () => {
  const data = collectPersonalData(seeded(), { exportedAt: AT });
  assert.match(data.excluded["faves.origin.v1"], /Near me/);
});

test("the Near-me origin is never collected even if it is in this storage", () => {
  const storage = seeded();
  storage.setItem("faves.origin.v1", JSON.stringify({ lat: -41.2, lng: 174.8 }));
  const json = personalDataJson(collectPersonalData(storage, { exportedAt: AT }));
  assert.equal(json.includes("174.8"), false);
  assert.equal(json.includes('"other"'), false);
});

// --- resilience --------------------------------------------------------

test("an empty store still exports a valid, usable file", () => {
  const data = collectPersonalData(fakeStorage(), { exportedAt: AT });
  assert.equal(data.profiles.length, 1); // the default profile the app guarantees
  assert.equal(data.profiles[0].favourites, null); // nothing stored yet, honestly null
  assert.deepEqual(data.order, []);
});

test("a corrupt value is reported as absent rather than throwing", () => {
  const storage = seeded();
  storage.setItem(scopeKey("p2", "faves.favourites.v1"), "{not json");
  storage.setItem(ORDER_KEY, "also not json");
  const data = collectPersonalData(storage, { exportedAt: AT });
  assert.equal(data.profiles[1].favourites, null);
  assert.deepEqual(data.order, []);
});

test("a corrupt registry falls back to the default profile", () => {
  const data = collectPersonalData(fakeStorage({ [PROFILES_KEY]: "{{{" }), { exportedAt: AT });
  assert.equal(data.profiles.length, 1);
  assert.equal(data.profiles[0].active, true);
});

test("listStoredKeys returns [] when the backend cannot enumerate", () => {
  const blocked = fakeStorage({ "faves.order.v1": "[]" }, { enumerable: false });
  assert.deepEqual(listStoredKeys(blocked), []);
  // …and collecting still works, just without the unknown-store sweep.
  assert.equal("other" in collectPersonalData(blocked, { exportedAt: AT }), false);
});

// --- summary + filename ------------------------------------------------

test("summary counts across all profiles", () => {
  const s = summarisePersonalData(collectPersonalData(seeded(), { exportedAt: AT }));
  assert.deepEqual(s, { profiles: 2, favourites: 3, ratings: 3, orderItems: 1 });
});

test("summary tolerates a corrupt/empty shape", () => {
  assert.deepEqual(summarisePersonalData({}), {
    profiles: 0,
    favourites: 0,
    ratings: 0,
    orderItems: 0,
  });
  assert.deepEqual(summarisePersonalData({ profiles: [{ favourites: "nope", ratings: 7 }] }), {
    profiles: 1,
    favourites: 0,
    ratings: 0,
    orderItems: 0,
  });
});

test("filename is dated from the export time", () => {
  assert.equal(personalDataFilename(AT), "faves-data-2026-08-08.json");
});

test("filename falls back rather than emitting `undefined`", () => {
  assert.equal(personalDataFilename(undefined), "faves-data.json");
  assert.equal(personalDataFilename("rubbish"), "faves-data.json");
});

test("the file is pretty-printed and round-trips", () => {
  const data = collectPersonalData(seeded(), { exportedAt: AT });
  const json = personalDataJson(data);
  assert.match(json, /\n {2}"format"/); // indented, not one line
  assert.equal(json.endsWith("\n"), true);
  assert.deepEqual(JSON.parse(json), data);
});
