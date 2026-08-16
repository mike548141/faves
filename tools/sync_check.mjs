#!/usr/bin/env node
// Faves sync check — cross-device sync (ROADMAP Theme 9 v2, ADR 0017, ADR
// 0060), driven through TWO real browsers at once. Fifth of the family after
// device_check, cook_check, addon_check and branch_check, on the same harness
// (tools/lib/browser.mjs).
//
//     node tools/sync_check.mjs             # headless, exit 0 = pass
//     node tools/sync_check.mjs --help
//
// CURRENT STATUS — READ THIS BEFORE TRUSTING A GREEN-LOOKING RUN. The run does
// NOT currently reach the end. It aborts partway through with a harness error
// (exit 2, not exit 1 — see "the verdict" in tools/lib/browser.mjs), which
// means the exit code and the PASS lines printed before the abort are real,
// but the assertions after the abort point NEVER RAN — they are not failures,
// they are absent. A wall of PASS lines followed by "harness error" is not a
// pass; check that the run reached its own final "OK/FAILED — N passed, N
// failed" summary line before trusting any of it.
//
//   RUNS AND PASSES TODAY, in a real two-browser run:
//     • turning on sync mints a well-formed code
//     • a malformed code is rejected by the UI before any network call
//     • the real code from the other device is accepted and joins
//     • a heart made on A appears on B after a sync
//     • a rating made on A appears on B after the same sync
//     • a heart REMOVED on A is removed on B, not re-added — the single most
//       valuable assertion in this file, the one that would have caught the
//       additive-merge bug this whole ADR 0060 exists to prevent
//     • the rating survives the heart's removal (the two stores don't
//       cross-contaminate)
//
//   DOES NOT YET RUN: turning off sync on B leaving its own data intact, and
//   the fake-server-unreachable/app-keeps-working assertion. The run reaches
//   the rating-change step (setRating to a new value on A, the setup for "a
//   rating changed on A replaces, not duplicates, the old value on B") and
//   then fails to re-open the Settings sheet — see KNOWN OPEN ISSUE below.
//   Assertions for the rating-replace, sync-off-leaves-data-intact and
//   server-unreachable claims are WRITTEN (further down this file) but their
//   PASS/FAIL has never actually been observed.
//
// KNOWN OPEN ISSUE — the overflow (⋯) menu, not sync. Reproduced while
// building this check, and NOT a sync-engine fault: after `setRating()`
// focuses a rating slider partway down a 70-item menu, the browser's default
// focus-scrolls-into-view behaviour scrolls the (non-fixed, in-flow) header
// off-screen. openSettings() already compensates — blur the focused element
// and `window.scrollTo(0, 0)` before reaching for the header — and that fixes
// the common case. But it has also been observed, once, NOT to fix it:
//
//     pre-click rect:  y:-863, scrollY:879   (button still off-screen above,
//                                              immediately AFTER the blur +
//                                              scrollTo(0,0) call had already run)
//     post-click rect: y:16,   scrollY:0     (page had jumped back to top by
//                                              the time of the NEXT read, i.e.
//                                              something scrolled it a second
//                                              time on its own)
//     event log: overflow-btn's own click handler fired and reported
//                aria-expanded flipping true, then false, then true, then
//                false again — i.e. it read as TWO full open/close cycles
//                from what this file only ever sent ONE click for.
//
// The scroll snapping back to 879px on its own, and the button's click
// handler seeing double, both point at something scrolling and/or dispatching
// asynchronously with respect to this file's own blur()+scrollTo(0,0)+click()
// sequence — plausibly menu.js's reapply() (settings.subscribe(reapply),
// wrapped in captureUiState/restoreUiState), which a completed sync now
// triggers on every device via sync-start.js's onApplied hook, and which is
// asynchronous relative to the sync panel reporting "Last synced…". That is a
// real timing hazard a real person could hit by acting fast right after their
// own device finishes syncing — but it was reproduced through the overflow
// menu (site/js/overflow-ui.js) and the reapply/scroll-restore machinery
// (site/js/menu.js), NOT through anything in the sync engine, and diagnosing
// or fixing it is out of this file's scope (file ownership: this check may
// only touch tools/sync_check.mjs) and out of this session's remaining
// budget. Whoever picks this up: an unwired MutationObserver-based
// `waitQuiet()` helper is already sitting in `openDevice()` below (counts DOM
// mutations under <html>, polls until the count goes quiet) as a documented,
// untested starting point — it was never actually called from anywhere before
// this file was handed off, so it fixes nothing yet.
//
// WHY THIS ONE IS SHAPED DIFFERENTLY. Every other check in the family proves
// something about ONE device. Sync's entire claim is about TWO — that a heart
// made on a phone shows up on a laptop, and a heart removed on the phone stays
// gone on the laptop. A single browser profile cannot show that anything ever
// left the device, so this check launches two independent Chrome profiles
// (two separate --user-data-dir, i.e. two genuinely separate storage origins
// in practice) and drives the real Settings UI in each, asserting data
// actually crosses between them via a server neither one talks to directly.
//
// THE ENDPOINT-OVERRIDE TECHNIQUE, AND WHY. sync.js exports `createSync()` as
// an injectable factory, but the app itself never calls it — sync-ui.js and
// sync-start.js both import the ALREADY-CONSTRUCTED singleton
// (`export const sync = createSync();`, sync.js's last line), built at
// *module-import time* against the real endpoint constant. There is no runtime
// hook in the shipped app for swapping that endpoint, and this check's file
// ownership is scoped to this file alone — editing sync.js or sync-ui.js to
// add one is out of scope even if it were otherwise a good idea. So this file
// takes the other option the brief allows: a `Page.addScriptToEvaluateOnNewDocument`
// script (the same "instrument globals before page scripts run" trick
// device_check and cook_check already use for seeding localStorage) that
// replaces `window.fetch` with a shim BEFORE any page module executes. The
// shim inspects only the request path — anything matching `/v1/blob/` is
// redirected to the local fake server below; every other request (site
// assets, sw.js, fonts) passes through untouched. Because `sync.js`'s default
// `fetchImpl` parameter is `globalThis.fetch?.bind(globalThis)`, evaluated
// when the singleton is constructed, the singleton captures OUR shim rather
// than the real network the moment it is first imported — no source file
// changes, no import-map tricks, nothing shipped.
//
// WHAT THIS MEANS THE CHECK DOES NOT PROVE: everything below is about the fake
// server standing in for the real one, and the app's OWN half of that boundary
// is all this can speak to.
//
//   • It says nothing about the REAL deployed Cloudflare Worker. The fake
//     server here is this file's own understanding of the documented
//     contract (GET/PUT/OPTIONS, ETag, If-Match, 404/412). If the deployed
//     Worker's behaviour drifts from that contract — auth, rate limits, KV's
//     eventual consistency, a CORS header dropped in a redeploy — this check
//     stays green while production sync breaks. It is a check on the app's
//     client-side contract compliance, not a check on the Worker.
//   • It says nothing about real network conditions. The fake server answers
//     over loopback in well under a millisecond, every time. DNS, TLS
//     handshakes, timeouts, retries, and the ordinary flakiness of a mobile
//     connection are not exercised — "unreachable" here means "nobody is
//     listening on the port", not "the request hung for 30 seconds".
//   • It says nothing about two genuinely different PHYSICAL devices. Two
//     Chrome profiles on one machine share a browser engine, a Chrome
//     version, a system clock and a filesystem. A real phone vs a real laptop
//     — different browsers (Safari's storage eviction is stricter than
//     Chrome's), different clocks, different points where the OS might kill
//     a backgrounded tab mid-sync — none of that is here.
//   • It never lets the real DEBOUNCE fire. Every sync in this file is forced
//     via the "Sync now" button — a real UI action, but not the 20-second
//     timer (sync.js's DEBOUNCE_MS) or the visibilitychange-triggered flush
//     that fires when a real tab is backgrounded. Those paths are covered by
//     unit tests only; this file is silent on whether they actually fire in
//     a real browser's event loop under real backgrounding.
//   • It never exercises the "that code doesn't match the data on the
//     server" branch (a blob that fails to authenticate) — only a clean pair
//     and a clean network failure are driven here.
//   • It cannot tell you the safety copy ("Your data is safe on this
//     device.") is legible or reassuring to an actual person mid-panic that
//     their phone appears to have lost their favourites. It can only assert
//     the string is the one sync.js actually wrote.
//
// NOT PART OF THE SHIPPED SITE. Dev tooling, like tools/serve.py — no npm
// install, no dependency added to the site (ADR 0001). Fresh Chrome profile
// per device per run (device_check's "the fresh profile is load-bearing"
// applies twice over here), because a stale service worker would happily
// serve last run's assets to either one.
//
// TIME-INDEPENDENCE. Every assertion below is a same-run state comparison —
// "B now shows what A just set", never a wall-clock check — so nothing here
// can pass at 1pm and fail at 1am.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import {
  Cdp,
  Report,
  createDriver,
  launchChrome,
  startServer,
  stopChrome,
  until,
} from "./lib/browser.mjs";
// Pure, DOM-free (sync-code.js's own header) — safe to run in Node, the same
// way tools/cook_check.mjs already imports site/js/slug.js. Read-only reuse of
// the app's own validator, so "well-formed" here means exactly what the app
// means by it, not a regex this file re-derives and could drift from.
import { isValidSyncCode } from "../site/js/sync-code.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

