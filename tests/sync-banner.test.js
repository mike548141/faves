// When the "sync is waiting for you" banner shows (roadmap 510/430). Only the
// no-base question qualifies: it is the one that stops sync until answered.
// Run: `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { BANNER_MESSAGE, shouldShowSyncBanner } from "../site/js/sync-banner.js";
import { CONFLICT_NO_BASE } from "../site/js/sync-merge.js";
import { createSync } from "../site/js/sync.js";

const noBase = { kind: CONFLICT_NO_BASE, people: [], at: null };

test("shows for an open no-base question, and for nothing else", () => {
  assert.equal(shouldShowSyncBanner({ state: "needs-decision", conflicts: [noBase] }), true);
  // while a cycle runs the state is "syncing" but the question is still open
  assert.equal(shouldShowSyncBanner({ state: "syncing", conflicts: [noBase] }), true);
  for (const st of [
    null,
    undefined,
    {},
    { state: "off", conflicts: null },
    { state: "idle", conflicts: null },
    { state: "idle", conflicts: [] },
    { state: "error", conflicts: null },
    // the allergen question has its own flow and is not this banner's job
    { state: "needs-decision", conflicts: [{ kind: "diet" }] },
    { state: "off", conflicts: [noBase] },
  ]) {
    assert.equal(shouldShowSyncBanner(st), false, JSON.stringify(st));
  }
});

test("the banner follows the stored question: shown while unanswered, gone once answered or cleared", () => {
  const m = new Map();
  const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
  const s = createSync({ storage, fetchImpl: async () => ({ ok: false, status: 500 }) });
  const put = (cfg) => storage.setItem("faves.sync.v1", JSON.stringify(cfg));
  put({ code: "ABCD-EFGH" });
  assert.equal(shouldShowSyncBanner(s.status()), false);
  put({ code: "ABCD-EFGH", ask: { at: "2026-10-02T00:00:00Z", people: [] } });
  assert.equal(shouldShowSyncBanner(s.status()), true, "an open question");
  put({ code: "ABCD-EFGH", ask: { at: "2026-10-02T00:00:00Z", people: [], answer: "keep" } });
  assert.equal(shouldShowSyncBanner(s.status()), false, "answered in another tab");
  put({ code: "ABCD-EFGH", ask: null });
  assert.equal(shouldShowSyncBanner(s.status()), false, "cleared once a sync landed");
  put({ ask: { at: "x", people: [] } });
  assert.equal(shouldShowSyncBanner(s.status()), false, "sync turned off");
});

test("the message is plain words", () => {
  assert.ok(BANNER_MESSAGE.length < 80);
  assert.doesNotMatch(BANNER_MESSAGE, /merge|base|conflict/i);
});

test("every page of the app loads the banner, through sw-register.js", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const pages = readdirSync(new URL("../site/", import.meta.url)).filter((f) => f.endsWith(".html"));
  assert.ok(pages.length >= 3, `expected the three shells, found ${pages}`);
  for (const f of pages) {
    assert.match(readFileSync(new URL(`../site/${f}`, import.meta.url), "utf8"), /js\/sw-register\.js/, `${f} must load sw-register.js`);
  }
  assert.match(readFileSync(new URL("../site/js/sw-register.js", import.meta.url), "utf8"), /import "\.\/sync-banner-ui\.js"/);
});
