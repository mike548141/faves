#!/usr/bin/env node
// Chatty check — how much the app TALKS (roadmap 510/250, the survey's proposal
// L: docs/reviews/2026-10-01-0418-chatty-app-survey.md). Fixed scenarios, each
// with an ASSERTED BUDGET, so the survey's numbers can be re-derived by typing
// one command and a fix that drifts back fails instead of going unnoticed.
//
//     node tools/chatty_check.mjs          # every scenario + the break-probes
//     node tools/chatty_check.mjs -v       # narrate each step
//     node tools/chatty_check.mjs --only hint   # one scenario (wire|hint|sync), no probes
//
// Exit 0 = every measurement within budget. 1 = a budget was exceeded.
// 2 = the browser stopped answering (tools/lib/browser.mjs) — says nothing
// about the site.
//
// WHAT IS MEASURED, AND HOW (so a number here is not a claim nobody can check):
//   · Requests and bytes — counted at the static server, for the page AND the
//     service worker (a page-side observer cannot see the worker's fetches).
//     Bytes are the response body as served, plus a gzip-6 estimate: the local
//     server has no compression, so the gzip figure is the one that resembles a
//     real deploy. Cloudflare serves brotli, so even that is an upper bound.
//   · localStorage writes — `Storage.prototype.setItem/removeItem` wrapped
//     before any page script runs. `storage` events — a SECOND tab on the same
//     origin counts what it receives; that is the cost the other tabs pay.
//   · DOM mutations — a MutationObserver on the document (childList, attributes,
//     characterData, subtree), reset just before the action under test.
//   · Sync — the REAL `worker/sync-worker.js` behind a local Node server, its KV
//     replaced by a counting stand-in, and the browser's `fetch` for the sync
//     endpoint redirected to it (the technique sync_check.mjs documents). KV
//     reads/writes are counted inside the Worker's own calls.
//
// BUDGETS are TODAY's measured value plus a stated margin (counts: the larger of
// +2 or +10%; bytes: +10%). They exist to CATCH A REGRESSION, not to bless
// today's cost: each row says which roadmap item should LOWER it, and the
// orchestrator tightens it when that item lands. A budget that has gone slack
// after its fix is the decorative-guard shape in reverse — lower it.
//
// 🔑 IT BREAK-PROBES ITSELF, every run. Two scenarios are re-run against an
// overlaid, deliberately chattier copy of one file (store.js re-probing storage on
// every call; sync-buckets.js asking about 16 buckets), and the matching
// budget MUST fail. A budget that passes both is measuring nothing.
//
// 🚩 WHAT THIS CANNOT SHOW: Cloudflare Pages (304s, brotli, HTTP/2), real KV
// latency or eventual consistency (the stand-in is strictly consistent), Safari,
// or a phone's CPU — counts are exact, byte figures are estimates, and the DOM
// numbers are changes not milliseconds. The KV scenarios are for a user with NO
// recipes (the survey's population). Browser-driven, so NOT in CI (the standing
// subset ruling) — type it.

import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import {
  Cdp,
  Report,
  createDriver,
  exitFromError,
  launchChrome,
  sleep,
  startServer,
  stopChrome,
  untilPresent,
} from "./lib/browser.mjs";
import worker from "../worker/sync-worker.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

const BIG_MENU = "regal-chinese-restaurant"; // 264 dishes — the survey's big menu
const SYNC_HOST = "faves-sync.cakeit.workers.dev"; // sync.js's SYNC_ENDPOINT host
const NAV_GAP_MS = 10_500; // sw.js coalesces data checks inside 10 s; step past it