const DEFAULT_VENUE = "rs-satay-noodle-house";

const HELP = `Faves sync check — verify cross-device sync in two real browsers.

  node tools/sync_check.mjs [options]

Serves site/ locally, launches TWO independent headless Chrome profiles
(device A, device B) against a throwaway --user-data-dir each, and a local
fake blob server standing in for the deployed Cloudflare Worker. Drives the
real Settings UI on each device — turn on sync, join with a code, heart/rate
a dish, sync — and asserts data actually crosses between the two, and that a
removal crosses too rather than being re-added.

Options:
  --id <venue-id>     Restaurant to test (default: ${DEFAULT_VENUE}); needs
                       at least two menu items.
  --port <n>          Port for the local static site server (default: free).
  --blob-port <n>     Port for the fake blob server (default: free).
  --headed            Show both browser windows (for watching them work).
  --keep-profile      Leave both temporary Chrome profiles behind, and say
                       where.
  --verbose           Print every step, not just the assertions.
  -h, --help          This message.

Exit status: 0 all assertions passed; 1 an assertion failed; 2 the harness
itself could not run (no Chrome, port in use, page never rendered).

Requires Google Chrome (set FAVES_CHROME to point elsewhere). No npm install —
the site ships build-less and this tool adds no dependency to it (ADR 0001).`;

