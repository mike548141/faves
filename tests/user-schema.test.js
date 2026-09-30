// The user-data schema and its upgrade chain (site/js/user-schema.js, roadmap
// 510/040, ADR 0145/0146). Run: `node --test`.
//
// Four things are held here:
//   1. every past schema version has a sample data set under tests/fixtures/ —
//      a backup and a device's raw storage — and both upgrade to the current
//      version with nothing a person put in lost, allergen flags above all;
//   2. the harness that says "nothing was lost" can actually see a loss. Today
//      the chain is the identity (USER_SCHEMA is 1), so a harness that saw
//      nothing would pass too. A SYNTHETIC schema-2 step is injected: a
//      faithful one must pass, and each of four damaging ones must fail, the
//      first of them dropping the settings store outright (the item's 🚩);
//   3. the startup upgrade is transactional: a step that throws, a missing
//      step, a full disk or a failed write leaves storage byte for byte as it
//      was, and the pre-upgrade snapshot lives until the new version has run;
//   4. the chain runs before any store is read: it is the first import of
//      every page's entry module, and nothing it imports reads storage.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  USER_SCHEMA,
  STORE_SCHEMA,
  UPGRADE_STEPS,
  SCHEMA_KEY,
  UPGRADE_SNAPSHOT_KEY,
  STORAGE_THRESHOLD,
  upgradePersonalData,
  upgradeStorage,
  upgradeRan,
  readSchema,
  userStorageSize,
} from "../site/js/user-schema.js";
import { applyPersonalData, collectPersonalData, parsePersonalData } from "../site/js/personal-data.js";
import { PERSIST_ASKED_KEY } from "../site/js/storage-persist.js";

const FIXTURES = new URL("./fixtures/", import.meta.url);
const SITE_JS = new URL("../site/js/", import.meta.url);
const SITE = new URL("../site/", import.meta.url);

function fakeStorage(initial = {}, { failOn = () => false } = {}) {
  const m = new Map(Object.entries(initial));
  const s = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (failOn(k, v)) throw new Error("QuotaExceededError");
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    _map: m,
  };
  Object.defineProperty(s, "length", { get: () => m.size });
  return s;
}

const dump = (s) => Object.fromEntries([...s._map.entries()].sort(([a], [b]) => a.localeCompare(b)));
const readJson = (name) => JSON.parse(readFileSync(new URL(name, FIXTURES), "utf8"));

/** A device seeded from a raw-storage fixture, carrying the fixture's schema. */
function deviceFrom(fixture) {
  return fakeStorage({ ...fixture.keys, [SCHEMA_KEY]: String(fixture.userSchema) });
}

// --- the harness: what a person would call "my data" ------------------------

const sortedDiet = (d) => ({
  dietary: [...(d?.dietary ?? [])].sort(),
  avoid: [...(d?.avoid ?? [])].sort(),
});

/** Everything a person put in, read the way this build reads it. Two readers
 *  over one view: the profile stores through collectPersonalData (what backup
 *  and sync see), and the device-level stores by their raw JSON. */
function whatTheyPutIn(storage) {
  const snap = collectPersonalData(storage, { exportedAt: null });
  return fromSnapshot(snap, storage);
}

function fromSnapshot(snap, storage = null) {
  const people = {};
  for (const p of snap.profiles ?? []) {
    people[p.name] = {
      favourites: (p.favourites ?? []).map((f) => `${f.type}:${f.venueId}:${f.dishId ?? f.name ?? ""}`).sort(),
      ratings: p.ratings ?? {},
      notes: p.notes ?? {},
      // THE SAFETY DATA. Present or absent is itself the claim: a profile that
      // had allergen flags and has none after an upgrade is the worst loss.
      diet: p.settings?.diet ? sortedDiet(p.settings.diet) : null,
      foodPrefs: [...(p.settings?.foodPrefs ?? [])].sort(),
    };
  }
  const out = { people, order: (snap.order ?? []).map((l) => `${l.venueId}:${l.name}:${l.qty}`) };
  if (storage) {
    for (const k of ["faves.shopping.v1", "faves.timers.v1", "faves.geo.consent.v1", "faves.sync.v1"]) {
      out[k] = storage.getItem(k);
    }
    out.checklists = Object.keys(dump(storage)).filter((k) => k.endsWith(".checklist.v1")).sort();
  }
  return out;
}