// --- The budgets -----------------------------------------------------------
// id → { what, budget, unit, lowers }. `measured` is filled in as scenarios run.
// `lowers` names the roadmap item expected to bring the number down (or "—").
const B = {
  coldReq: { what: "cold install: requests (home page, then the worker's install)", unit: "req", budget: 0, lowers: "170 (revalidate the install)" },
  coldGz: { what: "cold install: gzip-6 estimate", unit: "KB", budget: 0, lowers: "170" },
  warmReq: { what: "warm home load: requests", unit: "req", budget: 0, lowers: "160/180 (throttle the catalogue check)" },
  warmBytes: { what: "warm home load: response bytes", unit: "B", budget: 0, lowers: "160/180" },
  menuReq: { what: "menu open (warm, >10 s after the last page): requests", unit: "req", budget: 0, lowers: "160/180" },
  idleReq: { what: "open menu, 4 s idle: requests", unit: "req", budget: 0, lowers: "—" },
  idleTimers: { what: "open menu, 4 s idle: timers started", unit: "n", budget: 0, lowers: "—" },
  idleMut: { what: "open menu, 4 s idle: DOM mutations", unit: "n", budget: 0, lowers: "—" },
  lsSetHome: { what: "home page load: localStorage setItem", unit: "n", budget: 0, lowers: "200 (probe once per page)" },
  lsRemHome: { what: "home page load: localStorage removeItem", unit: "n", budget: 0, lowers: "200" },
  evHome: { what: "home page load: storage events a 2nd tab receives", unit: "n", budget: 0, lowers: "200" },
  lsSetMenu: { what: "menu page load: localStorage setItem", unit: "n", budget: 0, lowers: "200" },
  lsRemMenu: { what: "menu page load: localStorage removeItem", unit: "n", budget: 0, lowers: "200" },
  evMenu: { what: "menu page load: storage events a 2nd tab receives", unit: "n", budget: 0, lowers: "200" },
  mutHeart: { what: `one heart on ${BIG_MENU}: DOM mutations`, unit: "n", budget: 0, lowers: "150 (no per-dish re-render)" },
  mutUnheart: { what: "un-heart: DOM mutations", unit: "n", budget: 0, lowers: "150" },
  mutRating: { what: "one rating step: DOM mutations", unit: "n", budget: 0, lowers: "150" },
  hintHidden: { what: "home page hidden 15 s: DOM mutations", unit: "n", budget: 0, lowers: "230 (pause when hidden)" },
  hintTimersHidden: { what: "home page hidden 15 s: timers started", unit: "n", budget: 0, lowers: "230" },
  hintTurns: { what: "home page visible 30 s: placeholder changes", unit: "n", budget: 0, lowers: "230 (stop after a few turns)" },
  enableReq: { what: "sync: first sync on a new device: HTTP requests", unit: "req", budget: 0, lowers: "—" },
  enableR: { what: "sync: first sync: KV reads", unit: "R", budget: 0, lowers: "140 (stop probing absent buckets)" },
  enableW: { what: "sync: first sync: KV writes", unit: "W", budget: 0, lowers: "—" },
  pullReq: { what: "sync: page-load pull, nothing changed: HTTP requests", unit: "req", budget: 0, lowers: "160 (throttle pulls)" },
  pullR: { what: "sync: page-load pull, nothing changed: KV reads", unit: "R", budget: 0, lowers: "140" },
  pullW: { what: "sync: page-load pull, nothing changed: KV writes", unit: "W", budget: 0, lowers: "—" },
  pullLsSet: { what: "sync: page-load pull, nothing changed: localStorage setItem (excl. probe)", unit: "n", budget: 0, lowers: "190 (a no-op pull writes nothing)" },
  heartReq: { what: "sync: one heart then flush: HTTP requests (GET+OPTIONS+PUT)", unit: "req", budget: 0, lowers: "—" },
  heartR: { what: "sync: one heart then flush: KV reads", unit: "R", budget: 0, lowers: "140" },
  heartW: { what: "sync: one heart then flush: KV writes", unit: "W", budget: 0, lowers: "—" },
  tabReq: { what: "sync: a 2nd tab on a menu, one heart elsewhere: extra pull requests", unit: "req", budget: 0, lowers: "210 (cross-tab reload schedules no sync)" },
};
// Budgets are filled from MEASURED below (see BUDGETS): a literal per row, set
// to measured + margin on a stated date, so a reader sees numbers, not a rule.
const BUDGETS = {};
Object.assign(BUDGETS, {
  // Measured on main 3f57a7f (2026-10-01; 3 runs agreed except where noted;
  // the storage and hint rows were tightened to the post-510/200 and 510/230 values)
  // + margin: counts of 10 or fewer +1, above that max(+2, +10%); bytes +10%;
  // a zero baseline stays 0. Re-derive with this tool; tighten with the item
  // named in each row's `lowers`, never loosen without saying why.
  coldReq: 296, coldGz: 1702, // 269 req, 1,547 KB
  warmReq: 3, warmBytes: 37_859, // 2 req: catalogue + the sw.js update check (34,417 B when that fires; 197 B when it does not)
  menuReq: 2, idleReq: 2, // 1 and 0-1: a late sw.js update check lands in the idle window some runs
  idleTimers: 0, idleMut: 0,
  lsSetHome: 2, lsRemHome: 2, evHome: 4, // was 6, 6, 12 → 1, 1, 2 with 510/200
  lsSetMenu: 2, lsRemMenu: 2, evMenu: 4,
  mutHeart: 877, mutUnheart: 875, mutRating: 2626, // 795-797, 795, 2,387
  hintHidden: 0, hintTimersHidden: 0, hintTurns: 4, // was 6, 2, 4 → 0, 0, 3 with 510/230
  enableReq: 4, enableR: 29, enableW: 2, // 3, 26, 1
  pullReq: 2, pullR: 10, pullW: 0, pullLsSet: 3, // 1, 9, 0, 2
  heartReq: 4, heartR: 29, heartW: 2, // 3, 26, 1
  tabReq: 2, // 0-1 (the second tab's own pull ~20 s after the storage event; a low flake is harmless to an upper bound)
});
for (const [id, v] of Object.entries(BUDGETS)) B[id].budget = v;
const measured = {};

