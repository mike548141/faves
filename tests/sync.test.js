// Unit tests for the sync engine (site/js/sync.js) — the module that actually
// runs a sync, as opposed to the parts it drives. Real WebCrypto (Node 24), a
// fake storage and a fake server: no network, no browser, no clock.
//
// The fake server is deliberately a real-ish one. It enforces `If-Match` and
// returns 404/200/204/412 exactly as the deployed Worker does, because the
// interesting failures here are all sequencing — a write that lands before a
// read, a base recorded for an agreement that never happened, two devices
// racing. A stub that always said 204 would pass every test in this file and
// prove nothing about any of them. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSync,
  writeSnapshot,
  applyDietDecision,
  upgradeSnapshot,
  SYNC_KEY,
  SYNC_BASE_KEY,
  UPDATE_NEEDED,
  MAX_ATTEMPTS,
} from "../site/js/sync.js";
import { applyPersonalData, collectPersonalData, USER_SCHEMA, STORE_SCHEMA } from "../site/js/personal-data.js";
import { moveBackup } from "../tools/move_recipes.mjs";
import { mergePersonal, mergeSet } from "../site/js/sync-merge.js";
import { deriveSyncKeys, openBlob, sealBlob } from "../site/js/sync-crypto.js";
import { PROFILES_KEY, scopeKey } from "../site/js/profiles.js";
import { favKey } from "../site/js/favourites.js";
import { mintSyncCode, normaliseSyncCode } from "../site/js/sync-code.js";
import { RECIPE_BUCKETS, BUCKET_PAD, bucketOf, bucketPlaintext, readBucket } from "../site/js/sync-buckets.js";
import { cookbookKey } from "../site/js/recipe-record.js";

// A REAL code for the tests that seed one by hand. Until 2026-08-17 they used
// "K7F29DMX4QRA" — 12 characters, which normaliseSyncCode rejects — so
// deriveSyncKeys threw before any fetch and three tests about a refusing or
// dead server passed without ever reaching it (ADR 0072's shape).
const A_CODE = mintSyncCode();

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  const s = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
  Object.defineProperty(s, "length", { get: () => m.size });
  s.key = (i) => [...m.keys()][i] ?? null;
  return s;
}

/** A device: a storage seeded with one profile holding `favs`, `ratings` and
 *  `notes` (ADR 0131 — a note is the same flat-map shape a rating is). */
function device({ favs = [], ratings = {}, notes = {}, settings = null, id = "default", name = "Me" } = {}) {
  const st = fakeStorage({
    [PROFILES_KEY]: JSON.stringify({ v: 1, activeId: id, profiles: [{ id, name }] }),
    [scopeKey(id, "faves.favourites.v1")]: JSON.stringify(favs),
    [scopeKey(id, "faves.ratings.v1")]: JSON.stringify(ratings),
    [scopeKey(id, "faves.notes.v1")]: JSON.stringify(notes),
  });
  if (settings) st.setItem(scopeKey(id, "faves.settings.v1"), JSON.stringify(settings));
  return st;
}

/**
 * An in-memory stand-in for the Worker, with real If-Match semantics.
 *
 * `buckets: true` (the default) is the Worker that knows recipe buckets
 * (roadmap 510/050): a GET of the core copy carrying `?buckets=<n>` reports
 * which `<blobId>:r<k>` copies exist and their versions in `X-Faves-Buckets`,
 * exactly as worker/sync-worker.js does. `buckets: false` is the Worker
 * deployed before that, which reports nothing and refuses a bucket's key.
 */
function fakeServer({ buckets = true } = {}) {
  const blobs = new Map(); // key -> { bytes, etag }
  let version = 0;
  const hdrs = (map) => ({ get: (h) => map[h.toLowerCase()] ?? null });
  const server = {
    blobs,
    puts: 0,
    gets: 0,
    bucketGets: 0,
    bucketPuts: 0,
    async fetch(url, init = {}) {
      const [path, query = ""] = String(url).split("?");
      const id = path.split("/").pop();
      const isBucket = id.includes(":");
      if (isBucket && !buckets) return { status: 400, headers: hdrs({}) };
      const method = init.method || "GET";
      if (method === "GET") {
        server.gets += 1;
        if (isBucket) server.bucketGets += 1;
        const extra = {};
        const asked = /(?:^|&)buckets=(\d+)/.exec(query);
        if (buckets && !isBucket && asked) {
          const found = [];
          for (let k = 0; k < Number(asked[1]); k += 1) {
            const b = blobs.get(`${id}:r${k}`);
            if (b) found.push(`r${k}=${b.etag}`);
          }
          extra["x-faves-buckets"] = found.length ? found.join(",") : "none";
        }
        const rec = blobs.get(id);
        if (!rec) return { status: 404, headers: hdrs(extra) };
        return {
          status: 200,
          headers: hdrs({ ...extra, etag: rec.etag }),
          arrayBuffer: async () => rec.bytes.buffer.slice(rec.bytes.byteOffset, rec.bytes.byteOffset + rec.bytes.byteLength),
        };
      }
      if (method === "PUT") {
        const rec = blobs.get(id);
        const ifMatch = init.headers?.["If-Match"] ?? null;
        if (rec && ifMatch !== rec.etag) return { status: 412, headers: hdrs({}) };
        version += 1;
        const etag = `"v${version}"`;
        blobs.set(id, { bytes: new Uint8Array(init.body), etag });
        server.puts += 1;
        if (isBucket) server.bucketPuts += 1;
        return { status: 204, headers: hdrs({ etag }) };
      }
      return { status: 405, headers: hdrs({}) };
    },
  };
  return server;
}

const venue = (id) => ({ type: "venue", venueId: id, venueName: id });

const mk = (storage, server, extra = {}) =>
  createSync({
    storage,
    endpoint: "https://example.invalid",
    fetchImpl: (u, i) => server.fetch(u, i),
    now: () => "2026-08-16T00:00:00.000Z",
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (t) => clearTimeout(t),
    ...extra,
  });

const favsOf = (storage, id = "default") =>
  JSON.parse(storage.getItem(scopeKey(id, "faves.favourites.v1")) || "[]").map(favKey).sort();
const notesOf = (storage, id = "default") =>
  JSON.parse(storage.getItem(scopeKey(id, "faves.notes.v1")) || "{}");

// --- the whole point: two devices actually converge -----------------------

test("two devices with different hearts end up holding the same set", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  const b = device({ favs: [venue("pandan")] });

  const syncA = mk(a, server);
  const { code } = await syncA.enable();

  const syncB = mk(b, server);
  await syncB.join(code);
  await syncA.syncNow(); // A picks up what B pushed

  assert.deepEqual(favsOf(a), ["v:kk", "v:pandan"]);
  assert.deepEqual(favsOf(b), ["v:kk", "v:pandan"]);
});

test("two devices with different notes end up holding the same set (ADR 0131)", async () => {
  const server = fakeServer();
  const a = device({ notes: { "cook-at-home gingernut": "less sugar" } });
  const b = device({ notes: { "cook-at-home pavlova": "double it" } });

  const syncA = mk(a, server);
  const { code } = await syncA.enable();

  const syncB = mk(b, server);
  await syncB.join(code);
  await syncA.syncNow(); // A picks up what B pushed

  assert.deepEqual(notesOf(a), {
    "cook-at-home gingernut": "less sugar",
    "cook-at-home pavlova": "double it",
  });
  assert.deepEqual(notesOf(b), notesOf(a));
});

