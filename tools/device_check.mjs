#!/usr/bin/env node
// Scripted device check — the LIVE SAFETY re-apply, driven through a real
// browser instead of a manual phone test.
//
//     node tools/device_check.mjs            # headless, exit 0 = pass
//     node tools/device_check.mjs --help
//
// WHY THIS EXISTS. Settings is reachable from a restaurant menu, so a viewer can
// flag an allergen — or hand the phone to someone else — while a menu is on
// screen. menu.js must then re-apply the warning treatment live, off the same
// render path as the first paint (dietary.js). That is safety-critical and was
// only ever proven by unit tests plus an owner eyeball; the owner ruled
// (2026-07-24) that the confirmation be scripted and re-runnable rather than a
// manual phone test. This drives the real Settings UI with real mouse input and
// asserts on the real DOM:
//
//   a) flip an allergen preference → every matching dish lights up, with no
//      navigation or reload;
//   b) switch profile → the safety treatment and the hearts/ratings re-apply to
//      the new person, and switching back restores the first person's.
//
// NOT PART OF THE SHIPPED SITE. Nothing here runs in a browser from site/; it is
// dev tooling, like tools/serve.py, and touches no shipped artefact. Node is a
// measuring instrument here, never a build or runtime dependency (ADR 0001), so
// it speaks the Chrome DevTools Protocol over the platform's own WebSocket — no
// npm packages, no puppeteer, nothing to install. That machinery now lives in
// tools/lib/browser.mjs, shared with tools/cook_check.mjs.
//
// THE FRESH PROFILE IS LOAD-BEARING. The service worker will happily serve the
// previous run's assets, and a hard reload does not bust it — so every run gets
// a brand new --user-data-dir under the OS temp dir (no SW registration, no
// localStorage, no cache) and deletes it afterwards. That is the same trick the
// owner would use by hand; automating it is most of the value here.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Cdp,
  Report,
  createDriver,
  launchChrome,
  startServer,
  stopChrome,
  until,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// A venue whose menu carries plenty of peanut-tagged dishes, so the assertion
// has real signal rather than resting on one row. Override with --id.
const DEFAULT_VENUE = "rs-satay-noodle-house";
const ALLERGEN = { key: "contains-peanuts", chip: "Peanuts" };
const SEED_RATING = 4;
// Neutral display names — this repo is publication-bound, so the fixture never
// carries a real person's name (CLAUDE.md, no personal data).
const GUEST_NAME = "Guest";

const HELP = `Faves device check — verify the live allergen re-highlight in a real browser.

  node tools/device_check.mjs [options]

Serves site/ locally, launches Google Chrome headless against a throwaway
profile, then drives the real Settings UI: flips an allergen preference on a
restaurant menu and switches profile, asserting the safety treatment and the
hearts/ratings re-apply live — with no navigation or reload.

Options:
  --id <venue-id>   Restaurant to test (default: ${DEFAULT_VENUE}).
  --port <n>        Port for the local static server (default: an unused one).
  --headed          Show the browser window (for watching it work).
  --keep-profile    Leave the temporary Chrome profile behind, and say where.
  --verbose         Print every step, not just the assertions.
  -h, --help        This message.

Exit status: 0 all assertions passed; 1 an assertion failed; 2 the harness
itself could not run (no Chrome, port in use, page never rendered).

Requires Google Chrome (set FAVES_CHROME to point elsewhere). No npm install —
the site ships build-less and this tool adds no dependency to it (ADR 0001).`;

// --- Arguments ----------------------------------------------------------

function parseArgs(argv) {
  const opts = { id: DEFAULT_VENUE, port: 0, headed: false, keepProfile: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--port") opts.port = Number(argv[++i]);
    else if (a === "--headed") opts.headed = true;
    else if (a === "--keep-profile") opts.keepProfile = true;
    else if (a === "--verbose") opts.verbose = true;
    else throw new Error(`unknown option: ${a} (try --help)`);
  }
  if (!opts.id) throw new Error("--id needs a venue id");
  if (!Number.isInteger(opts.port) || opts.port < 0) throw new Error("--port needs a number");
  return opts;
}

// --- The page under test ------------------------------------------------