// --- Instrumentation injected before any page script runs ------------------
const INSTRUMENT = `(() => {
  const c = window.__chat = { set: 0, remove: 0, events: 0, timers: 0, mut: 0, ph: 0 };
  const sp = Storage.prototype;
  const set = sp.setItem, rem = sp.removeItem;
  sp.setItem = function (k, v) { c.set++; (c.keys ||= []).push(k); return set.call(this, k, v); };
  sp.removeItem = function (k) { c.remove++; return rem.call(this, k); };
  addEventListener("storage", () => { c.events++; });
  const st = window.setTimeout, si = window.setInterval;
  window.setTimeout = function (...a) { c.timers++; return st.apply(this, a); };
  window.setInterval = function (...a) { c.timers++; return si.apply(this, a); };
  new MutationObserver((r) => { c.mut += r.length; })
    .observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
})();`;

// The sync endpoint is rewritten to the local Worker. Page and worker fetches
// to anything else pass through untouched.
const shimSource = (port) => `(() => {
  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes(${JSON.stringify(SYNC_HOST)})) {
      const u = new URL(url);
      return real("http://127.0.0.1:${port}" + u.pathname + u.search, init);
    }
    return real(input, init);
  };
})();`;

// --- The counting KV stand-in and the real Worker behind a Node server ------
function countingKv() {
  const store = new Map();
  const c = { reads: 0, writes: 0, bytesRead: 0 };
  const bytes = (v) => (typeof v === "string" ? new TextEncoder().encode(v) : new Uint8Array(v.buffer ?? v, v.byteOffset ?? 0, v.byteLength).slice());
  return {
    c,
    reset: () => { c.reads = 0; c.writes = 0; c.bytesRead = 0; },
    async getWithMetadata(key) {
      c.reads += 1;
      const hit = store.get(key);
      if (!hit) return { value: null, metadata: null };
      c.bytesRead += hit.value.byteLength;
      return { value: hit.value.slice().buffer, metadata: hit.metadata ?? null };
    },
    async put(key, value, opts = {}) {
      c.writes += 1;
      store.set(key, { value: bytes(value), metadata: opts.metadata ?? null });
    },
  };
}

