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
  applyPersonalData,
  collectPersonalData,
  decisionKey,
  envelopeFromTransfer,
  listStoredKeys,
  parsePersonalData,
  personalDataFilename,
  personalDataJson,
  planImport,
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

// =========================================================================
// APPLY — the import / transfer seam (Theme 12b + 9 v1, ADR 0030)
// =========================================================================
// The load-bearing properties here are the three safety rules: merge never
// destroys, a name collision is a question rather than a guess, and an
// allergen difference cannot be resolved without someone choosing.

const FAV_KEY = "faves.favourites.v1";
const RAT_KEY = "faves.ratings.v1";
const SET_KEY = "faves.settings.v1";

const read = (s, k) => JSON.parse(s.getItem(k) || "null");

/** A device with two people, one of whom flags shellfish. */
function device() {
  return fakeStorage({
    [PROFILES_KEY]: JSON.stringify({
      v: 1,
      activeId: "default",
      profiles: [
        { id: "default", name: "Me" },
        { id: "pZ", name: "Sam" },
      ],
    }),
    [scopeKey("default", FAV_KEY)]: JSON.stringify([
      { type: "venue", venueId: "gold-lining-cafe", venueName: "Gold Lining Cafe" },
    ]),
    [scopeKey("default", SET_KEY)]: JSON.stringify({
      farKm: 40,
      diet: { dietary: [], avoid: ["contains-shellfish"] },
    }),
    [scopeKey("default", RAT_KEY)]: JSON.stringify({ "v:gold-lining-cafe": 2 }),
  });
}

/** A file exported from a *different* device: same id for "Me", a different
 *  id for a person who also happens to be called Sam. */
function file(overrides = {}) {
  return {
    format: FORMAT,
    v: FORMAT_VERSION,
    exportedAt: AT,
    profiles: [
      {
        id: "default",
        name: "Me",
        active: true,
        favourites: [{ type: "dish", venueId: "kk-malaysian", venueName: "KK Malaysian", name: "Roti Canai" }],
        ratings: { "v:gold-lining-cafe": 5, "d:kk-malaysian Roti Canai": 4 },
        settings: { farKm: 15, lang: "mi", diet: { dietary: ["gf"], avoid: ["contains-nuts"] } },
      },
      {
        id: "p-other-device",
        name: "Sam",
        favourites: [{ type: "venue", venueId: "kk-malaysian", venueName: "KK Malaysian" }],
        ratings: {},
        settings: null,
      },
    ],
    order: [],
    ...overrides,
  };
}

const keyFor = (data, i) => decisionKey(data.profiles[i], i);

// --- validation ----------------------------------------------------------

test("parse accepts what collect produced — the round trip is the contract", () => {
  const data = collectPersonalData(seeded(), { exportedAt: AT });
  const r = parsePersonalData(personalDataJson(data));
  assert.equal(r.ok, true);
  assert.deepEqual(r.data.profiles.map((p) => p.name), ["Me", "Sam"]);
  assert.equal(r.data.exportedAt, AT);
});

test("malformed input is refused with a message worth showing", () => {
  const cases = [
    ["", /empty/],
    ["   ", /empty/],
    ["{not json", /valid JSON/],
    ["[1,2,3]", /Faves data file/],
    [JSON.stringify({ format: "someone.else", v: 1, profiles: [] }), /wasn’t made by Faves/],
    [JSON.stringify({ v: "one", profiles: [] }), /no format version/],
    [JSON.stringify({ v: 99, profiles: [] }), /newer version/],
    [JSON.stringify({ v: 0, profiles: [] }), /can no longer read/],
    [JSON.stringify({ v: 1 }), /no people/],
    [JSON.stringify({ v: 1, profiles: [{ id: "x" }] }), /no people/], // nameless ⇒ unusable
  ];
  for (const [input, re] of cases) {
    const r = parsePersonalData(input);
    assert.equal(r.ok, false, `should have failed: ${input}`);
    assert.match(r.error, re);
  }
});

