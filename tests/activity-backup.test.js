// The activity log's export and wipe (Theme 32d): the tables a NEW STORE has to
// be walked through — backup, sync, reset-class wipes, profile removal.
//
// Asserted, not reasoned, because this repo has twice been wrong that "the
// existing machinery already does the right thing" for a store added after a
// whitelist (saved-orders.test.js says how). The recorder is activity.test.js.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ACTIVITY_CAP, ACTIVITY_KEY, mergeActivity, sanitiseActivity } from "../site/js/activity.js";
import { collectPersonalData, applyPersonalData, parsePersonalData, STORE_SCHEMA } from "../site/js/personal-data.js";
import { PURGED_BASE_KEYS, SCOPED_BASE_KEYS, createProfiles, scopeKey } from "../site/js/profiles.js";
import { mergePersonal } from "../site/js/sync-merge.js";
import { writeSnapshot } from "../site/js/sync.js";

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    _map: m,
  };
};

function device() {
  const s = fakeStorage();
  createProfiles(s); // a registry with "default"
  return s;
}
const some = (n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    at: `2026-10-18T08:00:${String(10 + i).padStart(2, "0")}Z`,
    kind: i % 2 ? "favourite.remove" : "favourite.add",
    subject: { venue: "kk", dish: `d${i}`, label: `Dish ${i}` },
    from: null,
    to: null,
  }));
const withLog = (s, list = some()) => {
  s.setItem(scopeKey("default", ACTIVITY_KEY), JSON.stringify(list));
  return s;
};
const logOf = (s, id = "default") => JSON.parse(s.getItem(scopeKey(id, ACTIVITY_KEY)) || "null");

test("SCHEMA: the log has its own store number, so an older build pauses on a newer shape", () => {
  assert.equal(STORE_SCHEMA.activity, 1);
  const r = parsePersonalData({ format: "faves.personal-data", v: 1, stores: { activity: 2 }, profiles: [{ id: "p", name: "Me" }] });
  assert.equal(r.ok, false);
});

test("BACKUP: the file the person asks for carries the log by person, not in the catch-all bag", () => {
  const s = withLog(device());
  const data = collectPersonalData(s, { exportedAt: "2026-10-18T00:00:00Z", localOnly: true });
  assert.equal(data.profiles[0].activity.length, 3);
  assert.equal(data.other, undefined, "not swept into the unnamed-store bag");
  assert.equal(data.stores.activity, 1);
});

test("SYNC: the default collect — the one sync makes — carries no log, and sync.js never names it", () => {
  const s = withLog(device());
  const data = collectPersonalData(s, { exportedAt: "x" });
  assert.equal("activity" in data.profiles[0], false);
  assert.equal(data.other, undefined, "and the sweep does not hand the key to sync's `other` either");
  // mergePersonal carries an unknown PROFILE field through (ADR 0146 §3): a
  // snapshot that held the log would be pushed. The default is what stops it.
  const merged = mergePersonal(data, data, data).merged;
  assert.equal("activity" in merged.profiles[0], false);
  const sync = readFileSync(new URL("../site/js/sync.js", import.meta.url), "utf8");
  assert.equal(/localOnly/.test(sync), false, "sync.js must never ask for the on-device-only stores");
  assert.equal(
    /activity/i.test(sync),
    false,
    "sync.js must not name the activity log: it is device-local, and what sync does not name it cannot send or erase"
  );
  const buckets = readFileSync(new URL("../site/js/sync-buckets.js", import.meta.url), "utf8");
  assert.equal(/activity/i.test(buckets), false);
});

test("SYNC: the log is not in SCOPED_BASE_KEYS (what migrates, exports as a base field and syncs), but is in PURGED_BASE_KEYS", () => {
  assert.equal(SCOPED_BASE_KEYS.includes(ACTIVITY_KEY), false);
  assert.equal(PURGED_BASE_KEYS.includes(ACTIVITY_KEY), true);
});

test("SYNC: a pull leaves the log exactly as it is", () => {
  const s = withLog(device());
  const before = s.getItem(scopeKey("default", ACTIVITY_KEY));
  writeSnapshot(s, { profiles: [{ id: "default", name: "Me", favourites: [], ratings: {}, notes: {}, settings: {} }] });
  assert.equal(s.getItem(scopeKey("default", ACTIVITY_KEY)), before);
});

test("SYNC: a pull that removes a person takes their log with them", () => {
  const s = withLog(device());
  s.setItem("faves.profiles.v1", JSON.stringify({ v: 1, activeId: "default", profiles: [{ id: "default", name: "Me" }, { id: "gone", name: "Gone" }] }));
  s.setItem(scopeKey("gone", ACTIVITY_KEY), JSON.stringify(some(2)));
  writeSnapshot(s, { profiles: [{ id: "default", name: "Me", favourites: [], ratings: {}, notes: {}, settings: {} }] });
  assert.equal(s.getItem(scopeKey("gone", ACTIVITY_KEY)), null);
  assert.notEqual(s.getItem(scopeKey("default", ACTIVITY_KEY)), null);
});

test("PROFILES: deleting a person purges their log, and only theirs", () => {
  const s = withLog(device());
  const p = createProfiles(s);
  const id = p.create("Sam");
  s.setItem(scopeKey(id, ACTIVITY_KEY), JSON.stringify(some(2)));
  assert.equal(p.remove(id), true);
  assert.equal(s.getItem(scopeKey(id, ACTIVITY_KEY)), null);
  assert.equal(logOf(s).length, 3);
});