function startWorkerServer() {
  const kv = countingKv();
  const http = { gets: 0, puts: 0, options: 0 };
  const env = { SYNC_BLOBS: kv, ALLOWED_ORIGINS: "" };
  const server = createServer(async (req, res) => {
    if (req.method === "GET") http.gets += 1;
    else if (req.method === "PUT") http.puts += 1;
    else if (req.method === "OPTIONS") http.options += 1;
    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const request = new Request(`http://127.0.0.1${req.url}`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "OPTIONS" ? undefined : body,
    });
    const r = await worker.fetch(request, env, {});
    const out = {};
    r.headers.forEach((v, k) => { out[k] = v; });
    // The Worker's CORS preflight/expose headers are its own; this layer adds none.
    res.writeHead(r.status, out);
    res.end(Buffer.from(await r.arrayBuffer()));
  });
  return new Promise((ok, bad) => {
    server.once("error", bad);
    server.listen(0, "127.0.0.1", () => ok({
      server, kv, http, env,
      port: server.address().port,
      reset() { kv.reset(); http.gets = 0; http.puts = 0; http.options = 0; },
    }));
  });
}

// --- Page plumbing ----------------------------------------------------------
async function newPage(cdp, { shimPort = null } = {}) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
    sessionId
  );
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENT }, sessionId);
  if (shimPort) {
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: shimSource(shimPort) }, sessionId);
  }
  return { sessionId, targetId };
}

/** One fresh ORIGIN (a new port = new storage, new service worker) with a request log. */
async function origin(overlay = null) {
  const srv = await startServer(0, SITE, overlay);
  const log = []; // { url, bytes, gz }
  srv.server.on("request", (req, res) => {
    const entry = { url: req.url, bytes: 0, gz: 0 };
    log.push(entry);
    const end = res.end.bind(res);
    res.end = (chunk, ...rest) => {
      if (chunk) {
        const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        entry.bytes = b.length;
        entry.gz = gzipSync(b, { level: 6 }).length;
      }
      return end(chunk, ...rest);
    };
  });
  return { srv, log, base: `http://127.0.0.1:${srv.port}` };
}

const sum = (log, f) => log.reduce((n, e) => n + e[f], 0);
const chat = (d) => d.evalPage(`JSON.parse(JSON.stringify(window.__chat))`);

async function waitFor(d, expr, label) {
  return untilPresent(() => d.evalPage(expr), { label });
}

/** Wait until `count()` has not moved for `ms`. */
async function quiet(count, ms = 1200, cap = 30_000) {
  let last = await count();
  let since = Date.now();
  const t0 = Date.now();
  while (Date.now() - since < ms) {
    if (Date.now() - t0 > cap) break;
    await sleep(100);
    const now = await count();
    if (now !== last) { last = now; since = Date.now(); }
  }
}

async function goto(cdp, d, sessionId, url, ready) {
  await cdp.send("Page.navigate", { url }, sessionId);
  await waitFor(d, ready, `loaded ${url}`);
}

const HOME_READY = `document.readyState === "complete" && document.querySelectorAll(".card, [data-venue-id]").length > 0`;
const MENU_READY = `document.readyState === "complete" && document.querySelectorAll("[data-dish-id]").length > 0`;

const SETTLE = `(async () => {
  const reg = await navigator.serviceWorker.register("sw.js");
  const w = reg.installing || reg.waiting || reg.active;
  if (!w) return "none";
  if (w.state === "activated" || w.state === "redundant") return w.state;
  return await new Promise((done) => {
    w.addEventListener("statechange", () => {
      if (w.state === "activated" || w.state === "redundant") done(w.state);
    });
  });
})()`;
const HELD = `(async () => {
  const store = await caches.open("faves-data");
  const hit = await store.match("__data_pointer__/v1");
  return hit ? Object.keys((await hit.json()).files || {}).length : 0;
})()`;