test("a hostile payload is clipped, clamped and deduped before it can be stored", () => {
  const r = parsePersonalData({
    v: 1,
    profiles: [
      {
        id: "x".repeat(500),
        name: "  Sam   the   Second  ",
        favourites: [
          { type: "venue", venueId: "kk" },
          { type: "venue", venueId: "kk" }, // duplicate
          { type: "dish", venueId: "kk" }, // nameless dish
          { type: "wat", venueId: "kk" }, // unknown type
          "nope",
          { type: "dish", venueId: "kk", name: "z".repeat(400) },
        ],
        ratings: { "v:kk": 99, "d:kk bad": -1, "": 3 },
        settings: { farKm: 9999 },
      },
    ],
    other: { "faves.origin.v1": '{"lat":-41}', "evil.key": "x", "faves.recipes.v1": "[]" },
  });
  assert.equal(r.ok, true);
  const p = r.data.profiles[0];
  assert.equal(p.id.length, 64);
  assert.equal(p.name, "Sam the Second");
  assert.deepEqual(p.favourites.map((f) => f.type), ["venue", "dish"]);
  assert.equal(p.favourites[1].name.length, 200);
  assert.deepEqual(p.ratings, { "v:kk": 5 }); // clamped to MAX, junk dropped
  // The Near-me origin is never re-imported, and non-faves keys never land.
  assert.deepEqual(Object.keys(r.data.other), ["faves.recipes.v1"]);
});

// --- planning ------------------------------------------------------------

test("plan asks before guessing: a same-name/different-id profile blocks", () => {
  const data = file();
  const plan = planImport(device(), data);
  assert.equal(plan.ok, true);
  const [me, sam] = plan.entries;
  assert.equal(me.match, "id"); // same id ⇒ the same person's other device
  assert.equal(me.action, "merge");
  assert.equal(sam.match, "name");
  assert.equal(sam.collides, true);
  assert.equal(sam.action, "undecided");
  assert.match(plan.blocking.join(" "), /same person/);
});

test("answering the collision unblocks it, either way", () => {
  const data = file();
  const k = keyFor(data, 1);
  const asNew = planImport(device(), data, { decisions: { [k]: { target: "new" } } });
  assert.equal(asNew.entries[1].action, "new");
  const merged = planImport(device(), data, { decisions: { [k]: { target: "pZ" } } });
  assert.equal(merged.entries[1].action, "merge");
  assert.equal(merged.entries[1].targetName, "Sam");
});

test("a differing allergen preference is surfaced, not resolved", () => {
  const plan = planImport(device(), file());
  const diet = plan.entries[0].diet;
  assert.deepEqual(diet.existing, { dietary: [], avoid: ["contains-shellfish"] });
  assert.deepEqual(diet.incoming, { dietary: ["gf"], avoid: ["contains-nuts"] });
  assert.equal(diet.choice, null);
  assert.match(plan.blocking.join(" "), /food preferences/);
});

test("identical preferences ask nothing", () => {
  const data = file();
  data.profiles[0].settings.diet = { dietary: [], avoid: ["contains-shellfish"] };
  const plan = planImport(device(), data, { decisions: { [keyFor(data, 1)]: { target: "new" } } });
  assert.equal(plan.entries[0].diet, null);
  assert.deepEqual(plan.blocking, []);
});

test("a payload with no diet at all never touches the existing one", () => {
  const data = file();
  delete data.profiles[0].settings.diet;
  const store = device();
  const plan = planImport(store, data, { decisions: { [keyFor(data, 1)]: { target: "new" } } });
  assert.equal(plan.entries[0].diet, null);
  assert.deepEqual(plan.blocking, []);
  applyPersonalData(store, data, { decisions: { [keyFor(data, 1)]: { target: "new" } } });
  assert.deepEqual(read(store, scopeKey("default", SET_KEY)).diet, {
    dietary: [],
    avoid: ["contains-shellfish"],
  });
});