test("clearing a note on one device removes it on the other — same base-diff rule as a heart", async () => {
  const server = fakeServer();
  const a = device({ notes: { r: "keep this one", gone: "will be cleared" } });
  const b = device({ notes: {} });

  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const syncB = mk(b, server);
  await syncB.join(code);
  assert.deepEqual(notesOf(b), { r: "keep this one", gone: "will be cleared" });

  a.setItem(scopeKey("default", "faves.notes.v1"), JSON.stringify({ r: "keep this one" }));
  await syncA.syncNow();
  await syncB.syncNow();

  assert.deepEqual(notesOf(a), { r: "keep this one" });
  assert.deepEqual(notesOf(b), { r: "keep this one" }, "the cleared note must not come back from B");
});

test("un-hearting on one device removes it on the other — the whole reason for the base", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk"), venue("pandan")] });
  const b = device({ favs: [] });

  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const syncB = mk(b, server);
  await syncB.join(code);
  assert.deepEqual(favsOf(b), ["v:kk", "v:pandan"], "B should first receive both");

  // Now A un-hearts pandan and syncs.
  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk")]));
  await syncA.syncNow();
  await syncB.syncNow();

  assert.deepEqual(favsOf(a), ["v:kk"]);
  assert.deepEqual(favsOf(b), ["v:kk"], "the deletion must reach B, not be re-added by it");
});

test("a rating changed on one device replaces the old one on the other", async () => {
  const server = fakeServer();
  const a = device({ ratings: { "v:kk": 3 } });
  const b = device({ ratings: {} });
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const syncB = mk(b, server);
  await syncB.join(code);

  a.setItem(scopeKey("default", "faves.ratings.v1"), JSON.stringify({ "v:kk": 5 }));
  await syncA.syncNow();
  await syncB.syncNow();
  assert.deepEqual(JSON.parse(b.getItem(scopeKey("default", "faves.ratings.v1"))), { "v:kk": 5 });
});

// --- the base snapshot, and when it may be written ------------------------

test("no base is recorded until the server has accepted the write", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  // A server that reads fine but refuses every write.
  let refused = 0;
  const refusing = { fetch: async (u, i) => ((i?.method || "GET") === "PUT" ? (refused++, { status: 500, headers: { get: () => null } }) : server.fetch(u, i)) };
  const s = mk(a, refusing);
  a.setItem(SYNC_KEY, JSON.stringify({ code: A_CODE }));

  const res = await s.syncNow();
  assert.equal(refused, 1, "the write must actually have been attempted and refused");
  assert.equal(res.ok, false);
  assert.equal(a.getItem(SYNC_BASE_KEY), null, "a base here would claim an agreement that never happened");
});

test("a failed sync leaves this device's own data untouched", async () => {
  const a = device({ favs: [venue("kk")] });
  let reached = 0;
  const dead = { fetch: async () => { reached++; throw new Error("offline"); } };
  const s = mk(a, dead);
  a.setItem(SYNC_KEY, JSON.stringify({ code: A_CODE }));

  const res = await s.syncNow();
  assert.equal(reached, 1, "the dead server must actually have been reached");
  assert.equal(res.ok, false);
  assert.deepEqual(favsOf(a), ["v:kk"]);
  assert.match(s.status().error, /safe on this device/);
});

/** A server that lets `raceTimes` writes by "someone else" land between our
 *  read and our write — the only place a race can happen. Mutating the blob
 *  before the read just means we read the newer etag and succeed. */
function racingServer(server, raceTimes) {
  let raced = 0;
  const wrapped = {
    puts412: 0,
    fetch: async (u, i) => {
      const res = await server.fetch(u, i);
      if ((i?.method || "GET") === "GET" && raced < raceTimes) {
        raced += 1;
        const [id, rec] = [...server.blobs.entries()][0];
        server.blobs.set(id, { ...rec, etag: `"someone-else-wrote-${raced}"` });
      }
      if (res.status === 412) wrapped.puts412 += 1;
      return res;
    },
  };
  return wrapped;
}

test("a lost race goes round again and lands the change (roadmap 510/070)", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  await mk(a, server).enable();
  const racing = racingServer(server, 1);
  const s = mk(a, racing);

  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk"), venue("new")]));
  const res = await s.syncNow();
  assert.equal(racing.puts412, 1, "the first write should have lost the race");
  assert.equal(res.ok, true, "the second round should have landed it");
  assert.equal(s.status().state, "idle");
  assert.ok(a.getItem(SYNC_BASE_KEY).includes("new"), "the agreement now includes the heart");
});

test("a race lost on every attempt stops at the bound, as retryable, without advancing the base", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  await mk(a, server).enable();
  const racing = racingServer(server, Infinity);
  const s = mk(a, racing);

  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk"), venue("new")]));
  const res = await s.syncNow();
  assert.equal(racing.puts412, MAX_ATTEMPTS, "the retry is bounded");
  assert.equal(res.retry, true, "a 412 must come back as retryable");
  assert.equal(s.status().state, "idle", "a race is normal, not a failure state");
  // A base legitimately exists from the successful first sync. What must NOT
  // have happened is the lost race advancing it: recording an agreement that
  // includes the heart we failed to push would make the next merge read that
  // heart as something the pair had agreed on and then deleted.
  assert.ok(!a.getItem(SYNC_BASE_KEY).includes("new"), "a lost race must not advance the base");
});

/** A window stand-in: enough EventTarget to fire `online`. */
function fakeWin() {
  const ls = new Map();
  return {
    addEventListener: (t, fn) => ls.set(t, fn),
    removeEventListener: (t) => ls.delete(t),
    fire: (t) => ls.get(t)?.(),
    has: (t) => ls.has(t),
  };
}

test("coming back online sends a change that failed while offline (roadmap 510/070)", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  let offline = false;
  const flaky = { fetch: (u, i) => (offline ? Promise.reject(new TypeError("offline")) : server.fetch(u, i)) };
  const s = mk(a, flaky);
  await s.enable();
  const win = fakeWin();
  const stop = s.start({ stores: [], doc: null, win });
  await s.syncNow(); // settle the pull start() fired
  assert.ok(win.has("online"));

  offline = true;
  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk"), venue("new")]));
  const failed = await s.syncNow();
  assert.equal(failed.ok, false);
  assert.equal(s.status().state, "error");

  offline = false;
  const putsBefore = server.puts;
  win.fire("online");
  await new Promise((r) => setTimeout(r, 0));
  await s.syncNow(); // joins the cycle `online` started, if one is in flight
  assert.equal(server.puts, putsBefore + 1, "the reconnect did not send the waiting change");
  assert.ok(a.getItem(SYNC_BASE_KEY).includes("new"));
  assert.equal(s.status().state, "idle");
  stop();
  assert.equal(win.has("online"), false, "stop() removes the listener");
});

test("coming back online with nothing waiting costs nothing", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  const s = mk(a, server);
  await s.enable();
  const win = fakeWin();
  const stop = s.start({ stores: [], doc: null, win });
  await s.syncNow();
  const [gets, puts] = [server.gets, server.puts];
  win.fire("online");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(server.gets, gets, "a reconnect with nothing owed made a request");
  assert.equal(server.puts, puts);
  stop();
});

test("coming back online sends a debounced change now, rather than waiting it out", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  const store = { subs: new Set(), subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); } };
  const s = mk(a, server, { debounceMs: 60_000 });
  await s.enable();
  const win = fakeWin();
  const stop = s.start({ stores: [store], doc: null, win });
  await s.syncNow();
  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk"), venue("new")]));
  for (const fn of store.subs) fn();
  assert.equal(s._pendingWrite(), true);
  const puts = server.puts;
  win.fire("online");
  await s.syncNow();
  assert.equal(s._pendingWrite(), false, "the debounce was not flushed");
  assert.equal(server.puts, puts + 1);
  stop();
});