// --- Scenarios --------------------------------------------------------------

/** Cold install, then warm home, warm menu, idle menu, storage per load. */
async function scenarioWire(cdp, report, { overlay = null, probe = false, label }) {
  const o = await origin(overlay);
  const A = await newPage(cdp);
  const dA = createDriver(cdp, A.sessionId, (m) => report.step(`${label}: ${m}`));
  const Bp = await newPage(cdp); // the second tab: counts the storage events it is sent
  const dB = createDriver(cdp, Bp.sessionId);
  try {
    await goto(cdp, dB, Bp.sessionId, `${o.base}/sw.js`, `document.readyState === "complete"`);

    // 1. Cold install: the home page, then everything the worker fetches.
    await goto(cdp, dA, A.sessionId, `${o.base}/index.html`, HOME_READY);
    await dA.evalPage(SETTLE);
    await waitFor(dA, `!!navigator.serviceWorker.controller`, `${label}: the worker controls the page`);
    await untilPresent(async () => ((await dA.evalPage(HELD)) > 0 ? true : null), { label: `${label}: the install held its data`, timeout: 60_000 }).catch(() => {});
    await quiet(() => o.log.length, 2500, 60_000);
    const cold = { req: o.log.length, gz: sum(o.log, "gz"), raw: sum(o.log, "bytes") };
    if (!probe) {
      measured.coldReq = cold.req;
      measured.coldGz = Math.round(cold.gz / 1024);
      report.step(`cold install: ${cold.req} requests, ${Math.round(cold.raw / 1024)} KB raw, ${Math.round(cold.gz / 1024)} KB gzip-6`);
    }

    // 2. Warm home load (past the 10 s coalescing gap, so it is a real navigation's cost).
    await sleep(NAV_GAP_MS);
    o.log.length = 0;
    await dB.evalPage(`window.__chat.events = 0`);
    await goto(cdp, dA, A.sessionId, `${o.base}/index.html`, HOME_READY);
    await quiet(() => o.log.length, 1500);
    await sleep(500); // storage events are queued to the other tab
    const home = await chat(dA);
    const homeEvents = (await chat(dB)).events;
    const warm = { req: o.log.length, bytes: sum(o.log, "bytes") };
    report.step(`warm home requests: ${o.log.map((e) => e.url).join(", ") || "none"}`);

    // 3. Menu open, warm: requests, then storage per load, then 4 s of idle.
    await sleep(NAV_GAP_MS);
    o.log.length = 0;
    await dB.evalPage(`window.__chat.events = 0`);
    await goto(cdp, dA, A.sessionId, `${o.base}/restaurant.html?id=${BIG_MENU}`, MENU_READY);
    await quiet(() => o.log.length, 1500);
    await sleep(500);
    const menu = await chat(dA);
    const menuEvents = (await chat(dB)).events;
    const menuReq = o.log.length;
    report.step(`menu open requests: ${o.log.map((e) => e.url).join(", ") || "none"}`);

    o.log.length = 0;
    await dA.evalPage(`Object.assign(window.__chat, { timers: 0, mut: 0 })`);
    await sleep(4000);
    const idle = await chat(dA);
    const idleReq = o.log.length;
    report.step(`warm home: menu idle requests: ${o.log.map((e) => e.url).join(", ") || "none"}`);

    if (probe) return { home, menu, homeEvents, menuEvents };
    Object.assign(measured, {
      warmReq: warm.req, warmBytes: warm.bytes, menuReq,
      idleReq, idleTimers: idle.timers, idleMut: idle.mut,
      lsSetHome: home.set, lsRemHome: home.remove, evHome: homeEvents,
      lsSetMenu: menu.set, lsRemMenu: menu.remove, evMenu: menuEvents,
    });

    // 4. Hearts and a rating, on the big menu this page is already showing.
    // A background tab never runs requestAnimationFrame, which driver.settle() waits on.
    await cdp.send("Page.bringToFront", {}, A.sessionId);
    const count = () => dA.evalPage(`window.__chat.mut`);
    const act = async (name, expr) => {
      await dA.evalPage(`window.__chat.mut = 0`);
      await dA.evalPage(expr);
      await dA.settle();
      await quiet(count, 600);
      measured[name] = await count();
    };
    const heart = `document.querySelector(".dish-actions .heart").click()`;
    await act("mutHeart", heart);
    await act("mutUnheart", heart);
    await act(
      "mutRating",
      `document.querySelector(".rating-slider").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))`
    );
    await dA.evalPage(`document.querySelector(".rating-slider").dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }))`);
    return true;
  } finally {
    o.srv.server.closeAllConnections?.();
    o.srv.server.close?.();
    await cdp.send("Target.closeTarget", { targetId: A.targetId }).catch(() => {});
    await cdp.send("Target.closeTarget", { targetId: Bp.targetId }).catch(() => {});
  }
}

