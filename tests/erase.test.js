// "Delete everything" (roadmap 180/010, ADR 0167): what it deletes, and the
// guard that a store added LATER cannot be forgotten by it.
// Run: `node --test`.
//
// THE LESSON THIS FILE EXISTS FOR (memory: "a whitelist sheds the field added
// after it"). The wipe deletes by default — every `faves.` key but a short
// keep-list — so a forgotten store fails safe. What can still go wrong is the
// other direction: a new DEVICE-STANDING key (a pairing, a promise) wiped when
// it should stay, and a new personal store that is wiped on disk but never
// re-pointed in memory, which then writes its old contents straight back. So
// every storage-key literal in the app is classified below, and the test fails
// the moment one appears that is not — the person adding it has to say what a
// deletion does to it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { eraseEverything, ERASE_KEEPS, ORDER_KEY } from "../site/js/personal-data.js";
import {
  PROFILES_KEY,
  SCOPED_BASE_KEYS,
  CHECKLIST_BASE_KEY,
  SAVED_ORDERS_BASE_KEY,
  ACTIVITY_BASE_KEY,
  scopeKey,
} from "../site/js/profiles.js";
import { SHOPPING_KEY } from "../site/js/shopping.js";
import { TIMERS_KEY } from "../site/js/cook.js";
import { SYNC_KEY, SYNC_BASE_KEY } from "../site/js/sync.js";
import { SYNC_LOG_KEY } from "../site/js/sync-log.js";
import { SCHEMA_KEY, USER_SCHEMA, UPGRADE_SNAPSHOT_KEY } from "../site/js/user-schema.js";
import { PERSIST_ASKED_KEY } from "../site/js/storage-persist.js";
import { CONSENT_KEY } from "../site/js/geo-consent.js";

const SITE_JS = new URL("../site/js/", import.meta.url);

/**
 * Every storage-key literal the app writes, and what a deletion does to it.
 *   wiped        removed by `eraseEverything`
 *   session      sessionStorage, outside what it can enumerate: cleared by the
 *                Settings control itself (settings-ui.js `rememberOrigin(null)`)
 *   kept         a fact about this device or browser, not something a person
 *                put in — and why, in `ERASE_KEEPS`' own comment
 *   label        a string that looks like a key and is a crypto/format label
 */
const CLASSIFIED = {
  "faves.favourites.v1": "wiped",
  "faves.ratings.v1": "wiped",
  "faves.notes.v1": "wiped",
  "faves.settings.v1": "wiped",
  "faves.recipes.v1": "wiped",
  "faves.checklist.v1": "wiped",
  "faves.savedorders.v1": "wiped",
  "faves.activity.v1": "wiped",
  "faves.profiles.v1": "wiped",
  "faves.order.v1": "wiped",
  "faves.shopping.v1": "wiped",
  "faves.timers.v1": "wiped",
  "faves.sync.base.v1": "wiped", // a full second copy of the synced data
  "faves.sync.log.v1": "wiped", // names hearts
  "faves.upgrade.snapshot.v1": "wiped", // a whole copy of the data from before the last upgrade
  "faves.origin.v1": "session",
  "faves.sync.v1": "kept",
  "faves.schema.v1": "kept",
  "faves.persist.asked.v1": "kept",
  "faves.geo.consent.v1": "kept",
  "faves.sync.enc-key.v1": "label",
  "faves.sync.blob-id.v1": "label",
};
// Prefixes and example strings that match the scan and are not keys.
const NOT_KEYS = new Set(["faves.p.", "faves.x", "faves.personal-data", "faves.recipe-bucket"]);