test("a store reloaded by ANOTHER tab's write schedules no sync here; a tap here still does (roadmap 510/210)", async () => {
  // Survey finding 8: a heart in one tab made every other open tab reload
  // favourites from the `storage` event and then pull on its own debounce —
  // a GET and 9 KV reads per extra tab for a change the first tab was
  // already pushing. The reload arrives through a `storage` event's dispatch,
  // which is what `window.event` reports while the listeners run.
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  const subs = new Set();
  const store = { subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)), notify: () => subs.forEach((fn) => fn()) };
  const s = mk(a, server, { debounceMs: 60_000 });
  await s.enable();
  const win = fakeWin();
  const stop = s.start({ stores: [store], doc: null, win });
  await s.syncNow(); // settle the pull start() fired

  // Another tab hearted something: this tab's listener reloads the store
  // while the `storage` event is being dispatched.
  win.event = { type: "storage", key: scopeKey("default", "faves.favourites.v1") };
  store.notify();
  win.event = undefined;
  assert.equal(s._pendingWrite(), false, "a cross-tab reload scheduled a sync — the writing tab already owns the push");

  // A tap in THIS tab (a click is the current event, or none after an await)
  // must still schedule, or this tab's own change would never leave it.
  win.event = { type: "click" };
  store.notify();
  win.event = undefined;
  assert.equal(s._pendingWrite(), true, "a change made in this tab must still schedule a sync");
  s.flush();
  await s.syncNow();

  // An import or a profile rename reloads the stores with no event at all;
  // that is a change made here, and it must sync.
  store.notify();
  assert.equal(s._pendingWrite(), true, "a same-tab reload (import, rename) must still schedule");
  stop();
  s.flush();
  await s.syncNow();
});

// --- the allergen question ------------------------------------------------

const dietOf = (storage, id = "default") =>
  JSON.parse(storage.getItem(scopeKey(id, "faves.settings.v1")) || "{}").diet;

test("a two-sided allergen change blocks the sync and asks", async () => {
  const server = fakeServer();
  const a = device({ settings: { diet: { dietary: [], avoid: [] } } });
  const syncA = mk(a, server);
  const { code } = await syncA.enable();

  const b = device({ settings: { diet: { dietary: [], avoid: [] } } });
  const syncB = mk(b, server);
  await syncB.join(code);

  // Each device now flags a different allergen.
  a.setItem(scopeKey("default", "faves.settings.v1"), JSON.stringify({ diet: { dietary: [], avoid: ["contains-nuts"] } }));
  await syncA.syncNow();
  b.setItem(scopeKey("default", "faves.settings.v1"), JSON.stringify({ diet: { dietary: [], avoid: ["contains-gluten"] } }));

  const res = await syncB.syncNow();
  assert.equal(res.needsDecision, true);
  assert.equal(syncB.status().state, "needs-decision");
  assert.ok(res.conflicts.some((c) => c.kind === "diet"));
});

test("answering 'keep mine' actually writes mine, not the provisional union", async () => {
  // The failure this guards: resolve() unblocks the write but the snapshot
  // still carries the union the merge produced, so the user's answer is
  // silently discarded — on the one question in this app that can hurt.
  const merged = { profiles: [{ id: "default", settings: { diet: { dietary: [], avoid: ["contains-gluten", "contains-nuts"] } } }] };
  const conflicts = [{ kind: "diet", profileId: "default", mine: { dietary: [], avoid: ["contains-nuts"] }, theirs: { dietary: [], avoid: ["contains-gluten"] } }];

  applyDietDecision(merged, conflicts, { diet: "keep" });
  assert.deepEqual(merged.profiles[0].settings.diet.avoid, ["contains-nuts"]);
});

test("answering 'use theirs' writes theirs, and 'combine' keeps the union", async () => {
  const base = () => ({ profiles: [{ id: "default", settings: { diet: { dietary: [], avoid: ["a", "b"] } } }] });
  const conflicts = [{ kind: "diet", profileId: "default", mine: { dietary: [], avoid: ["a"] }, theirs: { dietary: [], avoid: ["b"] } }];

  const inc = base();
  applyDietDecision(inc, conflicts, { diet: "incoming" });
  assert.deepEqual(inc.profiles[0].settings.diet.avoid, ["b"]);

  const comb = base();
  applyDietDecision(comb, conflicts, { diet: "combine" });
  assert.deepEqual(comb.profiles[0].settings.diet.avoid, ["a", "b"], "combine is what the merge already did");
});

// --- writeSnapshot, which must be able to remove ---------------------------

test("writeSnapshot replaces rather than merges, so an emptied list really empties", async () => {
  const st = device({ favs: [venue("kk"), venue("pandan")] });
  writeSnapshot(st, { profiles: [{ id: "default", name: "Me", favourites: [], ratings: {}, settings: null }] });
  assert.deepEqual(favsOf(st), []);
});

test("writeSnapshot purges the stores of a profile deleted on the other device", async () => {
  const st = device({ favs: [venue("kk")] });
  st.setItem(PROFILES_KEY, JSON.stringify({ v: 1, activeId: "default", profiles: [{ id: "default", name: "Me" }, { id: "p2", name: "Ruth" }] }));
  st.setItem(scopeKey("p2", "faves.favourites.v1"), JSON.stringify([venue("gone")]));
  st.setItem(scopeKey("p2", "faves.notes.v1"), JSON.stringify({ r: "Ruth's note" }));

  writeSnapshot(st, { profiles: [{ id: "default", name: "Me", favourites: [venue("kk")], ratings: {}, settings: null }] });

  assert.equal(st.getItem(scopeKey("p2", "faves.favourites.v1")), null, "orphaned hearts must not survive the profile");
  assert.equal(st.getItem(scopeKey("p2", "faves.notes.v1")), null, "orphaned notes must not survive the profile either");
  assert.deepEqual(JSON.parse(st.getItem(PROFILES_KEY)).profiles.map((p) => p.id), ["default"]);
});

test("writeSnapshot writes a profile's notes verbatim, replacing rather than merging", async () => {
  const st = device({ notes: { r: "old note" } });
  writeSnapshot(st, {
    profiles: [{ id: "default", name: "Me", favourites: [], ratings: {}, notes: { r: "new note" }, settings: null }],
  });
  assert.deepEqual(notesOf(st), { r: "new note" });
});

test("writeSnapshot never touches the order tally or an unknown store", async () => {
  const st = device({ favs: [] });
  st.setItem("faves.order.v1", JSON.stringify([{ venueId: "kk", name: "Roti", qty: 1 }]));
  st.setItem("faves.somethingelse.v1", "keep me");
  writeSnapshot(st, { profiles: [{ id: "default", name: "Me", favourites: [], ratings: {}, settings: null }] });
  assert.equal(JSON.parse(st.getItem("faves.order.v1")).length, 1);
  assert.equal(st.getItem("faves.somethingelse.v1"), "keep me");
});

// --- writes are the scarce resource ---------------------------------------

test("a burst of changes debounces into one write, and a flush sends it early", async () => {
  const server = fakeServer();
  const a = device({ favs: [] });
  const s = mk(a, server, { debounceMs: 5000 });
  await s.enable();
  const after = server.puts;

  // Three real changes, not three bare schedule() calls: a cycle whose merge
  // equals what the server holds writes nothing (see below), so a burst that
  // changed nothing would be a burst of zero writes and prove nothing.
  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk")]));
  s.schedule();
  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk"), venue("pandan")]));
  s.schedule();
  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk"), venue("pandan"), venue("roti")]));
  s.schedule();
  assert.equal(server.puts, after, "nothing should have been written yet");
  assert.equal(s._pendingWrite(), true);

  s.flush();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(server.puts, after + 1, "three changes must cost exactly one write");
});

// --- the engine's own writes are not changes ------------------------------

