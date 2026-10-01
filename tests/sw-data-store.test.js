// The service worker's permanent data store (roadmap 510/030; ADR 0145 as
// revised by ADR 0146): fetch only what changed, switch over in one step,
// sweep what no pointer names, never let a recheck in.
//
// 🔑 THE SHIPPED FILE RUNS HERE, NOT A COPY. site/sw.js is a classic worker
// (tests/sw-precache-guard.test.js says why it cannot be imported), so it is
// evaluated whole inside a Function whose `self`, `caches` and `fetch` are
// in-memory fakes. Node supplies the rest for real — `Response`, `URL`,
// `TextDecoder`, `crypto.subtle` — so the SHA-256 that decides "is this the
// file I asked for" is the same algorithm a phone runs. What this cannot show:
// that a real browser's Cache API, Web Locks and fetch behave like the fakes.
// tools/fetch_check.mjs drives a real install for that.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { DATA_SCHEMA, FINGERPRINT_LENGTH, fingerprint } from "../tools/gen_summaries.mjs";

const SITE = fileURLToPath(new URL("../site/", import.meta.url));
const src = readFileSync(`${SITE}sw.js`, "utf8");
const BASE = "http://faves.test/";

// --- A worker built from the shipped source, over fakes ----------------------

/** An in-memory CacheStorage: name → Map(absolute url → {bytes, type}). */
function fakeCaches() {
  const stores = new Map();
  const abs = (key) => new URL(typeof key === "string" ? key : key.url, BASE).href;
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return {
      match: async (key) => {
        const hit = m.get(abs(key));
        return hit ? new Response(hit.bytes.slice(0), { headers: { "content-type": hit.type } }) : undefined;
      },
      put: async (key, res) => {
        m.set(abs(key), { bytes: await res.arrayBuffer(), type: res.headers.get("content-type") });
      },
      delete: async (key) => m.delete(abs(key)),
      keys: async () => [...m.keys()].map((url) => ({ url })),
    };
  };
  return {
    stores,
    api: {
      open,
      has: async (name) => stores.has(name),
      delete: async (name) => stores.delete(name),
      keys: async () => [...stores.keys()],
    },
  };
}

/** A fake origin: path → {body, type}. Records every URL it is asked for. */
function fakeOrigin(files) {
  const log = [];
  const fetchImpl = async (url) => {
    const u = new URL(typeof url === "string" ? url : url.url, BASE);
    log.push(u.pathname.slice(1) + u.search);
    const f = files.get(u.pathname.slice(1));
    if (!f) return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
    return new Response(f.body, { status: 200, headers: { "content-type": f.type || "application/json" } });
  };
  return { log, fetchImpl };
}

function loadWorker({ caches, fetchImpl }) {
  const self = {
    addEventListener() {},
    location: new URL("sw.js", BASE),
    navigator: {}, // no Web Locks: the per-worker chain is what runs here
    clients: { claim: async () => {} },
  };
  return new Function(
    "self",
    "caches",
    "fetch",
    `${src}\nreturn { syncData, requestSync, dataRead, readPointer, sweepOrphans, storeKey, ` +
      `pointerKey, isRecheck, relativePath, hexPrefix, venueFiles, liveKeys, DATA_SCHEMA, ` +
      `FINGERPRINT_LENGTH, DATA_STORE, backgroundCheck, readChecked, insideWindow, ` +
      `DATA_CHECK_WINDOW_MS, CHECKED_KEY };`
  )(self, caches, fetchImpl);
}

// --- A small published tree, generated the way the real one is ---------------

const json = (v) => JSON.stringify(v) + "\n";

/** site-relative path → {body} for a tree with these venues, fingerprints and
 *  catalogue computed by the REAL generator's `fingerprint()`. */
function tree(venues, { fx = json({ base: "NZD", rates: { NZD: 1 } }) } = {}) {
  const files = new Map();
  const put = (p, body, type) => files.set(p, { body, type });
  for (const [id, body] of Object.entries(venues)) put(`data/restaurants/${id}.json`, body);
  const ids = Object.keys(venues);
  const index = json(ids);
  const summary = json(ids.map((id) => ({ id, h: fingerprint(venues[id]) })));
  const search = json({ venues: ids.map((id) => ({ id, sections: [] })) });
  put("data/index.json", index);
  put("data/summary.json", summary);
  put("data/search-index.json", search);
  put("data/fx.json", fx);
  put(
    "data/catalogue.json",
    json({
      schema: DATA_SCHEMA,
      files: {
        "data/fx.json": fingerprint(fx),
        "data/index.json": fingerprint(index),
        "data/search-index.json": fingerprint(search),
        "data/summary.json": fingerprint(summary),
      },
    })
  );
  return files;
}

