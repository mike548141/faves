#!/usr/bin/env node
// Faves sync check — cross-device sync (ROADMAP Theme 9 v2, ADR 0017, ADR
// 0060), driven through TWO real browsers at once. Fifth of the family after
// device_check, cook_check, addon_check and branch_check, on the same harness
// (tools/lib/browser.mjs).
//
//     node tools/sync_check.mjs             # headless, exit 0 = pass
//     node tools/sync_check.mjs --help
//
// CURRENT STATUS — the run reaches the end. 40 assertions, all passing, in a
// real two-browser run (2026-10-02: +8 for the banner while sync waits for an
// answer, 510/430 — the header said 33 but the run printed 32 before it; +3 for the sync log, 510/380, and +4 for
// the no-base question, 510/390; 26 from 2026-09-30, 22 from 2026-09-20, +4
// with roadmap 510/050's personal recipes in buckets; 16 until then, +6 with
// ADR 0118 —
// three for the allergen key an older build drops, three for the error
// view's way out). Read the verdict the same way regardless: a harness abort is exit 2,
// not exit 1 (see "the verdict" in tools/lib/browser.mjs), so an abort leaves
// the assertions after it ABSENT, not failed, and the run still looks orderly.
// Trust nothing until the run has printed its own final "OK/FAILED — N passed,
// N failed" summary line, and check that N is 40 — a *shrunken* N is the shape
// this file failed in for however long nobody ran it.
//
// HOW THIS FILE WENT DECORATIVE, because the next refactor will try it again.
// Commit e745923 ("settings: remove Transfer to another device, and fold Sync
// into Your data") demoted Sync from a top-level `.settings-row` to a
// `<p class="settings-sub">` inside the Your-data panel. openSyncPanel() still
// clicked the old row, so the check died at its FIRST UI interaction with zero
// PASS lines — and CI stayed green, because exit 2 is not a failed assertion.
// Two counters were fitted rather than more care: every Settings selector now
// lives in the single `NAV` block below, and every navigation move is wrapped
// in `nav()` so a break names the step and points at NAV.
//
// THE OLD "KNOWN OPEN ISSUE" IS CLOSED, AND ITS DIAGNOSIS WAS WRONG. The
// header used to record an overflow-menu race, blamed on menu.js's reapply()
// dispatching asynchronously after a sync, and flagged as a hazard a real
// person could hit. Re-measured 2026-08-17 with the selector fixed: the check
// aborted at "the overflow menu (⋯) to open" on three consecutive runs, at
// three different points — and it was this file's own doing, twice over.
//
//   1. `window.scrollTo(0, 0)` — the TWO-ARGUMENT form — obeys app.css's
//      `html { scroll-behavior: smooth }` (which applies here, because
//      headless Chrome reports prefers-reduced-motion: no-preference). It
//      returned with the page still animating. That is the whole of the old
//      trace's mystery: "scrollY:879 immediately AFTER scrollTo(0,0) had run,
//      then scrollY:0 on the next read" is one unfinished scroll, not
//      something scrolling the page a second time. ui-state.js's
//      restoreScroll() documents the identical trap.
//   2. The contact bar. Scrolling from deep in the menu back to the top makes
//      initContactBar()'s IntersectionObserver fire on a LATER frame, hiding
//      the bar and dropping body.contact-bar-open — a layout change landing
//      between this file's rect read and its mouse dispatch. Instrumented, the
//      failing click showed `mousedown` and `mouseup` 39 ms apart resolving to
//      a click on `body.menu-page` rather than the ⋯ glyph, while a programmatic
//      `.click()` on the same button worked immediately. The button was fine;
//      the coordinates had gone stale under it.
//
// So the previously-suspected product hazard is NOT evidenced here. The
// asynchrony is real, but it belongs to a scroll-driven observer doing its job,
// and it only ever bit a robot clicking at a remembered pixel. Nothing was
// changed in site/js/ to make this pass. Honest residue: the old trace's third
// observation — aria-expanded reading as TWO open/close cycles from one click —
// was never reproduced in 2026-08-17's runs, so it is unexplained rather than
// disproved. Every failure seen here had aria-expanded never move at all.
//
// NARROWED 2026-08-17 (second look, no code change): the shipped app has no
// mechanism that could produce it, so whatever the old trace read, it was not
// a person's click toggling the menu twice. One activation cannot move
// aria-expanded twice — overflow-ui.js's setOpen() returns early on
// `open === isOpen()` — so two cycles need TWO click listeners on the button.
// There is exactly one binding, and it is reachable exactly once per page:
// each page loads a single entry module (app.js / menu.js / recipe.js), each
// calls initOverflowMenu() once, and none of them has a re-init path. In
// particular the mechanism the old diagnosis named is not one: menu.js's
// reapply() is a settings SUBSCRIBER that re-renders dishes — it never
// re-runs initChrome() — and sync-ui.js's render() rebuilds only its own
// panel, never the header chrome. That leaves the reading itself (a poll
// spanning the tool's next interaction, which pointerdown-closes the menu via
// onOutside) as the likelier author of a "second cycle". Still not reproduced,
// so still not proven — but the product hazard now has nowhere to live.
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

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import {
  Cdp,
  Report,
  createDriver,
  exitFromError,
  launchChrome,
  need,
  startServer,
  stopChrome,
  untilPresent,
  untilStable,
} from "./lib/browser.mjs";
// Pure, DOM-free (sync-code.js's own header) — safe to run in Node, the same
// way tools/cook_check.mjs already imports site/js/slug.js. Read-only reuse of
// the app's own validator, so "well-formed" here means exactly what the app
// means by it, not a regex this file re-derives and could drift from.
import { isValidSyncCode } from "../site/js/sync-code.js";
import { foldSearchText } from "../site/js/search.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