/** Everything one assertion needs, read off the live DOM in a single hop. */
const snapshotExpr = (dishName) => `(() => {
  const dishes = [...document.querySelectorAll("li.dish")];
  const nameOf = (d) => d.dataset.name;
  const tags = (d) => (d.dataset.tags || "").split(" ");
  const target = dishes.find((d) => d.dataset.name === ${JSON.stringify(dishName.toLowerCase())});
  const heart = target ? target.querySelector(".dish-actions .heart") : null;
  const slider = target ? target.querySelector(".dish-rating [role=slider]") : null;
  return {
    dishes: dishes.length,
    allergen: dishes.filter((d) => tags(d).includes(${JSON.stringify(ALLERGEN.key)})).map(nameOf),
    flagged: dishes.filter((d) => d.classList.contains("dish-flagged")).map(nameOf),
    flaggedChips: document.querySelectorAll(".tag-allergen.is-flagged").length,
    heart: heart ? heart.getAttribute("aria-pressed") : null,
    rating: slider ? slider.getAttribute("aria-valuenow") : null,
    profile: (document.querySelector(".profile-caption-name") || {}).textContent || null,
    sentinel: window.__favesDeviceCheck || null,
    settingsOpen: !!document.querySelector("dialog.settings-sheet[open]"),
  };
})()`;

/** localStorage the page must already hold when its modules boot: one hearted +
 *  rated dish for the first profile, so a profile switch has something visible
 *  to swap. Written for profile "default" — profiles.js mints that id first. */
function seedExpr(venueId, venueName, dishName) {
  const entry = { type: "dish", venueId, venueName, name: dishName, isRecipe: false };
  const favourites = JSON.stringify([entry]);
  const ratings = JSON.stringify({ [`d:${venueId} ${dishName}`]: SEED_RATING });
  return `try {
  localStorage.setItem("faves.p.default.favourites.v1", ${JSON.stringify(favourites)});
  localStorage.setItem("faves.p.default.ratings.v1", ${JSON.stringify(ratings)});
} catch (e) { /* opaque origin (about:blank) — the real page seeds on load */ }`;
}

// --- Runner -------------------------------------------------------------

const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