test("replace has nothing to collide with, so it asks nothing", () => {
  const plan = planImport(device(), file(), { mode: "replace" });
  assert.deepEqual(plan.blocking, []);
  assert.deepEqual(plan.entries.map((e) => e.action), ["new", "new"]);
});

test("totals describe the payload, for the preview shown before anything happens", () => {
  const plan = planImport(device(), file());
  assert.deepEqual(plan.totals, {
    profiles: 2,
    favourites: 2,
    ratings: 2,
    orderItems: 0,
    otherStores: 0,
  });
  assert.equal(plan.exportedAt, AT);
});

// --- applying: merge -----------------------------------------------------

function applied(decisions, mode = "merge") {
  const store = device();
  const data = file();
  const named = Object.fromEntries(
    Object.entries(decisions).map(([i, d]) => [keyFor(data, Number(i)), d])
  );
  const report = applyPersonalData(store, data, { mode, decisions: named });
  return { store, report };
}

test("apply refuses while a question is unanswered — it never guesses", () => {
  const { report } = applied({});
  assert.equal(report.ok, false);
  assert.match(report.error, /choices are still needed/);
  assert.ok(report.blocking.length >= 2);
});

test("merge unions hearts and never drops an existing one", () => {
  const { store, report } = applied({ 0: { diet: "keep" }, 1: { target: "pZ" } });
  assert.equal(report.ok, true);
  const mine = read(store, scopeKey("default", FAV_KEY));
  assert.deepEqual(mine.map((f) => f.venueId), ["gold-lining-cafe", "kk-malaysian"]);
  assert.equal(report.favouritesAdded, 2);
});

test("merging the same file twice adds nothing the second time", () => {
  const store = device();
  const data = file();
  const decisions = { [keyFor(data, 0)]: { diet: "keep" }, [keyFor(data, 1)]: { target: "pZ" } };
  const first = applyPersonalData(store, data, { decisions });
  const second = applyPersonalData(store, data, { decisions });
  assert.equal(first.favouritesAdded, 2);
  assert.equal(second.favouritesAdded, 0);
  assert.equal(second.ratingsAdded, 0);
});

test("your own rating wins over the file's for the same thing", () => {
  const { store, report } = applied({ 0: { diet: "keep" }, 1: { target: "pZ" } });
  const r = read(store, scopeKey("default", RAT_KEY));
  assert.equal(r["v:gold-lining-cafe"], 2); // ours, not the file's 5
  assert.equal(r["d:kk-malaysian Roti Canai"], 4); // theirs, we had none
  assert.equal(report.ratingsAdded, 1);
});

test("“keep” leaves the allergen flags exactly as they were", () => {
  const { store, report } = applied({ 0: { diet: "keep" }, 1: { target: "pZ" } });
  const s = read(store, scopeKey("default", SET_KEY));
  assert.deepEqual(s.diet, { dietary: [], avoid: ["contains-shellfish"] });
  assert.deepEqual(report.dietChanged, []);
  // …while the non-safety preferences do follow the file.
  assert.equal(s.farKm, 15);
  assert.equal(s.lang, "mi");
});

test("“incoming” takes the file's preferences wholesale", () => {
  const { store, report } = applied({ 0: { diet: "incoming" }, 1: { target: "pZ" } });
  assert.deepEqual(read(store, scopeKey("default", SET_KEY)).diet, {
    dietary: ["gf"],
    avoid: ["contains-nuts"],
  });
  assert.deepEqual(report.dietChanged, ["Me"]);
});

test("“combine” keeps both sets of allergens flagged", () => {
  const { store } = applied({ 0: { diet: "combine" }, 1: { target: "pZ" } });
  assert.deepEqual(read(store, scopeKey("default", SET_KEY)).diet, {
    dietary: ["gf"],
    avoid: ["contains-shellfish", "contains-nuts"],
  });
});