// --- Arguments ------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    id: DEFAULT_VENUE,
    port: 0,
    blobPort: 0,
    headed: false,
    keepProfile: false,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--port") opts.port = Number(argv[++i]);
    else if (a === "--blob-port") opts.blobPort = Number(argv[++i]);
    else if (a === "--headed") opts.headed = true;
    else if (a === "--keep-profile") opts.keepProfile = true;
    else if (a === "--verbose") opts.verbose = true;
    else throw new Error(`unknown option: ${a} (try --help)`);
  }
  if (!opts.id) throw new Error("--id needs a venue id");
  if (!Number.isInteger(opts.port) || opts.port < 0) throw new Error("--port needs a number");
  if (!Number.isInteger(opts.blobPort) || opts.blobPort < 0) {
    throw new Error("--blob-port needs a number");
  }
  return opts;
}

// --- The fake blob server ---------------------------------------------------
// Implements exactly the contract the brief specifies, in-memory, in this
// process — no filesystem, no persistence across runs.
//
//   GET  /v1/blob/<32-hex-id>  -> 200 + body + ETag header, or 404
//   PUT  /v1/blob/<32-hex-id>  -> 204; honours If-Match, 412 on mismatch
//   OPTIONS                   -> permissive CORS preflight
//
// CORS is load-bearing, not decorative: the static site server and this one
// listen on different loopback ports, so every request the page makes here is
// cross-origin. Access-Control-Expose-Headers is the subtle part — without it
// a cross-origin fetch() cannot read the ETag header at all (it isn't one of
// the handful of "simple response headers" exposed by default), and sync.js's
// If-Match logic would silently degrade to "never seen an ETag".
function startFakeBlobServer(port) {
  const blobs = new Map(); // id -> { body: Buffer, etag: string }
  let nextEtag = 1;

  const server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, If-Match");
    res.setHeader("Access-Control-Expose-Headers", "ETag");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const m = /^\/v1\/blob\/([0-9a-f]{32})$/.exec(req.url || "");
    if (!m) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
      return;
    }
    const id = m[1];

    if (req.method === "GET") {
      const entry = blobs.get(id);
      if (!entry) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "application/octet-stream", ETag: entry.etag });
      res.end(entry.body);
      return;
    }

    if (req.method === "PUT") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        const ifMatch = req.headers["if-match"];
        const entry = blobs.get(id);
        if (ifMatch && (!entry || entry.etag !== ifMatch)) {
          res.writeHead(412);
          res.end();
          return;
        }
        const etag = `"${nextEtag++}"`;
        blobs.set(id, { body, etag });
        res.writeHead(204);
        res.end();
      });
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("method not allowed");
  });

  return new Promise((resolveP, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () =>
      resolveP({ server, port: server.address().port, blobs })
    );
  });
}