const VENUES = {
  alpha: json({ id: "alpha", menu: [{ items: [{ name: "Pie", price: 5 }] }] }),
  bravo: json({ id: "bravo", hours: { mon: [["09:00", "17:00"]] } }),
  charlie: json({ id: "charlie", menu: [] }),
};

async function installed(files = tree(VENUES)) {
  const c = fakeCaches();
  const origin = fakeOrigin(files);
  const sw = loadWorker({ caches: c.api, fetchImpl: origin.fetchImpl });
  const first = await sw.syncData();
  return { c, origin, sw, first, files };
}

const storeUrls = (c) => [...(c.stores.get("faves-data")?.keys() || [])].sort();

// --- The generator and the worker agree --------------------------------------

test("the worker's schema and fingerprint length match the generator's", () => {
  const sw = loadWorker({ caches: fakeCaches().api, fetchImpl: async () => {} });
  assert.equal(sw.DATA_SCHEMA, DATA_SCHEMA);
  assert.equal(sw.FINGERPRINT_LENGTH, FINGERPRINT_LENGTH);
});

// The one thing a phone and a commit must compute identically. Checked over
// the REAL committed tree: every fingerprint the catalogue and the summary
// ship is recomputed with the worker's own hexPrefix over a SHA-256 of the
// file's bytes. If they ever disagree, every phone refuses every download.
test("every shipped fingerprint is what the worker computes from the file's bytes", () => {
  const sw = loadWorker({ caches: fakeCaches().api, fetchImpl: async () => {} });
  const phone = (rel) =>
    sw.hexPrefix(createHash("sha256").update(readFileSync(`${SITE}${rel}`)).digest(), sw.FINGERPRINT_LENGTH);
  const catalogue = JSON.parse(readFileSync(`${SITE}data/catalogue.json`, "utf8"));
  assert.equal(catalogue.schema, DATA_SCHEMA);
  for (const [rel, fp] of Object.entries(catalogue.files)) assert.equal(phone(rel), fp, rel);
  const summary = JSON.parse(readFileSync(`${SITE}data/summary.json`, "utf8"));
  const venues = sw.venueFiles(summary);
  assert.equal(venues.length, JSON.parse(readFileSync(`${SITE}data/index.json`, "utf8")).length);
  for (const [rel, fp] of venues) assert.equal(phone(rel), fp, rel);
});

// --- Pure rules ----------------------------------------------------------------

test("only a `_fresh` bust counts as a recheck", () => {
  const sw = loadWorker({ caches: fakeCaches().api, fetchImpl: async () => {} });
  assert.equal(sw.isRecheck("?_fresh=abc"), true);
  assert.equal(sw.isRecheck("?x=1&_fresh=abc"), true);
  assert.equal(sw.isRecheck("?h=0123456789ab"), false);
  assert.equal(sw.isRecheck("?not_fresh=1"), false);
  assert.equal(sw.isRecheck(""), false);
});

test("a request path maps to the site-relative path the manifests use", () => {
  const sw = loadWorker({ caches: fakeCaches().api, fetchImpl: async () => {} });
  assert.equal(sw.relativePath("/data/summary.json", "/"), "data/summary.json");
  assert.equal(sw.relativePath("/faves/data/fx.json", "/faves/"), "data/fx.json");
  assert.equal(sw.relativePath("/elsewhere/data/fx.json", "/faves/"), null);
});

test("venueFiles refuses a record it cannot place, rather than skipping it", () => {
  const sw = loadWorker({ caches: fakeCaches().api, fetchImpl: async () => {} });
  assert.deepEqual(sw.venueFiles([{ id: "a", h: "0123456789ab" }]), [["data/restaurants/a.json", "0123456789ab"]]);
  assert.throws(() => sw.venueFiles([{ id: "a" }]), /no id or fingerprint/);
  assert.throws(() => sw.venueFiles([{ h: "x" }]), /no id or fingerprint/);
  assert.throws(() => sw.venueFiles({}), /not a list/);
});

