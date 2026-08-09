// Unit tests for site/js/versions.js — the About screen's "which version is
// this device actually on?" answer. The value is read from the service worker's
// cache names rather than duplicated as a constant, so this covers the parsing
// and, in particular, the mid-update case where two shell caches coexist and
// the newer one has to win. Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCacheVersions,
  installedVersions,
  askController,
  currentVersions,
} from "../site/js/versions.js";

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

// --- askController (ROADMAP 16f, ADR 0032) --------------------------------
// A fake ServiceWorker-shaped object with a real `postMessage(msg, transfer)`
// that echoes a reply down the transferred MessagePort — Node's global
// MessageChannel makes this an honest round-trip, not a mock of one.

test("askController gets the worker's own version over a MessageChannel", async () => {
  const worker = {
    postMessage(msg, transfer) {
      assert.deepEqual(msg, { type: "GET_VERSIONS" });
      transfer[0].postMessage({ type: "VERSIONS", shell: "2026-08-09.10", data: "2026-08-09.5" });
    },
  };
  assert.deepEqual(await askController(worker), { shell: "2026-08-09.10", data: "2026-08-09.5" });
});

test("askController with no worker (or no postMessage) resolves null, never throws", async () => {
  assert.equal(await askController(null), null);
  assert.equal(await askController(undefined), null);
  assert.equal(await askController({}), null);
});

test("askController with no MessageChannel support resolves null", async () => {
  // `undefined` would fall through to the destructured default (the real
  // globalThis.MessageChannel) and this would accidentally pass via the
  // timeout path instead — null is the only value that actually models "this
  // browser has no MessageChannel".
  const worker = { postMessage() {} };
  assert.equal(await askController(worker, { MessageChannelImpl: null }), null);
});

test("askController times out to null when the worker never replies", async () => {
  // Models a controller that predates the GET_VERSIONS protocol (deployed
  // before ROADMAP 16f): it has no handler for the message, so the port never
  // hears back. currentVersions() falls back to installedVersions() for this.
  const worker = { postMessage() {} };
  assert.equal(await askController(worker, { timeoutMs: 20 }), null);
});

test("askController degrades to null when postMessage throws", async () => {
  const worker = {
    postMessage() {
      throw new Error("nope");
    },
  };
  assert.equal(await askController(worker, { timeoutMs: 20 }), null);
});

test("askController ignores a reply that isn't a VERSIONS message", async () => {
  const worker = {
    postMessage(msg, transfer) {
      transfer[0].postMessage({ type: "SOMETHING_ELSE" });
    },
  };
  assert.equal(await askController(worker, { timeoutMs: 20 }), null);
});

// --- currentVersions (ROADMAP 16f, ADR 0032) ------------------------------
// The About stamp's actual read: the controlling worker's own version, a
// waiting worker's version reported separately, and every unreachable state
// degrading to an honest null rather than a throw or a guess.

function replyingWorker(shell, data) {
  return {
    postMessage(msg, transfer) {
      transfer[0].postMessage({ type: "VERSIONS", shell, data });
    },
  };
}

const silentWorker = { postMessage() {} };

test("no serviceWorker support ⇒ not controlling, not waiting, cache fallback", async () => {
  assert.deepEqual(await currentVersions({}), {
    shell: null,
    data: null,
    controlling: false,
    waiting: null,
  });
});

test("a controlling worker, no waiting worker: reports the controller's own version", async () => {
  const nav = {
    serviceWorker: {
      controller: replyingWorker("2026-08-09.10", "2026-08-09.5"),
      getRegistration: async () => ({ waiting: null }),
    },
  };
  assert.deepEqual(await currentVersions(nav), {
    shell: "2026-08-09.10",
    data: "2026-08-09.5",
    controlling: true,
    waiting: null,
  });
});

test("a controlling worker AND a waiting worker: both versions, reported separately", () =>
  currentVersions({
    serviceWorker: {
      controller: replyingWorker("2026-08-09.9", "2026-08-09.5"),
      getRegistration: async () => ({ waiting: replyingWorker("2026-08-09.10", "2026-08-09.5") }),
    },
  }).then((result) => {
    assert.deepEqual(result, {
      shell: "2026-08-09.9",
      data: "2026-08-09.5",
      controlling: true,
      waiting: { shell: "2026-08-09.10", data: "2026-08-09.5" },
    });
  }));

test("a waiting worker that exists but doesn't answer is still reported as ready", async () => {
  const nav = {
    serviceWorker: {
      controller: replyingWorker("2026-08-09.9", "2026-08-09.5"),
      getRegistration: async () => ({ waiting: silentWorker }),
    },
  };
  assert.deepEqual(await currentVersions(nav, { timeoutMs: 20 }), {
    shell: "2026-08-09.9",
    data: "2026-08-09.5",
    controlling: true,
    // Known: an update is ready. Unknown: which version — still a fact, not a
    // guess dressed up as one.
    waiting: { shell: null, data: null },
  });
});

test("no controlling worker yet (first load, still installing): honest, not a lie", async () => {
  const nav = {
    serviceWorker: {
      controller: null,
      getRegistration: async () => ({ waiting: null }),
    },
  };
  assert.deepEqual(await currentVersions(nav), {
    shell: null,
    data: null,
    controlling: false,
    waiting: null,
  });
});

test("a controller that predates GET_VERSIONS (never replies) falls back, still controlling", async () => {
  const nav = {
    serviceWorker: {
      controller: silentWorker,
      getRegistration: async () => ({ waiting: null }),
    },
  };
  assert.deepEqual(await currentVersions(nav, { timeoutMs: 20 }), {
    shell: null,
    data: null,
    controlling: true,
    waiting: null,
  });
});

test("getRegistration throwing degrades waiting to null, not a throw", async () => {
  const nav = {
    serviceWorker: {
      controller: null,
      getRegistration: () => {
        throw new Error("denied");
      },
    },
  };
  assert.deepEqual(await currentVersions(nav), {
    shell: null,
    data: null,
    controlling: false,
    waiting: null,
  });
});
