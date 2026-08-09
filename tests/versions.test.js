// Unit tests for site/js/versions.js — the About screen's "which version is
// this device actually on?" answer. The value is read from the service worker's
// cache names rather than duplicated as a constant, so this covers the parsing
// and, in particular, the mid-update case where two shell caches coexist and
// the newer one has to win. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCacheVersions, installedVersions } from "../site/js/versions.js";

test("picks the shell and data stamps out of the cache names", () => {
  assert.deepEqual(
    parseCacheVersions([
      "faves-shell-2026-08-09.2",
      "faves-data-2026-08-09.1",
      "faves-img-v1",
    ]),
    { shell: "2026-08-09.2", data: "2026-08-09.1" }
  );
});

test("the unversioned image cache is ignored", () => {
  assert.deepEqual(parseCacheVersions(["faves-img-v1"]), {
    shell: null,
    data: null,
  });
});

test("a missing cache is null, never a guess", () => {
  assert.deepEqual(parseCacheVersions(["faves-shell-2026-08-09.2"]), {
    shell: "2026-08-09.2",
    data: null,
  });
  assert.deepEqual(parseCacheVersions([]), { shell: null, data: null });
  assert.deepEqual(parseCacheVersions(null), { shell: null, data: null });
});

// The counter is a number, not a string: ".83" is newer than ".9", which a
// lexicographic compare gets backwards. Reachable during an update, when the
// old cache hasn't been swept — exactly when someone checks this screen.
test("same date: the higher counter wins, compared numerically", () => {
  assert.equal(
    parseCacheVersions(["faves-data-2026-07-23.9", "faves-data-2026-07-23.83"])
      .data,
    "2026-07-23.83"
  );
  assert.equal(
    parseCacheVersions(["faves-data-2026-07-23.83", "faves-data-2026-07-23.9"])
      .data,
    "2026-07-23.83"
  );
});

test("different dates: the later date wins whatever the counter", () => {
  assert.equal(
    parseCacheVersions([
      "faves-shell-2026-08-09.1",
      "faves-shell-2026-07-23.99",
    ]).shell,
    "2026-08-09.1"
  );
});

test("a stamp with no counter is handled, not dropped", () => {
  assert.equal(parseCacheVersions(["faves-shell-2026-08-09"]).shell, "2026-08-09");
});

test("no CacheStorage ⇒ 'not stored', not a throw", async () => {
  assert.deepEqual(await installedVersions(undefined), { shell: null, data: null });
  assert.deepEqual(await installedVersions({}), { shell: null, data: null });
});

test("a CacheStorage that rejects degrades to nulls", async () => {
  const hostile = { keys: () => Promise.reject(new Error("denied")) };
  assert.deepEqual(await installedVersions(hostile), { shell: null, data: null });
});

test("reads the live cache names when CacheStorage answers", async () => {
  const fake = { keys: async () => ["faves-shell-2026-08-09.2", "faves-data-2026-08-09.1"] };
  assert.deepEqual(await installedVersions(fake), {
    shell: "2026-08-09.2",
    data: "2026-08-09.1",
  });
});