test("REPLACE wipes every person's log, with or without enumerable storage", () => {
  const empty = collectPersonalData(device(), { exportedAt: "x", localOnly: true });
  const s = withLog(device());
  applyPersonalData(s, empty, { mode: "replace" });
  assert.equal(logOf(s), null);

  const t = withLog(device());
  const noEnum = { getItem: (k) => t.getItem(k), setItem: (k, v) => t.setItem(k, v), removeItem: (k) => t.removeItem(k) };
  applyPersonalData(noEnum, empty, { mode: "replace" });
  assert.equal(t.getItem(scopeKey("default", ACTIVITY_KEY)), null);
});

test("RESTORE: replace puts the log back for the right person, in order", () => {
  const data = collectPersonalData(withLog(device()), { exportedAt: "x", localOnly: true });
  const fresh = device();
  const out = applyPersonalData(fresh, data, { mode: "replace" });
  assert.equal(out.ok, true, out.error);
  assert.equal(out.activityAdded, 3);
  const id = JSON.parse(fresh.getItem("faves.profiles.v1")).activeId;
  assert.deepEqual(logOf(fresh, id), some());
});

test("MERGE: the union in time order, nothing duplicated, a re-import adds nothing", () => {
  const data = collectPersonalData(withLog(device(), some(3)), { exportedAt: "x", localOnly: true });
  const mine = device();
  const own = [
    { at: "2026-10-18T07:00:00Z", kind: "order.clear", subject: {}, from: 2, to: 0 },
    { ...some(3)[1] }, // one entry both devices already hold
    { at: "2026-10-18T09:00:00Z", kind: "rating.set", subject: { venue: "kk", dish: "x", label: "X" }, from: null, to: 5 },
  ];
  withLog(mine, own);
  const m = applyPersonalData(mine, data, { mode: "merge" });
  assert.equal(m.activityAdded, 2, "the two it lacked");
  const got = logOf(mine);
  assert.equal(got.length, 5);
  assert.deepEqual(got.map((e) => e.at), [...got.map((e) => e.at)].sort());
  assert.equal(applyPersonalData(mine, data, { mode: "merge" }).activityAdded, 0, "idempotent");

  const empty = device();
  assert.equal(applyPersonalData(empty, data, { mode: "merge" }).activityAdded, 3);
  assert.equal(applyPersonalData(empty, data, { mode: "merge" }).activityAdded, 0);
});

test("MERGE keeps only the newest ACTIVITY_CAP when the union is longer", () => {
  const big = (from, n) =>
    Array.from({ length: n }, (_, i) => ({
      at: new Date(Date.UTC(2026, 0, 1) + (from + i) * 60_000).toISOString().slice(0, 19) + "Z",
      kind: "order.clear",
      subject: {},
      from: 1,
      to: 0,
    }));
  const { merged, added } = mergeActivity(big(0, 400), big(300, 400));
  assert.equal(merged.length, ACTIVITY_CAP);
  assert.equal(merged.at(-1).at, big(699, 1)[0].at, "the newest survived");
  // 0..399 mine, 300..699 incoming: the union is 0..699, the newest 500 are
  // 200..699, and the incoming-only 400..699 (300 of them) all survive.
  assert.equal(added, 300);
});

test("IMPORT cleans a hostile file: junk dropped, a settings entry stripped to its dial, strings clipped", () => {
  const file = {
    format: "faves.personal-data",
    v: 1,
    profiles: [
      {
        id: "p",
        name: "Me",
        activity: [
          { at: "2026-10-18T08:00:00Z", kind: "settings.change", subject: { label: "diet" }, from: "contains-peanuts", to: ["contains-fish"] },
          { at: "2026-10-18T08:00:01Z", kind: "settings.change", subject: { label: "contains-peanuts" } },
          { at: "2026-10-18T08:00:02Z", kind: "favourite.add", subject: { venue: "v", label: "L".repeat(900) } },
          { at: "not a time", kind: "favourite.add" },
          { kind: "who.knows" },
          "junk",
        ],
      },
    ],
  };
  const r = parsePersonalData(file);
  assert.equal(r.ok, true);
  const got = r.data.profiles[0].activity;
  assert.equal(got.length, 2);
  assert.equal(JSON.stringify(got).includes("contains"), false);
  assert.equal(got[1].subject.label.length, 200);
});

test("IMPORT keeps, cleaned, a raw log key an older build's catch-all put in the `other` bag", () => {
  const key = scopeKey("p", ACTIVITY_KEY);
  const file = {
    format: "faves.personal-data",
    v: 1,
    profiles: [{ id: "p", name: "Me" }],
    other: { [key]: JSON.stringify([{ at: "2026-10-18T08:00:00Z", kind: "settings.change", subject: { label: "diet" }, to: "contains-egg" }, { junk: 1 }]) },
  };
  const r = parsePersonalData(file);
  const kept = JSON.parse(r.data.other[key]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].to, null);
});

test("an import never RECORDS: it writes the log it was given and adds nothing of its own", () => {
  const data = collectPersonalData(withLog(device(), some(2)), { exportedAt: "x", localOnly: true });
  const fresh = device();
  applyPersonalData(fresh, data, { mode: "replace" });
  const id = JSON.parse(fresh.getItem("faves.profiles.v1")).activeId;
  assert.equal(logOf(fresh, id).length, 2, "no settings.change for the dials the import set");
});