test("a pull that changed nothing writes nothing — and a successful sync does not re-arm itself", async () => {
  // Found by the 2026-08-17 cold review: `applied()` reloads the live stores,
  // their subscribers fire exactly as on a tap, and that scheduled the next
  // sync — one KV write every debounce forever, per open tab.
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  // A store shaped like favourites.js: reload() notifies its subscribers.
  // One per device, as in life — a shared one would let B's reload schedule A.
  const liveStore = () => {
    const subs = new Set();
    return { subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)), reload: () => subs.forEach((fn) => fn()) };
  };
  const storeA = liveStore();
  const s = mk(a, server, { debounceMs: 5000, onApplied: () => storeA.reload() });
  s.start({ stores: [storeA], doc: null });
  await s.enable();
  assert.equal(server.puts, 1, "the first cycle writes once");
  assert.equal(s._pendingWrite(), false, "a successful sync must not schedule another");

  // A second device pulls A's blob (a real local change here → applied → reload).
  const b = device({ favs: [] });
  const storeB = liveStore();
  const sb = mk(b, server, { debounceMs: 5000, onApplied: () => storeB.reload() });
  sb.start({ stores: [storeB], doc: null });
  const before = server.puts;
  await sb.join(s.status().code);
  assert.deepEqual(favsOf(b), ["v:kk"], "B received the heart");
  assert.equal(server.puts, before, "B had nothing the server lacked, so B wrote nothing");
  assert.equal(sb._pendingWrite(), false, "the reload B's pull caused is not a change to sync");
  assert.equal(s._pendingWrite(), false);

  // A cycle with nothing new anywhere: no PUT, no re-arm.
  const puts = server.puts;
  await s.syncNow();
  assert.equal(server.puts, puts, "nothing changed, nothing written");
  assert.equal(s._pendingWrite(), false);
});

test("a change made while a cycle is in flight is kept, not overwritten by the pull", async () => {
  // Safety-class: an allergen flag tapped during the round trip lived in
  // storage but not in the `mine` the cycle had collected; writing `merged`
  // over it erased the tap, and the next cycle pushed the erasure everywhere.
  const server = fakeServer();
  const a = device({ favs: [venue("kk")], settings: { diet: { dietary: [], avoid: [] } } });
  // A server whose PUT lands a tap on the device mid-flight.
  const orig = server.fetch;
  let tapped = false;
  server.fetch = async (url, init = {}) => {
    if ((init.method || "GET") === "PUT" && !tapped) {
      tapped = true;
      a.setItem(scopeKey("default", "faves.settings.v1"), JSON.stringify({ diet: { dietary: [], avoid: ["contains-nuts"] } }));
    }
    return orig(url, init);
  };
  const s = mk(a, server, { debounceMs: 5000 });
  const res = await s.enable();
  assert.equal(res.ok, true);
  assert.equal(res.deferredLocal, true, "the engine noticed the device moved under it");
  const diet = JSON.parse(a.getItem(scopeKey("default", "faves.settings.v1"))).diet;
  assert.deepEqual(diet.avoid, ["contains-nuts"], "the flag tapped mid-flight must survive the pull");
  assert.equal(s._pendingWrite(), true, "…and a follow-up cycle is scheduled to carry it out");
  // The follow-up carries the flag to the server.
  s.flush();
  await new Promise((r) => setTimeout(r, 30));
  const b = device({ favs: [] });
  await mk(b, server).join(s.status().code);
  assert.deepEqual(JSON.parse(b.getItem(scopeKey("default", "faves.settings.v1"))).diet.avoid, ["contains-nuts"]);
});

// --- turning it off --------------------------------------------------------

test("turning sync off forgets the code and the base but keeps your data", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  const s = mk(a, server);
  await s.enable();
  assert.equal(s.isOn(), true);

  s.disable();
  assert.equal(s.isOn(), false);
  assert.equal(a.getItem(SYNC_KEY), null);
  assert.equal(a.getItem(SYNC_BASE_KEY), null);
  assert.deepEqual(favsOf(a), ["v:kk"], "local data is not what sync owns");
});

test("a wrong code is refused before anything is written", async () => {
  const server = fakeServer();
  const s = mk(device(), server);
  const res = await s.join("not-a-real-code");
  assert.equal(res.ok, false);
  assert.match(res.error, /doesn’t look right/);
  assert.equal(server.puts, 0);
});

test("a blob that will not decrypt is refused rather than overwritten", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  const s = mk(a, server);
  const { code } = await s.enable();
  const before = server.puts;

  // Corrupt the stored blob, as a wrong-but-well-formed code would look.
  const [id, rec] = [...server.blobs.entries()][0];
  const bad = Uint8Array.from(rec.bytes);
  bad[20] ^= 0xff;
  server.blobs.set(id, { ...rec, bytes: bad });

  const res = await s.syncNow();
  assert.equal(res.ok, false);
  assert.equal(server.puts, before, "overwriting an unreadable blob would destroy whatever it really is");
  assert.ok(code);
});

// --- the half that only exists in a browser -------------------------------

test("a pull re-points the live stores, not just localStorage", async () => {
  // The bug this pins: writeSnapshot changes localStorage, but the live
  // favourites/ratings/settings singletons hold their state IN MEMORY. Without
  // an onApplied hook the synced data is correct on disk and every open screen
  // keeps rendering what it read at load — a heart arrives and nothing moves.
  // Invisible to every other test in this file, because they all read storage
  // directly. It took a real browser to find, and this is what keeps it found.
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  const s = mk(a, server);
  await s.enable();
  // B pulls A's heart: its storage changes, so its live stores must follow.
  const b = device({ favs: [] });
  let repointed = 0;
  const sb = mk(b, server, { onApplied: () => { repointed += 1; } });
  await sb.join(s.status().code);
  assert.deepEqual(favsOf(b), ["v:kk"]);
  assert.equal(repointed, 1, "a pull that changed storage must re-point the live stores");
  // A cycle that changes nothing on this device re-points nothing: the
  // repaint it would cause is the whole menu, and it would run on every
  // visibility change for no reason (2026-08-17).
  await sb.syncNow();
  assert.equal(repointed, 1, "nothing new here, nothing to re-point");
});

test("a failed sync does not claim to have re-pointed anything", async () => {
  const a = device({ favs: [venue("kk")] });
  let repointed = 0;
  const dead = { fetch: async () => { throw new Error("offline"); } };
  const s = mk(a, dead, { onApplied: () => { repointed += 1; } });
  a.setItem(SYNC_KEY, JSON.stringify({ code: A_CODE }));
  await s.syncNow();
  assert.equal(repointed, 0);
});

test("a screen that throws while repainting does not fail the sync", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  const s = mk(a, server, { onApplied: () => { throw new Error("render blew up"); } });
  const res = await s.enable();
  assert.notEqual(res.ok, false, "a repaint fault must not lose a completed sync");
});

// --- a newer build's data must survive an older build (ADR 0146 §3) ---------
//
// Roadmap 510/010's named test. The hazard: an old device merged the server
// copy, kept only the stores it knew, and wrote the result back. The newer
// device's three-way merge then saw its store in the base and in its own copy
// but not on the server — which is exactly how a deletion by the other device
// reads — and deleted it, locally and on the server. An allergen-adjacent
// store lost that way is the worst outcome this product has.
//
// A browser check cannot stage this (it runs one build), so the NEWER device is
// modelled here: its snapshot is this build's plus a `recipes` store on each
// profile and a top-level `pantry`, and its merge is this build's plus a
// three-way merge of `recipes` — the deletion-aware merge a real newer build
// would run on a store it knows.

async function serverCopy(server, code) {
  const { blobId, key } = await deriveSyncKeys(normaliseSyncCode(code));
  const rec = server.blobs.get(blobId);
  return rec ? openBlob(key, rec.bytes) : null;
}