function literals() {
  const found = new Map();
  for (const f of readdirSync(SITE_JS).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(new URL(f, SITE_JS), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
    for (const m of src.matchAll(/["'`](faves\.[a-z0-9][a-z0-9._-]*)["'`]/g)) {
      if (!found.has(m[1])) found.set(m[1], f);
    }
  }
  return found;
}

test("every storage key the app names is classified for a deletion, and none classified has gone", () => {
  const found = literals();
  const unclassified = [...found.keys()].filter((k) => !(k in CLASSIFIED) && !NOT_KEYS.has(k));
  assert.deepEqual(
    unclassified.map((k) => `${k} (${found.get(k)})`),
    [],
    "a new storage key: say in CLASSIFIED whether Delete everything wipes or keeps it (and, if it holds personal " +
      "state in memory, add its store to site/js/live-stores.js)"
  );
  const gone = Object.keys(CLASSIFIED).filter((k) => !found.has(k));
  assert.deepEqual(gone, [], "classified but no longer named anywhere — take it off the list");
});

test("the constants the wipe leans on still spell the keys this table says", () => {
  const consts = {
    [PROFILES_KEY]: "faves.profiles.v1",
    [ORDER_KEY]: "faves.order.v1",
    [SHOPPING_KEY]: "faves.shopping.v1",
    [TIMERS_KEY]: "faves.timers.v1",
    [SYNC_KEY]: "faves.sync.v1",
    [SYNC_BASE_KEY]: "faves.sync.base.v1",
    [SYNC_LOG_KEY]: "faves.sync.log.v1",
    [SCHEMA_KEY]: "faves.schema.v1",
    [UPGRADE_SNAPSHOT_KEY]: "faves.upgrade.snapshot.v1",
    [PERSIST_ASKED_KEY]: "faves.persist.asked.v1",
    [CONSENT_KEY]: "faves.geo.consent.v1",
    [CHECKLIST_BASE_KEY]: "faves.checklist.v1",
    [SAVED_ORDERS_BASE_KEY]: "faves.savedorders.v1",
    [ACTIVITY_BASE_KEY]: "faves.activity.v1",
  };
  for (const [actual, expected] of Object.entries(consts)) assert.equal(actual, expected);
  assert.deepEqual([...SCOPED_BASE_KEYS].sort(), [
    "faves.favourites.v1",
    "faves.notes.v1",
    "faves.ratings.v1",
    "faves.recipes.v1",
    "faves.settings.v1",
  ]);
});

/** A localStorage stand-in that can enumerate, as the real one can. */
function store(initial = {}) {
  const m = new Map(Object.entries(initial));
  const s = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    dump: () => Object.fromEntries([...m.entries()].sort()),
  };
  Object.defineProperty(s, "length", { get: () => m.size });
  return s;
}

const PEOPLE = ["default", "p2", "orphan"]; // the third is in no registry
const PER_PERSON = [...SCOPED_BASE_KEYS, CHECKLIST_BASE_KEY, SAVED_ORDERS_BASE_KEY, ACTIVITY_BASE_KEY];

/** Every key in CLASSIFIED that lives in localStorage, for three people. */
function seeded(extra = {}) {
  const init = {};
  for (const [key, fate] of Object.entries(CLASSIFIED)) {
    if (fate === "session" || fate === "label") continue;
    if (PER_PERSON.includes(key)) {
      for (const id of PEOPLE) init[scopeKey(id, key)] = '"personal"';
    } else {
      init[key] = '"personal"';
    }
  }
  init[PROFILES_KEY] = JSON.stringify({ v: 1, activeId: "p2", profiles: [{ id: "default", name: "Me" }, { id: "p2", name: "Sam" }] });
  init[SCHEMA_KEY] = String(USER_SCHEMA);
  init[SYNC_KEY] = JSON.stringify({ code: "ABCD-EFGH-JKMN-PQRS-TVWX", lastSyncedAt: "2026-10-18T00:00:00Z", ask: { people: [{ sample: ["Laksa"] }] } });
  return store({ ...init, ...extra });
}

test("Delete everything removes every wiped key for every person, and exactly the kept ones survive", () => {
  const st = seeded({ "faves.zzz.future.v1": "a store nobody classified", "unrelated.key": "not ours" });
  const before = Object.keys(st.dump());
  // Control: the seed really holds every wiped key — a wipe that "passes" over
  // an empty store proves nothing.
  for (const [key, fate] of Object.entries(CLASSIFIED).filter(([, f]) => f === "wiped")) {
    const holders = PER_PERSON.includes(key) ? PEOPLE.map((id) => scopeKey(id, key)) : [key];
    for (const h of holders) assert.ok(before.includes(h), `the control did not seed ${h}`);
  }
  const res = eraseEverything(st);
  assert.equal(res.ok, true);
  const left = Object.keys(st.dump()).sort();
  assert.deepEqual(left, ["unrelated.key", ...[...ERASE_KEEPS]].sort(), "a key survived that is not on the keep-list");
  assert.equal(st.getItem("faves.zzz.future.v1"), null, "an unclassified key must be deleted, never kept");
  assert.equal(st.getItem("unrelated.key"), "not ours", "a key outside the app's namespace was touched");
  // The keep-list is exactly what CLASSIFIED calls kept.
  assert.deepEqual([...ERASE_KEEPS].sort(), Object.entries(CLASSIFIED).filter(([, f]) => f === "kept").map(([k]) => k).sort());
});

test("the sync pairing survives a deletion without the question that names hearts", () => {
  const st = seeded();
  eraseEverything(st);
  const cfg = JSON.parse(st.getItem(SYNC_KEY));
  assert.equal(cfg.code, "ABCD-EFGH-JKMN-PQRS-TVWX", "the deletion signed the device out of sync");
  assert.equal(cfg.lastSyncedAt, "2026-10-18T00:00:00Z");
  assert.equal("ask" in cfg, false, "the open no-base question names hearts and must go");
});

test("a deletion on storage that cannot enumerate still removes every key it can name", () => {
  const st = seeded();
  const bare = { getItem: st.getItem, setItem: st.setItem, removeItem: st.removeItem }; // no key()/length: the in-memory shim
  assert.equal(eraseEverything(bare).ok, true);
  const left = Object.keys(st.dump()).filter((k) => !ERASE_KEEPS.includes(k));
  // The orphan person is in no registry, so only an enumerating backend can
  // find theirs — the documented limit of the best-effort path.
  assert.deepEqual(left.sort(), PER_PERSON.map((b) => scopeKey("orphan", b)).sort());
});

test("a tab behind storage deletes nothing", () => {
  const st = seeded();
  st.setItem(SCHEMA_KEY, String(USER_SCHEMA + 1));
  const before = JSON.stringify(st.dump());
  const res = eraseEverything(st);
  assert.equal(res.ok, false);
  assert.match(res.error, /another tab/);
  assert.equal(JSON.stringify(st.dump()), before);
});

test("every live store that holds personal state is re-pointed after a deletion", () => {
  // storage.reload() is what stops a store writing its old contents back at the
  // next tap. The list lives in live-stores.js; this reads it against the
  // singletons the app builds over device or profile storage.
  const live = readFileSync(new URL("live-stores.js", SITE_JS), "utf8");
  const exempt = new Set(["profiles", "persistence", "sync"]); // the registry is reloaded by name; the others hold no personal state
  const made = [];
  for (const f of readdirSync(SITE_JS).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(new URL(f, SITE_JS), "utf8");
    for (const m of src.matchAll(/^export const (\w+) = create\w+\(/gm)) made.push(m[1]);
  }
  assert.ok(made.length >= 10, "the scan found too few stores to mean anything");
  for (const name of made.filter((n) => !exempt.has(n))) {
    assert.match(live, new RegExp(`\\b${name}\\.reload\\(\\)|\\b${name}\\b[^\\n]*\\}\\)`), `${name} is not re-pointed by live-stores.js`);
    assert.match(live, new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from`), `${name} is not imported by live-stores.js`);
  }
  assert.match(live, /profiles\.reload\(\)/);
});