/** What was there before and is not there, or not the same, after. Empty
 *  means nothing was lost. Named paths, so a failure says WHAT went. */
function losses(before, after) {
  const out = [];
  const walk = (a, b, path) => {
    if (a && typeof a === "object" && !Array.isArray(a)) {
      for (const k of Object.keys(a)) walk(a[k], b?.[k], `${path}.${k}`);
      return;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(path);
  };
  walk(before, after, "data");
  return out;
}

// --- a synthetic schema 2, to prove the harness -----------------------------

const mapKeys = (keys, pick, fn) =>
  Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, pick(k) ? fn(v) : v]));
const isSettings = (k) => /^faves\.p\..+\.settings\.v1$/.test(k);

/** A faithful step: adds a field every settings reader ignores, and a store. */
const GOOD = {
  reshapes: {},
  snapshot: (d) => ({
    ...d,
    pantry: [],
    profiles: (d.profiles ?? []).map((p) => (p.settings ? { ...p, settings: { ...p.settings, textSize: "m" } } : p)),
  }),
  storage: (keys) => ({
    ...mapKeys(keys, isSettings, (v) => JSON.stringify({ ...JSON.parse(v), textSize: "m" })),
    "faves.pantry.v1": "[]",
  }),
};

/** Four damaging steps. Each must be caught, and caught naming its victim. */
const BAD = {
  // The item's 🚩 break-probe: an upgrade that drops a store — the one that
  // holds allergen flags.
  "drops the settings store": {
    victim: /\.diet\.avoid$/,
    step: {
      reshapes: {},
      snapshot: (d) => ({ ...d, profiles: d.profiles.map(({ settings, ...p }) => p) }),
      storage: (keys) => Object.fromEntries(Object.entries(keys).filter(([k]) => !isSettings(k))),
    },
  },
  "keeps the store but empties its allergen list": {
    victim: /\.diet\.avoid$/,
    step: {
      reshapes: { settings: 2 },
      snapshot: (d) => ({
        ...d,
        profiles: d.profiles.map((p) =>
          p.settings?.diet ? { ...p, settings: { ...p.settings, diet: { ...p.settings.diet, avoid: [] } } } : p
        ),
      }),
      storage: (keys) =>
        mapKeys(keys, isSettings, (v) => {
          const s = JSON.parse(v);
          return JSON.stringify(s.diet ? { ...s, diet: { ...s.diet, avoid: [] } } : s);
        }),
    },
  },
  "drops the order": {
    victim: /^data\.order$/,
    step: {
      reshapes: {},
      snapshot: (d) => ({ ...d, order: [] }),
      storage: (keys) => Object.fromEntries(Object.entries(keys).filter(([k]) => k !== "faves.order.v1")),
    },
  },
  "drops the second person": {
    victim: /^data\.people\.Sam\./,
    step: {
      reshapes: {},
      snapshot: (d) => ({ ...d, profiles: d.profiles.slice(0, 1) }),
      storage: (keys) => {
        const out = Object.fromEntries(Object.entries(keys).filter(([k]) => !k.startsWith("faves.p.p2.")));
        const reg = JSON.parse(out["faves.profiles.v1"]);
        out["faves.profiles.v1"] = JSON.stringify({ ...reg, profiles: reg.profiles.slice(0, 1) });
        return out;
      },
    },
  },
};

// --- 1. the fixtures ----------------------------------------------------------

test("every schema version up to the current one has both sample data sets", () => {
  const files = new Set(readdirSync(FIXTURES));
  for (let v = 1; v <= USER_SCHEMA; v += 1) {
    assert.ok(files.has(`personal-data-v${v}.json`), `no backup fixture for schema ${v}`);
    assert.ok(files.has(`user-storage-v${v}.json`), `no device-storage fixture for schema ${v}`);
  }
  // Never deleted: a fixture for a version that is not a number up to the
  // current one is a typo, and a gap would be caught above.
  for (const f of files) {
    const m = /^(?:personal-data|user-storage)-v(\d+)\.json$/.exec(f);
    if (m) assert.ok(Number(m[1]) >= 1 && Number(m[1]) <= USER_SCHEMA, `${f} names a version that does not exist`);
  }
});

