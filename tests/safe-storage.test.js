// safeStorage() probes localStorage by writing a key, and a write fires a
// `storage` event in every other open tab. It is called by six modules as they
// load, so it must probe once per page, not once per call (roadmap 510/200).
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { safeStorage } from "../site/js/store.js";

function fakeLocalStorage({ throws = false } = {}) {
  const data = new Map();
  const calls = { set: 0, remove: 0 };
  return {
    calls,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      if (throws) throw new Error("QuotaExceededError");
      calls.set += 1;
      data.set(k, String(v));
    },
    removeItem: (k) => {
      calls.remove += 1;
      data.delete(k);
    },
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

function withLocalStorage(ls, fn) {
  const had = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true, writable: true });
  try {
    return fn();
  } finally {
    if (had) Object.defineProperty(globalThis, "localStorage", had);
    else delete globalThis.localStorage;
  }
}

test("510/200: six callers cost one probe write, not six", () => {
  const ls = fakeLocalStorage();
  withLocalStorage(ls, () => {
    for (let i = 0; i < 6; i += 1) safeStorage();
  });
  assert.deepEqual(ls.calls, { set: 1, remove: 1 });
});

test("510/200: the memo is per localStorage object, so a swapped global is probed afresh", () => {
  const a = fakeLocalStorage();
  const b = fakeLocalStorage();
  withLocalStorage(a, () => safeStorage());
  withLocalStorage(b, () => safeStorage());
  assert.deepEqual([a.calls.set, b.calls.set], [1, 1]);
});

test("510/200: a storage that refuses writes still gets its own in-memory shim each call", () => {
  const ls = fakeLocalStorage({ throws: true });
  withLocalStorage(ls, () => {
    const one = safeStorage();
    const two = safeStorage();
    one.setItem("k", "v");
    assert.equal(one.getItem("k"), "v");
    assert.equal(two.getItem("k"), null, "shims are not shared, as before");
  });
});

test("510/200: the storage handed out still reads and writes through to localStorage", () => {
  const ls = fakeLocalStorage();
  withLocalStorage(ls, () => {
    const s = safeStorage();
    s.setItem("faves.p.default.favourites.v1", "[]");
    assert.equal(ls.getItem("faves.p.default.favourites.v1"), "[]");
  });
});
