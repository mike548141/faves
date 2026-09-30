// Unit tests for asking the browser to keep the data (site/js/storage-persist.js,
// roadmap 510/010 step 4). A fake storage manager, a fake window and fake
// stores: no browser. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createPersistence, storageSentences, GRANTED, NOT_GRANTED, UNKNOWN } from "../site/js/storage-persist.js";

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