test("every past backup upgrades to the current schema, allergens and all", () => {
  for (let v = 1; v <= USER_SCHEMA; v += 1) {
    const raw = readJson(`personal-data-v${v}.json`);
    const before = fromSnapshot(raw);
    const r = parsePersonalData(JSON.stringify(raw));
    assert.equal(r.ok, true, `schema ${v}: ${r.error}`);
    assert.equal(r.data.v, USER_SCHEMA);
    assert.deepEqual(losses(before, fromSnapshot(r.data)), [], `schema ${v} backup lost data`);
    // The allergen list, said out loud rather than trusted to the walk.
    assert.deepEqual(before.people.Me.diet.avoid, ["contains-nuts", "contains-peanuts"]);
  }
});

test("every past device's storage upgrades to the current schema with nothing lost", () => {
  for (let v = 1; v <= USER_SCHEMA; v += 1) {
    const fixture = readJson(`user-storage-v${v}.json`);
    assert.equal(fixture.userSchema, v);
    const device = deviceFrom(fixture);
    const before = whatTheyPutIn(device);
    const res = upgradeStorage(device);
    assert.ok(["current", "upgraded"].includes(res.status), `schema ${v}: ${res.status}`);
    assert.equal(readSchema(device), USER_SCHEMA);
    assert.deepEqual(losses(before, whatTheyPutIn(device)), [], `schema ${v} storage lost data`);
    assert.deepEqual(before.people.Me.diet.avoid, ["contains-nuts", "contains-peanuts"]);
    assert.deepEqual(before.people.Sam.diet.avoid, ["contains-shellfish"]);
  }
});

// --- 2. the harness can see a loss --------------------------------------------

test("a faithful synthetic schema-2 step passes the harness, on both halves", () => {
  const steps = { 1: GOOD };
  const device = deviceFrom(readJson("user-storage-v1.json"));
  const before = whatTheyPutIn(device);
  assert.equal(upgradeStorage(device, { steps, target: 2 }).status, "upgraded");
  assert.equal(readSchema(device), 2);
  assert.equal(device.getItem("faves.pantry.v1"), "[]", "the step did not run");
  assert.deepEqual(losses(before, whatTheyPutIn(device)), []);

  const backup = readJson("personal-data-v1.json");
  const up = upgradePersonalData(backup, { steps, target: 2 });
  assert.equal(up.ok, true);
  assert.equal(up.data.v, 2);
  assert.deepEqual(up.data.pantry, [], "the step did not run");
  assert.deepEqual(losses(fromSnapshot(backup), fromSnapshot(up.data)), []);
});

for (const [name, { victim, step }] of Object.entries(BAD)) {
  test(`break-probe: a schema-2 step that ${name} is caught, on both halves`, () => {
    const steps = { 1: step };
    const device = deviceFrom(readJson("user-storage-v1.json"));
    const before = whatTheyPutIn(device);
    assert.equal(upgradeStorage(device, { steps, target: 2 }).status, "upgraded");
    const lost = losses(before, whatTheyPutIn(device));
    assert.ok(lost.length > 0, "the harness saw nothing lost from device storage");
    assert.ok(lost.some((p) => victim.test(p)), `device storage: lost ${lost.join(", ")}, not the victim`);

    const backup = readJson("personal-data-v1.json");
    const up = upgradePersonalData(backup, { steps, target: 2 });
    assert.equal(up.ok, true);
    const lostB = losses(fromSnapshot(backup), fromSnapshot(up.data));
    assert.ok(lostB.some((p) => victim.test(p)), `backup: lost ${lostB.join(", ") || "nothing"}, not the victim`);
  });
}

// --- the chain's own rules ------------------------------------------------------

