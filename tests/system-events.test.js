// The activity log's system events (Theme 32c, roadmap 390/030): app.updated,
// data.updated and cache.refreshed, wired to the stamps versions.js already
// reads and the refresh cache-refresh.js already performs.
// Run: `node --test`.
//
// What these prove, in the order a regression would hurt: ONCE PER TRANSITION
// (not per page load, not per tab); NOTHING on a first run, a wiped device or a
// stamp the worker could not give; the baseline never reaches a backup or sync;
// and a refresh logs even though cache-refresh.js still touches no storage.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createActivity } from "../site/js/activity.js";
import {
  SEEN_VERSIONS_KEY,
  diffVersions,
  noteRefreshed,
  noteVersions,
  observeVersions,
  readSeen,
} from "../site/js/system-events.js";
import { forceRefresh } from "../site/js/cache-refresh.js";
import { collectPersonalData, applyPersonalData, parsePersonalData } from "../site/js/personal-data.js";
import { createProfiles } from "../site/js/profiles.js";

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
};

/** A device: where the stamps live, and a person's log with a stepping clock. */
function rig() {
  const storage = fakeStorage();
  let t = Date.parse("2026-11-23T00:00:00Z");
  const logStore = fakeStorage();
  const log = createActivity(logStore, { now: () => new Date((t += 1000)) });
  return { storage, log, opts: { storage, log } };
}
const kinds = (log) => log.entries().map((e) => [e.kind, e.from, e.to]);

test("diffVersions: a changed shell and a changed data stamp are two transitions", () => {
  const { events, next } = diffVersions(
    { shell: "2026-11-18.1", data: "aaaaaaaaaaaa" },
    { shell: "2026-11-23.2", data: "bbbbbbbbbbbb" }
  );
  assert.deepEqual(events, [
    { kind: "app.updated", from: "2026-11-18.1", to: "2026-11-23.2" },
    { kind: "data.updated", from: "aaaaaaaaaaaa", to: "bbbbbbbbbbbb" },
  ]);
  assert.deepEqual(next, { shell: "2026-11-23.2", data: "bbbbbbbbbbbb" });
});

test("diffVersions: nothing moved, nothing said", () => {
  const same = { shell: "2026-11-18.1", data: "aaaaaaaaaaaa" };
  assert.deepEqual(diffVersions(same, same), { events: [], next: same });
});

test("diffVersions: no baseline seeds and says nothing (a first run is not an update)", () => {
  const r = diffVersions(null, { shell: "2026-11-18.1", data: "aaaaaaaaaaaa" });
  assert.deepEqual(r.events, []);
  assert.deepEqual(r.next, { shell: "2026-11-18.1", data: "aaaaaaaaaaaa" });
});

test("diffVersions: a stamp the worker could not give is kept, never cleared and never a change", () => {
  const seen = { shell: "2026-11-18.1", data: "aaaaaaaaaaaa" };
  for (const current of [{ shell: "2026-11-18.1", data: null }, { shell: null, data: null }, {}, null, { shell: "", data: "  " }]) {
    const r = diffVersions(seen, current);
    assert.deepEqual(r.events, [], JSON.stringify(current));
    assert.deepEqual(r.next, seen, JSON.stringify(current));
  }
});

test("diffVersions: the first menus arriving after the first install are not an update", () => {
  const r = diffVersions({ shell: "2026-11-18.1", data: null }, { shell: "2026-11-18.1", data: "aaaaaaaaaaaa" });
  assert.deepEqual(r.events, []);
  assert.equal(r.next.data, "aaaaaaaaaaaa");
});

test("noteVersions: first load seeds the baseline and logs nothing", () => {
  const { opts, log, storage } = rig();
  assert.deepEqual(noteVersions({ shell: "2026-11-18.1", data: "aaaaaaaaaaaa" }, opts), []);
  assert.equal(log.count(), 0);
  assert.deepEqual(readSeen(storage), { shell: "2026-11-18.1", data: "aaaaaaaaaaaa" });
});

test("noteVersions: ONCE per transition — a reload, or ten, does not repeat it", () => {
  const { opts, log } = rig();
  noteVersions({ shell: "2026-11-18.1", data: "aaaaaaaaaaaa" }, opts);
  noteVersions({ shell: "2026-11-23.1", data: "aaaaaaaaaaaa" }, opts);
  for (let i = 0; i < 10; i++) noteVersions({ shell: "2026-11-23.1", data: "aaaaaaaaaaaa" }, opts);
  assert.deepEqual(kinds(log), [["app.updated", "2026-11-18.1", "2026-11-23.1"]]);
});