/** The home search hint: hidden for 15 s, then visible for 30 s. */
async function scenarioHint(cdp, report) {
  const o = await origin();
  const P = await newPage(cdp);
  const d = createDriver(cdp, P.sessionId, (m) => report.step(`hint: ${m}`));
  try {
    await goto(cdp, d, P.sessionId, `${o.base}/index.html`, HOME_READY + ` && !!document.querySelector("input[type=search], #search, input.search")`);
    // Visible, idle 30 s: how many times does the placeholder change?
    const probeJs = `(() => { const i = document.querySelector("input[type=search], #search, input.search"); window.__ph = 0; window.__phLast = i.placeholder; setInterval(() => { if (i.placeholder !== window.__phLast) { window.__ph++; window.__phLast = i.placeholder; } }, 100); })()`;
    await d.evalPage(probeJs);
    await sleep(30_000);
    measured.hintTurns = await d.evalPage(`window.__ph`);
    report.step(`hint: ${measured.hintTurns} placeholder change(s) in 30 s visible`);
    // Now hide the page (visibilityState is a getter; the event is what the app listens for).
    await d.evalPage(`(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    })()`);
    // Let the hide's own settling (a class write, delivered as a mutation record
    // a microtask later) land BEFORE the window opens: it is the cost of stopping,
    // not of running.
    await sleep(300);
    await d.evalPage(`Object.assign(window.__chat, { timers: 0, mut: 0 })`);
    await sleep(15_000);
    const c = await chat(d);
    // The harness's own 100 ms poll above is a setInterval, not a setTimeout call per tick,
    // so it adds nothing to `timers`; mutations are the page's.
    measured.hintHidden = c.mut;
    measured.hintTimersHidden = c.timers;
    return true;
  } finally {
    o.srv.server.closeAllConnections?.();
    o.srv.server.close?.();
    await cdp.send("Target.closeTarget", { targetId: P.targetId }).catch(() => {});
  }
}