// --- The sync ------------------------------------------------------------------

test("a first sync fetches every file once, by fingerprint, and switches to it", async () => {
  const { origin, first, c, sw } = await installed();
  assert.equal(first.status, "updated");
  // catalogue + 4 fixed files + 3 venues, every data file at its ?h= URL
  assert.equal(origin.log.length, 8, origin.log.join(", "));
  assert.equal(origin.log[0], "data/catalogue.json");
  for (const u of origin.log.slice(1)) assert.match(u, /\?h=[0-9a-f]{12}$/);
  const pointer = await sw.readPointer(await c.api.open("faves-data"));
  assert.equal(Object.keys(pointer.files).length, 7);
  assert.equal(pointer.generation, pointer.catalogue);
  // store = 7 files + 1 pointer, nothing else
  assert.equal(storeUrls(c).length, 8);
});

test("nothing changed ⇒ ONE request (the catalogue) and no switch", async () => {
  const { origin, sw, c } = await installed();
  const before = await sw.readPointer(await c.api.open("faves-data"));
  origin.log.length = 0;
  const r = await sw.syncData();
  assert.equal(r.status, "current");
  assert.deepEqual(origin.log, ["data/catalogue.json"]);
  assert.deepEqual(await sw.readPointer(await c.api.open("faves-data")), before);
});

// The item's own check, as a unit: one venue's menu and another's hours edited.
test("one menu and one venue's hours edited ⇒ exactly those files, the summary, the index that moved", async () => {
  const { origin, sw, files, c } = await installed();
  const edited = {
    ...VENUES,
    alpha: json({ id: "alpha", menu: [{ items: [{ name: "Pie", price: 6 }] }] }),
    bravo: json({ id: "bravo", hours: { mon: [["10:00", "17:00"]] } }),
  };
  for (const [p, f] of tree(edited)) files.set(p, f);
  origin.log.length = 0;
  const r = await sw.syncData();
  assert.equal(r.status, "updated");
  const paths = origin.log.map((u) => u.split("?")[0]).sort();
  // search-index.json did not change here (this tiny tree's index has no dish
  // text), so it is NOT refetched; charlie, fx and index.json are untouched.
  assert.deepEqual(paths, [
    "data/catalogue.json",
    "data/restaurants/alpha.json",
    "data/restaurants/bravo.json",
    "data/summary.json",
  ]);
  assert.deepEqual(r.fetched.sort(), ["data/restaurants/alpha.json", "data/restaurants/bravo.json", "data/summary.json"]);
  // …and the replaced versions were swept: still 7 files + 1 pointer.
  assert.equal(storeUrls(c).length, 8);
});

test("a read is answered from the held set; an unlisted path goes to the network unstored", async () => {
  const { origin, sw, c } = await installed();
  origin.log.length = 0;
  const res = await sw.dataRead(new Request(`${BASE}data/restaurants/alpha.json`));
  assert.equal(await res.text(), VENUES.alpha);
  assert.deepEqual(origin.log, [], "a held file must not touch the network");
  const before = storeUrls(c);
  await sw.dataRead(new Request(`${BASE}data/restaurants/zulu.json`));
  assert.deepEqual(origin.log, ["data/restaurants/zulu.json"]);
  assert.deepEqual(storeUrls(c), before, "a runtime read must never write the store");
});

// ADR 0146: "anything half-written is unreachable and cleared on the next start".
test("a sync that fails part-way switches NOTHING, and its debris is swept next time", async () => {
  const { origin, sw, files, c } = await installed();
  const before = await sw.readPointer(await c.api.open("faves-data"));
  const edited = { ...VENUES, alpha: json({ id: "alpha", v: 2 }), bravo: json({ id: "bravo", v: 2 }) };
  for (const [p, f] of tree(edited)) files.set(p, f);
  // bravo's new version is missing from the deploy — Pages answers with HTML.
  files.set("data/restaurants/bravo.json", { body: "<!doctype html><p>SPA", type: "text/html" });
  await assert.rejects(sw.syncData(), /served as HTML/);
  assert.deepEqual(await sw.readPointer(await c.api.open("faves-data")), before, "the pointer must not move");
  // alpha v2 and the new summary were written beside the old set: unreachable
  // (the pointer names the old ones), and present until the next start.
  assert.ok(storeUrls(c).length > 8, "the half-written files are there, unreachable");
  const res = await sw.dataRead(new Request(`${BASE}data/restaurants/alpha.json`));
  assert.equal(await res.text(), VENUES.alpha, "a read still gets the OLD, complete set");
  // Next start: the deploy is whole again.
  for (const [p, f] of tree(edited)) files.set(p, f);
  origin.log.length = 0;
  const r = await sw.syncData();
  assert.equal(r.status, "updated");
  assert.equal(storeUrls(c).length, 8, "debris cleared, old versions swept");
  // alpha v2 survived the sweep only because the new pointer names it — so it
  // was fetched AGAIN (the sweep ran before the sync, by design: nothing a
  // pointer does not name is trusted).
  assert.ok(origin.log.some((u) => u.startsWith("data/restaurants/alpha.json")));
});

