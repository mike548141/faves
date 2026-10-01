// The sync log on the device (roadmap 510/380, guard C of 510/320, owner-ruled
// 2026-10-02): the last 20 syncs that did something, each with the page and
// the build that ran it, whether it had a base, and the hearts it added and
// removed — kept on this device, never synced, never in a backup. Real client,
// real Worker (tests/stale-sync-harness.js). Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { EdgeKV, CACHE_TTL_MS, ORIGIN, device, venue, favsOf, heart, unheart, fakeStorage, storeFor } from "./stale-sync-harness.js";
import worker from "../worker/sync-worker.js";
import { createSync, SYNC_BASE_KEY, SYNC_KEY } from "../site/js/sync.js";
import {
  SYNC_LOG_KEY,
  MAX_ENTRIES,
  MAX_IDS,
  readSyncLog,
  appendSyncLog,
  heartChange,
  describeEntry,
  syncLogText,
  pageName,
} from "../site/js/sync-log.js";
import { collectPersonalData, applyPersonalData, personalDataJson } from "../site/js/personal-data.js";
import { scopeKey } from "../site/js/profiles.js";

const gap = (kv) => {
  kv.clock += 3 * CACHE_TTL_MS;
};

/** A device whose engine says which page and build it is, as a browser's does. */
function logged(storage, kv, { page = "/restaurant.html", build = "2026-10-02.2" } = {}) {
  const d = { storage, requests: [], worker };
  const fetchImpl = async (u, i = {}) => {
    d.requests.push({ method: i.method || "GET", at: kv.clock });
    const res = await d.worker.fetch(
      new Request(String(u).replace("https://example.invalid", "https://w.test"), {
        method: i.method || "GET",
        headers: { Origin: ORIGIN, ...(i.headers || {}) },
        body: i.body,
      }),
      { SYNC_BLOBS: kv.at("L1"), SYNC_STORE: storeFor(kv), ALLOWED_ORIGINS: ORIGIN }
    );
    return { status: res.status, headers: res.headers, arrayBuffer: () => res.arrayBuffer() };
  };
  d.sync = createSync({
    storage,
    endpoint: "https://example.invalid",
    fetchImpl,
    now: () => new Date(Date.parse("2026-10-01T08:00:00.000Z") + kv.clock).toISOString(),
    setTimer: () => 0,
    clearTimer: () => {},
    page: () => page,
    build: async () => build,
  });
  return d;
}

// --- the pure half -------------------------------------------------------------

test("the log keeps the last 20, folds a repeated failure into one entry, and never throws", () => {
  const s = fakeStorage();
  for (let i = 0; i < MAX_ENTRIES + 5; i += 1) appendSyncLog(s, { at: `t${i}`, outcome: "synced", sent: { nAdded: 1, nRemoved: 0, added: [`v:${i}`], removed: [] } });
  const log = readSyncLog(s);
  assert.equal(log.length, MAX_ENTRIES);
  assert.equal(log[0].at, "t5", "the oldest were not the ones dropped");
  const fail = { outcome: "error", error: "Couldn’t reach sync just now.", page: "/", build: "b", base: "yes" };
  appendSyncLog(s, { ...fail, at: "f1" });
  appendSyncLog(s, { ...fail, at: "f2" });
  appendSyncLog(s, { ...fail, at: "f3" });
  const last = readSyncLog(s).at(-1);
  assert.equal(last.times, 3);
  assert.equal(last.at, "f3");
  assert.equal(readSyncLog(s).length, MAX_ENTRIES);
  // A storage that throws, or holds garbage: no throw, an empty log.
  const bad = { getItem: () => "{nope", setItem: () => { throw new Error("full"); } };
  assert.deepEqual(readSyncLog(bad), []);
  assert.equal(appendSyncLog(bad, { outcome: "synced" }), false);
});