test("“import as a new person” leaves the existing namesake untouched", () => {
  const { store, report } = applied({ 0: { diet: "keep" }, 1: { target: "new" } });
  const reg = read(store, PROFILES_KEY);
  assert.equal(reg.profiles.length, 3);
  assert.deepEqual(reg.profiles.map((p) => p.name), ["Me", "Sam", "Sam"]);
  assert.equal(reg.activeId, "default"); // an import never yanks you to someone else
  assert.deepEqual(report.created, ["Sam"]);
  // The new profile got its own scoped bucket, and the old Sam's is untouched.
  assert.equal(read(store, scopeKey("p-other-device", FAV_KEY)).length, 1);
  assert.equal(store.getItem(scopeKey("pZ", FAV_KEY)), null);
});

// The `default` id is deterministic on every device (profiles.js), so a file
// from someone *else's* phone collides on it by construction. Acting on the id
// alone would silently merge two people — including their allergen settings.
test("a matching id with a different name is a question, not a match", () => {
  const data = file();
  data.profiles[1].id = "default"; // the id the device's own "Me" carries
  data.profiles[1].name = "Ari";
  const plan = planImport(device(), data);
  const ari = plan.entries[1];
  assert.equal(ari.match, "id");
  assert.equal(ari.collides, true);
  assert.equal(ari.action, "undecided");
  assert.equal(ari.candidateName, "Me");
  assert.match(plan.blocking.join(" "), /Is “Ari” the same person as “Me”/);
});

test("choosing “new” for an id-colliding profile mints it a fresh id", () => {
  const store = device();
  const data = file();
  data.profiles[1].id = "default";
  data.profiles[1].name = "Ari";
  const r = applyPersonalData(store, data, {
    decisions: { [keyFor(data, 0)]: { diet: "keep" }, [keyFor(data, 1)]: { target: "new" } },
  });
  assert.equal(r.ok, true);
  const reg = read(store, PROFILES_KEY);
  assert.deepEqual(reg.profiles.map((p) => p.name).sort(), ["Ari", "Me", "Sam"]);
  // "Me" keeps `default`; Ari got a minted id, so neither overwrote the other.
  assert.equal(reg.profiles.find((p) => p.id === "default").name, "Me");
  assert.notEqual(reg.profiles.find((p) => p.name === "Ari").id, "default");
});

test("same id AND same name is the one case that merges without asking", () => {
  const data = file();
  const plan = planImport(device(), data, { decisions: { [keyFor(data, 1)]: { target: "new" } } });
  assert.equal(plan.entries[0].collides, false);
  assert.equal(plan.entries[0].action, "merge");
});

// --- applying: replace ---------------------------------------------------

test("replace makes the device look like the payload and drops the rest", () => {
  const { store, report } = applied({}, "replace");
  assert.equal(report.ok, true);
  const reg = read(store, PROFILES_KEY);
  assert.deepEqual(reg.profiles.map((p) => p.name), ["Me", "Sam"]);
  assert.equal(reg.activeId, reg.profiles[0].id); // the payload's active person
  // The device's own hearts and its shellfish flag are gone — that is the deal.
  assert.deepEqual(read(store, scopeKey("default", FAV_KEY)).map((f) => f.name), ["Roti Canai"]);
  assert.deepEqual(read(store, scopeKey("default", SET_KEY)).diet, {
    dietary: ["gf"],
    avoid: ["contains-nuts"],
  });
  assert.equal(store.getItem(scopeKey("pZ", FAV_KEY)), null);
});

test("replace never removes a key outside the faves namespace", () => {
  const store = device();
  store.setItem("someone-elses.thing", "keep me");
  applyPersonalData(store, file(), { mode: "replace" });
  assert.equal(store.getItem("someone-elses.thing"), "keep me");
});

test("an unknown mode is refused rather than silently treated as merge", () => {
  const r = applyPersonalData(device(), file(), { mode: "wipe" });
  assert.equal(r.ok, false);
  assert.match(r.error, /Unknown import mode/);
});

// --- the order tally -----------------------------------------------------

