#!/usr/bin/env node
// Fetch only what changed, on an INSTALLED phone (roadmap 510/030; ADR 0145
// as revised by ADR 0146). Edit one venue's menu and another venue's hours,
// then count what a service-worker-controlled page downloads to catch up.
//
// The item's own check, made an assertion:
//
//   · Expected: the catalogue, plus exactly the files whose fingerprint moved —
//     the two venue files and the summary (which carries every venue's
//     fingerprint) and, only if the edit changed dish text, the search index.
//     NOTHING ELSE under data/. Before 510/030 the same edit cost every phone
//     all 57 menus again.
//   · …and the update is SHOWN: the edited price renders on the venue's page,
//     from the store, with no request for that file.
//   · …and it SURVIVES FLIGHT MODE: the server is stopped (precache_check's
//     method — CDP's `offline` flag never reaches a worker's own fetches) and
//     the edited menu still opens, the home screen still lists places.
//   · …and a broken deploy is not switched to: a venue file answered with
//     Cloudflare Pages' 200-but-HTML stand-in (ADR 0100) leaves the held set
//     exactly as it was.
//
// 🔑 IT BREAK-PROBES ITSELF, every run. The same scenario runs a second time
// against a worker whose "do I already hold this fingerprint?" test is
// removed — so every update re-downloads everything — and the request-count
// assertion MUST fail against it. A count that passes both is measuring
// nothing. (tests/sw-data-store.test.js pins the same rule in Node; this is
// the half no unit test can show: a real browser's Cache API and fetch.)
//
// 🚩 WHAT THIS CANNOT SHOW: Cloudflare Pages itself (the stand-in is staged,
// as in precache_check), Safari, or a sync interrupted by the OS killing the
// worker mid-download (the unit tests stage that one).
//
//     node tools/fetch_check.mjs        # the whole scenario + its break-probe
//     node tools/fetch_check.mjs -v     # narrate each step
//
// Exit 0 = all passed. 1 = an assertion failed. 2 = the browser stopped
// answering (see tools/lib/browser.mjs) — that says nothing about the site.

import { readFile, mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
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
  sleep,
  startServer,
  stopChrome,
  untilPresent,
} from "./lib/browser.mjs";
import { renderTree } from "./gen_summaries.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// The two edits. Chosen because each has a numeric dish price and its own
// top-level weekly hours; any such pair would do.
const MENU_VENUE = "bambina-pizzeria";
const HOURS_VENUE = "simmer";
const NEW_PRICE = 987; // distinctive: appears nowhere else on that page
// A third venue, served as Pages' HTML stand-in in the broken-deploy step.
const STAND_IN_VENUE = "spices-indian";
const PAGES_STAND_IN = {
  body: "<!doctype html><title>Faves</title><p>SPA fallback</p>",
  type: "text/html; charset=utf-8",
};

// The break-probe's worker: the reuse test gone, so every sync re-downloads
// every file. Refused loudly if the line moved, so the probe cannot silently
// become a copy of the honest worker.
const REUSE_LINE = "    if (have[path] === fp && (await store.match(storeKey(path, fp)))) {";

async function newPage(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
    sessionId
  );
  return sessionId;
}

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

// Ask the controlling worker to check now, and wait for what it did.
const SYNC_NOW = `(async () => {
  const reg = await navigator.serviceWorker.ready;
  const worker = navigator.serviceWorker.controller || reg.active;
  const ch = new MessageChannel();
  const reply = new Promise((r) => { ch.port1.onmessage = (e) => r(e.data); });
  worker.postMessage({ type: "SYNC_DATA", force: true }, [ch.port2]);
  return await reply;
})()`;

const POINTER = `(async () => {
  const store = await caches.open("faves-data");
  const hit = await store.match("__data_pointer__/v1");
  return hit ? await hit.json() : null;
})()`;

/** Bytes for an edited venue file, and the overlay that publishes the edit:
 *  the venue files plus the summary, search index and catalogue the REAL
 *  generator derives from them (renderTree — never a second implementation). */
function stageEdits(edits) {
  const read = (rel) => (edits.has(rel) ? edits.get(rel) : readFileSync(join(SITE, rel)));
  const { summaryText, indexText, catalogueText } = renderTree(read);
  const overlay = new Map();
  for (const [rel, body] of edits) overlay.set(`/${rel}`, { body, type: "application/json" });
  overlay.set("/data/summary.json", { body: summaryText, type: "application/json" });
  overlay.set("/data/search-index.json", { body: indexText, type: "application/json" });
  overlay.set("/data/catalogue.json", { body: catalogueText, type: "application/json" });
  const indexMoved = indexText !== readFileSync(join(SITE, "data", "search-index.json"), "utf8");
  return { overlay, indexMoved };
}