test("bytes that are not the fingerprint asked for are refused (a mid-deploy mix)", async () => {
  const { sw, files, c } = await installed();
  const before = await sw.readPointer(await c.api.open("faves-data"));
  const edited = { ...VENUES, charlie: json({ id: "charlie", v: 2 }) };
  for (const [p, f] of tree(edited)) files.set(p, f);
  files.set("data/restaurants/charlie.json", { body: VENUES.charlie }); // the OLD bytes
  await assert.rejects(sw.syncData(), /arrived as [0-9a-f]{12}, not the [0-9a-f]{12}/);
  assert.deepEqual(await sw.readPointer(await c.api.open("faves-data")), before);
});

test("a missing rates file does not block the set, and the next check retries it", async () => {
  const files = tree(VENUES);
  const fx = files.get("data/fx.json");
  files.delete("data/fx.json");
  const { sw, origin, c, first } = await installed(files);
  assert.equal(first.status, "updated");
  const pointer = await sw.readPointer(await c.api.open("faves-data"));
  assert.equal(pointer.files["data/fx.json"], undefined);
  assert.equal(pointer.catalogue, null, "incomplete ⇒ the next check must not short-circuit");
  files.set("data/fx.json", fx);
  origin.log.length = 0;
  const r = await sw.syncData();
  assert.deepEqual(r.fetched, ["data/fx.json"], "only the rates, not the whole set");
});

test("a catalogue in another schema is not switched to", async () => {
  const { sw, files, c } = await installed();
  const before = await sw.readPointer(await c.api.open("faves-data"));
  files.set("data/catalogue.json", { body: json({ schema: DATA_SCHEMA + 1, files: {} }) });
  const r = await sw.syncData();
  assert.equal(r.status, "other-schema");
  assert.deepEqual(await sw.readPointer(await c.api.open("faves-data")), before);
});