/** The fetch shim, injected before any page script runs. Only requests whose
 *  path contains "/v1/blob/" are redirected — matched on the path, not the
 *  hardcoded endpoint host, so this stays correct even if sync.js's
 *  SYNC_ENDPOINT constant changes. Every other request (site assets, sw.js)
 *  passes through the real fetch untouched. Counts intercepted calls on
 *  `window.__favesSyncFetchCount` so the malformed-code assertion can prove a
 *  network call never happened, not just that the UI looks right. */
function fetchShimSource(fakeBlobPort) {
  return `(() => {
    const real = window.fetch.bind(window);
    window.__favesSyncFetchCount = 0;
    const FAKE_ORIGIN = "http://127.0.0.1:${fakeBlobPort}";
    window.fetch = function (input, init) {
      const isRequest = typeof Request !== "undefined" && input instanceof Request;
      let url = typeof input === "string" ? input : isRequest ? input.url : String(input);
      if (url.indexOf("/v1/blob/") !== -1) {
        window.__favesSyncFetchCount++;
        const path = url.replace(/^https?:\\/\\/[^/]+/, "");
        const rewritten = FAKE_ORIGIN + path;
        input = isRequest ? new Request(rewritten, input) : rewritten;
      }
      return real(input, init);
    };
  })();`;
}

// --- Page-side expressions ---------------------------------------------------

const dishStateExpr = (name) => `(() => {
  const wanted = ${JSON.stringify(name.toLowerCase())};
  const li = [...document.querySelectorAll("li.dish")].find((d) => d.dataset.name === wanted);
  if (!li) return null;
  const heart = li.querySelector(".dish-actions .heart");
  const slider = li.querySelector(".dish-rating .rating-slider");
  return {
    heart: heart ? heart.getAttribute("aria-pressed") : null,
    rating: slider ? slider.getAttribute("aria-valuenow") : null,
  };
})()`;

const heartSelector = (name) =>
  `li.dish[data-name=${JSON.stringify(name.toLowerCase())}] .dish-actions .heart`;
const sliderSelector = (name) =>
  `li.dish[data-name=${JSON.stringify(name.toLowerCase())}] .dish-rating .rating-slider`;

// Reads the raw store directly rather than only the DOM, so the "replaces,
// doesn't duplicate" assertion can see the actual shape of what got written —
// a bug that left a stray second key (rather than the wrong value) would be
// invisible to a DOM read of one slider's aria-valuenow.
const rawStoreExpr = `(() => {
  let fav = [], rat = {};
  try { fav = JSON.parse(localStorage.getItem("faves.p.default.favourites.v1") || "[]"); } catch {}
  try { rat = JSON.parse(localStorage.getItem("faves.p.default.ratings.v1") || "{}"); } catch {}
  return { favCount: fav.length, ratingKeys: Object.keys(rat).sort(), ratings: rat };
})()`;

const syncStatusExpr = `(() => {
  const s = document.querySelector(".sync-body [role=status]");
  return s ? s.textContent : null;
})()`;

// --- Small driving helpers, shared by both devices --------------------------

/** See the file header ("KNOWN OPEN ISSUE"). The overflow button sits in
 *  normal document flow (not fixed/sticky), so anything that scrolls the page
 *  — notably a rating slider's own `.focus()`, which the browser scrolls into
 *  view by default — can carry it off-screen; this has been observed to make
 *  the very next click on it land unreliably even after scrolling back. The
 *  blur+scrollTo below is a partial mitigation (it fixes the common case) but
 *  did not fix every case seen while building this check — see the header. */
async function openSettings(d) {
  await d.evalPage(`(() => { document.activeElement?.blur(); window.scrollTo(0, 0); })()`);
  await d.click("#overflow-btn");
  await until(
    async () =>
      d.evalPage(`document.getElementById("overflow-btn")?.getAttribute("aria-expanded") === "true"`),
    { label: "the overflow menu (⋯) to open" }
  );
  await d.click("#settings-btn");
  await until(async () => d.evalPage(`!!document.querySelector("dialog.settings-sheet[open]")`), {
    label: "the Settings sheet to open",
  });
}

async function openSyncPanel(d) {
  await openSettings(d);
  await d.click(".settings-row", "Sync across your devices");
  await until(async () => d.evalPage(`!!document.querySelector(".sync-body")`), {
    label: "the Sync panel to render",
  });
}

