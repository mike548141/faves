// The stale-tab guard's two moments of detection (roadmap 510/110, owner-ruled
// "Old tab stops writing"): another tab's `storage` event, and the write
// itself. Its own file because store.js's "this tab is stale" flag is
// page-wide, and each test file runs in a process of its own.
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { guardStorage, isTabStale, onTabStale, storageAhead, watchStaleTab, StaleTabError } from "../site/js/store.js";
import { USER_SCHEMA, SCHEMA_KEY, stampAhead } from "../site/js/schema-stamp.js";

function mem(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

test("only a well-formed newer stamp counts as ahead", () => {
  assert.equal(stampAhead(String(USER_SCHEMA + 1)), true);
  for (const raw of [null, undefined, "", String(USER_SCHEMA), "0", "banana", "1.5", String(USER_SCHEMA - 1)]) {
    assert.equal(stampAhead(raw), false, `stamp ${JSON.stringify(raw)}`);
  }
  // An absent stamp is a fresh device (or data from before the number): never
  // a reason to stop a tab saving.
  assert.equal(storageAhead(mem()), false);
});

test("a storage event from the tab that upgraded marks this one stale, and only that event", () => {
  const listeners = [];
  const win = { addEventListener: (type, fn) => listeners.push([type, fn]), removeEventListener() {} };
  const storage = mem({ [SCHEMA_KEY]: String(USER_SCHEMA) });
  watchStaleTab({ storage, win });
  assert.equal(isTabStale(), false, "a current tab was marked stale at load");
  const heard = [];
  onTabStale(() => heard.push("stale"));
  const fire = (e) => listeners.filter(([t]) => t === "storage").forEach(([, fn]) => fn(e));
  // Neighbours that must not trip it: another key, the same number, a clear().
  fire({ key: "faves.favourites.v1", newValue: String(USER_SCHEMA + 1) });
  fire({ key: SCHEMA_KEY, newValue: String(USER_SCHEMA) });
  fire({ key: null, newValue: null });
  assert.equal(isTabStale(), false);
  fire({ key: SCHEMA_KEY, oldValue: String(USER_SCHEMA), newValue: String(USER_SCHEMA + 1) });
  assert.equal(isTabStale(), true);
  assert.deepEqual(heard, ["stale"], "the page was told once");
  // A listener that arrives late still hears it, at once.
  let late = false;
  onTabStale(() => (late = true));
  assert.equal(late, true);
});

test("the write-time check refuses a write that lands after the upgrade, and lets reads through", () => {
  const raw = mem({ [SCHEMA_KEY]: String(USER_SCHEMA), "faves.notes.v1": "{}" });
  const s = guardStorage(raw);
  s.setItem("faves.notes.v1", '{"a":"b"}'); // current: lands
  assert.equal(raw.getItem("faves.notes.v1"), '{"a":"b"}');
  raw.setItem(SCHEMA_KEY, String(USER_SCHEMA + 1)); // another tab, no event heard
  assert.throws(() => s.setItem("faves.notes.v1", "{}"), StaleTabError);
  assert.throws(() => s.removeItem("faves.notes.v1"), StaleTabError);
  assert.equal(raw.getItem("faves.notes.v1"), '{"a":"b"}', "the refused write landed");
  assert.equal(s.getItem("faves.notes.v1"), '{"a":"b"}', "reads must still work");
  assert.equal(s.length, 2);
  assert.equal(s.key(0), SCHEMA_KEY);
});