async function seedServer(server, code, snapshot) {
  const { blobId, key } = await deriveSyncKeys(normaliseSyncCode(code));
  const res = await server.fetch(`https://example.invalid/v1/blob/${blobId}`, {
    method: "PUT",
    body: await sealBlob(key, snapshot),
    headers: {},
  });
  assert.equal(res.status, 204);
}

// A store this build has never heard of, on each profile. It was called
// `recipes` until 2026-10-01, when recipes became a real per-person store
// (roadmap 510/120) that never rides in the core copy.
const RECIPE = { id: "u:ginger-crunch", title: "Ginger crunch" };

/** What a newer build's merge does: this build's, plus `jars` merged three
 *  ways by id — so a recipe missing from the server copy, present in its base,
 *  is read as deleted. That is the reading the fix has to make impossible. */
function newerMerge(base, mine, theirs) {
  const out = mergePersonal(base, mine, theirs);
  const byId = (list, id) => (list || []).find((p) => p.id === id);
  for (const p of out.merged.profiles) {
    p.jars = mergeSet(
      byId(base?.profiles, p.id)?.jars,
      byId(mine?.profiles, p.id)?.jars,
      byId(theirs?.profiles, p.id)?.jars,
      (r) => r.id
    ).items;
  }
  return out.merged;
}

test("a server copy one version ahead keeps its unknown store after an old device syncs — on the server AND the newer device", async () => {
  const server = fakeServer();
  const code = mintSyncCode();

  // The newer device's last agreed state: its hearts, a recipe, and a pantry
  // store, stamped one format ahead with two store numbers this build lacks.
  const newerDevice = device({ favs: [venue("pandan")] });
  const newerSnap = {
    ...collectPersonalData(newerDevice, { exportedAt: "2026-09-30T00:00:00.000Z" }),
    v: USER_SCHEMA + 1,
    stores: { ...STORE_SCHEMA, jars: 1, pantry: 1 },
    pantry: { flour: "plain" },
  };
  newerSnap.profiles[0].jars = [RECIPE];
  await seedServer(server, code, newerSnap);

  // The OLD device (this build) joins and adds a heart, so it must WRITE.
  const old = device({ favs: [venue("kk")] });
  const res = await mk(old, server).join(code);
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(server.puts, 2, "the old device wrote the server copy");

  // 1. On the server: the store, the pantry and the newer stamps survived.
  const onServer = await serverCopy(server, code);
  assert.deepEqual(onServer.profiles[0].jars, [RECIPE], "the jars store was dropped from the server copy");
  assert.deepEqual(onServer.pantry, { flour: "plain" });
  assert.equal(onServer.v, USER_SCHEMA + 1, "the old device stamped its own lower version over the copy");
  assert.equal(onServer.stores.jars, 1);
  assert.deepEqual(onServer.profiles[0].favourites.map(favKey).sort(), ["v:kk", "v:pandan"]);

  // 2. On the newer device: its next merge, against the base it last agreed
  //    (newerSnap), keeps the recipe rather than reading it as deleted.
  const newerNext = newerMerge(newerSnap, newerSnap, onServer);
  assert.deepEqual(newerNext.profiles[0].jars, [RECIPE], "the newer device read the recipe as deleted");
  assert.deepEqual(newerNext.pantry, { flour: "plain" });

  // 3. And again on the old device's SECOND write, when its base already holds
  //    the carried store and its own copy still does not.
  old.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk"), venue("third")]));
  const again = await mk(old, server).syncNow();
  assert.equal(again.ok, true);
  const second = await serverCopy(server, code);
  assert.deepEqual(second.profiles[0].jars, [RECIPE], "the second write dropped it");
  assert.deepEqual(second.pantry, { flour: "plain" });
});

test("a store this build KNOWS, in a newer shape, pauses sync and writes nothing", async () => {
  const server = fakeServer();
  const code = mintSyncCode();
  const newer = collectPersonalData(device({ favs: [venue("pandan")] }), { exportedAt: null });
  newer.stores = { ...STORE_SCHEMA, favourites: STORE_SCHEMA.favourites + 1 };
  await seedServer(server, code, newer);

  const old = device({ favs: [venue("kk")] });
  const before = [...old._map.entries()].filter(([k]) => !k.startsWith("faves.sync"));
  const s = mk(old, server);
  const res = await s.join(code);
  assert.equal(res.ok, false);
  assert.equal(res.error, "update-needed");
  assert.deepEqual(res.stores, ["favourites"]);
  // Its own state since 510/090: ERROR's row says "tap to retry", and no
  // retry can help until this device runs a newer Faves.
  assert.equal(s.status().state, "paused");
  assert.equal(s.status().error, UPDATE_NEEDED);
  assert.equal(server.puts, 1, "nothing was written over the newer copy");
  assert.equal(old.getItem(SYNC_BASE_KEY), null, "no base was recorded");
  assert.deepEqual([...old._map.entries()].filter(([k]) => !k.startsWith("faves.sync")), before);
});

test("the base and the server copy run through the upgrade chain, and an unstamped one is format 1", () => {
  assert.equal(upgradeSnapshot(null), null);
  assert.equal(upgradeSnapshot([1]), null);
  const unstamped = upgradeSnapshot({ profiles: [], shelf: 1 });
  assert.equal(unstamped.v, USER_SCHEMA);
  assert.equal(unstamped.shelf, 1, "the chain must carry what it does not know");
  const older = upgradeSnapshot({ v: 0, profiles: [{ id: "a", name: "Me", jars: [1] }] });
  assert.equal(older.v, USER_SCHEMA);
  assert.deepEqual(older.profiles[0].jars, [1]);
});

test("an un-heart still propagates through a base read back through the chain", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk"), venue("pandan")] });
  const b = device({ favs: [] });
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  await mk(b, server).join(code);
  // Stamp A's stored base as an older format: it must still be read as a base,
  // not discarded (which would turn the un-heart below into a resurrection).
  const base = JSON.parse(a.getItem(SYNC_BASE_KEY));
  a.setItem(SYNC_BASE_KEY, JSON.stringify({ ...base, v: 0 }));
  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk")]));
  await syncA.syncNow();
  await mk(b, server).syncNow();
  assert.deepEqual(favsOf(b), ["v:kk"]);
});

// --- the pause has its own state (roadmap 510/090) --------------------------
//
// Until 2026-09-30 the "Update Faves" pause reused ERROR, so the Settings row
// read "Couldn't sync — tap to retry" while the panel said to update, and the
// panel offered a Retry that cannot help.
test("a paused sync has its own row label and view, not the error's retry", async () => {
  const { summaryText, computeViewKey } = await import("../site/js/sync-ui.js");
  const local = { joining: false, justOn: false };
  const paused = { state: "paused", error: UPDATE_NEEDED };
  assert.equal(computeViewKey(paused, local), "paused");
  assert.match(summaryText(paused), /update Faves/i);
  assert.doesNotMatch(summaryText(paused), /retry/i);
  // The control: the error state still offers retry, so the two did not merge.
  assert.match(summaryText({ state: "error", error: "x" }), /retry/i);
  assert.equal(computeViewKey({ state: "error" }, local), "error");
});

// --- personal recipes in buckets (roadmap 510/050, ADR 0146 §2) -----------

// Per person since 510/120: the default profile's own cookbook.
const RECIPES_KEY_ = "faves.p.default.recipes.v1";
const precipe = (id, name = id.slice(2), extra = {}) => ({ dishId: id, name, steps: ["Mix.", "Bake."], ...extra });
const withRecipes = (storage, list) => {
  storage.setItem(RECIPES_KEY_, JSON.stringify(Object.fromEntries(list.map((r) => [r.dishId, r]))));
  return storage;
};
const recipesOf = (storage) => Object.keys(JSON.parse(storage.getItem(RECIPES_KEY_) || "{}")).sort();
const bucketKeys = (server) => [...server.blobs.keys()].filter((k) => k.includes(":")).sort();