/** Sync against the real Worker with counting KV. */
async function scenarioSync(cdp, report, { overlay = null, probe = false, label }) {
  const w = await startWorkerServer();
  const o = await origin(overlay);
  w.env.ALLOWED_ORIGINS = o.base;
  const A = await newPage(cdp, { shimPort: w.port });
  const d = createDriver(cdp, A.sessionId, (m) => report.step(`${label}: ${m}`));
  const snap = () => ({ req: w.http.gets + w.http.puts + w.http.options, r: w.kv.c.reads, w: w.kv.c.writes, gets: w.http.gets, puts: w.http.puts, opt: w.http.options, kb: w.kv.c.bytesRead });
  const idle = () => quiet(() => snap().req, 1500, 20_000);
  try {
    await goto(cdp, d, A.sessionId, `${o.base}/restaurant.html?id=${BIG_MENU}`, MENU_READY);

    // First sync on a new device (enable() mints a code and runs one cycle).
    w.reset();
    const en = await d.evalPage(`(async () => { const { sync } = await import("/js/sync.js"); const r = await sync.enable(); return { ok: r.ok !== false }; })()`);
    await idle();
    const first = snap();
    report.step(`${label}: enable → ${JSON.stringify(first)} ${JSON.stringify(en)}`);

    // A page load with sync on and nothing changed: the pull on load.
    w.reset();
    await goto(cdp, d, A.sessionId, `${o.base}/restaurant.html?id=${BIG_MENU}`, MENU_READY);
    await untilPresent(() => (w.http.gets > 0 ? true : null), { label: `${label}: the page-load pull arrived`, timeout: 15_000 }).catch(() => {});
    await idle();
    const pull = snap();
    const pullLs = await chat(d);
    // Every page makes exactly the probe writes (6 sets today); report the rest.
    const probes = (pullLs.keys || []).filter((k) => k === "__faves_probe__").length;
    report.step(`${label}: pull → ${JSON.stringify(pull)}; setItem ${pullLs.set} (${probes} probes)`);

    // One heart, then the debounce flushed.
    w.reset();
    await d.evalPage(`document.querySelector(".dish-actions .heart").click()`);
    await d.settle();
    await d.evalPage(`import("/js/sync.js").then(({ sync }) => sync.flush())`);
    await untilPresent(() => (w.http.puts > 0 ? true : null), { label: `${label}: the heart's PUT arrived`, timeout: 15_000 }).catch(() => {});
    await idle();
    const heart = snap();
    report.step(`${label}: heart → ${JSON.stringify(heart)}`);

    if (probe) return { pull };
    Object.assign(measured, {
      enableReq: first.req, enableR: first.r, enableW: first.w,
      pullReq: pull.req, pullR: pull.r, pullW: pull.w, pullLsSet: pullLs.set - probes,
      heartReq: heart.req, heartR: heart.r, heartW: heart.w,
    });

    // A second tab on a different page: a heart in tab A, and does tab B pull too?
    const Bt = await newPage(cdp, { shimPort: w.port });
    const dB = createDriver(cdp, Bt.sessionId);
    try {
      await goto(cdp, dB, Bt.sessionId, `${o.base}/index.html`, HOME_READY);
      await sleep(1500);
      await cdp.send("Page.bringToFront", {}, A.sessionId); // rAF (settle) needs the foreground
      w.reset();
      await d.evalPage(`document.querySelector(".dish-actions .heart").click()`);
      await d.settle();
      await d.evalPage(`import("/js/sync.js").then(({ sync }) => sync.flush())`);
      await untilPresent(() => (w.http.puts > 0 ? true : null), { label: `${label}: tab A's PUT arrived`, timeout: 15_000 }).catch(() => {});
      await idle();
      const a = snap();
      // Tab B's own pull is debounced (~20 s) after its storage-event reload.
      await untilPresent(() => (w.http.gets > a.gets ? true : null), { label: `${label}: tab B's own pull`, timeout: 35_000 }).catch(() => {});
      await idle();
      const both = snap();
      measured.tabReq = both.gets - a.gets;
      report.step(`${label}: after tab A's heart: ${JSON.stringify(a)}; 25 s later ${JSON.stringify(both)}`);
    } finally {
      await cdp.send("Target.closeTarget", { targetId: Bt.targetId }).catch(() => {});
    }
    return true;
  } finally {
    o.srv.server.closeAllConnections?.();
    o.srv.server.close?.();
    w.server.closeAllConnections?.();
    w.server.close?.();
    await cdp.send("Target.closeTarget", { targetId: A.targetId }).catch(() => {});
  }
}

