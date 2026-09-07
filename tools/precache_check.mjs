#!/usr/bin/env node
// The service worker's precache, in a real browser: does the install guard
// REFUSE a Cloudflare-Pages-shaped stand-in, does it still ACCEPT a correct
// deploy, and does the extensionless URL a Pages 308 leaves a reader holding
// answer OFFLINE? (roadmap 240/010, ADR 0100.)
//
// Three findings from the 2026-08-17 cold review live on one surface, and none
// of them is reachable from a unit test:
//
//   (a) `!res.ok → throw` cannot fire on Pages — a missing path is answered
//       with index.html and a 200. tests/sw-precache-guard.test.js pins the
//       PREDICATE; only an install can show the predicate is wired into one,
//       and that a wrong guard would brick every future update.
//   (b) covered before the push by tools/check_precache.py, not here.
//   (c) `/restaurant?id=…` missed the shell cache, so the deep link a reader is
//       most likely to have saved was the one route flight mode did not cover.
//
// 🚩 WHAT THIS PROVES, AND WHAT IT CANNOT.
//   · It proves the SERVICE WORKER's half: given a 200 carrying `text/html` for
//     a `.js` path, the install rejects and no shell cache is left marked
//     ready; given correct types, it installs; and with the network genuinely
//     off at the browser level, a navigation to `/restaurant?id=…` is answered
//     from the precache.
//   · It does NOT prove Cloudflare Pages behaves that way. The local harness is
//     a plain static server: it does not 308 `/foo.html` → `/foo` and it does
//     not answer a missing path with 200. Both were established by curl against
//     the live site on 2026-09-08 and are recorded in ADR 0100; the HTML
//     stand-in here is staged with an overlay whose content type is the
//     fixture. If Pages changes, this stays green.
//   · It is Chrome only, and says nothing about Safari — which is where a PWA
//     lives on the owner's own phone.
//
//     node tools/precache_check.mjs        # all three
//     node tools/precache_check.mjs -v     # narrate each step
//
// Exit 0 = all passed. 1 = an assertion failed. 2 = the browser stopped
// answering (see tools/lib/browser.mjs) — that says nothing about the site.

import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  Cdp,
  Report,
  createDriver,
  exitFromError,
  launchChrome,
  startServer,
  stopChrome,
  untilPresent,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// The module the "broken deploy" fixture stands in for. Anything in SHELL would
// do; a leaf nothing else imports keeps the failure about the guard.
const VICTIM = "/js/vibes.js";

// Byte-for-byte the shape Pages returns for a path it does not have: its own
// index.html, 200, `text/html`. The body does not matter — the guard reads the
// content type — but a realistic one keeps the fixture honest if it ever does.
const PAGES_STAND_IN = {
  body: "<!doctype html><title>Faves</title><p>SPA fallback</p>",
  type: "text/html; charset=utf-8",
};

/** Attach to a fresh page in this browser and return a driver for it. */
async function newPage(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
    sessionId
  );
  return sessionId;
}

/**
 * Wait for the worker to reach a terminal state and report which.
 *
 * `registration.active` alone is the wrong question: on a first visit the OLD
 * worker is null and a REJECTED install also leaves it null, so "not active"
 * would pass for both the failure and the success. This watches the installing
 * worker's own state instead — `activated` or `redundant` — which distinguishes
 * them.
 */
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

const CACHE_STATE = `(async () => {
  const names = await caches.keys();
  const shell = names.filter((n) => n.startsWith("faves-shell-"));
  const ready = [];
  for (const n of shell) {
    const c = await caches.open(n);
    if (await c.match("./__cache_ready__")) ready.push(n);
  }
  return { names, shell, ready };
})()`;