async function closeSettings(d) {
  await d.click(".settings-close");
  await until(
    async () => !(await d.evalPage(`!!document.querySelector("dialog.settings-sheet[open]")`)),
    { label: "the Settings sheet to close" }
  );
}

/** Turn on sync from the "off" view, capture the minted code, dismiss the
 *  reveal, and leave Settings closed (so the dish rows behind it — inert while
 *  the modal <dialog> is open — are interactable again). */
async function turnOnSync(d, report, label) {
  await openSyncPanel(d);
  await d.click(".sync-body .settings-reset", "Turn on sync");
  await until(async () => d.evalPage(`!!document.querySelector(".sync-body .sync-code-display")`), {
    label: "the sync code to render",
    timeout: 15_000,
  });
  const code = await d.evalPage(`document.querySelector(".sync-body .sync-code-display").textContent`);
  report.check(
    `[${label}] turning on sync mints a well-formed code`,
    isValidSyncCode(code),
    `code="${code}"`
  );
  await d.click(".sync-body .profile-btn-primary", "I’ve saved it");
  await closeSettings(d);
  return code;
}

/** A single checksum-invalid but syntactically plausible code, deterministic
 *  from a real one — flips the first character to every other alphabet symbol
 *  until the app's OWN validator (isValidSyncCode) rejects it. Proves the UI
 *  catches a genuine checksum mismatch, not just a wrong length. */
function malformedCode(validCode) {
  const flat = validCode.replace(/-/g, "");
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  for (const ch of alphabet) {
    if (ch === flat[0]) continue;
    const candidate = ch + flat.slice(1);
    if (!isValidSyncCode(candidate)) return candidate;
  }
  throw new Error("could not construct a malformed code from " + validCode);
}

/** From the "off" view: type a malformed code (assert it's rejected, and that
 *  rejection never reaches the network), then the real one (assert it's
 *  accepted). Leaves Settings closed. */
async function joinSync(d, report, label, realCode) {
  await openSyncPanel(d);
  await d.click(".sync-body .profile-btn", "Use an existing code");
  await until(async () => d.evalPage(`!!document.querySelector("#sync-join-code")`), {
    label: "the join input to render",
  });

  // --- a malformed code first ------------------------------------------
  await d.click("#sync-join-code");
  const before = await d.evalPage(`window.__favesSyncFetchCount`);
  await d.insertText(malformedCode(realCode));
  await d.settle();
  const rejected = await d.evalPage(`(() => {
    const btn = document.querySelector(".sync-body .profile-btn-primary");
    const err = document.querySelector(".sync-body .import-blocked");
    return { disabled: btn ? btn.disabled : null, errorText: err ? err.textContent : "" };
  })()`);
  const afterBad = await d.evalPage(`window.__favesSyncFetchCount`);
  report.check(
    `[${label}] a malformed code is rejected by the UI before any network call`,
    rejected.disabled === true && rejected.errorText.length > 0 && afterBad === before,
    `Join disabled=${rejected.disabled}, error="${rejected.errorText}", fetches while typing=${afterBad - before}`
  );

  // --- clear, then the real code ----------------------------------------
  await d.evalPage(
    `(() => { const el = document.querySelector("#sync-join-code"); el.value = ""; ` +
      `el.dispatchEvent(new Event("input", { bubbles: true })); })()`
  );
  await d.click("#sync-join-code");
  await d.insertText(realCode);
  await d.settle();
  const enabled = await d.evalPage(
    `document.querySelector(".sync-body .profile-btn-primary").disabled === false`
  );
  report.check(`[${label}] the real code from the other device is accepted as well-formed`, enabled);

  await d.click(".sync-body .profile-btn-primary", "Join");
  await until(async () => !(await d.evalPage(`!!document.querySelector("#sync-join-code")`)), {
    label: "the join to be accepted",
    timeout: 15_000,
  });
  report.check(
    `[${label}] joining leaves the "enter a code" view for the "on" view`,
    true
  );
  await closeSettings(d);
}

/** Open the sync panel, tap "Sync now", wait for the engine to leave SYNCING,
 *  read the status text, and close Settings again. No reload: sync.js now
 *  re-points the live favourites/ratings/settings stores itself after a pull
 *  (site/js/sync-start.js's `onApplied` hook), so this check can assert the
 *  crossing live, on the already-open page — the stronger claim, and the one
 *  this file originally set out to prove. Returns the settled status line —
 *  "Syncing…" never included, by construction of the wait. */