const DEFAULT_VENUE = "rs-satay-noodle-house";

/** The build the pages under test run, as the sync log should name it
 *  (roadmap 510/380). Read from sw.js, never typed here, so a bump cannot
 *  leave this check asserting last week's number. */
const SHELL_VERSION = /^const SHELL_VERSION = "([^"]+)";/m.exec(readFileSync(join(SITE, "sw.js"), "utf8"))?.[1];

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
//   PUT  /v1/blob/<32-hex-id>  -> 204 + ETag; honours If-Match, 412 on mismatch
//   OPTIONS                   -> permissive CORS preflight
//
// And the recipe buckets (roadmap 510/050, worker/sync-worker.js): the same
// two verbs on `<32-hex-id>:r<n>`, and a GET of the core copy carrying
// `?buckets=<n>` reports each existing bucket's version in X-Faves-Buckets
// (`r0="<etag>",…`, or `none`) — on a 404 as well, exactly as the Worker does.
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
    res.setHeader("Access-Control-Expose-Headers", "ETag, X-Faves-Buckets");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const m = /^\/v1\/blob\/([0-9a-f]{32}(?::r(?:0|[1-9][0-9]?))?)(?:\?(.*))?$/.exec(req.url || "");
    if (!m) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
      return;
    }
    const id = m[1];
    const asked = !id.includes(":") ? Number(new URLSearchParams(m[2] || "").get("buckets")) : 0;

    if (req.method === "GET") {
      const report = {};
      if (Number.isInteger(asked) && asked > 0) {
        const found = [];
        for (let k = 0; k < Math.min(asked, 16); k += 1) {
          const b = blobs.get(`${id}:r${k}`);
          if (b) found.push(`r${k}=${b.etag}`);
        }
        report["X-Faves-Buckets"] = found.length ? found.join(",") : "none";
      }
      const entry = blobs.get(id);
      if (!entry) {
        res.writeHead(404, report);
        res.end();
        return;
      }
      res.writeHead(200, { ...report, "Content-Type": "application/octet-stream", ETag: entry.etag });
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
        // As strict as the real Worker (sync-worker.js handlePut): a blob that
        // exists is overwritten ONLY with a matching If-Match. A missing one
        // is refused too — that is what a client that could not read the ETag
        // sends, and until 2026-08-17 this fake accepted it, so a browser that
        // never saw the header still looked synced here while the deployed
        // Worker answered every second write with 412.
        if (entry && (!ifMatch || entry.etag !== ifMatch)) {
          res.writeHead(412);
          res.end();
          return;
        }
        if (!entry && ifMatch) {
          res.writeHead(412);
          res.end();
          return;
        }
        const etag = `"${nextEtag++}"`;
        blobs.set(id, { body, etag });
        res.writeHead(204, { ETag: etag });
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

// The sync history as the Settings panel draws it (roadmap 510/380): each
// entry's heading and words, whether the toggle says it is open, and the
// smallest visible control's height (a target under 44 px fails WCAG 2.2's
// spacing rule on a phone).
const syncLogExpr = () => `(() => {
  const items = [...document.querySelectorAll(".sync-log-entry")];
  const t = document.querySelector(${JSON.stringify(NAV.logToggle)});
  const btns = [...document.querySelectorAll(".sync-log-wrap button")].filter((b) => b.getClientRects().length);
  return {
    n: items.length,
    expanded: t ? t.getAttribute("aria-expanded") : null,
    heads: items.map((li) => li.querySelector(".sync-log-head")?.textContent || ""),
    text: items.map((li) => li.textContent).join(" | "),
    minH: btns.length ? Math.min(...btns.map((b) => Math.round(b.getBoundingClientRect().height))) : 0,
  };
})()`;

const syncStatusExpr = `(() => {
  const s = document.querySelector(".sync-body [role=status]");
  return s ? s.textContent : null;
})()`;

// The flagged-allergen list as it stands ON DISK, not as a chip row renders it.
// That is deliberate and it is the whole point of the ADR 0118 assertions: the
// key under test is one this build has no chip for, so a DOM read of the
// allergen chips cannot see it at all — present or absent, the row looks
// identical. Only the store can say whether the flag still exists.
const avoidExpr = `(() => {
  try {
    const s = JSON.parse(localStorage.getItem("faves.p.default.settings.v1") || "{}");
    const a = (s.diet || {}).avoid;
    return Array.isArray(a) ? a : [];
  } catch { return []; }
})()`;

/** Write an allergen list straight into a device's store, the way a pull from
 *  a NEWER build would have left it, and reload so the live settings store
 *  hydrates from it. Seeded rather than clicked because the key under test is
 *  by definition one no chip on this build can set. */
const seedAvoidExpr = (keys) => `(() => {
  const KEY = "faves.p.default.settings.v1";
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch {}
  s.diet = { dietary: (s.diet && s.diet.dietary) || [], avoid: ${JSON.stringify(keys)} };
  localStorage.setItem(KEY, JSON.stringify(s));
  return true;
})()`;

// --- Small driving helpers, shared by both devices --------------------------

// EVERY selector used to WALK the Settings UI lives here, in one block, and
// nowhere else in this file. That is the whole lesson of 2026-08-16: commit
// e745923 ("settings: remove Transfer to another device, and fold Sync into
// Your data") demoted Sync from a top-level `.settings-row` to a
// `<p class="settings-sub">` inside the "Your data" panel, one hard-coded
// selector three functions down stopped matching, and this check went from
// eight passing assertions to *zero* without anyone noticing — CI is green
// either way, because a harness abort is exit 2, not a failed assertion.
// A refactor now breaks one line here, loudly and in one place, instead of
// silently emptying the guard.
const NAV = {
  overflowBtn: "#overflow-btn",
  settingsBtn: "#settings-btn",
  sheet: "dialog.settings-sheet[open]",
  closeBtn: ".settings-close",
  indexRow: ".settings-row",
  // Sync is a *section* inside this index row's panel, not a row of its own.
  syncTopic: "Your data",
  syncBody: ".sync-body",
  // The allergen chips (ADR 0118's assertions) live under their own index row,
  // a different drill-in from Sync's — so they get their own two entries here
  // rather than a selector buried three functions down, which is the mistake
  // this block exists to stop recurring.
  dietTopic: "Food preferences",
  avoidChip: ".pref-chips-avoid .pref-chip",
  // The sync log (roadmap 510/380) and the no-base question (510/390), both
  // inside the Sync section.
  logToggle: ".sync-log-wrap .profile-btn",
  noBaseHeading: "This device has favourites sync doesn’t",
  noBaseChoice: ".sync-body .import-choice",
};

/** Wrap one move of the Settings walk so a break names the STEP, not just a
 *  selector. The harness's own "no element matching X" is true and useless to
 *  anyone who doesn't already carry this UI in their head — it cannot tell a
 *  renamed control apart from a sheet that never opened, or say how far the
 *  walk got before it stopped. */
async function nav(step, looksFor, fn) {
  try {
    return await fn();
  } catch (err) {
    throw new Error(
      `Settings navigation broke at step "${step}" (looking for ${looksFor}) — ` +
        `has the Settings UI been refactored? Update NAV in tools/sync_check.mjs. ` +
        `Underlying: ${err.message}`
    );
  }
}

/** Present is not the same as reached. sync-ui.js builds `.sync-body` once, at
 *  construction time, and the "Your data" panel merely un-hides it — so a bare
 *  `querySelector(".sync-body")` is truthy while the reader is still staring at
 *  the index. Only a laid-out box proves the drill-in actually happened. */
const syncBodyVisibleExpr = `(() => {
  const b = document.querySelector(${JSON.stringify(NAV.syncBody)});
  return !!b && b.getClientRects().length > 0;
})()`;

/** Getting back to the header from wherever the last step left the page is the
 *  most fragile move in this file, and all three of its steps are here for a
 *  measured reason (see the header's diagnosis). The overflow button sits in
 *  normal document flow, so a rating slider's `.focus()` or a dish click deep
 *  in a 70-item menu carries it off-screen; scrolling back is asynchronous
 *  twice over — the scroll itself, then the observers that react to it. */
async function openSettings(d) {
  // `behavior: "instant"` is load-bearing, and its absence is what the header's
  // "KNOWN OPEN ISSUE" trace was actually recording. app.css smooth-scrolls the
  // document for anyone who hasn't asked for reduced motion — which headless
  // Chrome hasn't — and the two-argument `scrollTo(0, 0)` OBEYS that, returning
  // while the page is still animating. ui-state.js's restoreScroll() documents
  // the same trap for the same reason. That is why the old trace read
  // "scrollY:879 immediately AFTER scrollTo(0, 0) had already run", and then
  // "scrollY:0 by the time of the NEXT read": nothing was scrolling the page a
  // second time on its own — this line simply had not finished scrolling it the
  // first time.
  await d.evalPage(
    `(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, left: 0, behavior: "instant" }); })()`
  );
  // untilStable, not untilPresent: this waits for a SCROLL to come to rest, and
  // a scroll that has not finished yet is a statement about the machine, never
  // about the page's markup.
  await untilStable(async () => (await d.evalPage("window.scrollY")) === 0, {
    label: "the page to actually be back at the top",
  });
  // Landing at the top is not the same as being settled there. menu.js's
  // initContactBar() watches the contact card with an IntersectionObserver, so
  // arriving at the top hides the compact bar and drops body.contact-bar-open
  // on a LATER frame — a layout change that lands between the rect read inside
  // d.click() and the mouse event it then dispatches. Measured: without this
  // wait the click resolved to body.menu-page instead of the ⋯ glyph. Waiting for
  // the DOM to go quiet is the honest fix; a fixed sleep would be a wall-clock
  // wait, which this file's TIME-INDEPENDENCE promise rules out.
  await d.waitQuiet();
  await nav("open the overflow (⋯) menu", NAV.overflowBtn, async () => {
    await d.click(NAV.overflowBtn);
    await untilPresent(
      async () =>
        d.evalPage(
          `document.querySelector(${JSON.stringify(NAV.overflowBtn)})?.getAttribute("aria-expanded") === "true"`
        ),
      { label: "the overflow menu (⋯) to open" }
    );
  });
  await nav("open Settings from the ⋯ menu", NAV.settingsBtn, async () => {
    await d.click(NAV.settingsBtn);
    await untilPresent(async () => d.evalPage(`!!document.querySelector(${JSON.stringify(NAV.sheet)})`), {
      label: "the Settings sheet to open",
    });
  });
}

/** Settings → the "Your data" index row → the Sync section nested inside it.
 *  The sheet always reopens on the index (settings-ui.js closes back to it
 *  however it was dismissed), so the drill-in is repeated every time rather
 *  than assumed to have stuck. */
async function openSyncPanel(d) {
  await openSettings(d);
  await nav(
    `drill into the "${NAV.syncTopic}" panel`,
    `${NAV.indexRow} containing "${NAV.syncTopic}"`,
    () => d.click(NAV.indexRow, NAV.syncTopic)
  );
  await nav(
    `reach the Sync section inside "${NAV.syncTopic}"`,
    `a visible ${NAV.syncBody}`,
    () => untilPresent(async () => d.evalPage(syncBodyVisibleExpr), { label: "the Sync panel to render" })
  );
}

/** Settings → "Food preferences" → tap one allergen chip. A REAL settings
 *  write on this device, which is the step that matters: an older build only
 *  loses a key it doesn't know when it commits its own view of the list back
 *  over the top, and nothing else in this file makes a device do that. */
async function flagAllergen(d, key) {
  await openSettings(d);
  await nav(
    `drill into the "${NAV.dietTopic}" panel`,
    `${NAV.indexRow} containing "${NAV.dietTopic}"`,
    () => d.click(NAV.indexRow, NAV.dietTopic)
  );
  const sel = `${NAV.avoidChip}[data-key=${JSON.stringify(key)}]`;
  await nav(`flag the "${key}" allergen`, sel, async () => {
    await untilPresent(
      async () =>
        d.evalPage(
          `(() => { const c = document.querySelector(${JSON.stringify(sel)}); ` +
            `return !!c && c.getClientRects().length > 0; })()`
        ),
      { label: "the allergen chips to render" }
    );
    await d.click(sel);
  });
  // Flagging an allergen fires menu.js's safety-critical reapply() — a full
  // rebuild of the dish list. Let it finish before clicking anything else.
  await d.waitQuiet();
  await closeSettings(d);
}

async function closeSettings(d) {
  await nav("close the Settings sheet", NAV.closeBtn, async () => {
    await d.click(NAV.closeBtn);
    await untilPresent(
      async () => !(await d.evalPage(`!!document.querySelector(${JSON.stringify(NAV.sheet)})`)),
      { label: "the Settings sheet to close" }
    );
  });
}

/** A second tab on the same Chrome profile (the banner's "disappears in every
 *  tab" claim needs one). Gets the same fake-server shim as the first, or its
 *  sync would reach the real endpoint. Returns a driver and a close(). */
async function openExtraTab({ cdp, url, fakeBlobPort, report, label }) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchShimSource(fakeBlobPort) }, sessionId);
  const d = createDriver(cdp, sessionId, (m) => report.step(`[${label}] ${m}`));
  await cdp.send("Page.navigate", { url }, sessionId);
  await untilPresent(async () => d.evalPage(`document.readyState === "complete" && !!document.querySelector("main")`), {
    label: `[${label}] ${url} to render`,
  });
  return { d, targetId, close: () => cdp.send("Target.closeTarget", { targetId }) };
}