test("noteVersions: a failed baseline write repeats the attempt, and the log's own check stops a duplicate", () => {
  const { opts, log, storage } = rig();
  noteVersions({ shell: "2026-11-18.1", data: null }, opts);
  const set = storage.setItem;
  storage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  noteVersions({ shell: "2026-11-23.1", data: null }, opts); // logs, cannot remember
  noteVersions({ shell: "2026-11-23.1", data: null }, opts); // same transition again
  storage.setItem = set;
  assert.equal(log.count(), 1, "the event was lost or doubled");
  noteVersions({ shell: "2026-11-23.1", data: null }, opts);
  assert.equal(log.count(), 1);
  assert.equal(readSeen(storage).shell, "2026-11-23.1", "the baseline never caught up");
});

test("noteVersions: two tabs noticing the same update log it once", () => {
  const { opts, log, storage } = rig();
  noteVersions({ shell: "2026-11-18.1", data: null }, opts);
  // Both tabs read the old baseline before either writes the new one.
  const stale = storage.getItem(SEEN_VERSIONS_KEY);
  noteVersions({ shell: "2026-11-23.1", data: null }, opts);
  storage.setItem(SEEN_VERSIONS_KEY, stale);
  noteVersions({ shell: "2026-11-23.1", data: null }, opts);
  assert.equal(log.count(), 1);
});

test("noteVersions: A to B, back to A, to B again are three events, not one", () => {
  const { opts, log } = rig();
  noteVersions({ shell: "A.1", data: null }, opts);
  noteVersions({ shell: "B.1", data: null }, opts);
  noteVersions({ shell: "A.1", data: null }, opts);
  noteVersions({ shell: "B.1", data: null }, opts);
  assert.equal(log.count(), 3);
});

test("noteVersions: data.updated is its own event and names the generation", () => {
  const { opts, log } = rig();
  noteVersions({ shell: "S.1", data: "aaaaaaaaaaaa" }, opts);
  noteVersions({ shell: "S.1", data: "bbbbbbbbbbbb" }, opts);
  assert.deepEqual(kinds(log), [["data.updated", "aaaaaaaaaaaa", "bbbbbbbbbbbb"]]);
});

test("noteVersions: never throws on unusable storage or a missing answer", () => {
  const { log } = rig();
  const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
  assert.deepEqual(noteVersions({ shell: "S.1", data: null }, { storage: broken, log }), []);
  assert.deepEqual(noteVersions(null, { storage: fakeStorage(), log }), []);
  assert.deepEqual(noteVersions(undefined, { storage: fakeStorage(), log }), []);
});

test("an entry written by this is a valid one: values survive the recorder's own gate", () => {
  const { opts, log } = rig();
  noteVersions({ shell: "2026-11-18.1", data: "aaaaaaaaaaaa" }, opts);
  noteVersions({ shell: "2026-11-23.1", data: "bbbbbbbbbbbb" }, opts);
  const [app, data] = log.entries();
  assert.deepEqual({ k: app.kind, f: app.from, t: app.to, s: app.subject }, { k: "app.updated", f: "2026-11-18.1", t: "2026-11-23.1", s: {} });
  assert.equal(data.to, "bbbbbbbbbbbb");
  assert.ok(Object.isFrozen(app));
});

test("observeVersions asks the controller, and only the controller", async () => {
  const { opts, log } = rig();
  const answers = [{ shell: "S.1", data: null }, { shell: "S.2", data: null }];
  const asked = [];
  const ask = async (c) => (asked.push(c), answers.shift());
  const container = { controller: { id: "ctl" } };
  await observeVersions(container, { ...opts, ask });
  await observeVersions(container, { ...opts, ask });
  assert.deepEqual(asked, [{ id: "ctl" }, { id: "ctl" }]);
  assert.deepEqual(kinds(log), [["app.updated", "S.1", "S.2"]]);
});

test("observeVersions: no controller, no answer, or a throwing ask all log nothing", async () => {
  const { opts, log, storage } = rig();
  noteVersions({ shell: "S.1", data: null }, opts);
  assert.deepEqual(await observeVersions({ controller: null }, opts), []);
  assert.deepEqual(await observeVersions(undefined, opts), []);
  assert.deepEqual(await observeVersions({ controller: {} }, { ...opts, ask: async () => null }), []);
  assert.deepEqual(await observeVersions({ controller: {} }, { ...opts, ask: async () => { throw new Error("x"); } }), []);
  assert.equal(log.count(), 0);
  assert.equal(readSeen(storage).shell, "S.1");
});