test("a recheck is excluded: the fetch handler sends `_fresh` straight to the network", () => {
  const handler = src.slice(src.indexOf('self.addEventListener("fetch"'));
  assert.match(handler, /if \(isRecheck\(url\.search\)\) \{\s*event\.respondWith\(fetch\(req\)\);\s*return;/);
});

test("requestSync coalesces reads inside the gap, and `force` runs one anyway", async () => {
  const { sw, origin } = await installed();
  origin.log.length = 0;
  const a = sw.requestSync();
  assert.ok(a, "the first read after install starts a check");
  assert.equal(sw.requestSync(), a, "a second read while one runs shares it");
  await a;
  assert.equal(sw.requestSync(), null, "inside the gap, a read starts nothing");
  await sw.requestSync({ force: true });
  assert.equal(origin.log.filter((u) => u === "data/catalogue.json").length, 2);
});

test("liveKeys keeps every file any pointer names, resolved against the scope", () => {
  const sw = loadWorker({ caches: fakeCaches().api, fetchImpl: async () => {} });
  const live = sw.liveKeys(
    [{ files: { "data/a.json": "111111111111" } }, { files: { "data/b.json": "222222222222" } }, null],
    BASE
  );
  assert.deepEqual([...live].sort(), [`${BASE}data/a.json?h=111111111111`, `${BASE}data/b.json?h=222222222222`]);
});

// --- The persisted data-check window (roadmap 510/180, ADR 0148) -------------
//
// "A restarted worker" is a SECOND worker loaded over the SAME caches: the
// browser stops an idle worker after ~30 s and every variable goes with it,
// which is exactly the state the 10 s in-memory gap could never survive.

/** Age the recorded check by `ms` (the store is the only clock the window reads). */
async function ageCheck(c, sw, ms) {
  const store = await c.api.open("faves-data");
  const at = await sw.readChecked(store);
  await store.put(sw.CHECKED_KEY, new Response(JSON.stringify({ at: at - ms })));
}

async function installedViaRequest(files = tree(VENUES)) {
  const c = fakeCaches();
  const origin = fakeOrigin(files);
  const sw = loadWorker({ caches: c.api, fetchImpl: origin.fetchImpl });
  const first = await sw.requestSync({ force: true }); // as the install does
  return { c, origin, sw, first, files };
}

test("a check that succeeds is recorded in the store, and the sweep keeps the record", async () => {
  const { c, sw, first } = await installedViaRequest();
  assert.equal(first.status, "updated");
  const store = await c.api.open("faves-data");
  const at = await sw.readChecked(store);
  assert.ok(Number.isFinite(at) && Math.abs(Date.now() - at) < 5000, `recorded ${at}`);
  await sw.sweepOrphans(store);
  assert.equal(await sw.readChecked(store), at, "the sweep must not delete the record");
  // 7 files + 1 pointer + the record
  assert.equal(storeUrls(c).length, 9);
});

test("a RESTARTED worker's read inside the window makes no request", async () => {
  const { c, origin, files } = await installedViaRequest();
  const restarted = loadWorker({ caches: c.api, fetchImpl: origin.fetchImpl });
  origin.log.length = 0;
  assert.equal(await restarted.backgroundCheck(), null, "inside the window, a read starts nothing");
  assert.deepEqual(origin.log, []);
  // …and that is the window, not luck: the same read once it has passed checks.
  await ageCheck(c, restarted, restarted.DATA_CHECK_WINDOW_MS + 1000);
  const again = loadWorker({ caches: c.api, fetchImpl: origin.fetchImpl });
  const r = await again.backgroundCheck();
  assert.equal(r?.status, "current");
  assert.deepEqual(origin.log, ["data/catalogue.json"]);
  assert.ok(files.size > 0);
});

test("the window is about three minutes (owner-ruled 2026-10-01)", () => {
  const sw = loadWorker({ caches: fakeCaches().api, fetchImpl: async () => {} });
  assert.equal(sw.DATA_CHECK_WINDOW_MS, 3 * 60 * 1000);
});

test("a resume (an unforced SYNC_DATA → requestSync) ignores the window", async () => {
  const { c, origin } = await installedViaRequest();
  const restarted = loadWorker({ caches: c.api, fetchImpl: origin.fetchImpl });
  origin.log.length = 0;
  const r = await restarted.requestSync();
  assert.equal(r?.status, "current");
  assert.deepEqual(origin.log, ["data/catalogue.json"]);
});

test("a FAILED check records nothing, so the next read retries", async () => {
  const { c, origin, sw, files } = await installedViaRequest();
  await ageCheck(c, sw, sw.DATA_CHECK_WINDOW_MS + 1000);
  const aged = await sw.readChecked(await c.api.open("faves-data"));
  files.delete("data/catalogue.json"); // the network fails
  const restarted = loadWorker({ caches: c.api, fetchImpl: origin.fetchImpl });
  await assert.rejects(restarted.backgroundCheck(), /catalogue\.json → 404/);
  assert.equal(await restarted.readChecked(await c.api.open("faves-data")), aged, "a failure must not start the window");
});

test("a sync whose rates file failed records nothing either", async () => {
  const files = tree(VENUES);
  files.delete("data/fx.json");
  const { c, sw, first } = await installedViaRequest(files);
  assert.equal(first.status, "updated");
  assert.equal(first.complete, false);
  assert.equal(await sw.readChecked(await c.api.open("faves-data")), null);
});

test("a recorded time in the FUTURE (clock wound back) does not defer the check", () => {
  const sw = loadWorker({ caches: fakeCaches().api, fetchImpl: async () => {} });
  const now = 1_000_000_000;
  assert.equal(sw.insideWindow(now - 1000, now, 180_000), true);
  assert.equal(sw.insideWindow(now - 180_000, now, 180_000), false);
  assert.equal(sw.insideWindow(now + 1000, now, 180_000), false);
  assert.equal(sw.insideWindow(null, now, 180_000), false);
});