/** What the sync banner looks like on a page right now (510/430). */
const bannerExpr = `(() => {
  const b = document.querySelector(".sync-banner");
  if (!b) return null;
  const btn = b.querySelector("button");
  const cs = getComputedStyle(b);
  const r = b.getBoundingClientRect();
  // Everything else on the page that is laid out must start at or below the
  // banner's bottom edge: in flow, nothing underneath it.
  const others = [...document.body.children].filter((e) => e !== b && e.getBoundingClientRect().height > 0);
  const topOfRest = Math.min(...others.map((e) => e.getBoundingClientRect().top));
  return {
    text: b.querySelector("p").textContent,
    label: b.getAttribute("aria-label"),
    role: b.getAttribute("role"),
    btnText: btn.textContent,
    btnH: btn.getBoundingClientRect().height,
    position: cs.position,
    first: document.body.firstElementChild === b,
    bottom: r.bottom,
    topOfRest,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
})()`;

/** Turn on sync from the "off" view, capture the minted code, dismiss the
 *  reveal, and leave Settings closed (so the dish rows behind it — inert while
 *  the modal <dialog> is open — are interactable again). */
async function turnOnSync(d, report, label) {
  await openSyncPanel(d);
  await d.click(".sync-body .settings-reset", "Turn on sync");
  await untilPresent(async () => d.evalPage(`!!document.querySelector(".sync-body .sync-code-display")`), {
    label: "the sync code to render",
    timeout: 15_000,
  });
  const code = await d.evalPage(`${need(".sync-body .sync-code-display")}.textContent`);
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
  await untilPresent(async () => d.evalPage(`!!document.querySelector("#sync-join-code")`), {
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
    `${need(".sync-body .profile-btn-primary")}.disabled === false`
  );
  report.check(`[${label}] the real code from the other device is accepted as well-formed`, enabled);

  await d.click(".sync-body .profile-btn-primary", "Join");
  await untilPresent(async () => !(await d.evalPage(`!!document.querySelector("#sync-join-code")`)), {
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
  // untilStable, not untilPresent: the status line is already on the page — what
  // is being waited for is the engine LEAVING "Syncing…", which is a round trip
  // whose duration nothing promises. A slow one must never read as a regression.
  await untilStable(
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
  // "Sync now" settling in the panel. That rebuild is one of several things
  // this file must not click into the middle of; menu.js's contact-bar
  // IntersectionObserver is the one actually caught doing it (see the header).
  // Rather than name each source and time it, observe the page and wait for it
  // to stop changing — `waitQuiet`, below, polls this counter until it stops
  // moving. A fixed sleep would be a wall-clock wait, which this file's
  // TIME-INDEPENDENCE promise rules out.
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
    untilPresent(async () => (await driver.evalPage("document.querySelectorAll('li.dish').length")) > 0, {
      label: `[${label}] the menu to render${why ? ` (${why})` : ""}`,
    });
  const d = {
    ...driver,
    insertText: (text) => cdp.send("Input.insertText", { text }, sessionId),
    /** Reload the page and wait for the menu to be back. Needed only by the
     *  ADR 0118 assertions, which seed a store directly and then have to make
     *  the live singletons hydrate from it — settings.js reads storage once,
     *  at module construction. */
    reload: async (why) => {
      await cdp.send("Page.navigate", { url: siteUrl }, sessionId);
      await waitForMenu(why || "after a reload");
    },
    /** Open another page of the site (a recipe, roadmap 510/050) and wait for
     *  `readyExpr` to be truthy. `reload()` brings the menu back after. */
    goto: async (url, readyExpr, label) => {
      await cdp.send("Page.navigate", { url }, sessionId);
      await untilPresent(async () => driver.evalPage(readyExpr), { label: `[${label}] ${url} to render` });
    },
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

  return { chrome, cdp, d, targetId };
}

// --- Runner -------------------------------------------------------------

/**
 * Refuse a re-derived fixture dish that the page could confuse with another
 * (roadmap 28s). This check picks its dish from the data rather than naming
 * one, and finds it on the page by `li.dish[data-name]` — the FOLDED name
 * (menu.js sets `data-name = foldSearchText(item.name)`). Two rows folding
 * alike and the lookup takes the first, which is the wrong-line bug this
 * family exists to catch, asserted against the wrong row. A merge of ladder
 * rows (roadmap 28o) is the likeliest way to produce that, and nothing would
 * have said so. So say it before a browser is launched: exit 2, never a PASS.
 */
function refuseAmbiguousFixture(items, name, venueId) {
  const folded = foldSearchText(name);
  const alike = items.filter((i) => typeof i.name === "string" && foldSearchText(i.name) === folded);
  if (alike.length !== 1) {
    throw new Error(
      `${venueId}: the fixture dish "${name}" folds to "${folded}", which ${alike.length} rows share — ` +
        `the page lookup would take whichever comes first. Pick another --id.`
    );
  }
  if (folded !== name.toLowerCase()) {
    throw new Error(
      `${venueId}: the fixture dish "${name}" folds to "${folded}", not "${name.toLowerCase()}" — ` +
        `this check looks it up by the latter and would find nothing.`
    );
  }
}

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
  const DISH_Z = items[2]?.name; // hearted on B with no base: the no-base question (510/390)
  if (!DISH_Z) throw new Error(`${opts.id} needs at least three menu items — pick another --id`);
  refuseAmbiguousFixture(items, DISH_X, opts.id);
  refuseAmbiguousFixture(items, DISH_Y, opts.id);
  refuseAmbiguousFixture(items, DISH_Z, opts.id);

  const { server: siteServer, port: sitePort } = await startServer(opts.port, SITE);
  const { server: blobServer, port: blobPort, blobs: fakeBlobs } = await startFakeBlobServer(opts.blobPort);
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

    // --- 5b. AN ALLERGEN KEY ONE BUILD DOESN'T KNOW SURVIVES THE OTHER ---
    //
    // The safety-critical one (ADR 0118). Two of a person's devices need not
    // run the same build — a phone serves whatever its service worker last
    // cached — so the day an allergen key is added, the older device pulls it,
    // strips a key it has never heard of, writes the stripped list back, and
    // the newer device's three-way merge reads that as a DELETION and clears
    // the flag. An allergen warning, lost to the act of syncing, reported
    // nowhere.
    //
    // WHY IT HAS TO BE THIS CHECK AND NOT A UNIT TEST. Every step is correct
    // in isolation and each module's own tests stay green: the sanitiser is
    // right to distrust input, the merge is right to propagate a deletion, and
    // the settings store is right to write what it holds. The loss exists only
    // in the seam, across two devices, two stores and a round trip — which is
    // the one thing this file can see and nothing else in the repo can.
    //
    // The unknown key is SEEDED rather than clicked, because by definition no
    // control on this build can set it. Everything after the seed is the real
    // app: A's own push, B's pull, a real tap on B's allergen chips, B's push,
    // A's pull.
    const FUTURE_KEY = "contains-zzz-future";
    const KNOWN_KEY = "contains-nuts";
    await A.d.evalPage(seedAvoidExpr(["contains-peanuts", FUTURE_KEY]));
    await A.d.reload("after seeding A's allergen list");
    await syncNowAndWait(A.d);
    await syncNowAndWait(B.d);
    const bAvoid = await B.d.evalPage(avoidExpr);
    report.check(
      "an allergen key from a newer build reaches B's store rather than being refused on arrival",
      bAvoid.includes(FUTURE_KEY),
      `B's stored avoid list: ${JSON.stringify(bAvoid)}`
    );

    // A REAL settings write on B — the step that made the older build commit
    // its own stripped view of the list. Without this, B never rewrites its
    // settings and the bug cannot appear at all.
    await flagAllergen(B.d, KNOWN_KEY);
    await syncNowAndWait(B.d);
    await syncNowAndWait(A.d);
    const aAvoid = await A.d.evalPage(avoidExpr);
    report.check(
      "an allergen flag on A is NOT cleared by syncing with a device that has no chip for that key",
      aAvoid.includes(FUTURE_KEY),
      `A's stored avoid list after the round trip: ${JSON.stringify(aAvoid)}`
    );
    // The control, and it is load-bearing: a merge that had simply stopped
    // accepting anything from B would satisfy the assertion above and be a far
    // worse bug. This is the half that proves B's changes still cross.
    report.check(
      "…and the ordinary allergen flagged on B crossed back to A in the same sync",
      aAvoid.includes(KNOWN_KEY),
      `A's stored avoid list: ${JSON.stringify(aAvoid)} (B flagged ${KNOWN_KEY})`
    );

    // --- 5c. A PERSONAL RECIPE CROSSES IN BUCKETS (roadmap 510/050) -------
    //
    // A recipe of one's own lives in its person's cookbook (per profile since
    // roadmap 510/120: faves.p.<id>.recipes.v1) and syncs in eight padded
    // buckets beside the core copy, not inside it.
    // SEEDED on A, because there is no recipe editor yet (the item says so) —
    // an import is the only way one arrives today. Everything after the seed
    // is the real app: A's push, B's pull, and B's recipe page drawing it.
    const RECIPE = {
      dishId: "u:sync-check-loaf",
      name: "Sync Check Loaf",
      ingredients: ["2 cups flour", "1 cup water"],
      steps: ["Mix.", "Bake at 200°C."],
      tags: ["v", "contains-gluten"],
    };
    const myBook = `"faves.p." + JSON.parse(localStorage.getItem("faves.profiles.v1")).activeId + ".recipes.v1"`;
    await A.d.evalPage(
      `localStorage.setItem(${myBook}, ${JSON.stringify(JSON.stringify({ [RECIPE.dishId]: RECIPE }))})`
    );
    await A.d.reload("after seeding A's cookbook");
    await syncNowAndWait(A.d);
    await syncNowAndWait(B.d);
    const bRecipes = await B.d.evalPage(`Object.keys(JSON.parse(localStorage.getItem(${myBook}) || "{}"))`);
    report.check(
      "a personal recipe made on A reaches B's cookbook",
      Array.isArray(bRecipes) && bRecipes.includes(RECIPE.dishId),
      `B's recipes: ${JSON.stringify(bRecipes)}`
    );
    const bucketBodies = [...fakeBlobs.entries()].filter(([k]) => k.includes(":r"));
    const sizes = bucketBodies.map(([, v]) => v.body.length);
    report.check(
      "the recipes travel in all 8 buckets, each padded to a 4 KiB multiple (+29 bytes of envelope)",
      bucketBodies.length === 8 && sizes.every((n) => (n - 29) % 4096 === 0),
      `${bucketBodies.length} bucket(s), sizes ${JSON.stringify(sizes)}`
    );
    report.check(
      "no bucket carries the recipe in the clear — the Worker holds ciphertext only",
      bucketBodies.every(([, v]) => !v.body.includes(Buffer.from(RECIPE.name))),
      "searched every bucket's bytes for the recipe's name"
    );
    await B.d.goto(
      siteUrl.replace(/restaurant\.html\?id=.*$/, `recipe.html?id=u:mine&dish=${RECIPE.dishId}`),
      `document.querySelector("h1.menu-title")?.textContent === ${JSON.stringify(RECIPE.name)}`,
      "B"
    );
    const bSteps = await B.d.evalPage(`document.querySelectorAll(".method li").length`);
    report.check(
      "B's recipe page renders the synced personal recipe, method and all",
      bSteps === RECIPE.steps.length,
      `${bSteps} method step(s) on the page`
    );
    await B.d.reload("back to the menu after the recipe page");

    // --- 5d. THE SYNC LOG ON THE DEVICE (roadmap 510/380) ------------------
    // Every sync above went through the real panel, so A's log holds real
    // entries. Read the way the owner would: Settings → Your data → Sync →
    // "Show sync history". The build comes from A's own service worker.
    await openSyncPanel(A.d);
    await nav("open the sync history", NAV.logToggle, () => A.d.click(NAV.logToggle, "Show sync history"));
    const logView = await A.d.evalPage(syncLogExpr());
    report.check(
      "[A] Settings shows the sync history newest first, naming the screen and the build that ran each sync",
      logView.n >= 3 && logView.expanded === "true" && logView.heads[0].includes("A place’s menu") &&
        logView.heads[0].includes(`build ${SHELL_VERSION}`),
      `${logView.n} entr(ies); newest: "${logView.heads[0]}"; expected build ${SHELL_VERSION}`
    );
    report.check(
      "[A] the history says what each sync did: the heart sent, by id, and whether it had a base",
      /Added to sync: d:/.test(logView.text) && /Had the last agreement/.test(logView.text) && /Had NO last agreement/.test(logView.text),
      logView.text.slice(0, 400)
    );
    report.check("[A] the history's controls are at least 44 px tall", logView.minH >= 44, `smallest ${logView.minH}px`);
    await closeSettings(A.d);

    // --- 5e. NO SILENT MERGE WITHOUT A BASE (roadmap 510/390) --------------
    // B loses its last agreement (the base) and holds a heart sync does not.
    // Until 510/390 the next sync added it everywhere as if new — the merge
    // behind 510/320's union. Now it must stop and ask, send nothing, and
    // carry the heart only on the answer "add".
    const blobState = () => JSON.stringify([...fakeBlobs.entries()].map(([k, v]) => [k, v.etag]).sort());
    await B.d.evalPage(`localStorage.removeItem("faves.sync.base.v1")`);
    await toggleHeart(B.d, DISH_Z);
    const blobsBefore = blobState();
    await openSyncPanel(B.d);
    await B.d.click(".sync-body .settings-reset", "Sync now");
    await untilPresent(
      async () => B.d.evalPage(`[...document.querySelectorAll(".sync-body .settings-sub")].some((e) => e.textContent === ${JSON.stringify(NAV.noBaseHeading)})`),
      { label: "B's no-base question", timeout: 15_000 }
    );
    const q = await B.d.evalPage(`(() => {
      const radios = [...document.querySelectorAll('.sync-body input[name="sync-no-base-choice"]')];
      const use = [...document.querySelectorAll(".sync-body .profile-btn-primary")].find((b) => b.textContent === "Use this answer");
      return { text: document.querySelector(".sync-body").textContent, radios: radios.length, checked: radios.filter((r) => r.checked).length, disabled: use ? use.disabled : null };
    })()`);
    report.check(
      "[B] a device with no base, holding a heart sync lacks, ASKS rather than merging — two answers, neither pre-picked, naming the dish",
      q.radios === 2 && q.checked === 0 && q.disabled === true && q.text.toLowerCase().includes(DISH_Z.toLowerCase()),
      `radios=${q.radios} checked=${q.checked} useDisabled=${q.disabled}; names ${DISH_Z}: ${q.text.toLowerCase().includes(DISH_Z.toLowerCase())}`
    );
    report.check("[B] nothing was written to sync while the question is open", blobState() === blobsBefore, "the fake server's copies changed");
    await closeSettings(B.d);
    await syncNowAndWait(A.d);
    report.check(
      "[A] the unanswered heart did not reach A",
      (await dishState(A.d, DISH_Z)).heart === "false",
      `A sees ${DISH_Z}: heart=${(await dishState(A.d, DISH_Z)).heart}`
    );

    // --- 5f. THE BANNER (roadmap 510/430) ----------------------------------
    // A paused sync must not sit unnoticed in a Settings row. The question is
    // open on B, so B shows a banner on EVERY screen — here the menu and, in a
    // second tab, the home screen — and it goes in every tab once answered.
    const bBanner = await B.d.evalPage(bannerExpr);
    report.check(
      "[B] the open question puts a banner on the menu: plain words, labelled region, a 44 px button",
      !!bBanner && bBanner.role === "region" && bBanner.label === "Sync needs your answer" &&
        /paused/i.test(bBanner.text) && !/merge|base|conflict/i.test(bBanner.text) &&
        bBanner.btnText === "Answer it now" && bBanner.btnH >= 44 && !bBanner.overflowX,
      JSON.stringify(bBanner)
    );
    report.check(
      "[B] the banner is in flow at the very top and covers nothing — not fixed, and everything else starts below it",
      !!bBanner && bBanner.first && bBanner.position === "static" && bBanner.topOfRest >= bBanner.bottom - 0.5,
      `position=${bBanner?.position} first=${bBanner?.first} bottom=${bBanner?.bottom} rest starts at ${bBanner?.topOfRest}`
    );
    report.check(
      "[A] a device with nothing to answer shows no banner (the control)",
      (await A.d.evalPage(bannerExpr)) === null,
      "A grew a banner for B's question"
    );
    const homeUrl = siteUrl.replace(/restaurant\.html\?id=.*$/, "index.html");
    const tab2 = await openExtraTab({ cdp: B.cdp, url: homeUrl, fakeBlobPort: blobPort, report, label: "B tab 2" });
    const tab2Banner = await tab2.d.evalPage(bannerExpr);
    report.check(
      "[B, a second tab on the HOME screen] the same banner is there",
      !!tab2Banner && tab2Banner.first && tab2Banner.position === "static" && tab2Banner.btnText === "Answer it now",
      JSON.stringify(tab2Banner)
    );
    await B.cdp.send("Target.activateTarget", { targetId: B.targetId });
    await B.d.click(".sync-banner-btn", "Answer it now");
    await untilPresent(async () => B.d.evalPage(syncBodyVisibleExpr), { label: "the banner's button to open the question", timeout: 15_000 });
    const landed = await B.d.evalPage(`(() => {
      const a = document.activeElement;
      return { focus: a ? a.textContent : null, open: !!document.querySelector(${JSON.stringify(NAV.sheet)}) };
    })()`);
    report.check(
      "[B] the banner's button opens Settings straight on the question, focus on its heading",
      landed.open && landed.focus === NAV.noBaseHeading,
      `sheet open=${landed.open}; focus is "${landed.focus}"`
    );
    await B.d.click(NAV.noBaseChoice, "Add them to all your devices");
    await B.d.click(".sync-body .profile-btn-primary", "Use this answer");
    await untilPresent(async () => B.d.evalPage(`!!document.querySelector(".sync-body .settings-reset")`), {
      label: "B's sync panel to return to the \"on\" view after the answer",
      timeout: 15_000,
    });
    await closeSettings(B.d);
    await untilPresent(async () => (await B.d.evalPage(bannerExpr)) === null, { label: "the banner to go once answered", timeout: 15_000 });
    await untilPresent(async () => (await tab2.d.evalPage(bannerExpr)) === null, {
      label: "the banner to go in the OTHER tab once answered",
      timeout: 15_000,
    });
    report.check(
      "[B] answering removes the banner here and in the other tab, with no reload",
      (await B.d.evalPage(bannerExpr)) === null && (await tab2.d.evalPage(bannerExpr)) === null,
      "a banner outlived the answer"
    );
    // The dialog's opener was the banner's button, which the answer removed;
    // the browser's own focus restore then lands on <body> — the top of the
    // document for a keyboard reader. The ⋯ menu button (the way to Settings,
    // on every page) catches it.
    const focusAfter = await B.d.evalPage(`document.activeElement?.id || document.activeElement?.tagName`);
    report.check(
      "[B] closing Settings after answering puts focus on the ⋯ menu button, not <body>",
      focusAfter === "overflow-btn",
      `focus is on ${focusAfter}`
    );
    await tab2.close();
    await syncNowAndWait(A.d);
    report.check(
      "[A] once B answers \"add\", B's heart reaches A",
      (await dishState(A.d, DISH_Z)).heart === "true",
      `A sees ${DISH_Z}: heart=${(await dishState(A.d, DISH_Z)).heart}`
    );

    // --- 6. Turning sync off on B leaves B's own data intact -------------
    const bBeforeOff = await dishState(B.d, DISH_X);
    const bRawBeforeOff = await B.d.evalPage(rawStoreExpr);
    await openSyncPanel(B.d);
    await B.d.click(".sync-body .profile-btn", "Turn off sync on this device");
    await B.d.click(".sync-body .profile-btn-primary", "Turn off");
    await untilPresent(
      async () => B.d.evalPage(`!!document.querySelector(".sync-body .settings-reset")`),
      { label: "B's sync panel to return to the \"off\" view" }
    );
    const offViewText = await B.d.evalPage(`${need(".sync-body .settings-reset")}.textContent`);
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

    // --- 9. THE ERROR VIEW HAS A WAY OUT, NOT JUST A RETRY ---------------
    //
    // A is now genuinely in the error state (the blob server above is closed,
    // and A's sync failed against it) — which is why these assertions live
    // here rather than being staged: the view is reached the way a reader
    // reaches it, by sync actually breaking.
    //
    // Until 2026-09-20 this view offered Retry and nothing else. The panel
    // shows exactly ONE view and ERROR outranks every other (sync-ui.js's
    // computeViewKey), so a reader whose sync was broken for a reason retrying
    // cannot fix — a code that no longer matches the data on the server, a
    // Worker that has gone away — had no route to the one verb that ends it.
    // The exit was reachable from every state except the one that needed it.
    const aRawBeforeOff = await A.d.evalPage(rawStoreExpr);
    const aStateBeforeOff = await dishState(A.d, DISH_Y);
    await openSyncPanel(A.d);
    const errorView = await A.d.evalPage(`(() => {
      const body = document.querySelector(".sync-body");
      const btns = [...body.querySelectorAll("button")].map((b) => b.textContent.trim());
      const msg = body.querySelector("[role=status]");
      return { buttons: btns, message: msg ? msg.textContent : null };
    })()`);
    report.check(
      "the error view offers a way to turn sync off, not only Retry",
      errorView.buttons.includes("Turn off sync on this device") &&
        errorView.buttons.includes("Retry") &&
        errorView.message === EXPECTED_UNREACHABLE,
      `buttons: ${JSON.stringify(errorView.buttons)}; message: "${errorView.message}"`
    );

    await A.d.click(".sync-body .profile-btn", "Turn off sync on this device");
    await A.d.click(".sync-body .profile-btn-primary", "Turn off");
    await untilPresent(
      async () => A.d.evalPage(`!!document.querySelector(".sync-body .settings-reset")`),
      { label: "A's sync panel to return to the \"off\" view" }
    );
    const aOffViewText = await A.d.evalPage(`${need(".sync-body .settings-reset")}.textContent`);
    report.check(
      "turning sync off from the ERROR view actually turns it off, error state and all",
      aOffViewText === "Turn on sync",
      `button reads "${aOffViewText}"`
    );
    await closeSettings(A.d);
    const aRawAfterOff = await A.d.evalPage(rawStoreExpr);
    const aStateAfterOff = await dishState(A.d, DISH_Y);
    report.check(
      "…and leaves A's own data exactly as it was — the promise the confirmation makes",
      aRawAfterOff.favCount === aRawBeforeOff.favCount &&
        JSON.stringify(aRawAfterOff.ratings) === JSON.stringify(aRawBeforeOff.ratings) &&
        aStateAfterOff.heart === aStateBeforeOff.heart,
      `before: fav=${aRawBeforeOff.favCount} heart=${aStateBeforeOff.heart}; ` +
        `after: fav=${aRawAfterOff.favCount} heart=${aStateAfterOff.heart}`
    );

    return report.summary(SITE) ? 0 : 1;
  } finally {
    A?.cdp?.close();
    B?.cdp?.close();
    await stopChrome(A?.chrome?.proc, { keepProfile: opts.keepProfile });
    await stopChrome(B?.chrome?.proc, { keepProfile: opts.keepProfile });
    siteServer.closeAllConnections?.();
    await new Promise((r) => siteServer.close(r));
    // blobServer may already be closed (assertion 8) — closing twice is a
    // harmless no-op error we can ignore.
    await new Promise((r) => blobServer.close(() => r()));
    if (opts.keepProfile) {
      console.log(`Chrome profile A kept at ${profileDirA}`);
      console.log(`Chrome profile B kept at ${profileDirB}`);
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
  // Classified in ONE place (lib/browser.mjs's exitFromError): a missing element
  // is the SITE, and exits 1 naming what it wanted; anything else is the harness,
  // and exits 2 so the two never blur. This used to be decided here, per tool —
  // which is how the exit-1 verdict was quietly swallowed in eight of fifteen.
  exitFromError(err);
}
