// Every module that writes user storage, by name (roadmap 510/040, ADR 0146 §4).
// Run: `node --test`.
//
// THE RULE THIS HOLDS: an app update may change a person's data only through
// the upgrade chain (user-schema.js) and the named import modes
// (personal-data.js `IMPORT_MODES`, and sync's write-back). Everything else
// that writes is a store writing its OWN key because the person just did
// something. This test cannot read intent, so it does the next best thing: it
// lists every module whose code can write browser storage, and fails the
// moment a module not on the list gains that power — or one on the list loses
// it, so the list cannot rot into a comfortable over-approximation.
//
// If this fails because you added a writer: that is the review point. Say in
// WRITERS why the module writes, and which key. If it rewrites data that was
// already there because the app changed (a migration), it belongs in the chain
// instead — see the header of site/js/user-schema.js.
//
// What counts as a write: `.setItem(`, `.removeItem(`, `<something>Storage.clear(`,
// or naming `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie`
// at all (reaching the raw object is the power to write it). Comments are
// stripped first. A static scan; a module that reached storage through some
// cleverer path would evade it, and code review is what catches that.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const SITE_JS = new URL("../site/js/", import.meta.url);

const WRITERS = {
  "store.js": "the storage primitive: probes localStorage once, falls back to memory",
  "user-schema.js": "THE UPGRADE CHAIN — the only code that rewrites data because the app changed",
  "personal-data.js": "the named import modes (merge / replace) and nothing else",
  "sync.js": "sync's write-back of an agreed merge, its pairing and its base",
  "sync-log.js": "its own key: the device's sync log (510/380), written only by sync.js with the storage sync.js was given",
  "profiles.js": "the profile registry; also copies pre-profile keys forward once (a pre-chain migration, 2026-08)",
  "favourites.js": "its own key: hearts",
  "ratings.js": "its own key: ratings",
  "notes.js": "its own key: recipe notes",
  "recipes.js": "its own key: personal recipes, each person's own cookbook (510/050, per person 510/120)",
  "settings.js": "its own key: settings, including allergen flags",
  "cart.js": "its own key: the order tally (and, via createOrder, the shopping list)",
  "saved-orders.js": "its own key: saved orders, per person (Theme 26a) — on-device, never synced",
  "checklist.js": "its own key: cook-mode ticks",
  "cook.js": "its own key: running cook-mode timers",
  "geo-consent.js": "its own key: the location ask's “don't ask again”",
  "geo.js": "sessionStorage: the last “Near me” origin, this tab only",
  "storage-persist.js": "its own key: that this browser was asked to keep the data (510/090)",
};

// THE SECOND RULE (roadmap 510/110, owner-ruled "Old tab stops writing"): a tab
// whose build is behind the stored USER_SCHEMA writes nothing. The refusal
// lives in ONE place — the storage store.js hands out (`safeStorage`, which
// wraps localStorage in `guardStorage`) — so it holds only while every writer
// gets its storage from there. Two tests below hold that: no module but
// store.js may reach the raw backends at all, and each writer, driven in a
// stale tab, must leave storage exactly as it was.
//
// The one exception is by construction, not by convenience: sessionStorage is
// this TAB's own, so no other tab can upgrade it under this one.
const RAW_BACKEND = /\blocalStorage\b|\bindexedDB\b|\bdocument\.cookie\b/;
const RAW_ALLOWED = { "store.js": "the storage primitive: wraps localStorage in the stale-tab guard" };
const TAB_LOCAL = { "geo.js": "sessionStorage — this tab's own, which no other tab can upgrade" };