// --- The verdict ------------------------------------------------------------
function judge(report, partial) {
  const width = Math.max(...Object.values(B).map((r) => r.what.length));
  console.log("\n  measured vs budget (budget = today's value + margin; 'lowers' = the item that should tighten it)");
  for (const [id, r] of Object.entries(B)) {
    const m = measured[id];
    if (m === undefined) {
      if (partial) continue; // --only: the other scenarios did not run
      report.check(`${r.what}: measured`, false, "no measurement was taken (a scenario aborted before it)");
      continue;
    }
    const ok = m <= r.budget;
    report.check(
      `${r.what}`.padEnd(width),
      ok,
      `measured ${m} ${r.unit} · budget ${r.budget} ${r.unit}${r.lowers === "—" ? "" : ` · lowers with ${r.lowers}`}`
    );
  }
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-chatty-check-"));
  let chrome = null;
  let cdp = null;
  try {
    console.log("Faves chatty check — what the app says to the network, storage and DOM (510/250)");
    console.log(`  profile  ${profileDir} (fresh — one origin per scenario)\n`);
    chrome = await launchChrome({ profileDir, headed: false });
    cdp = await Cdp.connect(chrome.wsUrl);

    const want = (n) => !opts.only || opts.only === n;
    if (want("wire")) await scenarioWire(cdp, report, { label: "wire" });
    if (want("hint")) await scenarioHint(cdp, report);
    if (want("sync")) await scenarioSync(cdp, report, { label: "sync" });
    judge(report, !!opts.only);

    if (!opts.noProbe && !opts.only) {
      // Break-probe 1: store.js forgets its probe result, so every safeStorage()
      // call writes the probe key again (the pre-510/200 behaviour).
      const storeJs = readFileSync(join(SITE, "js", "store.js"), "utf8");
      const memoLine = "if (probed && probed.ls === ls) {";
      if (!storeJs.includes(memoLine)) {
        report.check("break-probe: store.js's probe memo is where the probe expects", false, "site/js/store.js changed shape — update memoLine in this tool");
      } else {
        const p = await scenarioWire(cdp, report, {
          label: "break-probe/storage", probe: true,
          overlay: new Map([["/js/store.js", { body: storeJs.replace(memoLine, "if (false) {"), type: "text/javascript" }]]),
        });
        report.check(
          "break-probe: a store.js that re-probes on every call FAILS the home-load setItem budget",
          p.home.set > B.lsSetHome.budget,
          `${p.home.set} setItem against a budget of ${B.lsSetHome.budget}`
        );
      }
      // Break-probe 2: the client asks the Worker about 16 buckets, not 8.
      const bucketsJs = readFileSync(join(SITE, "js", "sync-buckets.js"), "utf8");
      const bucketsLine = "export const RECIPE_BUCKETS = 8;";
      if (!bucketsJs.includes(bucketsLine)) {
        report.check("break-probe: sync-buckets.js's RECIPE_BUCKETS line is where the probe expects", false, "site/js/sync-buckets.js changed shape — update bucketsLine in this tool");
      } else {
        const p = await scenarioSync(cdp, report, {
          label: "break-probe/sync", probe: true,
          overlay: new Map([["/js/sync-buckets.js", { body: bucketsJs.replace(bucketsLine, "export const RECIPE_BUCKETS = 16;"), type: "text/javascript" }]]),
        });
        report.check(
          "break-probe: a client asking about 16 buckets FAILS the pull KV-read budget",
          p.pull.r > B.pullR.budget,
          `${p.pull.r} KV reads against a budget of ${B.pullR.budget}`
        );
      }
    }
    return report.summary(SITE);
  } finally {
    if (chrome) await stopChrome(chrome.proc ?? chrome);
    if (cdp) cdp.close?.();
  }
}

const { values } = parseArgs({
  options: {
    verbose: { type: "boolean", short: "v", default: false },
    "no-probe": { type: "boolean", default: false },
    only: { type: "string" }, // wire | hint | sync — one scenario, no probes (debugging)
  },
});

process.exit((await run({ verbose: values.verbose, noProbe: values["no-probe"], only: values.only }).catch(exitFromError)) ? 0 : 1);