async function editedVenues() {
  const menu = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${MENU_VENUE}.json`), "utf8"));
  const item = menu.menu.flatMap((s) => s.items || []).find((i) => typeof i.price === "number");
  if (!item) throw new Error(`${MENU_VENUE} has no numeric price to edit — pick another venue`);
  item.price = NEW_PRICE;
  const hours = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${HOURS_VENUE}.json`), "utf8"));
  if (!hours.hours || !Array.isArray(hours.hours.mon)) {
    throw new Error(`${HOURS_VENUE} has no Monday hours to edit — pick another venue`);
  }
  hours.hours.mon = [["06:15", "13:45"]];
  return new Map([
    [`data/restaurants/${MENU_VENUE}.json`, JSON.stringify(menu, null, 2) + "\n"],
    [`data/restaurants/${HOURS_VENUE}.json`, JSON.stringify(hours, null, 2) + "\n"],
  ]);
}

/**
 * Install on a fresh origin, publish the two edits, sync, and return what the
 * server was asked for. `swBody` replaces sw.js for the break-probe.
 */
async function scenario(cdp, report, { label, swBody = null, port = 0, keepServer = false }) {
  const overlay = new Map();
  if (swBody) overlay.set("/sw.js", { body: swBody, type: "text/javascript" });
  const srv = await startServer(port, SITE, overlay);
  const log = [];
  srv.server.on("request", (req) => log.push(req.url));
  const base = `http://127.0.0.1:${srv.port}`;
  const sessionId = await newPage(cdp);
  const driver = createDriver(cdp, sessionId, (m) => report.step(`${label}: ${m}`));

  await cdp.send("Page.navigate", { url: `${base}/index.html` }, sessionId);
  await untilPresent(() => driver.evalPage(`document.readyState === "complete"`), {
    label: `${label}: the home screen loaded`,
  });
  const state = await driver.evalPage(SETTLE);
  await untilPresent(() => driver.evalPage(`!!navigator.serviceWorker.controller`), {
    label: `${label}: the worker controls the page`,
  });
  const installed = await driver.evalPage(POINTER);
  const installRequests = log.filter((u) => u.includes("?h=")).length;

  // Publish the edit, exactly as a deploy would: new bytes at the same paths.
  const { overlay: edit, indexMoved } = stageEdits(await editedVenues());
  for (const [k, v] of edit) overlay.set(k, v);
  log.length = 0;
  const sync = await driver.evalPage(SYNC_NOW);
  const dataRequests = log.filter((u) => u.startsWith("/data/")).map((u) => u.split("?")[0]);
  const after = await driver.evalPage(POINTER);
  return { srv, base, sessionId, driver, overlay, log, state, installed, installRequests, sync, dataRequests, after, indexMoved, keepServer };
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-fetch-check-"));
  let chrome = null;
  let cdp = null;
  const servers = [];

  try {
    console.log("Faves fetch check — an installed phone downloads only what changed (510/030)");
    console.log(`  edits    ${MENU_VENUE}: one price → ${NEW_PRICE} · ${HOURS_VENUE}: Monday's hours`);
    console.log(`  profile  ${profileDir} (fresh — one origin per scenario)\n`);
    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);

    const ids = JSON.parse(await readFile(join(SITE, "data", "index.json"), "utf8"));

    // --- 1. The honest worker ------------------------------------------------
    const h = await scenario(cdp, report, { label: "honest", port: opts.port });
    servers.push(h.srv);
    report.check("the worker installs and controls the page", h.state === "activated", `ended: ${h.state}`);
    const wantInstall = 4 + ids.length; // 4 catalogue files + every venue
    report.check(
      "the first install fetched every data file exactly once, by fingerprint",
      h.installRequests === wantInstall && Object.keys(h.installed?.files || {}).length === wantInstall,
      `${h.installRequests} ?h= request(s), ${Object.keys(h.installed?.files || {}).length} held; want ${wantInstall}`
    );

    const expected = [
      "/data/catalogue.json",
      `/data/restaurants/${HOURS_VENUE}.json`,
      `/data/restaurants/${MENU_VENUE}.json`,
      ...(h.indexMoved ? ["/data/search-index.json"] : []),
      "/data/summary.json",
    ].sort();
    const got = [...h.dataRequests].sort();
    const exact = JSON.stringify(got) === JSON.stringify(expected);
    report.check(
      `after one menu edit and one hours edit, ONLY the changed files are fetched (${expected.length} requests)`,
      h.sync?.status === "updated" && exact,
      `sync ${h.sync?.status}; fetched ${got.length}: ${got.join(", ")}` +
        (exact ? "" : ` — want ${expected.join(", ")}`)
    );
    report.step(
      `the search index ${h.indexMoved ? "DID" : "did not"} change with this edit ` +
        `(it carries dish text, not prices or hours)`
    );
    report.check(
      "…and the switch happened: a new generation, the held set still complete",
      h.after && h.after.generation !== h.installed.generation &&
        Object.keys(h.after.files).length === wantInstall,
      `generation ${h.installed?.generation} → ${h.after?.generation}, ${Object.keys(h.after?.files || {}).length} held`
    );
    const storeSize = await h.driver.evalPage(`caches.open("faves-data").then((c) => c.keys()).then((k) => k.length)`);
    report.check(
      "…and the replaced versions were swept (held files + one pointer, nothing else)",
      storeSize === wantInstall + 1,
      `${storeSize} entries in faves-data`
    );

    // The update is SHOWN, from the store.
    h.log.length = 0;
    await cdp.send("Page.navigate", { url: `${h.base}/restaurant.html?id=${MENU_VENUE}` }, h.sessionId);
    const shown = await untilPresent(
      () => h.driver.evalPage(`document.querySelectorAll("[data-dish-id]").length > 0 && document.body.innerText`),
      { label: "the edited venue's menu rendered" }
    );
    report.check(
      `the edited price (${NEW_PRICE}) renders on the venue's page`,
      String(shown).includes(String(NEW_PRICE)),
      String(shown).includes(String(NEW_PRICE)) ? "" : "the new price is not on the page"
    );
    const venueHits = h.log.filter((u) => u.startsWith(`/data/restaurants/${MENU_VENUE}.json`));
    report.check(
      "…served from the store: no request for that venue's file",
      venueHits.length === 0,
      venueHits.join(", ")
    );

    // THE NATURAL PATH — no message, no force: how an edit reaches an online
    // phone. A data read starts a background check (at most once per
    // SYNC_MIN_GAP_MS, 10 s); the screen that started it renders the set it
    // already held; the NEXT screen after the switch shows the edit.
    const second = await editedVenues();
    const bumped = JSON.parse(second.get(`data/restaurants/${MENU_VENUE}.json`));
    bumped.menu.flatMap((x) => x.items || []).find((i) => i.price === NEW_PRICE).price = NEW_PRICE + 1;
    second.set(`data/restaurants/${MENU_VENUE}.json`, JSON.stringify(bumped, null, 2) + "\n");
    for (const [k, v] of stageEdits(second).overlay) h.overlay.set(k, v);
    await sleep(10_500); // past the coalescing gap since the forced sync above
    const t0 = Date.now();
    await cdp.send("Page.navigate", { url: `${h.base}/restaurant.html?id=${MENU_VENUE}` }, h.sessionId);
    const firstScreen = await untilPresent(
      () => h.driver.evalPage(`document.querySelectorAll("[data-dish-id]").length > 0 && document.body.innerText`),
      { label: "natural path: the menu rendered" }
    );
    const switched = await untilPresent(
      async () => {
        const p = await h.driver.evalPage(POINTER);
        return p && p.generation !== h.after.generation ? p : null;
      },
      { label: "natural path: the page's own read switched the set" }
    );
    const tSwitch = Date.now() - t0;
    await cdp.send("Page.navigate", { url: `${h.base}/restaurant.html?id=${MENU_VENUE}` }, h.sessionId);
    const nextScreen = await untilPresent(
      () => h.driver.evalPage(`document.querySelectorAll("[data-dish-id]").length > 0 && document.body.innerText`),
      { label: "natural path: the next screen rendered" }
    );
    report.check(
      "unprompted, a data read starts the update; that screen keeps the set it had…",
      String(firstScreen).includes(String(NEW_PRICE)) && !String(firstScreen).includes(String(NEW_PRICE + 1)),
      String(firstScreen).includes(String(NEW_PRICE + 1)) ? "the first screen already showed the new price" : ""
    );
    report.check(
      "…and the NEXT screen shows the edit",
      String(nextScreen).includes(String(NEW_PRICE + 1)),
      `switched ${tSwitch} ms after the navigation (local server — the network's own time is extra)`
    );
    h.after = switched;

    // A broken deploy is not switched to (ADR 0100's stand-in, on a data file).
    const edits = second;
    const standIn = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${STAND_IN_VENUE}.json`), "utf8"));
    standIn.name = `${standIn.name} (edited)`;
    edits.set(`data/restaurants/${STAND_IN_VENUE}.json`, JSON.stringify(standIn, null, 2) + "\n");
    for (const [k, v] of stageEdits(edits).overlay) h.overlay.set(k, v);
    h.overlay.set(`/data/restaurants/${STAND_IN_VENUE}.json`, PAGES_STAND_IN);
    const refused = await h.driver.evalPage(SYNC_NOW);
    const held = await h.driver.evalPage(POINTER);
    report.check(
      "a venue file answered as HTML (Pages' stand-in) is REFUSED — the sync fails",
      refused?.status === "failed" && /HTML/.test(refused?.error || ""),
      JSON.stringify(refused)
    );
    report.check(
      "…and the held set is exactly as it was (no half-switch)",
      held?.generation === h.after.generation &&
        JSON.stringify(held?.files) === JSON.stringify(h.after.files),
      `generation ${held?.generation} (was ${h.after.generation})`
    );

    // Flight mode after the update: stop the server (not a CDP flag — see the header).
    h.srv.server.closeAllConnections?.();
    await new Promise((done) => h.srv.server.close(done));
    report.step(`network: offline — the server on port ${h.srv.port} is stopped`);
    const reachable = await h.driver.evalPage(
      `fetch("/__offline_probe__", { cache: "no-store" }).then(() => true).catch(() => false)`
    );
    report.check("the browser really is offline (the instrument arrived)", reachable === false,
      reachable ? "a network-only fetch SUCCEEDED" : "");
    await cdp.send("Page.navigate", { url: `${h.base}/restaurant.html?id=${MENU_VENUE}` }, h.sessionId);
    const offlineMenu = await untilPresent(
      () => h.driver.evalPage(`document.querySelectorAll("[data-dish-id]").length > 0 && document.body.innerText`),
      { label: "offline: the edited venue's menu rendered" }
    );
    report.check(
      "OFFLINE after the update, the edited menu opens with the new price",
      String(offlineMenu).includes(String(NEW_PRICE + 1)),
      String(offlineMenu).includes(String(NEW_PRICE + 1)) ? "" : "rendered, but not the updated menu"
    );
    await cdp.send("Page.navigate", { url: `${h.base}/index.html` }, h.sessionId);
    const cards = await untilPresent(
      () => h.driver.evalPage(`(() => { const n = document.querySelectorAll("[data-venue-id], .card").length; return n > 0 ? n : null; })()`),
      { label: "offline: the home screen listed places" }
    );
    report.check("OFFLINE after the update, the home screen still lists places", cards > 0, `${cards} card(s)`);

    // --- 2. The break-probe: a worker that refetches everything ---------------
    const honestSw = readFileSync(join(SITE, "sw.js"), "utf8");
    if (!honestSw.includes(REUSE_LINE)) {
      report.check("break-probe: the reuse line is where the probe expects it", false,
        "site/sw.js changed shape — update REUSE_LINE in this tool");
    } else {
      const b = await scenario(cdp, report, {
        label: "break-probe",
        swBody: honestSw.replace(REUSE_LINE, "    if (false) {"),
      });
      servers.push(b.srv);
      const bGot = [...b.dataRequests].sort();
      const bPasses = b.sync?.status === "updated" && JSON.stringify(bGot) === JSON.stringify(expected);
      report.check(
        "break-probe: a worker that re-downloads everything FAILS the count assertion",
        !bPasses && bGot.filter((u) => u.startsWith("/data/restaurants/")).length >= ids.length,
        `it fetched ${bGot.length} data file(s) (${bGot.filter((u) => u.startsWith("/data/restaurants/")).length} venue files)` +
          (bPasses ? " — and the assertion PASSED: it measures nothing" : "")
      );
    }

    return report.summary(SITE);
  } finally {
    if (chrome) await stopChrome(chrome.proc ?? chrome);
    if (cdp) cdp.close?.();
    for (const s of servers) s.server.close?.(() => {});
  }
}

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "0" },
    headed: { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

process.exit((await run({ ...values, port: Number(values.port) }).catch(exitFromError)) ? 0 : 1);