test("heartChange is bounded, exact in its counts, and names the person only when there are several", () => {
  const many = Array.from({ length: MAX_IDS + 3 }, (_, i) => venue(`v${String(i).padStart(2, "0")}`));
  const c = heartChange({ profiles: [{ id: "a", favourites: [venue("gone")] }] }, { profiles: [{ id: "a", favourites: many }] });
  assert.equal(c.nAdded, MAX_IDS + 3);
  assert.equal(c.added.length, MAX_IDS);
  assert.deepEqual(c.removed, ["v:gone"]);
  const two = heartChange(
    { profiles: [{ id: "a", name: "Me", favourites: [] }, { id: "b", name: "Kid", favourites: [] }] },
    { profiles: [{ id: "a", name: "Me", favourites: [venue("kk")] }, { id: "b", name: "Kid", favourites: [venue("kk")] }] }
  );
  assert.deepEqual(two.added, ["Kid: v:kk", "Me: v:kk"]);
});

test("an entry reads in plain words: when, which screen, which build, what started it, the base, the hearts, the end", () => {
  const d = describeEntry({
    at: "2026-10-01T08:50:00.000Z",
    page: "/restaurant.html",
    build: "2026-10-02.2",
    why: "open",
    base: "none",
    outcome: "synced",
    here: { nAdded: 0, nRemoved: 0, added: [], removed: [] },
    sent: { nAdded: 2, nRemoved: 0, added: ["d:cook-at-home x", "v:kk"], removed: [] },
  });
  assert.match(d.head, /A place’s menu, build 2026-10-02\.2$/);
  assert.ok(d.lines.includes("Started by opening Faves or coming back to it."));
  assert.ok(d.lines.some((l) => /NO last agreement/.test(l)));
  assert.ok(d.lines.includes("Hearts sent to sync: 2 added, 0 removed."));
  assert.ok(d.lines.includes("Done."));
  assert.deepEqual(d.ids, ["Added to sync: d:cook-at-home x, v:kk"]);
  assert.equal(pageName("/faves/index.html"), "Home");
  assert.match(syncLogText([{ at: "x", outcome: "error", error: "Offline." }]), /Didn’t finish\. Offline\./);
});

// --- the engine ----------------------------------------------------------------

test("a sync that changed hearts is logged with its page, build, trigger, base and the hearts both ways", async () => {
  const kv = new EdgeKV();
  const a = logged(device([venue("kk")]), kv);
  const { code } = await a.sync.enable();
  let log = readSyncLog(a.storage);
  assert.equal(log.length, 1, "turning sync on was not logged");
  assert.equal(log[0].why, "turned on");
  assert.equal(log[0].page, "/restaurant.html");
  assert.equal(log[0].build, "2026-10-02.2");
  assert.equal(log[0].base, "none");
  assert.deepEqual(log[0].sent.added, ["v:kk"]);

  const b = logged(device([]), kv, { page: "/", build: "2026-10-01.9" });
  gap(kv);
  await b.sync.join(code);
  const bl = readSyncLog(b.storage).at(-1);
  assert.equal(bl.why, "joined");
  assert.equal(bl.build, "2026-10-01.9");
  assert.deepEqual(bl.here.added, ["v:kk"], "the hearts a pull brought here were not logged");

  gap(kv);
  heart(a.storage, venue("pho"));
  unheart(a.storage, "v:kk");
  await a.sync.syncNow({ why: "change" });
  log = readSyncLog(a.storage);
  const e = log.at(-1);
  assert.equal(e.why, "change");
  assert.equal(e.base, "yes");
  assert.equal(e.outcome, "synced");
  assert.deepEqual(e.sent.added, ["v:pho"]);
  assert.deepEqual(e.sent.removed, ["v:kk"]);
});

test("a sync that found nothing to do is NOT logged — and still writes only its timestamp", async () => {
  const kv = new EdgeKV();
  const a = logged(device([venue("kk")]), kv);
  await a.sync.enable();
  gap(kv);
  await a.sync.syncNow();
  const before = a.storage.getItem(SYNC_LOG_KEY);
  const writes = [];
  const set = a.storage.setItem;
  a.storage.setItem = (k, v) => (writes.push(k), set(k, v));
  gap(kv);
  assert.equal((await a.sync.syncNow({ why: "open" })).ok, true);
  a.storage.setItem = set;
  assert.deepEqual(writes, [SYNC_KEY]);
  assert.equal(a.storage.getItem(SYNC_LOG_KEY), before);
});