test("every version below the current one has a complete step, and none above", () => {
  for (let v = 1; v < USER_SCHEMA; v += 1) {
    const s = UPGRADE_STEPS[v];
    assert.ok(s, `no upgrade step from schema ${v}`);
    assert.equal(typeof s.snapshot, "function", `step ${v} has no snapshot half`);
    assert.equal(typeof s.storage, "function", `step ${v} has no storage half`);
    assert.ok(s.reshapes && typeof s.reshapes === "object", `step ${v} does not say which stores it reshapes`);
  }
  for (const v of Object.keys(UPGRADE_STEPS)) {
    assert.ok(Number(v) >= 1 && Number(v) < USER_SCHEMA, `a step from ${v} can never run`);
  }
  assert.ok(Object.isFrozen(UPGRADE_STEPS));
});

test("a step that reshapes a store has bumped that store's own number", () => {
  // The rule tying USER_SCHEMA to STORE_SCHEMA (roadmap 510/040's claim note):
  // sync pauses on a store's own number, so a reshape it does not record is a
  // reshape an older device would misread instead of pausing on.
  const check = (steps, table) => {
    const bad = [];
    for (const [v, s] of Object.entries(steps)) {
      for (const [store, n] of Object.entries(s.reshapes ?? {})) {
        if (!(store in table) || table[store] < n) bad.push(`step ${v} → ${store} ${n}`);
      }
    }
    return bad;
  };
  assert.deepEqual(check(UPGRADE_STEPS, STORE_SCHEMA), []);
  // …and the check itself can fail: a reshape of settings to 2 against today's table.
  assert.deepEqual(check({ 1: { reshapes: { settings: 2 } } }, STORE_SCHEMA), ["step 1 → settings 2"]);
});

test("the snapshot half carries fields it does not understand, and refuses what it cannot upgrade", () => {
  const up = upgradePersonalData({ v: 0, profiles: [{ id: "a", name: "Me", pantry: [1] }], shelf: { x: 1 } });
  assert.equal(up.ok, true);
  assert.deepEqual(up.data.shelf, { x: 1 });
  const newer = { v: USER_SCHEMA + 1, profiles: [] };
  assert.equal(upgradePersonalData(newer).data, newer);
  assert.equal(upgradePersonalData({ profiles: [] }).ok, false);
  assert.equal(upgradePersonalData({ v: 1 }, { steps: {}, target: 2 }).ok, false, "a missing step");
  const boom = { 1: { reshapes: {}, snapshot: () => { throw new Error("x"); }, storage: (k) => k } };
  assert.equal(upgradePersonalData({ v: 1 }, { steps: boom, target: 2 }).ok, false, "a throwing step");
});

// --- 3. the startup upgrade, transactional ------------------------------------

test("a fresh device is stamped with the current schema and nothing else", () => {
  const s = fakeStorage();
  assert.equal(upgradeStorage(s).status, "fresh");
  assert.deepEqual(dump(s), { [SCHEMA_KEY]: String(USER_SCHEMA) });
});

test("data from before the number existed is schema 1, and is stamped as such", () => {
  const fixture = readJson("user-storage-v1.json");
  const s = fakeStorage({ ...fixture.keys });
  const res = upgradeStorage(s, { steps: { 1: GOOD }, target: 2 });
  assert.equal(res.from, 1);
  assert.equal(res.status, "upgraded");
  // And with today's identity chain, the same data is stamped 1 and untouched.
  const t = fakeStorage({ ...fixture.keys });
  assert.equal(upgradeStorage(t, { target: 1 }).status, "current");
  assert.deepEqual(dump(t), { ...fixture.keys, [SCHEMA_KEY]: "1" });
});

test("a newer or unreadable number is left alone — there is no downgrade", () => {
  const newer = fakeStorage({ [SCHEMA_KEY]: String(USER_SCHEMA + 1), "faves.x.v1": "1" });
  const before = dump(newer);
  assert.equal(upgradeStorage(newer).status, "newer");
  assert.deepEqual(dump(newer), before);
  const odd = fakeStorage({ [SCHEMA_KEY]: "two", "faves.x.v1": "1" });
  assert.equal(upgradeStorage(odd, { steps: { 1: GOOD }, target: 2 }).status, "unreadable");
  assert.deepEqual(dump(odd), { [SCHEMA_KEY]: "two", "faves.x.v1": "1" });
});