async function run(opts) {
  const report = new Report(opts.verbose);
  const index = JSON.parse(await readFile(join(SITE, "data", "index.json"), "utf8"));
  const venueId = opts.id || index.find((id) => id !== "cook-at-home") || index[0];

  // Two servers: one honest, one with the victim module answered the way Pages
  // answers a path that is gone. Separate servers rather than a mutable
  // overlay, because a service worker install is asynchronous and a fixture
  // that changes underneath one is a race, not a test.
  const honest = await startServer(opts.port, SITE);
  const broken = await startServer(0, SITE, new Map([[VICTIM, PAGES_STAND_IN]]));
  const profileDir = await mkdtemp(join(tmpdir(), "faves-precache-check-"));
  let chrome = null;
  let cdp = null;

  try {
    const base = `http://127.0.0.1:${honest.port}`;
    const brokenBase = `http://127.0.0.1:${broken.port}`;
    console.log("Faves precache check — the install guard, and the offline deep link");
    console.log(`  venue    ${venueId}`);
    console.log(`  honest   ${base}`);
    console.log(`  broken   ${brokenBase} (${VICTIM} → 200 text/html, as Pages answers a missing path)`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);

    // --- 1. The broken deploy must be REFUSED ------------------------------
    // Different origin (different port) ⇒ its own registration and its own
    // cache storage, so this cannot contaminate the control below.
    {
      const sessionId = await newPage(cdp);
      const driver = createDriver(cdp, sessionId, (m) => report.step(m));
      await cdp.send("Page.navigate", { url: `${brokenBase}/index.html` }, sessionId);
      await untilPresent(() => driver.evalPage(`document.readyState === "complete"`), {
        label: "the broken-deploy page loaded",
      });
      const state = await driver.evalPage(SETTLE);
      report.check(
        "a shell asset served as HTML REJECTS the install (the guard fires)",
        state === "redundant",
        `installing worker ended: ${state}`
      );
      const caches = await driver.evalPage(CACHE_STATE);
      report.check(
        "…and no shell cache is left marked ready, so nothing serves the wreck offline",
        caches.ready.length === 0,
        `caches: ${JSON.stringify(caches)}`
      );
    }

    // --- 2. The control: a correct deploy must still install ---------------
    // Without this, a guard mangled into refusing everything passes case 1 —
    // and refusing everything is the failure that matters most, because a
    // worker that can never install leaves every phone on the old shell for
    // good, silently.
    const sessionId = await newPage(cdp);
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));
    await cdp.send("Page.navigate", { url: `${base}/index.html` }, sessionId);
    await untilPresent(() => driver.evalPage(`document.readyState === "complete"`), {
      label: "the home screen loaded",
    });
    const state = await driver.evalPage(SETTLE);
    report.check(
      "a correct deploy still installs (the guard does not brick updates)",
      state === "activated",
      `installing worker ended: ${state}`
    );
    const caches = await driver.evalPage(CACHE_STATE);
    report.check(
      "…and the shell cache is built and marked ready",
      caches.ready.length === 1,
      `caches: ${JSON.stringify(caches)}`
    );

    // --- 3. The extensionless deep link, offline ---------------------------
    // Reached through the `.html` URL first, exactly as a reader arrives from
    // the home screen; Pages then 308s them onto the extensionless one, which
    // is what their bookmark, their history and their share sheet hold.
    const menuUrl = `${base}/restaurant.html?id=${encodeURIComponent(venueId)}`;
    const canonicalUrl = `${base}/restaurant?id=${encodeURIComponent(venueId)}`;
    await cdp.send("Page.navigate", { url: menuUrl }, sessionId);
    await untilPresent(() => driver.evalPage(`!!navigator.serviceWorker.controller`), {
      label: "the worker is controlling the menu page",
    });

    // 🔑 OFFLINE IS THE SERVER GOING AWAY, NOT AN EMULATION FLAG. The first
    // version of this check used CDP `Network.emulateNetworkConditions
    // {offline:true}` on the page session, and its own control caught it doing
    // nothing: a network-only `fetch()` still SUCCEEDED. A controlled page's
    // requests are answered by the SERVICE WORKER, which is a separate target
    // with its own network stack — the page session's emulation never reaches
    // the worker's `fetch`. Every assertion below would have passed against a
    // fully online browser. Stopping the listener is unambiguous, needs nothing
    // to be believed about CDP, and is closer to flight mode anyway.
    await cdp.send(
      "Network.emulateNetworkConditions",
      { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
      sessionId
    );
    honest.server.closeAllConnections?.();
    await new Promise((done) => honest.server.close(done));
    report.step(`network: offline — the server on port ${honest.port} is stopped`);

    // The instrument's own control, kept for exactly the reason above: without
    // it, a measurement that never left the ground agrees with the truth.
    const reachable = await driver.evalPage(
      `fetch("/__offline_probe__", { cache: "no-store" }).then(() => true).catch(() => false)`
    );
    report.check(
      "the browser really is offline (the instrument arrived)",
      reachable === false,
      `a network-only fetch ${reachable ? "SUCCEEDED — nothing here is offline" : "failed, as it must"}`
    );

    await cdp.send("Page.navigate", { url: canonicalUrl }, sessionId);
    const landed = await untilPresent(
      () =>
        driver.evalPage(`(() => {
          const h = document.querySelector("#venue-name, h1");
          return h && h.textContent.trim() ? h.textContent.trim() : null;
        })()`),
      { label: "offline: the canonical /restaurant URL rendered a venue" }
    );
    const where = await driver.evalPage(`location.pathname + location.search`);
    // The URL is asserted, not just the heading. Chrome's own "This site can't
    // be reached" page carries an `<h1>` and sits at `/`, so a heading-only
    // assertion passes on the exact failure this exists to catch — measured
    // while break-probing the fix out on 2026-09-08.
    const wanted = `/restaurant?id=${venueId}`;
    report.check(
      "OFFLINE, the extensionless /restaurant?id=… deep link opens from the precache",
      where === wanted && typeof landed === "string" && landed.length > 0,
      `at ${where} (wanted ${wanted}) → ${JSON.stringify(landed)}`
    );

    // …and it is the RIGHT venue, not the home page fail-soft standing in for
    // one. A shell that answers every URL with index.html would satisfy the
    // assertion above and nothing else.
    const menu = await driver.evalPage(`(() => ({
      dishes: document.querySelectorAll(".dish, .dish-row, [data-dish-id]").length,
      id: new URLSearchParams(location.search).get("id"),
    }))()`);
    report.check(
      "…and it is that venue's MENU, not the home screen answering every URL",
      menu.dishes > 0 && menu.id === venueId,
      JSON.stringify(menu)
    );

    return report.summary(SITE);
  } finally {
    if (chrome) await stopChrome(chrome.proc ?? chrome);
    if (cdp) cdp.close?.();
    // `honest` is closed mid-run to go offline; closing a closed server throws
    // an ERR_SERVER_NOT_RUNNING into the callback, which is not a failure here.
    honest.server.close?.(() => {});
    broken.server.close?.();
  }
}

const { values } = parseArgs({
  options: {
    id: { type: "string" },
    port: { type: "string", default: "0" },
    headed: { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

process.exit(
  (await run({ ...values, port: Number(values.port) }).catch(exitFromError)) ? 0 : 1
);