async function syncNowAndWait(d) {
  await openSyncPanel(d);
  await d.click(".sync-body .settings-reset", "Sync now");
  await until(
    async () => {
      const t = await d.evalPage(syncStatusExpr);
      return t !== null && t !== "Syncing…" ? t : null;
    },
    { label: "the sync to settle", timeout: 15_000 }
  );
  const text = await d.evalPage(syncStatusExpr);
  await closeSettings(d);
  return text;
}

async function dishState(d, name) {
  return d.evalPage(dishStateExpr(name));
}

async function toggleHeart(d, name) {
  await d.click(heartSelector(name));
}

/** Focus the slider and drive it purely by keyboard — Home always lands on 1
 *  (ratings-ui.js), then ArrowUp steps up, so the result is deterministic
 *  regardless of the slider's current value or where a click would have
 *  landed on it. Focus is set directly rather than via a click because the
 *  slider's own pointerdown handler calls preventDefault(), which suppresses
 *  the browser's default click-to-focus behaviour. */
async function setRating(d, name, target) {
  await d.evalPage(`document.querySelector(${JSON.stringify(sliderSelector(name))}).focus()`);
  await d.press("Home");
  for (let i = 1; i < target; i++) await d.press("ArrowUp");
}

// --- One device's browser, wired up ------------------------------------------

async function openDevice({ label, profileDir, headed, siteUrl, fakeBlobPort, report }) {
  const chrome = await launchChrome({ profileDir, headed, width: 390, height: 844 });
  const cdp = await Cdp.connect(chrome.wsUrl);
  report.step(`[${label}] connected to Chrome`);

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
    sessionId
  );
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    { source: fetchShimSource(fakeBlobPort) },
    sessionId
  );
  // A sync that actually applied re-points the live favourites/ratings/settings
  // stores (site/js/sync-start.js's onApplied hook, added specifically because
  // this check found its absence), and settings.reload() is documented
  // (profiles.js) to fire menu.js's SAFETY-CRITICAL reapply() — a full rebuild
  // of the dish list, wrapped in captureUiState/restoreUiState so scroll
  // position and focus survive it. That rebuild is asynchronous relative to
  // "Sync now" settling in the panel, so an interaction fired immediately
  // afterwards (in practice: focusing a rating slider, which the browser
  // scrolls into view) can race a still-in-flight restoreUiState() and end up
  // with a click landing at the wrong scroll position, or on an element the
  // rebuild is about to replace. A real person could hit the same race by
  // acting fast right after their own device finishes syncing — so this is
  // observed and waited out (`waitQuiet`, below), not swept under a fixed
  // sleep. The observer counts DOM mutations under <body>; `waitQuiet` polls
  // until the count stops moving.
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    {
      source: `(() => {
        window.__mutations = 0;
        new MutationObserver((recs) => { window.__mutations += recs.length; })
          .observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      })();`,
    },
    sessionId
  );

  const driver = createDriver(cdp, sessionId, (m) => report.step(`[${label}] ${m}`));
  const waitForMenu = (why) =>
    until(async () => (await driver.evalPage("document.querySelectorAll('li.dish').length")) > 0, {
      label: `[${label}] the menu to render${why ? ` (${why})` : ""}`,
    });
  const d = {
    ...driver,
    insertText: (text) => cdp.send("Input.insertText", { text }, sessionId),
    /** Wait until the page has stopped mutating itself — see the comment on
     *  the MutationObserver above. Polls rather than sleeping a fixed period
     *  (a fixed sleep is exactly the kind of time-dependent wait this file's
     *  header promises not to need), and gives up after `timeout` rather than
     *  hanging forever if something is mutating continuously. */
    waitQuiet: async (timeout = 5000) => {
      let last = -1;
      let stableSince = null;
      const deadline = Date.now() + timeout;
      for (;;) {
        const now = await driver.evalPage("window.__mutations");
        if (now === last) {
          if (stableSince === null) stableSince = Date.now();
          if (Date.now() - stableSince >= 200) return;
        } else {
          last = now;
          stableSince = null;
        }
        if (Date.now() > deadline) return; // best-effort — proceed rather than hang
        await new Promise((r) => setTimeout(r, 50));
      }
    },
  };

  await cdp.send("Page.navigate", { url: siteUrl }, sessionId);
  await waitForMenu();

  return { chrome, cdp, d };
}

// --- Runner -------------------------------------------------------------