test("a restore won't bulk up an order you're in the middle of", () => {
  const store = device();
  store.setItem(
    ORDER_KEY,
    JSON.stringify([{ venueId: "kk-malaysian", venueName: "KK Malaysian", name: "Roti Canai", qty: 1 }])
  );
  const data = file({
    order: [{ venueId: "kk-malaysian", venueName: "KK Malaysian", name: "Roti Canai", qty: 4 }],
  });
  const decisions = { [keyFor(data, 0)]: { diet: "keep" }, [keyFor(data, 1)]: { target: "new" } };
  const r = applyPersonalData(store, data, { decisions });
  assert.equal(r.orderRestored, false);
  assert.equal(read(store, ORDER_KEY)[0].qty, 1);
});

test("…but it does restore the tally onto a device with no order running", () => {
  const store = device();
  const data = file({
    order: [{ venueId: "kk-malaysian", venueName: "KK Malaysian", name: "Roti Canai", qty: 4 }],
  });
  const decisions = { [keyFor(data, 0)]: { diet: "keep" }, [keyFor(data, 1)]: { target: "new" } };
  const r = applyPersonalData(store, data, { decisions });
  assert.equal(r.orderRestored, true);
  assert.equal(read(store, ORDER_KEY)[0].qty, 4);
});

// --- unknown stores ------------------------------------------------------

test("merge restores an unknown store only where there is nothing to lose", () => {
  const store = device();
  store.setItem("faves.recipes.v1", '["mine"]');
  const data = file({ other: { "faves.recipes.v1": '["theirs"]', "faves.tags.v1": '["theirs"]' } });
  const decisions = { [keyFor(data, 0)]: { diet: "keep" }, [keyFor(data, 1)]: { target: "new" } };
  applyPersonalData(store, data, { decisions });
  assert.equal(store.getItem("faves.recipes.v1"), '["mine"]'); // never clobbered
  assert.equal(store.getItem("faves.tags.v1"), '["theirs"]');
});

// --- degraded storage ----------------------------------------------------

test("a storage backend that silently drops writes is reported, not claimed as saved", () => {
  const blocked = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  const r = applyPersonalData(blocked, file(), { mode: "replace" });
  assert.equal(r.ok, true);
  assert.equal(r.persisted, false);
});

test("a storage backend that throws on write never throws out of apply", () => {
  const hostile = {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {},
  };
  const r = applyPersonalData(hostile, file(), { mode: "replace" });
  assert.equal(r.ok, true);
  assert.equal(r.persisted, false);
});

// --- the transfer envelope ----------------------------------------------

test("a transfer's parts become the same envelope a file carries", () => {
  const env = envelopeFromTransfer({
    profile: { id: "p9", name: "Ari" },
    favourites: [{ type: "venue", venueId: "kk-malaysian", venueName: "KK Malaysian" }],
    ratings: { "v:kk-malaysian": 5 },
    settings: { diet: { dietary: ["vg"], avoid: [] } },
  });
  const parsed = parsePersonalData(env);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.profiles.length, 1);
  // …and it applies through the one seam, with the same collision rules.
  const store = device();
  const plan = planImport(store, env);
  assert.equal(plan.entries[0].action, "new");
  const r = applyPersonalData(store, env);
  assert.deepEqual(r.created, ["Ari"]);
});

test("a transfer carrying a colliding name asks the same question a file does", () => {
  const env = envelopeFromTransfer({
    profile: { id: "p-elsewhere", name: "Sam" },
    favourites: [{ type: "venue", venueId: "kk-malaysian", venueName: "KK Malaysian" }],
  });
  const plan = planImport(device(), env);
  assert.equal(plan.entries[0].collides, true);
  assert.match(plan.blocking.join(" "), /same person/);
});

test("a re-import that changed nothing says so, rather than claiming an update", () => {
  const store = device();
  const data = file();
  const decisions = { [keyFor(data, 0)]: { diet: "keep" }, [keyFor(data, 1)]: { target: "pZ" } };
  applyPersonalData(store, data, { decisions });
  const again = applyPersonalData(store, data, { decisions });
  assert.deepEqual(again.merged, []);
  assert.deepEqual(again.unchanged, ["Me", "Sam"]);
  assert.equal(again.settingsUpdated, 0);
});