test("a merge with no base, the question it asks, and a failure are each logged", async () => {
  const kv = new EdgeKV();
  const a = logged(device([venue("kk")]), kv);
  const { code } = await a.sync.enable();
  gap(kv);
  a.storage.removeItem(SYNC_BASE_KEY);
  heart(a.storage, venue("x1"));
  await a.sync.syncNow({ why: "open" });
  const asked = readSyncLog(a.storage).at(-1);
  assert.equal(asked.outcome, "asked");
  assert.equal(asked.base, "none");
  // The repeated short-circuit while the question is open is not logged again.
  const n = readSyncLog(a.storage).length;
  await a.sync.syncNow({ why: "open" });
  assert.equal(readSyncLog(a.storage).length, n);
  // A failure.
  const offline = logged(device([]), kv);
  offline.worker = { fetch: async () => { throw new TypeError("offline"); } };
  await offline.sync.join(code);
  const f = readSyncLog(offline.storage).at(-1);
  assert.equal(f.outcome, "error");
  assert.match(f.error, /Couldn’t reach sync/);
});

test("the log never leaves the device: not in a backup, not in what sync sends, and a Replace keeps it", async () => {
  const kv = new EdgeKV();
  const a = logged(device([venue("kk")]), kv);
  await a.sync.enable();
  assert.ok(a.storage.getItem(SYNC_LOG_KEY), "nothing was logged, so this proves nothing");
  const backup = collectPersonalData(a.storage, { exportedAt: "x" });
  assert.equal(SYNC_LOG_KEY in (backup.other || {}), false, "the log rode along in the backup's catch-all");
  assert.equal(personalDataJson(backup).includes("turned on"), false, "an entry's words are in the backup");
  assert.ok(SYNC_LOG_KEY in backup.excluded, "the backup does not say why the log is left out");
  assert.equal(JSON.stringify(backup.other || {}).includes("turned on"), false);
  // A file that carries one anyway (hand-edited, or from a build before this)
  // does not write it here.
  const file = { ...backup, other: { [SYNC_LOG_KEY]: JSON.stringify([{ at: "forged", outcome: "synced" }]) } };
  const log = a.storage.getItem(SYNC_LOG_KEY);
  assert.equal(applyPersonalData(a.storage, JSON.stringify(file), { mode: "replace" }).ok, true);
  assert.equal(a.storage.getItem(SYNC_LOG_KEY), log, "a Replace wiped the log, or the file's log was written");
  // What sync carries is a collect, so the same exclusion holds for it.
  assert.equal(JSON.stringify(collectPersonalData(a.storage, { exportedAt: "y" }).other || {}).includes("turned on"), false);
});

test("the log's EXCLUDED literal is the module's own key", async () => {
  const st = fakeStorage();
  st.setItem(SYNC_LOG_KEY, "[]");
  st.setItem(scopeKey("default", "faves.favourites.v1"), "[]");
  assert.equal(SYNC_LOG_KEY in (collectPersonalData(st).other || {}), false);
});

test("a sync is logged against the page whose engine ran it, not the page that made the change", async () => {
  const kv = new EdgeKV();
  const home = logged(device([]), kv, { page: "/index.html" });
  await home.sync.enable();
  const recipe = logged(home.storage, kv, { page: "/recipe.html" });
  gap(kv);
  heart(home.storage, venue("ramen"));
  await recipe.sync.syncNow({ why: "open" });
  const e = readSyncLog(home.storage).at(-1);
  assert.equal(e.page, "/recipe.html");
  assert.deepEqual(e.sent.added, ["v:ramen"]);
  assert.deepEqual(favsOf(home.storage), ["v:ramen"]);
});