test("cache.refreshed carries no value and no subject", () => {
  const { log } = rig();
  assert.equal(noteRefreshed({ log }), true);
  const [e] = log.entries();
  assert.deepEqual({ k: e.kind, f: e.from, t: e.to, s: e.subject }, { k: "cache.refreshed", f: null, t: null, s: {} });
});

test("forceRefresh calls its hook after the caches are cleared and before the reload", async () => {
  const order = [];
  const res = await forceRefresh({
    cacheStorage: { keys: async () => ["faves-shell-x", "faves-img-v1"], delete: async (n) => void order.push(`delete ${n}`) },
    serviceWorker: { getRegistrations: async () => [] },
    isOnline: () => true,
    reload: () => order.push("reload"),
    onRefreshed: ({ cleared }) => order.push(`hook ${cleared}`),
  });
  assert.equal(res.ok, true);
  assert.deepEqual(order, ["delete faves-shell-x", "hook 1", "reload"]);
});

test("forceRefresh: a throwing hook neither stops the reload nor reports a failed refresh", async () => {
  let reloaded = 0;
  const res = await forceRefresh({
    cacheStorage: { keys: async () => ["faves-shell-x"], delete: async () => true },
    isOnline: () => true,
    reload: () => void reloaded++,
    onRefreshed: () => {
      throw new Error("log full");
    },
  });
  assert.deepEqual(res, { ok: true, cleared: 1 });
  assert.equal(reloaded, 1);
});

test("forceRefresh: a refused refresh (offline, unsupported) logs nothing", async () => {
  let hooked = 0;
  const onRefreshed = () => void hooked++;
  await forceRefresh({ cacheStorage: { keys: async () => [] }, isOnline: () => false, onRefreshed });
  await forceRefresh({ cacheStorage: null, isOnline: () => true, onRefreshed });
  assert.equal(hooked, 0);
});

// --- The whitelist walk: the baseline is a device fact, not a person's ---------

const AT = "2026-11-23T00:00:00Z";

test("the baseline is in the excluded table, not the backup's `other` bag, and not in sync's snapshot", () => {
  const s = fakeStorage();
  createProfiles(s);
  s.setItem(SEEN_VERSIONS_KEY, JSON.stringify({ shell: "2026-11-23.1", data: "aaaaaaaaaaaa" }));
  s.setItem("faves.pantry.v1", "[]"); // proves the catch-all sweep ran
  for (const opts of [{ exportedAt: AT }, { exportedAt: AT, localOnly: true }]) {
    const data = collectPersonalData(s, opts);
    assert.ok(SEEN_VERSIONS_KEY in data.excluded, "not named in the excluded table");
    assert.deepEqual(Object.keys(data.other), ["faves.pantry.v1"]);
  }
});

test("an import neither restores another device's baseline nor loses this one", () => {
  const file = {
    format: "faves.personal-data",
    v: 1,
    exportedAt: AT,
    profiles: [{ id: "default", name: "Me" }],
    other: { [SEEN_VERSIONS_KEY]: JSON.stringify({ shell: "9999-01-01.1", data: "ffffffffffff" }) },
  };
  const r = parsePersonalData(file);
  assert.equal(r.ok, true);
  assert.equal(SEEN_VERSIONS_KEY in r.data.other, false, "the file's baseline got through parsing");
  for (const mode of ["merge", "replace"]) {
    const s = fakeStorage();
    createProfiles(s);
    s.setItem(SEEN_VERSIONS_KEY, JSON.stringify({ shell: "2026-11-23.1", data: null }));
    const report = applyPersonalData(s, r.data, { mode, decisions: {} });
    assert.equal(report.ok, true, report.error);
    assert.equal(readSeen(s).shell, "2026-11-23.1", `${mode} touched this device's baseline`);
  }
});

test("cache-refresh.js still reaches no storage (its hook is injected, not imported)", () => {
  const src = readFileSync(new URL("../site/js/cache-refresh.js", import.meta.url), "utf8");
  assert.equal(/system-events|activity/.test(src.replace(/\/\/.*$/gm, "")), false);
});
