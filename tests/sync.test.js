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
import { createSync, writeSnapshot, applyDietDecision, SYNC_KEY, SYNC_BASE_KEY } from "../site/js/sync.js";
import { PROFILES_KEY, scopeKey } from "../site/js/profiles.js";
import { favKey } from "../site/js/favourites.js";

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

/** A device: a storage seeded with one profile holding `favs` and `ratings`. */
function device({ favs = [], ratings = {}, settings = null, id = "default", name = "Me" } = {}) {
  const st = fakeStorage({
    [PROFILES_KEY]: JSON.stringify({ v: 1, activeId: id, profiles: [{ id, name }] }),
    [scopeKey(id, "faves.favourites.v1")]: JSON.stringify(favs),
    [scopeKey(id, "faves.ratings.v1")]: JSON.stringify(ratings),
  });
  if (settings) st.setItem(scopeKey(id, "faves.settings.v1"), JSON.stringify(settings));
  return st;
}

/** An in-memory stand-in for the Worker, with real If-Match semantics. */
function fakeServer() {
  const blobs = new Map(); // blobId -> { bytes, etag }
  let version = 0;
  const server = {
    blobs,
    puts: 0,
    gets: 0,
    async fetch(url, init = {}) {
      const id = String(url).split("/").pop();
      const method = init.method || "GET";
      if (method === "GET") {
        server.gets += 1;
        const rec = blobs.get(id);
        if (!rec) return { status: 404, headers: { get: () => null } };
        return {
          status: 200,
          headers: { get: (h) => (h.toLowerCase() === "etag" ? rec.etag : null) },
          arrayBuffer: async () => rec.bytes.buffer.slice(rec.bytes.byteOffset, rec.bytes.byteOffset + rec.bytes.byteLength),
        };
      }
      if (method === "PUT") {
        const rec = blobs.get(id);
        const ifMatch = init.headers?.["If-Match"] ?? null;
        if (rec && ifMatch !== rec.etag) return { status: 412, headers: { get: () => null } };
        version += 1;
        blobs.set(id, { bytes: new Uint8Array(init.body), etag: `"v${version}"` });
        server.puts += 1;
        return { status: 204, headers: { get: () => null } };
      }
      return { status: 405, headers: { get: () => null } };
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
  const refusing = { fetch: async (u, i) => ((i?.method || "GET") === "PUT" ? { status: 500, headers: { get: () => null } } : server.fetch(u, i)) };
  const s = mk(a, refusing);
  a.setItem(SYNC_KEY, JSON.stringify({ code: "K7F29DMX4QRA" }));

  const res = await s.syncNow();
  assert.equal(res.ok, false);
  assert.equal(a.getItem(SYNC_BASE_KEY), null, "a base here would claim an agreement that never happened");
});

test("a failed sync leaves this device's own data untouched", async () => {
  const a = device({ favs: [venue("kk")] });
  const dead = { fetch: async () => { throw new Error("offline"); } };
  const s = mk(a, dead);
  a.setItem(SYNC_KEY, JSON.stringify({ code: "K7F29DMX4QRA" }));

  const res = await s.syncNow();
  assert.equal(res.ok, false);
  assert.deepEqual(favsOf(a), ["v:kk"]);
  assert.match(s.status().error, /safe on this device/);
});

test("a lost race is reported as retryable, not as an error", async () => {
  const server = fakeServer();
  const a = device({ favs: [venue("kk")] });
  await mk(a, server).enable();

  // The race is BETWEEN our read and our write, which is the only place it can
  // happen — mutating the blob beforehand just means we read the newer etag and
  // succeed, which is what an earlier version of this test actually asserted.
  let raced = false;
  const racing = {
    fetch: async (u, i) => {
      const res = await server.fetch(u, i);
      if ((i?.method || "GET") === "GET" && !raced) {
        raced = true;
        const [id, rec] = [...server.blobs.entries()][0];
        server.blobs.set(id, { ...rec, etag: '"someone-else-wrote"' });
      }
      return res;
    },
  };
  const s = mk(a, racing);

  a.setItem(scopeKey("default", "faves.favourites.v1"), JSON.stringify([venue("kk"), venue("new")]));
  const res = await s.syncNow();
  assert.equal(res.retry, true, "a 412 must come back as retryable");
  assert.equal(s.status().state, "idle", "a race is normal, not a failure state");
  // A base legitimately exists from the successful first sync. What must NOT
  // have happened is the lost race advancing it: recording an agreement that
  // includes the heart we failed to push would make the next merge read that
  // heart as something the pair had agreed on and then deleted.
  assert.ok(!a.getItem(SYNC_BASE_KEY).includes("new"), "a lost race must not advance the base");
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

  writeSnapshot(st, { profiles: [{ id: "default", name: "Me", favourites: [venue("kk")], ratings: {}, settings: null }] });

  assert.equal(st.getItem(scopeKey("p2", "faves.favourites.v1")), null, "orphaned hearts must not survive the profile");
  assert.deepEqual(JSON.parse(st.getItem(PROFILES_KEY)).profiles.map((p) => p.id), ["default"]);
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

  s.schedule();
  s.schedule();
  s.schedule();
  assert.equal(server.puts, after, "nothing should have been written yet");
  assert.equal(s._pendingWrite(), true);

  s.flush();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(server.puts, after + 1, "three changes must cost exactly one write");
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
  let repointed = 0;
  const s = mk(a, server, { onApplied: () => { repointed += 1; } });
  await s.enable();
  assert.equal(repointed, 1, "a successful sync must re-point the live stores");
});

test("a failed sync does not claim to have re-pointed anything", async () => {
  const a = device({ favs: [venue("kk")] });
  let repointed = 0;
  const dead = { fetch: async () => { throw new Error("offline"); } };
  const s = mk(a, dead, { onApplied: () => { repointed += 1; } });
  a.setItem(SYNC_KEY, JSON.stringify({ code: "K7F29DMX4QRA" }));
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
