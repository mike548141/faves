// The location ask, in a real browser (ADR 0083). The eighth of the family.
//
// WHY THIS EXISTS. The tickbox on the dialog makes a PROMISE — "don't ask me
// about this again" — and a promise is exactly the kind of thing unit tests
// cannot verify, because the failure is not in the decision table (that is
// `tests/geo-consent.test.js`, and it is green) but in the wiring: a listener
// on the wrong element, a flag read before it is written, a dialog that reopens
// because `close` fires a second time. Every one of those leaves the pure logic
// correct and the promise broken. The reader would be told they will not be
// asked again, and then asked again.
//
// It also pins the three things the owner asked for by name on 2026-08-17:
//   1. THE PILL IS GONE. "I don't like the pill button to prompt for location
//      data, remove it." Asserted as an absence, which is the assertion most
//      likely to rot silently — a future refactor that restores it would be
//      caught here and nowhere else.
//   2. THE PAGE LOADS FIRST. "Load the full page so they can see everything and
//      sort to the best of Faves ability without location data sharing. Then
//      ask." So the venue list must be on screen BEFORE the dialog is, and this
//      measures that order rather than assuming the timer holds.
//   3. THE TICKBOX BINDS BOTH SURFACES, ACROSS RELOADS.
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU — read this before trusting it:
//   • Whether the browser's own permission prompt looks or behaves the same on
//     a real iPhone. CDP grants and denies permissions programmatically; no
//     native prompt is ever drawn, so nothing here exercises the one dialog
//     Faves does not own.
//   • Whether 900 ms is the right beat before asking. It asserts the ORDER
//     (list first, dialog second), never that the pause feels right.
//   • Whether the wording persuades anyone. "Your location never leaves your
//     device" is checked for PRESENCE, not for truth — its truth is a property
//     of the network code, and `check_no_deps.py` plus a grep for fetch/beacon
//     is what actually holds it up.
//   • Anything about a second device or a restored backup: the consent flag is
//     deliberately outside the exported set, and that is asserted in the unit
//     tests, not here.
//
//     node tools/geo_check.mjs           # all scenarios
//     node tools/geo_check.mjs -v        # narrate each step
//
// Exit 0 = every assertion held. 1 = at least one didn't.

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  Cdp,
  Report,
  createDriver,
  launchChrome,
  startServer,
  stopChrome,
  until,
  sleep,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// One read of everything the ask can put on screen, so a single probe can
// answer "what is the reader looking at right now".
const PROBE = `(() => {
  const dlg = document.getElementById("geo-dialog");
  const banner = document.getElementById("geo-banner");
  const status = document.getElementById("geo-status");
  const cards = document.querySelectorAll("#restaurant-list .card").length;
  const vis = (el) => {
    if (!el || el.hidden) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  return {
    pillExists: !!document.getElementById("geo-ask"),
    dialogOpen: !!dlg?.open,
    dialogText: (dlg?.textContent || "").replace(/\\s+/g, " ").trim(),
    bannerShown: vis(banner),
    statusText: (status && !status.hidden ? status.textContent : "").trim(),
    cards,
  };
})()`;

/** Set the browser-level geolocation permission for this origin. */
async function setPermission(cdp, origin, setting) {
  await cdp.send("Browser.setPermission", {
    origin,
    permission: { name: "geolocation" },
    setting, // "granted" | "denied" | "prompt"
  });
}