test("a step that throws, is missing, or returns junk leaves storage exactly as it was", () => {
  const cases = {
    failed: { 1: { reshapes: {}, snapshot: (d) => d, storage: () => { throw new Error("bug"); } } },
    "missing-step": {},
  };
  const junk = { 1: { reshapes: {}, snapshot: (d) => d, storage: (k) => ({ ...k, "faves.bad.v1": 7 }) } };
  const stray = { 1: { reshapes: {}, snapshot: (d) => d, storage: (k) => ({ ...k, "not-ours": "1" }) } };
  for (const [status, steps] of Object.entries({ ...cases, junk, stray })) {
    const device = deviceFrom(readJson("user-storage-v1.json"));
    const before = dump(device);
    const res = upgradeStorage(device, { steps, target: 2 });
    assert.equal(res.status, status === "junk" || status === "stray" ? "failed" : status);
    assert.deepEqual(dump(device), before, `${status}: storage changed`);
  }
});

test("no room for the snapshot means no upgrade, and nothing written", () => {
  const fixture = readJson("user-storage-v1.json");
  const device = fakeStorage(
    { ...fixture.keys, [SCHEMA_KEY]: "1" },
    { failOn: (k) => k === UPGRADE_SNAPSHOT_KEY }
  );
  const before = dump(device);
  assert.equal(upgradeStorage(device, { steps: { 1: GOOD }, target: 2 }).status, "no-room");
  assert.deepEqual(dump(device), before);
});

test("a write that fails part way puts back every key it touched", () => {
  const fixture = readJson("user-storage-v1.json");
  const device = fakeStorage(
    { ...fixture.keys, [SCHEMA_KEY]: "1" },
    // The settings of the SECOND profile, so the first has already been written.
    { failOn: (k) => k === "faves.p.p2.settings.v1" }
  );
  const before = dump(device);
  const res = upgradeStorage(device, { steps: { 1: GOOD }, target: 2 });
  assert.equal(res.status, "failed");
  const after = dump(device);
  delete after[UPGRADE_SNAPSHOT_KEY]; // written first, and harmless: ok is false
  assert.deepEqual(after, before);
});

test("the snapshot is taken before, kept until the new version has run, then dropped", () => {
  const fixture = readJson("user-storage-v1.json");
  const device = deviceFrom(fixture);
  const original = dump(device);
  delete original[SCHEMA_KEY];
  const steps = { 1: GOOD };
  const at = () => "2026-09-30T10:00:00.000Z";

  assert.equal(upgradeStorage(device, { steps, target: 2, now: at }).status, "upgraded");
  const snap = JSON.parse(device.getItem(UPGRADE_SNAPSHOT_KEY));
  assert.deepEqual(snap, { from: 1, to: 2, at: at(), ok: false, keys: original });

  // A reload before the page has ever finished drawing keeps it.
  upgradeStorage(device, { steps, target: 2 });
  assert.ok(device.getItem(UPGRADE_SNAPSHOT_KEY), "dropped before the new version ran");

  // The page finished its first render: marked, and still there this load…
  assert.equal(upgradeRan(device, { target: 2 }), true);
  assert.equal(JSON.parse(device.getItem(UPGRADE_SNAPSHOT_KEY)).ok, true);
  assert.equal(upgradeRan(device, { target: 2 }), false, "marked twice");
  // …and gone on the next.
  assert.equal(upgradeStorage(device, { steps, target: 2 }).status, "current");
  assert.equal(device.getItem(UPGRADE_SNAPSHOT_KEY), null);
});

test("a second upgrade before the first has run keeps the OLDEST snapshot", () => {
  const device = deviceFrom(readJson("user-storage-v1.json"));
  const original = dump(device);
  delete original[SCHEMA_KEY];
  const THIRD = { reshapes: {}, snapshot: (d) => d, storage: (k) => ({ ...k, "faves.third.v1": "1" }) };
  upgradeStorage(device, { steps: { 1: GOOD }, target: 2 });
  upgradeStorage(device, { steps: { 1: GOOD, 2: THIRD }, target: 3 });
  const snap = JSON.parse(device.getItem(UPGRADE_SNAPSHOT_KEY));
  assert.equal(snap.from, 1);
  assert.equal(snap.to, 3);
  assert.deepEqual(snap.keys, original, "the last data known to work was replaced");
  assert.equal(upgradeRan(device, { target: 2 }), false, "marked by a version it is not for");
});