async function keysFor(code) {
  return deriveSyncKeys(normaliseSyncCode(code));
}

test("recipes cross between two devices in buckets, every bucket padded, and the core copy records each version", async () => {
  const server = fakeServer();
  const a = withRecipes(device(), [precipe("u:ginger-crunch"), precipe("u:pavlova")]);
  const b = withRecipes(device(), [precipe("u:scones")]);
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  await mk(b, server).join(code);
  await syncA.syncNow();

  assert.deepEqual(recipesOf(a), ["u:ginger-crunch", "u:pavlova", "u:scones"]);
  assert.deepEqual(recipesOf(b), ["u:ginger-crunch", "u:pavlova", "u:scones"]);

  const { blobId, key } = await keysFor(code);
  // All eight exist once any recipe does — which exist must not count them.
  assert.equal(bucketKeys(server).length, RECIPE_BUCKETS);
  for (const k of bucketKeys(server)) {
    const len = server.blobs.get(k).bytes.length;
    assert.equal((len - 29) % BUCKET_PAD, 0, `${k} is ${len} bytes`); // 1 + 12 IV + 16 tag
  }
  const core = await openBlob(key, server.blobs.get(blobId).bytes);
  assert.equal(core.recipes, undefined, "recipes never travel in the core copy");
  assert.equal(core.recipeBuckets.n, RECIPE_BUCKETS);
  for (let n = 0; n < RECIPE_BUCKETS; n += 1) {
    assert.equal(core.recipeBuckets.v[`r${n}`], server.blobs.get(`${blobId}:r${n}`).etag);
  }
});

test("once agreed, a heart costs one core write and no bucket is read or written", async () => {
  const server = fakeServer();
  const a = withRecipes(device(), [precipe("u:ginger-crunch")]);
  const syncA = mk(a, server);
  await syncA.enable();
  const reads = server.bucketGets;
  const writes = server.bucketPuts;
  const puts = server.puts;
  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk")]));
  const res = await syncA.syncNow();
  assert.equal(res.ok, true);
  assert.equal(server.puts - puts, 1);
  assert.equal(server.bucketPuts - writes, 0);
  assert.equal(server.bucketGets - reads, 0);
  // And a pull that changed nothing writes nothing at all.
  const again = server.puts;
  await syncA.syncNow();
  assert.equal(server.puts, again);
});

test("a recipe edit writes one bucket and the core copy; a deletion crosses to the other device", async () => {
  const server = fakeServer();
  const a = withRecipes(device(), [precipe("u:ginger-crunch"), precipe("u:pavlova")]);
  const b = device();
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const syncB = mk(b, server);
  await syncB.join(code);
  assert.deepEqual(recipesOf(b), ["u:ginger-crunch", "u:pavlova"]);

  withRecipes(a, [precipe("u:ginger-crunch", "Ginger Crunch, less sugar")]);
  const writes = server.bucketPuts;
  await syncA.syncNow();
  // Two buckets at most: the edited recipe's and the deleted one's.
  assert.ok(server.bucketPuts - writes <= 2 && server.bucketPuts - writes >= 1);
  await syncB.syncNow();
  assert.deepEqual(recipesOf(b), ["u:ginger-crunch"]);
  assert.equal(JSON.parse(b.getItem(RECIPES_KEY_))["u:ginger-crunch"].name, "Ginger Crunch, less sugar");
});

// (a) — the break-probed claim: an OLD device (any build before this one)
// never reads or writes a bucket, and its write of the core copy — even one
// that drops the `recipeBuckets` record, as builds before 510/010 drop every
// field they do not know — must not cost anyone a recipe.
test("an old device's sync leaves every recipe and every bucket intact", async () => {
  const server = fakeServer();
  const a = withRecipes(device(), [precipe("u:ginger-crunch"), precipe("u:pavlova")]);
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const { blobId, key } = await keysFor(code);
  const bucketsBefore = new Map(bucketKeys(server).map((k) => [k, server.blobs.get(k).etag]));

  // The old device: reads the core copy and writes back its own shape — a new
  // heart, and none of the fields it never knew.
  const got = server.blobs.get(blobId);
  const core = await openBlob(key, got.bytes);
  const oldWrite = {
    format: core.format,
    v: core.v,
    profiles: core.profiles.map((p) => ({ ...p, favourites: [...p.favourites, venue("old-phone")] })),
    order: [],
  };
  const put = await server.fetch(`https://example.invalid/v1/blob/${blobId}`, {
    method: "PUT",
    body: await sealBlob(key, oldWrite),
    headers: { "If-Match": got.etag },
  });
  assert.equal(put.status, 204);

  // The new device syncs after it.
  const res = await syncA.syncNow();
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.deepEqual(recipesOf(a), ["u:ginger-crunch", "u:pavlova"], "the new device lost a recipe");
  assert.deepEqual(favsOf(a), ["v:old-phone"], "and took the old device's heart");
  // Every bucket untouched on the server: same versions, nothing rewritten.
  assert.deepEqual(new Map(bucketKeys(server).map((k) => [k, server.blobs.get(k).etag])), bucketsBefore);
  // The core copy records them again.
  const after = await openBlob(key, server.blobs.get(blobId).bytes);
  assert.equal(Object.keys(after.recipeBuckets.v).length, RECIPE_BUCKETS);
  // And a device joining later still gets them.
  const c = device();
  await mk(c, server).join(code);
  assert.deepEqual(recipesOf(c), ["u:ginger-crunch", "u:pavlova"]);
});

// (b) — the break-probed claim: a bucket written WITHOUT its core update (a
// device whose core write then lost a race) is detected, and its contents are
// merged rather than ignored.
test("a bucket written without its core update is detected and merged", async () => {
  const server = fakeServer();
  const a = withRecipes(device(), [precipe("u:ginger-crunch")]);
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const b = device();
  const syncB = mk(b, server);
  await syncB.join(code);
  const { blobId, key } = await keysFor(code);

  // Another device adds a recipe to its bucket, and its core write never lands.
  // Filed by person since 510/120: the bucket is a hash of recipe + person.
  const added = precipe("u:orphan-loaf");
  const flat = cookbookKey("default", added.dishId);
  const k = bucketOf(flat);
  const bkey = `${blobId}:r${k}`;
  const current = readBucket(await openBlob(key, server.blobs.get(bkey).bytes), k);
  const put = await server.fetch(`https://example.invalid/v1/blob/${bkey}`, {
    method: "PUT",
    body: await sealBlob(key, bucketPlaintext(k, { ...current, [flat]: added })),
    headers: { "If-Match": server.blobs.get(bkey).etag },
  });
  assert.equal(put.status, 204);

  const res = await syncB.syncNow();
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.deepEqual(res.bucketMismatch, [`r${k}`], "the orphaned bucket was not detected");
  assert.deepEqual(recipesOf(b), ["u:ginger-crunch", "u:orphan-loaf"], "its recipe was ignored");
  const core = await openBlob(key, server.blobs.get(blobId).bytes);
  assert.equal(core.recipeBuckets.v[`r${k}`], server.blobs.get(bkey).etag, "the core copy records it now");
  await syncA.syncNow();
  assert.deepEqual(recipesOf(a), ["u:ginger-crunch", "u:orphan-loaf"]);
});