async function run(opts) {
  const report = new Report(opts.verbose);

  const venuePath = join(SITE, "data", "restaurants", `${opts.id}.json`);
  const venue = JSON.parse(await readFile(venuePath, "utf8"));
  const items = (venue.menu || []).flatMap((s) => s.items || []);
  if (items.length < 2) {
    throw new Error(`${opts.id} needs at least two menu items — pick another --id`);
  }
  const DISH_X = items[0].name; // hearted + rated: the headline crossing
  const DISH_Y = items[1].name; // only ever touched after the server goes dark

  const { server: siteServer, port: sitePort } = await startServer(opts.port, SITE);
  const { server: blobServer, port: blobPort } = await startFakeBlobServer(opts.blobPort);
  const siteUrl = `http://127.0.0.1:${sitePort}/restaurant.html?id=${encodeURIComponent(opts.id)}`;

  const profileDirA = await mkdtemp(join(tmpdir(), "faves-sync-check-a-"));
  const profileDirB = await mkdtemp(join(tmpdir(), "faves-sync-check-b-"));
  let A = null;
  let B = null;

  try {
    console.log(`Faves sync check — cross-device sync`);
    console.log(`  venue      ${venue.name} (${opts.id})`);
    console.log(`  dish X     ${DISH_X}  (hearted + rated)`);
    console.log(`  dish Y     ${DISH_Y}  (touched only once the server is down)`);
    console.log(`  page       ${siteUrl}`);
    console.log(`  fake blob  http://127.0.0.1:${blobPort}/v1/blob/<id>`);
    console.log(`  profile A  ${profileDirA}`);
    console.log(`  profile B  ${profileDirB}\n`);

    A = await openDevice({
      label: "A",
      profileDir: profileDirA,
      headed: opts.headed,
      siteUrl,
      fakeBlobPort: blobPort,
      report,
    });
    B = await openDevice({
      label: "B",
      profileDir: profileDirB,
      headed: opts.headed,
      siteUrl,
      fakeBlobPort: blobPort,
      report,
    });

    // --- 1. Device A turns sync on ---------------------------------------
    const code = await turnOnSync(A.d, report, "A");

    // --- 2. Device B joins with that code (malformed-code check inline) --
    await joinSync(B.d, report, "B", code);

    // --- 3. A heart + rating made on A crosses to B ----------------------
    await toggleHeart(A.d, DISH_X);
    await setRating(A.d, DISH_X, 4);
    const aAfterHeart = await dishState(A.d, DISH_X);
    report.step(`A: ${DISH_X} heart=${aAfterHeart.heart} rating=${aAfterHeart.rating}`);
    const pushStatus = await syncNowAndWait(A.d);
    report.check(
      "A's push after hearting + rating succeeds",
      !/couldn.t|doesn.t match/i.test(pushStatus || ""),
      `status: "${pushStatus}"`
    );

    await syncNowAndWait(B.d);
    const bAfterPull1 = await dishState(B.d, DISH_X);
    report.check(
      "a heart made on A appears on B after a sync",
      bAfterPull1.heart === "true",
      `B sees ${DISH_X}: heart=${bAfterPull1.heart}`
    );
    report.check(
      "a rating made on A appears on B after the same sync",
      bAfterPull1.rating === "4",
      `B sees ${DISH_X}: rating=${bAfterPull1.rating}`
    );

    // --- 4. A heart REMOVED on A is removed on B, not re-added -----------
    await toggleHeart(A.d, DISH_X); // was on, now off
    const aAfterUnheart = await dishState(A.d, DISH_X);
    report.check(
      "un-hearting actually clears the heart on A before it's even synced",
      aAfterUnheart.heart === "false",
      `A sees ${DISH_X}: heart=${aAfterUnheart.heart}`
    );
    await syncNowAndWait(A.d);
    await syncNowAndWait(B.d);
    const bAfterPull2 = await dishState(B.d, DISH_X);
    report.check(
      "a heart removed on A is removed on B, not re-added",
      bAfterPull2.heart === "false",
      `B sees ${DISH_X}: heart=${bAfterPull2.heart} (was "true" before this sync)`
    );
    report.check(
      "the rating survives the heart's removal — the two stores don't cross-contaminate",
      bAfterPull2.rating === "4",
      `B sees ${DISH_X}: rating=${bAfterPull2.rating}`
    );

    // --- 5. A rating CHANGED on A replaces (not duplicates) on B ---------
    await setRating(A.d, DISH_X, 2);
    await syncNowAndWait(A.d);
    await syncNowAndWait(B.d);
    const bAfterPull3 = await dishState(B.d, DISH_X);
    const bRaw = await B.d.evalPage(rawStoreExpr);
    report.check(
      "a rating changed on A replaces the old value on B",
      bAfterPull3.rating === "2",
      `B sees ${DISH_X}: rating=${bAfterPull3.rating} (was "4")`
    );
    report.check(
      "the replacement is a real replace, not a second entry alongside the first",
      bRaw.ratingKeys.length === 1,
      `B's raw ratings store holds ${bRaw.ratingKeys.length} key(s): ${JSON.stringify(bRaw.ratings)}`
    );

    // --- 6. Turning sync off on B leaves B's own data intact -------------
    const bBeforeOff = await dishState(B.d, DISH_X);
    const bRawBeforeOff = await B.d.evalPage(rawStoreExpr);
    await openSyncPanel(B.d);
    await B.d.click(".sync-body .profile-btn", "Turn off sync on this device");
    await B.d.click(".sync-body .profile-btn-primary", "Turn off");
    await until(
      async () => B.d.evalPage(`!!document.querySelector(".sync-body .settings-reset")`),
      { label: "B's sync panel to return to the \"off\" view" }
    );
    const offViewText = await B.d.evalPage(`document.querySelector(".sync-body .settings-reset").textContent`);
    report.check(
      `B's sync panel reads "off" again`,
      offViewText === "Turn on sync",
      `button reads "${offViewText}"`
    );
    await closeSettings(B.d);
    const bAfterOff = await dishState(B.d, DISH_X);
    const bRawAfterOff = await B.d.evalPage(rawStoreExpr);
    report.check(
      "turning off sync on B leaves B's own heart/rating data untouched",
      bAfterOff.heart === bBeforeOff.heart &&
        bAfterOff.rating === bBeforeOff.rating &&
        bRawAfterOff.favCount === bRawBeforeOff.favCount &&
        JSON.stringify(bRawAfterOff.ratings) === JSON.stringify(bRawBeforeOff.ratings),
      `before: heart=${bBeforeOff.heart} rating=${bBeforeOff.rating} fav=${bRawBeforeOff.favCount}; ` +
        `after: heart=${bAfterOff.heart} rating=${bAfterOff.rating} fav=${bRawAfterOff.favCount}`
    );

    // --- 7. malformed-code UI rejection was already proven in joinSync() --
    report.step("malformed-code rejection asserted during B's join, above");

    // --- 8. the fake server goes dark — the app must not break -----------
    await new Promise((resolveP, reject) => {
      blobServer.close((err) => (err ? reject(err) : resolveP()));
    });
    const darkStatus = await syncNowAndWait(A.d);
    const EXPECTED_UNREACHABLE = "Couldn’t reach sync just now. Your data is safe on this device.";
    report.check(
      "with the fake server unreachable, sync fails with the app's own calm message",
      darkStatus === EXPECTED_UNREACHABLE,
      `status: "${darkStatus}"`
    );
    await toggleHeart(A.d, DISH_Y);
    const aStillWorks = await dishState(A.d, DISH_Y);
    const stillRendered = await A.d.evalPage("document.querySelectorAll('li.dish').length");
    report.check(
      "the app itself keeps working while sync is unreachable — hearting still works, the menu is still there",
      aStillWorks.heart === "true" && stillRendered > 0,
      `${DISH_Y}: heart=${aStillWorks.heart}, ${stillRendered} dishes still rendered`
    );

    console.log(`\n${report.failed ? "FAILED" : "OK"} — ${report.passed} passed, ${report.failed} failed`);
    return report.failed ? 1 : 0;
  } finally {
    A?.cdp?.close();
    B?.cdp?.close();
    await stopChrome(A?.chrome?.proc);
    await stopChrome(B?.chrome?.proc);
    siteServer.closeAllConnections?.();
    await new Promise((r) => siteServer.close(r));
    // blobServer may already be closed (assertion 8) — closing twice is a
    // harmless no-op error we can ignore.
    await new Promise((r) => blobServer.close(() => r()));
    if (opts.keepProfile) {
      console.log(`Chrome profile A kept at ${profileDirA}`);
      console.log(`Chrome profile B kept at ${profileDirB}`);
    } else {
      await rm(profileDirA, { recursive: true, force: true });
      await rm(profileDirB, { recursive: true, force: true });
    }
  }
}

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(2);
}
if (opts.help) {
  console.log(HELP);
  process.exit(0);
}
try {
  process.exit(await run(opts));
} catch (err) {
  // A harness failure is not an app verdict — exit 2 so the two never blur.
  console.error(`\nharness error: ${err.message}`);
  process.exit(2);
}