test("storage that cannot be listed is left alone", () => {
  const shim = { getItem: () => null, setItem() { throw new Error("no"); }, removeItem() {} };
  assert.equal(upgradeStorage(shim).status, "unavailable");
  assert.equal(upgradeStorage(null).status, "unavailable");
  assert.equal(upgradeRan(shim), false);
});

test("the chain's own keys, and the persistence ask, never travel in a backup", () => {
  const device = deviceFrom(readJson("user-storage-v1.json"));
  upgradeStorage(device, { steps: { 1: GOOD }, target: 2 });
  device.setItem(PERSIST_ASKED_KEY, JSON.stringify({ at: "T", homeScreen: false }));
  const data = collectPersonalData(device, { exportedAt: null });
  for (const k of [SCHEMA_KEY, UPGRADE_SNAPSHOT_KEY, PERSIST_ASKED_KEY]) {
    assert.ok(!(k in (data.other ?? {})), `${k} went into the backup`);
    assert.ok(k in data.excluded, `${k} is excluded without saying so`);
  }
});

test("a replace import keeps the schema number, or the next load would call the restored data schema 1", () => {
  const device = deviceFrom(readJson("user-storage-v1.json"));
  const res = applyPersonalData(device, readFileSync(new URL("personal-data-v1.json", FIXTURES), "utf8"), {
    mode: "replace",
  });
  assert.equal(res.ok, true, res.error);
  assert.equal(readSchema(device), USER_SCHEMA);
});

test("storage use is measured in UTF-16 code units of faves. keys and values", () => {
  const s = fakeStorage({ "faves.a": "12345", other: "ignored", "faves.é": "ü" });
  assert.equal(userStorageSize(s), "faves.a".length + 5 + "faves.é".length + 1);
  assert.ok(STORAGE_THRESHOLD > 0);
});

// --- 4. before any store is read --------------------------------------------------

const importsOf = (file) => {
  const src = readFileSync(new URL(file, SITE_JS), "utf8");
  return [...src.matchAll(/^(?:import|export)\s[^;]*?from\s*["']\.\/([\w.-]+)["']|^import\s*["']\.\/([\w.-]+)["']/gm)].map(
    (m) => m[1] ?? m[2]
  );
};

test("the upgrade is the first import of every page's entry module", () => {
  const pages = readdirSync(SITE).filter((f) => f.endsWith(".html"));
  assert.ok(pages.length >= 3, "no pages found");
  let entries = 0;
  for (const page of pages) {
    const html = readFileSync(new URL(page, SITE), "utf8");
    for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']js\/([\w.-]+)["'][^>]*>/g)) {
      entries += 1;
      assert.equal(importsOf(m[1])[0], "upgrade-start.js", `${page}: ${m[1]} does not import the upgrade first`);
    }
    // An inline module script would be an entry this test cannot see.
    assert.ok(!/<script\b(?![^>]*\bsrc=)[^>]*type=["']module["']/.test(html), `${page} has an inline module`);
  }
  assert.ok(entries >= 6, `only ${entries} entry scripts found`);
});

test("nothing the upgrade imports reads a store when it loads", () => {
  // Its whole import graph, which must be exactly these four files: any other
  // module could evaluate a store (and read storage) before the upgrade runs.
  // schema-stamp.js joined on 2026-10-01 (roadmap 510/110): it holds the schema
  // number so store.js can refuse a stale tab's writes without a cycle, and it
  // imports nothing.
  const seen = new Set();
  const walk = (f) => {
    if (seen.has(f)) return;
    seen.add(f);
    for (const g of importsOf(f)) walk(g);
  };
  walk("upgrade-start.js");
  assert.deepEqual([...seen].sort(), ["schema-stamp.js", "store.js", "upgrade-start.js", "user-schema.js"]);
  for (const f of seen) {
    assert.ok(!/\bimport\s*\(/.test(readFileSync(new URL(f, SITE_JS), "utf8")), `${f} imports dynamically`);
  }
});