const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
const WRITES =
  /\.setItem\s*\(|\.removeItem\s*\(|\b\w*[sS]torage\w*\.clear\s*\(|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bdocument\.cookie\b/;

function writersNow() {
  const files = readdirSync(SITE_JS).filter((f) => f.endsWith(".js"));
  const out = files.filter((f) => WRITES.test(strip(readFileSync(new URL(f, SITE_JS), "utf8"))));
  // The service worker has no localStorage, but IndexedDB and cookies are not
  // out of its reach, so it is scanned too and must stay off the list.
  const sw = strip(readFileSync(new URL("../sw.js", SITE_JS), "utf8"));
  if (WRITES.test(sw)) out.push("../sw.js");
  return out.sort();
}

test("every module that writes user storage is named, and no other does", () => {
  const now = writersNow();
  const named = Object.keys(WRITERS).sort();
  const added = now.filter((f) => !named.includes(f));
  const gone = named.filter((f) => !now.includes(f));
  assert.deepEqual(added, [], `new writer(s) of user storage: ${added.join(", ")} — see this file's header`);
  assert.deepEqual(gone, [], `named but no longer writing (take them off the list): ${gone.join(", ")}`);
});

test("the scan can see a writer", () => {
  // Break-probe for the scanner itself: each form must be caught, and a
  // comment mentioning one must not be.
  for (const src of [
    "storage.setItem('faves.x', '1')",
    "s.removeItem(k)",
    "sessionStorage.getItem('a')",
    "const l = localStorage;",
    "indexedDB.open('faves-user')",
    "deviceStorage.clear()",
    "document.cookie = 'a=1'",
  ]) {
    assert.ok(WRITES.test(strip(src)), `missed: ${src}`);
  }
  assert.ok(!WRITES.test(strip("// localStorage.setItem is not called here\nconst a = 1;")));
  assert.ok(!WRITES.test(strip("ratings.clear(entry); order.clear();")), "a store's own clear() is not a raw write");
});

test("no module but store.js reaches the raw storage backends", () => {
  // A module naming localStorage itself would get a storage the stale-tab
  // guard never sees (roadmap 510/110). geo-consent.js did, until 2026-10-01.
  const files = readdirSync(SITE_JS).filter((f) => f.endsWith(".js"));
  const raw = files.filter((f) => RAW_BACKEND.test(strip(readFileSync(new URL(f, SITE_JS), "utf8"))));
  assert.deepEqual(raw.sort(), Object.keys(RAW_ALLOWED).sort(), "reaches localStorage/indexedDB/cookies directly — go through store.js safeStorage()");
  const session = files.filter((f) => /\bsessionStorage\b/.test(strip(readFileSync(new URL(f, SITE_JS), "utf8"))));
  assert.deepEqual(session.sort(), Object.keys(TAB_LOCAL).sort());
});

// --- behaviour: every writer, in a tab that has fallen behind storage --------

/** A localStorage stand-in, installed before any store module is evaluated
 *  (they bind their storage when they load). */
function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    dump: () => Object.fromEntries([...m.entries()].sort()),
  };
}

test("in a tab behind storage, every writer leaves storage exactly as it was", async () => {
  const ls = fakeLocalStorage();
  globalThis.localStorage = ls;
  try {
    const { USER_SCHEMA, SCHEMA_KEY } = await import("../site/js/schema-stamp.js");
    ls.setItem(SCHEMA_KEY, String(USER_SCHEMA));
    // A device with something in it, and sync on — so each writer has
    // something it could overwrite, and sync something it could send.
    ls.setItem("faves.sync.v1", JSON.stringify({ code: "ABCD-EFGH-JKMN-PQRS-TVWX" }));
    const store = await import("../site/js/store.js");
    const { favourites } = await import("../site/js/favourites.js");
    const { ratings } = await import("../site/js/ratings.js");
    const { notes } = await import("../site/js/notes.js");
    const { settings } = await import("../site/js/settings.js");
    const { checklist } = await import("../site/js/checklist.js");
    const { order } = await import("../site/js/cart.js");
    const { shopping } = await import("../site/js/shopping.js");
    const { recipes } = await import("../site/js/recipes.js");
    const { savedOrders } = await import("../site/js/saved-orders.js");
    const { profiles, deviceStorage } = await import("../site/js/profiles.js");
    const { createTimerStore } = await import("../site/js/cook.js");
    const { writeConsent, suppressAsk } = await import("../site/js/geo-consent.js");
    const { createPersistence } = await import("../site/js/storage-persist.js");
    const { createSync } = await import("../site/js/sync.js");
    const { appendSyncLog } = await import("../site/js/sync-log.js");
    const { applyPersonalData, collectPersonalData } = await import("../site/js/personal-data.js");
    const { upgradeStorage, upgradeRan } = await import("../site/js/user-schema.js");

    // The control: while storage is at this build's schema, writes land. A
    // guard broken into refusing everything would pass the half below alone.
    favourites.toggle({ type: "venue", venueId: "control", venueName: "Control" });
    assert.ok(ls.getItem("faves.p.default.favourites.v1")?.includes("control"), "a current tab could not write at all");
    assert.equal(store.isTabStale(), false);
    const backup = collectPersonalData(deviceStorage, { exportedAt: "2026-10-01T00:00:00Z" });

    // Another tab upgrades storage.
    ls.setItem(SCHEMA_KEY, String(USER_SCHEMA + 1));
    const before = JSON.stringify(ls.dump());

    const fetched = [];
    const writers = {
      "favourites.js": () => favourites.toggle({ type: "venue", venueId: "stale", venueName: "Stale" }),
      "ratings.js": () => ratings.set({ type: "venue", venueId: "stale" }, 3),
      "notes.js": () => notes.set("stale dish", "half the sugar"),
      "settings.js": () => settings.set({ diet: { dietary: [], avoid: ["peanut"] } }),
      "checklist.js": () => checklist.set("stale dish", "i:flour", true),
      "cart.js": () => order.add({ venueId: "stale", venueName: "Stale", name: "Pie", price: 5 }),
      "recipes.js": () => recipes.put({ dishId: "u:stale", name: "Stale loaf" }),
      "saved-orders.js": () =>
        savedOrders.save({ venueId: "stale", venueName: "Stale", name: "My Stale", lines: [{ dishId: "pie", name: "Pie", qty: 1 }] }),
      "profiles.js": () => profiles.create("Sam"),
      "cook.js": () => createTimerStore(store.safeStorage()).start("stale dish", 0, Date.now() + 60_000),
      "geo-consent.js": () => {
        writeConsent({ suppressed: true });
        suppressAsk();
      },
      "storage-persist.js": () =>
        createPersistence({
          storage: store.safeStorage(),
          manager: { persist: async () => true, persisted: async () => false },
          win: { navigator: { standalone: true } },
        }).requestOnce(),
      "sync.js": async () => {
        const s = createSync({ fetchImpl: async (u) => (fetched.push(u), { status: 500, headers: new Map() }), setTimer: null });
        const res = await s.syncNow();
        assert.equal(res.error, "reload-needed");
      },
      "sync-log.js": () => {
        assert.equal(appendSyncLog(deviceStorage, { at: "x", outcome: "error" }), false, "the log reported a write a stale tab refused");
      },
      "personal-data.js": () => {
        const r = applyPersonalData(deviceStorage, backup, { mode: "replace" });
        assert.equal(r.ok, false, "an import in a stale tab reported success");
      },
      "user-schema.js": () => {
        assert.equal(upgradeStorage(store.safeStorage()).status, "newer");
        assert.equal(upgradeRan(store.safeStorage()), false);
      },
    };
    // Every module on the writers list is driven here, bar the two that are
    // not the stale-tab guard's to hold (the primitive itself, and the one
    // that writes only this tab's sessionStorage).
    const exempt = new Set([...Object.keys(RAW_ALLOWED), ...Object.keys(TAB_LOCAL)]);
    assert.deepEqual(
      Object.keys(writers).sort(),
      Object.keys(WRITERS).filter((f) => !exempt.has(f)).sort(),
      "a writer is not driven by this test — add it to `writers`"
    );
    shopping.add({ venueId: "stale dish", venueName: "Stale", name: "flour" }); // same code as cart.js, own key

    for (const [file, write] of Object.entries(writers)) {
      await write();
      assert.equal(JSON.stringify(ls.dump()), before, `${file} wrote to storage in a stale tab`);
    }
    assert.deepEqual(fetched, [], "sync reached the network from a stale tab");
    assert.equal(store.isTabStale(), true, "the page was never told it is stale");
  } finally {
    delete globalThis.localStorage;
  }
});