async function run(opts) {
  const report = new Report(opts.verbose);

  // Which dish carries the seeded heart + rating: the first one tagged with the
  // allergen under test, so one dish exercises both halves of the check.
  const venuePath = join(SITE, "data", "restaurants", `${opts.id}.json`);
  const venue = JSON.parse(await readFile(venuePath, "utf8"));
  const items = (venue.menu || []).flatMap((s) => s.items || []);
  const seedDish = items.find((i) => (i.tags || []).includes(ALLERGEN.key));
  if (!seedDish) {
    throw new Error(`${opts.id} has no ${ALLERGEN.key} dish — pick another --id`);
  }

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-device-check-"));
  let chrome = null;
  let cdp = null;

  try {
    const url = `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(opts.id)}`;
    console.log(`Faves device check — live allergen re-highlight`);
    console.log(`  venue    ${venue.name} (${opts.id})`);
    console.log(`  page     ${url}`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    report.step("connected to Chrome");

    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

    // Every navigation the page makes on its own is a failure of the thing under
    // test ("live, without a reload"), so count them rather than trust a sentinel
    // alone. The first load is expected; anything after it is not.
    let navigations = 0;
    cdp.on("Page.frameNavigated", (p) => {
      if (!p.frame.parentId) navigations++;
    });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    // Mobile width (the design target) without touch emulation: the behaviour
    // under test is layout-independent, and mouse input is the deterministic way
    // to drive real controls.
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
      sessionId
    );
    await cdp.send(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: seedExpr(opts.id, venue.name, seedDish.name) },
      sessionId
    );

    const { evalPage, settle, click } = createDriver(cdp, sessionId, (m) => report.step(m));

    const snap = () => evalPage(snapshotExpr(seedDish.name));

    // --- 1. First paint --------------------------------------------------
    await cdp.send("Page.navigate", { url }, sessionId);
    await until(async () => (await evalPage("document.querySelectorAll('li.dish').length")) > 0, {
      label: "the menu to render",
    });
    // A marker only a genuine document load can clear — belt to the navigation
    // counter's braces.
    await evalPage("window.__favesDeviceCheck = 'alive'");
    const navsAfterLoad = navigations;

    const first = await snap();
    // One tagged dish is enough for the real assertion below ("every tagged
    // dish lights up"), and the zero case already hard-errors before the
    // browser starts. It used to demand five, which turned a healthy venue with
    // four into a red FAIL that meant nothing — and a red result that means
    // nothing is how a check stops being read.
    report.check(
      "menu renders with allergen-tagged dishes",
      first.dishes > 0 && first.allergen.length >= 1,
      `${first.dishes} dishes, ${first.allergen.length} tagged ${ALLERGEN.key}`
    );
    report.check(
      "no dish is flagged before any preference is set",
      first.flagged.length === 0 && first.flaggedChips === 0,
      `${first.flagged.length} flagged rows, ${first.flaggedChips} flagged tag chips`
    );
    report.check(
      "seeded heart and rating render for the first profile",
      first.heart === "true" && first.rating === String(SEED_RATING),
      `${seedDish.name}: heart=${first.heart}, rating=${first.rating}`
    );
    const firstProfile = first.profile;

    // --- 1b. The confidence ⓘ (ADR 0037) ---------------------------------
    // It is present either way and only its tone changes, so the check is that
    // the tone MATCHES THE DATA rather than that a particular tone appears —
    // a blue "up to date" on a stale menu is the failure worth catching, and
    // it cannot be seen by asserting the button merely exists.
    const tip = await evalPage(`(() => {
      const btn = document.querySelector(".menu-title-group .caveat-btn");
      if (!btn) return null;
      btn.click();
      const note = document.getElementById(btn.getAttribute("aria-controls"));
      return {
        info: btn.classList.contains("is-info"),
        noteInfo: note ? note.classList.contains("is-info") : null,
        open: note ? note.classList.contains("is-open") : null,
        text: note ? note.textContent : "",
        expanded: btn.getAttribute("aria-expanded"),
        glyph: btn.textContent.trim(),
        label: btn.getAttribute("aria-label"),
        tapTarget: Math.min(btn.getBoundingClientRect().width, btn.getBoundingClientRect().height),
      };
    })()`);
    // What the data says this venue's tone must be, computed here from the
    // record rather than from the DOM we are testing.
    const trusted = ["in-store", "paper-menu", "official-site", "phone"];
    const vDate = venue.verified;
    const fresh =
      typeof vDate === "string" &&
      trusted.includes(venue.verifiedBy) &&
      Date.now() - Date.parse(vDate) < 365 * 24 * 3600 * 1000;
    report.check(
      "the confidence ⓘ is present beside the venue name",
      tip !== null && tip.expanded === "true" && tip.open === true,
      tip ? `aria-expanded=${tip.expanded}, note open=${tip.open}` : "no ⓘ found"
    );
    report.check(
      `the ⓘ tone matches the record (${fresh ? "fresh ⇒ info" : "needs a refresh ⇒ caution"})`,
      tip !== null && tip.info === fresh && tip.noteInfo === fresh,
      `verified=${vDate ?? "never"} by ${venue.verifiedBy ?? "—"}; is-info=${tip?.info}`
    );
    report.check(
      "the ⓘ keeps a 44px tap target",
      tip !== null && tip.tapTarget >= 44,
      `${tip?.tapTarget}px`
    );
    // Colour is never the only signal: the glyph and the accessible name must
    // differ between the tones too, or a colour-blind reader sees one control.
    report.check(
      "the tone is carried by shape and label, not colour alone",
      tip !== null && tip.glyph === (fresh ? "ⓘ" : "⚠") && /refresh|checked/.test(tip.label || ""),
      `glyph=${tip?.glyph}, aria-label=“${tip?.label}”`
    );
    if (fresh) {
      report.check(
        "the up-to-date note states the currency",
        /New Zealand dollars \(NZD\)/.test(tip.text),
        tip.text.trim()
      );
      // The note may only claim the phone/address/hours were checked when the
      // record carries their own reading — the whole point of splitting the
      // field out (ADR 0037).
      const claimsDetails = /opening hours/.test(tip.text);
      const primary = venue.locations?.[0];
      // Per-branch provenance (ADR NNNN). A branch may carry its own reading, in
      // which case the note describes THAT branch and the venue-level pair is
      // only the fallback — so "does the note mention hours" now has to ask both
      // levels, in the order the app resolves them.
      const detailsDate = primary?.detailsVerified ?? venue.detailsVerified;
      report.check(
        "the note claims venue details only when they have their own date",
        claimsDetails === Boolean(detailsDate),
        `detailsVerified=${detailsDate ?? "absent"} (branch or venue), note mentions hours=${claimsDetails}`
      );
      // With no captured location the nearest branch IS the first one
      // (locations.js), so this is deterministic rather than a lucky ordering.
      if (venue.locations?.length > 1 && primary?.detailsVerified) {
        report.check(
          "a branch-scoped reading names the branch it describes",
          tip.text.includes(`at ${primary.label}`),
          tip.text.trim()
        );
        // The assertion that matters: the stronger branch has stopped being
        // dragged down to the venue's weakest-wins summary. Only fires when the
        // two levels genuinely disagree, so it cannot pass vacuously.
        // The phrases are menu.js's CHECKED_PHRASE; a reword there breaks this
        // check loudly, which is the safe direction for a drift.
        const PHRASE = {
          "in-store": "checked in store",
          "paper-menu": "read from the shop’s own menu",
          "official-site": "checked against the place’s own site",
          phone: "confirmed with the place by phone",
          "delivery-app": "taken from a delivery app",
          "third-party": "taken from a directory listing",
        };
        if (venue.detailsVerifiedBy && primary.detailsVerifiedBy !== venue.detailsVerifiedBy) {
          report.check(
            "the branch's own method wins over the venue's weakest-wins summary",
            tip.text.includes(PHRASE[primary.detailsVerifiedBy]) &&
              !tip.text.includes(PHRASE[venue.detailsVerifiedBy]),
            `branch=${primary.detailsVerifiedBy}, venue=${venue.detailsVerifiedBy ?? "—"}: ${tip.text.trim()}`
          );
        }
      }
    }
    await evalPage(`document.querySelector(".menu-title-group .caveat-btn").click()`);

    // --- 1c. A multi-location venue shows every branch ----------------------
    // Not a test of hours/phone: `data.js` projects the primary branch up to
    // the top level, so those are covered by the single-site path already. What
    // is genuinely branch-only is the aside listing ALL branches — a venue with
    // two addresses that renders one is the failure worth catching.
    const branchCount = venue.locations?.length ?? 1;
    if (branchCount > 1) {
      const shown = await evalPage(
        `document.querySelectorAll(".menu-aside .contact-row[href^='http'], .menu-aside .contact-row[href^='geo']").length`
      );
      report.check(
        "every branch of a multi-location venue is listed",
        shown >= branchCount,
        `${branchCount} branches in the record, ${shown} address row(s) rendered`
      );
    }

    // --- 2. Flip an allergen preference, live ----------------------------
    await click("#overflow-btn");
    await click("#settings-btn");
    await until(async () => (await snap()).settingsOpen, { label: "the Settings sheet to open" });
    report.check("Settings opens from the menu page's ⋯ menu", true);

    await click(".settings-row", "Food preferences");

    // --- The allergen caveat ⓘ opens on a click (ADR 0059) ----------------
    // ADR 0059 made every ⓘ click-only. The invariant "no hover reveal exists"
    // is asserted in tests/disclosure-css.test.js, NOT here: a synthetic
    // mouseMoved does not reliably raise CSS :hover in this harness — the
    // deleted rule was put back and a hover assertion here PASSED against it,
    // which is a check that would have read as coverage while proving nothing.
    // What a real browser can prove is the half that matters to a user: the
    // one remaining way in still works.
    const caveat = ".settings-sub-row .caveat-btn";
    const caveatShown = () => evalPage(
      `!!document.querySelector(".settings-sub-row .caveat-note") &&` +
      ` getComputedStyle(document.querySelector(".settings-sub-row .caveat-note")).display !== "none"`
    );
    if (await evalPage(`!!document.querySelector(${JSON.stringify(caveat)})`)) {
      const before = await caveatShown();
      await click(caveat);
      const opened = await caveatShown();
      await click(caveat);
      const closed = await caveatShown();
      report.check(
        "the allergen ⓘ opens and closes on a click — the one way in, on every input",
        before === false && opened === true && closed === false,
        `closed → ${opened ? "open" : "still closed"} → ${closed ? "still open" : "closed"}`
      );
    }

    await click(`.pref-chips-avoid .pref-chip[data-key="${ALLERGEN.key}"]`);
    const chipOn = await evalPage(
      `document.querySelector('.pref-chips-avoid .pref-chip[data-key="${ALLERGEN.key}"]')` +
        `.getAttribute("aria-pressed")`
    );
    report.check(`"${ALLERGEN.chip}" reads as flagged in Settings`, chipOn === "true", `aria-pressed=${chipOn}`);

    const flipped = await snap();
    report.check(
      "allergen warnings light up live on every matching dish",
      flipped.flagged.length > 0 && same(flipped.flagged, flipped.allergen),
      `${flipped.flagged.length} of ${flipped.allergen.length} tagged dishes flagged, ` +
        `${flipped.flaggedChips} tag chips shouting`
    );
    report.check(
      "no reload or navigation was needed",
      flipped.sentinel === "alive" && navigations === navsAfterLoad,
      `sentinel=${flipped.sentinel}, navigations since load=${navigations - navsAfterLoad}`
    );
    report.check(
      "hearts and ratings survive the safety re-render",
      flipped.heart === "true" && flipped.rating === String(SEED_RATING),
      `${seedDish.name}: heart=${flipped.heart}, rating=${flipped.rating}`
    );

    // --- 3. Switch profile ------------------------------------------------
    await click(".settings-back");
    await click(".settings-row", "using Faves");
    await click('.profile-btn[data-act="add"]');
    await click("#profile-name-input");
    await cdp.send("Input.insertText", { text: GUEST_NAME }, sessionId);
    await click(".profile-btn-primary");
    await settle();

    const switched = await snap();
    report.check(
      "the new profile is the one browsing",
      switched.profile === GUEST_NAME,
      `browsing as "${switched.profile}" (was "${firstProfile}")`
    );
    // Requires the *transition*, not just the end state: "nothing flagged" is
    // also true of a menu that never flagged anything, so a broken re-apply
    // would sail through an end-state-only assertion.
    report.check(
      "safety treatment re-applies for the new profile — warnings clear",
      flipped.flagged.length > 0 && switched.flagged.length === 0 && switched.flaggedChips === 0,
      `${flipped.flagged.length} flagged before the switch → ${switched.flagged.length} after ` +
        `(${switched.flaggedChips} flagged tag chips)`
    );
    report.check(
      "hearts and ratings re-apply per profile",
      switched.heart === "false" && switched.rating === "0",
      `${seedDish.name}: heart=${switched.heart}, rating=${switched.rating}`
    );
    report.check(
      "the profile switch needed no reload either",
      switched.sentinel === "alive" && navigations === navsAfterLoad,
      `sentinel=${switched.sentinel}, navigations since load=${navigations - navsAfterLoad}`
    );

    // --- 4. Switch back ---------------------------------------------------
    // The reverse direction is the one that would betray a one-way re-render:
    // warnings must come *back*, not merely go away.
    await click(".profile-list .profile-chip", firstProfile);
    await settle();
    const back = await snap();
    report.check(
      "switching back restores the first profile's warnings",
      same(back.flagged, back.allergen) && back.flagged.length > 0,
      `browsing as "${back.profile}", ${back.flagged.length} dishes flagged again`
    );
    report.check(
      "switching back restores the first profile's heart and rating",
      back.heart === "true" && back.rating === String(SEED_RATING),
      `${seedDish.name}: heart=${back.heart}, rating=${back.rating}`
    );
    report.check(
      "still one page load for the whole run",
      back.sentinel === "alive" && navigations === navsAfterLoad,
      `navigations since load=${navigations - navsAfterLoad}`
    );

    console.log(`\n${report.failed ? "FAILED" : "OK"} — ${report.passed} passed, ${report.failed} failed`);
    return report.failed ? 1 : 0;
  } finally {
    cdp?.close();
    await stopChrome(chrome?.proc);
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    if (opts.keepProfile) console.log(`Chrome profile kept at ${profileDir}`);
    else await rm(profileDir, { recursive: true, force: true });
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