test("a Worker that predates buckets: recipes stay on the device, nothing is lost, and they sync once it is updated", async () => {
  const old = fakeServer({ buckets: false });
  const a = withRecipes(device({ favs: [venue("kk")] }), [precipe("u:ginger-crunch")]);
  const syncA = mk(a, old);
  const { code } = await syncA.enable();
  assert.equal(old.bucketPuts, 0);
  assert.deepEqual(recipesOf(a), ["u:ginger-crunch"]);
  const b = device();
  await mk(b, old).join(code);
  assert.deepEqual(favsOf(b), ["v:kk"], "the core copy still syncs");
  assert.deepEqual(recipesOf(b), []);

  // The Worker is updated: same stored copies, now answering for buckets.
  const updated = fakeServer();
  for (const [k, v] of old.blobs) updated.blobs.set(k, v);
  await mk(a, updated).syncNow();
  await mk(b, updated).syncNow();
  assert.deepEqual(recipesOf(b), ["u:ginger-crunch"]);
  assert.deepEqual(recipesOf(a), ["u:ginger-crunch"], "the device that held it did not read the old agreement as a deletion");
});

test("a bucket that expired from the server is no opinion: its recipes stand and it is written again", async () => {
  const server = fakeServer();
  const a = withRecipes(device(), [precipe("u:ginger-crunch")]);
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const { blobId } = await keysFor(code);
  const k = bucketOf(cookbookKey("default", "u:ginger-crunch"));
  server.blobs.delete(`${blobId}:r${k}`);
  const res = await syncA.syncNow();
  assert.equal(res.ok, true);
  assert.deepEqual(recipesOf(a), ["u:ginger-crunch"]);
  assert.ok(server.blobs.has(`${blobId}:r${k}`), "the bucket was written back");
});

test("buckets cut a different way by another build are left alone, never misfiled", async () => {
  const server = fakeServer();
  const code = mintSyncCode();
  const snap = collectPersonalData(device(), { exportedAt: null });
  delete snap.recipes;
  await seedServer(server, code, { ...snap, recipeBuckets: { n: 16, v: { r12: '"x"' } } });
  const a = withRecipes(device(), [precipe("u:ginger-crunch")]);
  const res = await mk(a, server).join(code);
  assert.equal(res.ok, true);
  assert.equal(server.bucketPuts, 0);
  assert.deepEqual(recipesOf(a), ["u:ginger-crunch"]);
  const { key, blobId } = await keysFor(code);
  const core = await openBlob(key, server.blobs.get(blobId).bytes);
  assert.deepEqual(core.recipeBuckets, { n: 16, v: { r12: '"x"' } }, "carried as found");
});

test("a bucket that will not open stops the sync with nothing written", async () => {
  const server = fakeServer();
  const a = withRecipes(device(), [precipe("u:ginger-crunch")]);
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const { blobId } = await keysFor(code);
  const k = bucketOf(cookbookKey("default", "u:ginger-crunch"));
  const b = server.blobs.get(`${blobId}:r${k}`);
  server.blobs.set(`${blobId}:r${k}`, { bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]), etag: '"tampered"' });
  const puts = server.puts;
  const fresh = device();
  const res = await mk(fresh, server).join(code);
  assert.equal(res.ok, false);
  assert.equal(server.puts, puts);
  assert.deepEqual(recipesOf(fresh), []);
  assert.ok(b);
});

// --- one cookbook per person (roadmap 510/120, owner-ruled "Per person") ----

test("two people's cookbooks cross to the other device and stay theirs, and a removed person's go with them", async () => {
  const server = fakeServer();
  const a = withRecipes(device(), [precipe("u:ginger-crunch")]);
  const reg = JSON.parse(a.getItem(PROFILES_KEY));
  reg.profiles.push({ id: "p-sam", name: "Sam" });
  a.setItem(PROFILES_KEY, JSON.stringify(reg));
  a.setItem(scopeKey("p-sam", "faves.recipes.v1"), JSON.stringify({ "u:scones": precipe("u:scones") }));
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const { blobId, key } = await keysFor(code);
  const core = await openBlob(key, server.blobs.get(blobId).bytes);
  assert.ok(core.profiles.every((p) => !("recipes" in p)), "a person's recipes rode in the core copy");

  const b = device();
  const syncB = mk(b, server);
  assert.equal((await syncB.join(code)).ok, true);
  assert.deepEqual(recipesOf(b), ["u:ginger-crunch"], "Me's cookbook on B");
  const sams = Object.keys(JSON.parse(b.getItem(scopeKey("p-sam", "faves.recipes.v1")) || "{}"));
  assert.deepEqual(sams, ["u:scones"], "Sam's recipe did not reach Sam on B, or landed on someone else");

  // Sam is removed on A; B loses Sam and Sam's recipes, and Me keeps theirs.
  const regA = JSON.parse(a.getItem(PROFILES_KEY));
  regA.profiles = regA.profiles.filter((p) => p.id !== "p-sam");
  a.setItem(PROFILES_KEY, JSON.stringify(regA));
  a.removeItem(scopeKey("p-sam", "faves.recipes.v1")); // what profiles.remove() purges
  assert.equal((await syncA.syncNow()).ok, true);
  assert.equal((await syncB.syncNow()).ok, true);
  assert.equal(b.getItem(scopeKey("p-sam", "faves.recipes.v1")), null, "a removed person's recipes stayed behind");
  assert.deepEqual(recipesOf(b), ["u:ginger-crunch"]);
});

// --- a local edit during a pull that brought the other device's change -----
// (roadmap 510/100). Until 2026-10-01 a change made on this device while a
// cycle was in flight left the pull unapplied locally — correctly, so the tap
// survived — but still recorded the merge as the base. The base then held the
// other device's change and this device did not, so the next cycle read the
// difference as a deletion made HERE and pushed it to every device.

/** Run `tap` on device storage the first time the core copy is PUT: the one
 *  moment in a cycle where a tap lands after `mine` was collected and before
 *  the cycle looks again. */
function tapDuringPut(server, tap) {
  let done = false;
  return {
    fetch: (u, i = {}) => {
      const id = String(u).split("?")[0].split("/").pop();
      if (!done && (i.method || "GET") === "PUT" && !id.includes(":")) {
        done = true;
        tap();
      }
      return server.fetch(u, i);
    },
  };
}

/** Pair A and B, let B make `bChange` and push it, then let A sync its own
 *  `aChange` with `aTap` landing mid-flight, then carry A's follow-up out and
 *  let B pull it. Returns both devices and A's first result. */
async function midFlight({ a, b, bChange, aChange, aTap }) {
  const server = fakeServer();
  const syncA0 = mk(a, server);
  const { code } = await syncA0.enable();
  const syncB = mk(b, server);
  await syncB.join(code);
  await syncA0.syncNow();

  bChange(b);
  assert.equal((await syncB.syncNow()).ok, true);

  aChange(a);
  const syncA = mk(a, tapDuringPut(server, () => aTap(a)), { debounceMs: 5000 });
  const first = await syncA.syncNow();
  assert.equal(first.ok, true);
  assert.equal(first.deferredLocal, true, "the tap must have landed mid-flight, or this tests nothing");
  syncA.flush();
  const second = await syncA.syncNow(); // joins the follow-up flush started
  const third = second.needsDecision ? second : await syncB.syncNow();
  return { a, b, syncA, syncB, first, second, third };
}

const setFavs = (st, ids) => st.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify(ids.map(venue)));
const setRatings = (st, r) => st.setItem(scopeKey("default", "faves.ratings.v1"), JSON.stringify(r));
const setAvoid = (st, avoid) =>
  st.setItem(scopeKey("default", "faves.settings.v1"), JSON.stringify({ diet: { dietary: [], avoid } }));
const avoidOf = (st) => JSON.parse(st.getItem(scopeKey("default", "faves.settings.v1")) || "{}").diet?.avoid;

