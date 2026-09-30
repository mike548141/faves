// Unit tests for asking the browser to keep the data (site/js/storage-persist.js,
// roadmap 510/010 step 4). A fake storage manager, a fake window and fake
// stores: no browser. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPersistence,
  storageSentences,
  GRANTED,
  NOT_GRANTED,
  UNKNOWN,
  PERSIST_ASKED_KEY,
} from "../site/js/storage-persist.js";

function fakeManager({ persisted = false, grant = true, throws = false } = {}) {
  const m = {
    calls: 0,
    async persisted() {
      if (throws) throw new Error("no");
      return persisted;
    },
    async persist() {
      m.calls += 1;
      if (throws) throw new Error("no");
      if (grant) persisted = true;
      return grant;
    },
  };
  return m;
}

function fakeStore() {
  const subs = new Set();
  return {
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    fire() {
      for (const fn of subs) fn();
    },
    get listeners() {
      return subs.size;
    },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test("nothing is asked until the first personal write, then exactly once", async () => {
  const manager = fakeManager();
  const p = createPersistence({ manager, win: {} });
  const a = fakeStore();
  const b = fakeStore();
  p.watch([a, b]);
  await tick();
  assert.equal(manager.calls, 0, "asked before anything was written");
  a.fire();
  await tick();
  assert.equal(manager.calls, 1);
  b.fire();
  a.fire();
  await tick();
  assert.equal(manager.calls, 1, "asked more than once");
  assert.equal(a.listeners + b.listeners, 0, "kept listening after asking");
});

test("a browser that already keeps the data is not asked again", async () => {
  const manager = fakeManager({ persisted: true });
  const p = createPersistence({ manager, win: {} });
  await p.requestOnce();
  assert.equal(manager.calls, 0);
});

test("a browser without the API, or one that throws, costs nothing and never throws", async () => {
  await createPersistence({ manager: undefined, win: {} }).requestOnce();
  await createPersistence({ manager: fakeManager({ throws: true }), win: {} }).requestOnce();
  assert.equal(await createPersistence({ manager: undefined, win: {} }).state(), UNKNOWN);
  assert.equal(await createPersistence({ manager: fakeManager({ throws: true }), win: {} }).state(), UNKNOWN);
});

test("state reports what the browser says, before and after asking", async () => {
  const manager = fakeManager({ grant: true });
  const p = createPersistence({ manager, win: {} });
  assert.equal(await p.state(), NOT_GRANTED);
  await p.requestOnce();
  assert.equal(await p.state(), GRANTED);
  const refused = createPersistence({ manager: fakeManager({ grant: false }), win: {} });
  await refused.requestOnce();
  assert.equal(await refused.state(), NOT_GRANTED);
});

test("the Home Screen is detected both ways a browser reports it", () => {
  assert.equal(createPersistence({ win: { navigator: { standalone: true } } }).onHomeScreen(), true);
  assert.equal(createPersistence({ win: { matchMedia: () => ({ matches: true }) } }).onHomeScreen(), true);
  assert.equal(createPersistence({ win: { matchMedia: () => ({ matches: false }) } }).onHomeScreen(), false);
  assert.equal(createPersistence({ win: {} }).onHomeScreen(), false);
});

test("About says whether it was granted, and gives the Safari caveat only off the Home Screen", () => {
  assert.match(storageSentences(GRANTED, true)[0], /agreed to keep/);
  assert.match(storageSentences(NOT_GRANTED, true)[0], /hasn’t agreed/);
  assert.match(storageSentences(UNKNOWN, true)[0], /doesn’t say/);
  assert.equal(storageSentences(GRANTED, true).length, 1, "the caveat does not apply on the Home Screen");
  const tab = storageSentences(GRANTED, false);
  assert.equal(tab.length, 2);
  assert.match(tab[1], /Safari/);
  assert.match(tab[1], /Home Screen/);
});

// --- asked once per browser, not once per page load (roadmap 510/090) -------

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test("a browser that said no is not asked again on the next visit", async () => {
  const storage = memStorage();
  const manager = fakeManager({ grant: false });
  await createPersistence({ manager, win: {}, storage, now: () => "T1" }).requestOnce();
  assert.equal(manager.calls, 1);
  assert.deepEqual(JSON.parse(storage.getItem(PERSIST_ASKED_KEY)), { at: "T1", homeScreen: false });
  // A new page load: a new persistence object over the same storage.
  await createPersistence({ manager, win: {}, storage }).requestOnce();
  assert.equal(manager.calls, 1, "asked again after a no");
});

test("the ask is recorded BEFORE the browser is asked, so a dismissed prompt counts", async () => {
  const storage = memStorage();
  let recordedFirst = null;
  const manager = {
    async persisted() { return false; },
    async persist() { recordedFirst = storage.getItem(PERSIST_ASKED_KEY) !== null; return false; },
  };
  await createPersistence({ manager, win: {}, storage }).requestOnce();
  assert.equal(recordedFirst, true);
});

test("asked from a tab, then opened from the Home Screen: asked once more, then never", async () => {
  const storage = memStorage();
  const manager = fakeManager({ grant: false });
  const home = { navigator: { standalone: true } };
  await createPersistence({ manager, win: {}, storage }).requestOnce();
  await createPersistence({ manager, win: home, storage }).requestOnce();
  assert.equal(manager.calls, 2, "installing is the one change that can turn a no into a yes");
  await createPersistence({ manager, win: home, storage }).requestOnce();
  await createPersistence({ manager, win: {}, storage }).requestOnce();
  assert.equal(manager.calls, 2, "asked a third time");
});

test("with no storage to remember in, it behaves as before: once per page load", async () => {
  const manager = fakeManager({ grant: false });
  await createPersistence({ manager, win: {} }).requestOnce();
  await createPersistence({ manager, win: {} }).requestOnce();
  assert.equal(manager.calls, 2);
});
