// Unit tests for site/js/cache-refresh.js — Settings → Your data → "Refresh
// menus and app" (ROADMAP Theme 16c). Two of these guard rules the roadmap
// states as non-negotiable: it must refuse when offline (clearing the caches
// with no network strands the app), and it must never touch the personal layer.
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { refreshableCaches, forceRefresh } from "../site/js/cache-refresh.js";

const NAMES = [
  "faves-shell-2026-08-09.5",
  "faves-data-2026-08-09.3",
  "faves-img-v1",
  "something-else",
];

function fakes({ names = NAMES, online = true, registrations = [] } = {}) {
  const deleted = [];
  const unregistered = [];
  let reloaded = 0;
  return {
    deleted,
    unregistered,
    reloads: () => reloaded,
    opts: {
      cacheStorage: {
        keys: async () => names.slice(),
        delete: async (n) => {
          deleted.push(n);
          return true;
        },
      },
      serviceWorker: {
        getRegistrations: async () =>
          registrations.map((id) => ({
            unregister: async () => {
              unregistered.push(id);
              return true;
            },
          })),
      },
      isOnline: () => online,
      reload: () => {
        reloaded++;
      },
    },
  };
}

test("only the shell and data caches are refreshable — photos survive", () => {
  assert.deepEqual(refreshableCaches(NAMES), [
    "faves-shell-2026-08-09.5",
    "faves-data-2026-08-09.3",
  ]);
  assert.deepEqual(refreshableCaches([]), []);
  assert.deepEqual(refreshableCaches(null), []);
});

test("offline is a refusal: nothing cleared, nothing unregistered, no reload", async () => {
  const f = fakes({ online: false, registrations: ["sw"] });
  const res = await forceRefresh(f.opts);
  assert.deepEqual(res, { ok: false, reason: "offline" });
  assert.deepEqual(f.deleted, []);
  assert.deepEqual(f.unregistered, []);
  assert.equal(f.reloads(), 0);
});

test("online: unregisters the worker, clears shell + data, reloads", async () => {
  const f = fakes({ registrations: ["sw"] });
  const res = await forceRefresh(f.opts);
  assert.deepEqual(res, { ok: true, cleared: 2 });
  assert.deepEqual(f.unregistered, ["sw"]);
  assert.deepEqual(f.deleted.sort(), [
    "faves-data-2026-08-09.3",
    "faves-shell-2026-08-09.5",
  ]);
  assert.equal(f.reloads(), 1);
});

test("the photo cache and foreign caches are left alone", async () => {
  const f = fakes();
  await forceRefresh(f.opts);
  assert.ok(!f.deleted.includes("faves-img-v1"));
  assert.ok(!f.deleted.includes("something-else"));
});

test("no CacheStorage ⇒ says so, rather than reloading into the same stale copy", async () => {
  const f = fakes();
  const res = await forceRefresh({ ...f.opts, cacheStorage: {} });
  assert.deepEqual(res, { ok: false, reason: "unsupported" });
  assert.equal(f.reloads(), 0);
});

test("a browser that refuses to delete reports failure and does not reload", async () => {
  const f = fakes();
  const res = await forceRefresh({
    ...f.opts,
    cacheStorage: {
      keys: async () => NAMES.slice(),
      delete: async () => {
        throw new Error("denied");
      },
    },
  });
  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.equal(f.reloads(), 0);
});

test("a browser with no service worker still refreshes the caches", async () => {
  const f = fakes();
  const res = await forceRefresh({ ...f.opts, serviceWorker: undefined });
  assert.equal(res.ok, true);
  assert.equal(f.reloads(), 1);
});

// The roadmap's second hard rule, asserted over the source rather than by
// behaviour: hearts, ratings, settings, profiles and the order tally are the
// user's, not cache. A refresh that reached for storage would be a data-loss
// bug nobody would notice until it had happened.
test("the module never reaches for the personal layer", () => {
  const src = readFileSync(
    fileURLToPath(new URL("../site/js/cache-refresh.js", import.meta.url)),
    "utf8"
  );
  const code = src.replace(/^\s*\/\/.*$/gm, ""); // comments may name it; code may not
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB"]) {
    assert.ok(!code.includes(forbidden), `cache-refresh.js must not touch ${forbidden}`);
  }
});