test("a heart added on the other device survives an edit made here mid-sync (roadmap 510/100)", async () => {
  const { a, b, second } = await midFlight({
    a: device({ favs: [venue("kk")] }),
    b: device({ favs: [] }),
    bChange: (b) => setFavs(b, ["kk", "pandan"]),
    aChange: (a) => setFavs(a, ["kk", "new"]),
    aTap: (a) => setRatings(a, { "v:kk": 4 }),
  });
  assert.equal(second.ok, true);
  assert.deepEqual(favsOf(a), ["v:kk", "v:new", "v:pandan"], "B's heart must reach A");
  assert.deepEqual(favsOf(b), ["v:kk", "v:new", "v:pandan"], "…and must not be deleted from B by A's follow-up");
  assert.deepEqual(JSON.parse(b.getItem(scopeKey("default", "faves.ratings.v1"))), { "v:kk": 4 }, "the mid-flight tap still travels");
});

test("an allergen flag set on the other device survives a heart tapped here mid-sync (roadmap 510/100)", async () => {
  const { a, b } = await midFlight({
    a: device({ favs: [venue("kk")], settings: { diet: { dietary: [], avoid: [] } } }),
    b: device({ favs: [] }),
    bChange: (b) => setAvoid(b, ["contains-gluten"]),
    aChange: (a) => setFavs(a, ["kk", "new"]),
    aTap: (a) => setFavs(a, ["kk", "new", "tapped"]),
  });
  assert.deepEqual(avoidOf(a), ["contains-gluten"], "B's allergen flag must reach A");
  assert.deepEqual(avoidOf(b), ["contains-gluten"], "…and must not be switched off on B by A's follow-up");
  assert.deepEqual(favsOf(b), ["v:kk", "v:new", "v:tapped"]);
});

test("an allergen flag set on BOTH devices, one mid-sync, is put to the reader — never silently one side's (roadmap 510/100)", async () => {
  const { a, b, second } = await midFlight({
    a: device({ favs: [venue("kk")], settings: { diet: { dietary: [], avoid: [] } } }),
    b: device({ favs: [] }),
    bChange: (b) => setAvoid(b, ["contains-gluten"]),
    aChange: (a) => setFavs(a, ["kk", "new"]),
    aTap: (a) => setAvoid(a, ["contains-nuts"]),
  });
  assert.equal(second.needsDecision, true, "two-sided diet change: the follow-up must ask");
  assert.deepEqual(avoidOf(a), ["contains-nuts"], "the tap stands until the reader answers");
  assert.deepEqual(avoidOf(b), ["contains-gluten"], "B's flag was not overwritten behind the reader's back");
});

test("a recipe added on the other device survives a heart tapped here mid-sync (roadmap 510/100, bucket path)", async () => {
  const { a, b } = await midFlight({
    a: withRecipes(device({ favs: [venue("kk")] }), [precipe("u:pavlova")]),
    b: device({ favs: [] }),
    bChange: (b) => withRecipes(b, [precipe("u:pavlova"), precipe("u:scones")]),
    aChange: (a) => setFavs(a, ["kk", "new"]),
    aTap: (a) => setFavs(a, ["kk", "new", "tapped"]),
  });
  assert.deepEqual(recipesOf(a), ["u:pavlova", "u:scones"], "B's recipe must reach A");
  assert.deepEqual(recipesOf(b), ["u:pavlova", "u:scones"], "…and must not be deleted from B");
});

test("a heart added on the other device survives a recipe edited here mid-sync (roadmap 510/100)", async () => {
  const { a, b } = await midFlight({
    a: withRecipes(device({ favs: [venue("kk")] }), [precipe("u:pavlova")]),
    b: device({ favs: [] }),
    bChange: (b) => setFavs(b, ["kk", "pandan"]),
    aChange: (a) => setFavs(a, ["kk", "new"]),
    aTap: (a) => withRecipes(a, [precipe("u:pavlova"), precipe("u:scones")]),
  });
  assert.deepEqual(favsOf(a), ["v:kk", "v:new", "v:pandan"]);
  assert.deepEqual(favsOf(b), ["v:kk", "v:new", "v:pandan"]);
  assert.deepEqual(recipesOf(b), ["u:pavlova", "u:scones"]);
});

// --- the one-off move, by backup file (roadmap 510/050, owner-ruled 2026-10-01)
// tools/move_recipes.mjs rewrites an exported backup; the owner imports it on
// ONE device with Replace, and sync must carry the move to the others: the old
// keys removed there, the new ones and the recipe itself added. Replace keeps
// the sync pairing and the base (personal-data.js EXCLUDED `spare`), so the
// next cycle sees the move as this device's own edit against the last
// agreement — which is what lets it propagate as deletions + additions.

const MV = "test-kitchen";
const MOVE_PLAN = { venueId: MV, moves: [{ from: { venueId: MV, dishId: "alpha-bake" }, to: "u:alpha-bake" }] };
const MOVE_SOURCES = {
  venue: { id: MV, menu: [{ section: "Baking", items: [{ name: "Alpha Bake", dishId: "alpha-bake", steps: ["Mix.", "Bake."] }] }] },
  history: null,
};
const kHeart = (dishId, name) => ({ type: "dish", venueId: MV, venueName: "Test Kitchen", name, dishId, isRecipe: true });
const ratingsOf = (st) => JSON.parse(st.getItem(scopeKey("default", "faves.ratings.v1")) || "{}");

/** Two paired, agreed devices holding a heart, a rating and a note on the
 *  recipe that moves, and a heart and rating on one that stays. */
async function pairedBeforeTheMove(serverOpts) {
  const server = fakeServer(serverOpts);
  const seed = () =>
    device({
      favs: [kHeart("alpha-bake", "Alpha Bake"), kHeart("delta-salad", "Delta Salad")],
      ratings: { [`d:${MV} alpha-bake`]: 5, [`d:${MV} delta-salad`]: 3 },
      notes: { [`${MV} alpha-bake`]: "less sugar" },
    });
  const a = seed();
  const b = seed();
  const syncA = mk(a, server);
  const { code } = await syncA.enable();
  const syncB = mk(b, server);
  await syncB.join(code);
  await syncA.syncNow();
  return { server, a, b, syncA, syncB };
}

/** Steps 3–5 of the runbook on device A: export, run the tool, Replace. */
function moveOnA(a) {
  const res = moveBackup(collectPersonalData(a, { exportedAt: "2026-10-01T00:00:00.000Z" }), MOVE_PLAN, MOVE_SOURCES);
  assert.equal(res.ok, true, res.error);
  const report = applyPersonalData(a, JSON.stringify(res.data), { mode: "replace" });
  assert.equal(report.ok, true, report.error);
}

test("a moved backup Replace-imported on A crosses to B: old keys gone, new keys and the recipe arrive, and it settles", async () => {
  const { server, a, b, syncA, syncB } = await pairedBeforeTheMove();
  moveOnA(a);
  assert.equal((await syncA.syncNow()).ok, true);
  assert.equal((await syncB.syncNow()).ok, true);

  for (const [name, st] of [["A", a], ["B", b]]) {
    assert.deepEqual(favsOf(st), [`d:${MV} delta-salad`, "d:u:mine u:alpha-bake"], `${name}'s hearts`);
    assert.deepEqual(ratingsOf(st), { [`d:${MV} delta-salad`]: 3, "d:u:mine u:alpha-bake": 5 }, `${name}'s ratings`);
    assert.deepEqual(notesOf(st), { "u:mine u:alpha-bake": "less sugar" }, `${name}'s notes`);
    assert.deepEqual(recipesOf(st), ["u:alpha-bake"], `${name}'s cookbook`);
  }
  // Settled: another round each way writes nothing and brings nothing back.
  const puts = server.puts;
  await syncA.syncNow();
  await syncB.syncNow();
  await syncA.syncNow();
  assert.equal(server.puts, puts, "the pair kept writing after the move");
  assert.deepEqual(favsOf(a), favsOf(b));
  assert.equal(`d:${MV} alpha-bake` in ratingsOf(a), false, "the old rating came back");
});