/** Load the home screen and wait for the list to be drawn by app.js. */
async function openHome(cdp, driver, sessionId, port) {
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html` }, sessionId);
  await until(
    () => driver.evalPage(`document.querySelectorAll("#restaurant-list .card").length > 3`),
    { label: "home list rendered" }
  );
  await driver.settle();
}

/** The dialog is deferred behind two rAFs and a 900 ms beat, so give it room —
 *  but resolve as soon as it opens rather than sleeping the full time, or a
 *  slow machine turns this check flaky. Flakiness in a required check trains
 *  everyone to hit re-run, which is worse than no check at all. */
async function waitForAsk(driver, { timeout = 6000 } = {}) {
  const start = Date.now();
  let last = await driver.evalPage(PROBE);
  while (Date.now() - start < timeout) {
    if (last.dialogOpen || last.bannerShown) return last;
    await sleep(100);
    last = await driver.evalPage(PROBE);
  }
  return last;
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const { server, port } = await startServer(opts.port, SITE);
  const origin = `http://127.0.0.1:${port}`;
  const profileDir = await mkdtemp(join(tmpdir(), "faves-geo-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log("Faves location-ask check — is the promise on the tickbox kept?");
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
      sessionId
    );

    // ── 1. Fresh device, permission not yet decided ────────────────────────
    await setPermission(cdp, origin, "prompt");
    await openHome(cdp, driver, sessionId, port);

    // The owner's rule 2, asserted as an absence.
    const atLoad = await driver.evalPage(PROBE);
    report.check(
      "the 'Use my location' pill is gone from the page",
      atLoad.pillExists === false,
      atLoad.pillExists ? "#geo-ask is still in the DOM" : "no #geo-ask anywhere"
    );

    // The owner's rule 1: the list is READABLE before anything is asked.
    report.check(
      "the venue list renders before the ask, not behind it",
      atLoad.cards > 3 && atLoad.dialogOpen === false,
      `${atLoad.cards} cards drawn, dialog open: ${atLoad.dialogOpen}`
    );

    const asked = await waitForAsk(driver);
    report.check(
      "the dialog then arrives on its own",
      asked.dialogOpen === true,
      `dialog open: ${asked.dialogOpen}, banner: ${asked.bannerShown}`
    );
    report.check(
      "the dialog says the location never leaves the device",
      /never leaves your device/i.test(asked.dialogText),
      asked.dialogText.slice(0, 120)
    );
    report.check(
      "the list is still rendered underneath the dialog",
      asked.cards > 3,
      `${asked.cards} cards`
    );

    // ── 2. "Not now" WITHOUT ticking → the banner, and it survives a reload ─
    await driver.click("#geo-dialog-skip");
    await driver.settle();
    const declined = await waitForAsk(driver);
    report.check(
      "declining without ticking demotes the ask to the banner",
      declined.bannerShown === true && declined.dialogOpen === false,
      `banner: ${declined.bannerShown}, dialog: ${declined.dialogOpen}`
    );

    await openHome(cdp, driver, sessionId, port);
    const afterReload = await waitForAsk(driver);
    report.check(
      "after a reload it is still the banner, not the dialog again",
      afterReload.bannerShown === true && afterReload.dialogOpen === false,
      `banner: ${afterReload.bannerShown}, dialog: ${afterReload.dialogOpen}`
    );

    // ── 3. Dismissing the banner is the second no — both surfaces stop ─────
    await driver.click("#geo-banner-dismiss");
    await driver.settle();
    const afterBannerDismiss = await driver.evalPage(PROBE);
    report.check(
      "dismissing the banner hides it immediately",
      afterBannerDismiss.bannerShown === false,
      `banner: ${afterBannerDismiss.bannerShown}`
    );
    await openHome(cdp, driver, sessionId, port);
    const quiet = await waitForAsk(driver, { timeout: 3500 });
    report.check(
      "two refusals is a no — nothing is asked on the next visit",
      quiet.dialogOpen === false && quiet.bannerShown === false,
      `dialog: ${quiet.dialogOpen}, banner: ${quiet.bannerShown}`
    );

    // ── 4. THE CORE PROMISE: the tickbox, from a clean slate ───────────────
    // Clear the consent record so the dialog is offered again, then tick the
    // box. This is the assertion the whole check exists for.
    await driver.evalPage(`localStorage.removeItem("faves.geo.consent.v1")`);
    await openHome(cdp, driver, sessionId, port);
    const reoffered = await waitForAsk(driver);
    report.check(
      "clearing the consent record offers the dialog again",
      reoffered.dialogOpen === true,
      `dialog: ${reoffered.dialogOpen}`
    );

    await driver.click("#geo-dialog-never");
    await driver.click("#geo-dialog-skip");
    await driver.settle();
    const suppressed = await driver.evalPage(PROBE);
    report.check(
      "ticking 'don't ask again' suppresses the banner too, at once",
      suppressed.bannerShown === false && suppressed.dialogOpen === false,
      `banner: ${suppressed.bannerShown}, dialog: ${suppressed.dialogOpen}`
    );

    // Across a reload — the promise is "again", not "for this page view".
    await openHome(cdp, driver, sessionId, port);
    const stillQuiet = await waitForAsk(driver, { timeout: 3500 });
    report.check(
      "…and it is still silent after a reload — the promise is kept",
      stillQuiet.dialogOpen === false && stillQuiet.bannerShown === false,
      `dialog: ${stillQuiet.dialogOpen}, banner: ${stillQuiet.bannerShown}`
    );
    report.check(
      "the list is unaffected by any of it",
      stillQuiet.cards > 3,
      `${stillQuiet.cards} cards`
    );

    // ── 5. The way back exists, or the tickbox is a trapdoor ───────────────
    const settingsHasGeo = await driver.evalPage(`(() => {
      // settings-ui.js builds the sheet eagerly but only shows it on click;
      // the Distance panel is in the DOM either way, so clicking is belt and
      // braces rather than load-bearing.
      document.getElementById("settings-btn")?.click();
      const row = document.querySelector(".settings-row-geo");
      return {
        found: !!row,
        text: (row?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 140),
      };
    })()`);
    report.check(
      "Settings carries a Location control — the only route back once suppressed",
      settingsHasGeo.found === true,
      settingsHasGeo.text || "no .settings-row-geo in the Settings sheet"
    );

    // ── 6. Already granted → never asked at all ────────────────────────────
    await setPermission(cdp, origin, "granted");
    // Session-scoped domain: without the sessionId this throws "wasn't found",
    // which reads like a missing CDP method rather than a routing mistake.
    await cdp.send(
      "Emulation.setGeolocationOverride",
      { latitude: -41.2247, longitude: 174.8079, accuracy: 40 },
      sessionId
    );
    await driver.evalPage(`localStorage.removeItem("faves.geo.consent.v1")`);
    await openHome(cdp, driver, sessionId, port);
    const granted = await waitForAsk(driver, { timeout: 3500 });
    report.check(
      "an already-granted permission is never asked about",
      granted.dialogOpen === false && granted.bannerShown === false,
      `dialog: ${granted.dialogOpen}, banner: ${granted.bannerShown}, status: "${granted.statusText}"`
    );

    // ── 7. Blocked → no dialog whose button could not work ─────────────────
    await setPermission(cdp, origin, "denied");
    await driver.evalPage(`localStorage.removeItem("faves.geo.consent.v1")`);
    await openHome(cdp, driver, sessionId, port);
    const denied = await waitForAsk(driver, { timeout: 3500 });
    report.check(
      "a blocked permission raises no dialog and no banner",
      denied.dialogOpen === false && denied.bannerShown === false,
      `dialog: ${denied.dialogOpen}, banner: ${denied.bannerShown}`
    );
    report.check(
      "…and says so, rather than looking like it was never asked",
      /blocked/i.test(denied.statusText),
      denied.statusText || "(no status line)"
    );

    console.log(`\n${report.failed ? "FAILED" : "OK"} — ${report.passed} passed, ${report.failed} failed`);
    return report.failed === 0;
  } finally {
    cdp?.close();
    await stopChrome(chrome?.proc);
    server.close();
  }
}

const { values } = parseArgs({
  options: {
    verbose: { type: "boolean", short: "v", default: false },
    headed: { type: "boolean", default: false },
    port: { type: "string", default: "0" },
  },
});

const ok = await run({ ...values, port: Number(values.port) });
process.exitCode = ok ? 0 : 1;
