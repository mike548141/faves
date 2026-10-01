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

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { foldSearchText } from "../site/js/search.js";
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
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// A venue whose menu carries plenty of peanut-tagged dishes, so the assertion
// has real signal rather than resting on one row. Override with --id.
const DEFAULT_VENUE = "rs-satay-noodle-house";
const ALLERGEN = { key: "contains-peanuts", chip: "Peanuts" };
const SEED_RATING = 4;
// The one PUBLISHED Cook at Home recipe section 9 hearts beside the personal ones.
// Named, and checked against the data before a browser starts.
const PUBLISHED_RECIPE = { dishId: "easy-pad-thai", name: "Easy Pad Thai" };
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
    // ADR 0140: what Halal must light, and a signature of every row's state so
    // "Meatarian changed nothing" is a comparison, not an absence of evidence.
    pork: dishes.filter((d) => tags(d).includes("contains-pork")).map(nameOf),
    rows: dishes.map((d) => [d.className, d.hidden, getComputedStyle(d).opacity].join("|")).join("\\n"),
    foodChips: Object.fromEntries([...document.querySelectorAll(".pref-chip[data-key]")]
      .filter((c) => ["halal", "kosher", "meatarian"].includes(c.dataset.key))
      .map((c) => [c.dataset.key, c.getAttribute("aria-pressed")])),
    // The note under the food preferences, as PAINTED: "" when hidden. It
    // appears only for a selected preference (owner-ruled 2026-09-29).
    foodHint: (() => {
      const p = document.querySelector(".food-hint");
      if (!p || p.hidden || !p.getClientRects().length) return "";
      return [...p.children].filter((s) => !s.hidden).map((s) => s.textContent).join("").trim();
    })(),
    flagged: dishes.filter((d) => d.classList.contains("dish-flagged")).map(nameOf),
    flaggedChips: document.querySelectorAll(".tag-allergen.is-flagged").length,
    // Owner's ruling 2026-08-17: a chip for a need this reader has NOT declared
    // is DULLED, never hidden, and an allergen chip drops the word "Contains".
    // Counted here because the whole point is that the muted ones are still on
    // the page — a check that only counted the loud ones would pass just as
    // happily if the quiet ones vanished, which is the failure this must catch.
    mutedAllergenChips: document.querySelectorAll(".tag-allergen.is-muted").length,
    mutedDietChips: document.querySelectorAll(".tag-diet.is-muted").length,
    allergenChipsTotal: document.querySelectorAll(".tag-allergen").length,
    // "CONTAINS" must appear on a flagged chip and on no muted one. Read off
    // rendered text rather than the source string, because the uppercasing is
    // CSS and the word we removed is not.
    saysContainsFlagged: [...document.querySelectorAll(".tag-allergen.is-flagged")]
      .filter((c) => /contains/i.test(c.textContent)).length,
    saysContainsMuted: [...document.querySelectorAll(".tag-allergen.is-muted")]
      .filter((c) => /contains/i.test(c.textContent)).length,
    // A muted chip that is invisible, zero-sized or removed from the a11y tree
    // is a HIDDEN chip wearing a different name. Measured, not assumed.
    mutedChipsVisible: [...document.querySelectorAll(".tag-allergen.is-muted, .tag-diet.is-muted")]
      .filter((c) => {
        const s = getComputedStyle(c);
        return c.getBoundingClientRect().width > 0 && s.visibility !== "hidden" &&
               s.display !== "none" && Number(s.opacity) > 0 && c.getAttribute("aria-hidden") !== "true";
      }).length,
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

  // Which dish carries the seeded heart + rating: the first one tagged with the
  // allergen under test, so one dish exercises both halves of the check.
  const venuePath = join(SITE, "data", "restaurants", `${opts.id}.json`);
  const venue = JSON.parse(await readFile(venuePath, "utf8"));
  const items = (venue.menu || []).flatMap((s) => s.items || []);
  const seedDish = items.find((i) => (i.tags || []).includes(ALLERGEN.key));
  if (!seedDish) {
    throw new Error(`${opts.id} has no ${ALLERGEN.key} dish — pick another --id`);
  }
  refuseAmbiguousFixture(items, seedDish.name, opts.id);

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-device-check-"));
  let chrome = null;
  let cdp = null;

  try {
    const url = `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(opts.id)}`;
    console.log(`Faves device check — live allergen re-highlight`);
    console.log(`  venue    ${venue.name} (${opts.id})`);
    // Re-derived, not named — so print it: a merge that changes which dish is
    // "the first one tagged" changes this line, and a reader can see the
    // subject moved (roadmap 28s).
    console.log(`  dish     ${seedDish.name}  (first tagged ${ALLERGEN.key}; hearted + rated)`);
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
    await untilPresent(async () => (await evalPage("document.querySelectorAll('li.dish').length")) > 0, {
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
    // --- The chip-loudness rule (owner's ruling 2026-08-17) --------------
    // Before any preference is set NOTHING is this reader's, so every allergen
    // chip on the page must be muted — and must still BE on the page.
    report.check(
      "with no preferences set, every allergen chip is muted and none is hidden",
      first.allergenChipsTotal > 0 &&
        first.mutedAllergenChips === first.allergenChipsTotal &&
        first.mutedChipsVisible === first.mutedAllergenChips + first.mutedDietChips,
      `${first.mutedAllergenChips}/${first.allergenChipsTotal} allergen chips muted, ` +
        `${first.mutedChipsVisible} of ${first.mutedAllergenChips + first.mutedDietChips} muted chips visible`
    );
    report.check(
      'a muted allergen chip drops the word "Contains"',
      first.saysContainsMuted === 0,
      `${first.saysContainsMuted} muted chip(s) still say "contains"`
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
    await evalPage(`${need(".menu-title-group .caveat-btn")}.click()`);

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
    await untilPresent(async () => (await snap()).settingsOpen, { label: "the Settings sheet to open" });
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
    // The other half of the ruling: declaring the allergen turns THAT chip loud
    // and restores its "Contains", while every chip the reader did not declare
    // stays muted. Both halves in one assertion, because a rule that made
    // everything loud would pass "the flagged one is loud" perfectly well.
    report.check(
      'declaring an allergen makes ONLY that chip shout, and gives it back "Contains"',
      flipped.flaggedChips > 0 &&
        flipped.saysContainsFlagged === flipped.flaggedChips &&
        flipped.saysContainsMuted === 0 &&
        flipped.mutedAllergenChips === flipped.allergenChipsTotal - flipped.flaggedChips,
      `${flipped.flaggedChips} loud (all saying "contains"), ` +
        `${flipped.mutedAllergenChips} still muted of ${flipped.allergenChipsTotal}`
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

    // --- 2b. Halal, Kosher and Meatarian (ADR 0140, owner-ruled 2026-09-29) --
    // Meatarian FIRST, against a known state: it must change nothing on the
    // page — not a flag, not a dim, not a hidden row. `dishSatisfiesDiet`
    // answers false for a key it does not know, so a Meatarian key leaking
    // into a filter would dim every row, and this comparison is what sees it.
    const beforeFood = await snap();
    report.check(
      "Settings offers Halal, Kosher and Meatarian, none selected",
      JSON.stringify(beforeFood.foodChips) === JSON.stringify({ halal: "false", kosher: "false", meatarian: "false" }),
      JSON.stringify(beforeFood.foodChips)
    );
    await click('.pref-chip[data-key="meatarian"]');
    const meat = await snap();
    report.check(
      "Meatarian is selectable and changes nothing on the menu",
      meat.foodChips.meatarian === "true" && meat.rows === beforeFood.rows &&
        same(meat.flagged, beforeFood.flagged) && meat.flaggedChips === beforeFood.flaggedChips,
      `pressed=${meat.foodChips.meatarian}; rows identical=${meat.rows === beforeFood.rows}; ` +
        `${meat.flagged.length} flagged (was ${beforeFood.flagged.length})`
    );
    await click('.pref-chip[data-key="halal"]');
    const halal = await snap();
    const wantHalal = [...new Set([...halal.allergen, ...halal.pork])];
    report.check(
      "Halal flags every pork dish live, on top of the reader's own allergen",
      halal.pork.length > 0 && same(halal.flagged, wantHalal) &&
        halal.sentinel === "alive" && navigations === navsAfterLoad,
      `${halal.flagged.length} flagged = ${halal.allergen.length} ${ALLERGEN.key} ∪ ` +
        `${halal.pork.length} contains-pork (${wantHalal.length} distinct); no reload`
    );
    report.check(
      "Halal dims and hides nothing — it only warns",
      halal.dishes === beforeFood.dishes &&
        halal.rows.split("\n").every((r, i) => r.split("|").slice(1).join("|") ===
          beforeFood.rows.split("\n")[i].split("|").slice(1).join("|")),
      `${halal.dishes} rows before and after, visibility and opacity unchanged`
    );
    // Put both back, so the profile switch below starts from the state it
    // always has, and prove the warnings LEAVE again (the reverse direction).
    await click('.pref-chip[data-key="halal"]');
    await click('.pref-chip[data-key="meatarian"]');
    const cleared = await snap();
    await click('.pref-chip[data-key="kosher"]');
    const kosher = await snap();
    await click('.pref-chip[data-key="kosher"]');
    const hint = (v) => JSON.stringify(v.foodHint.slice(0, 40));
    report.check(
      "the food-preference note shows only for what is selected",
      beforeFood.foodHint === "" &&
        meat.foodHint === "Meatarian doesn’t change any menu yet." &&
        halal.foodHint.startsWith("Halal and Kosher flag") && halal.foodHint.endsWith("Meatarian doesn’t change any menu yet.") &&
        kosher.foodHint.startsWith("Halal and Kosher flag") && !kosher.foodHint.includes("Meatarian") &&
        cleared.foodHint === "",
      `none ${hint(beforeFood)} · Meatarian ${hint(meat)} · +Halal ${hint(halal)} · ` +
        `Kosher alone ${hint(kosher)} · cleared ${hint(cleared)}`
    );
    report.check(
      "turning Halal off takes the pork warnings away again, live",
      same(cleared.flagged, cleared.allergen) &&
        JSON.stringify(cleared.foodChips) === JSON.stringify({ halal: "false", kosher: "false", meatarian: "false" }),
      `${cleared.flagged.length} flagged, chips ${JSON.stringify(cleared.foodChips)}`
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
    // --- 7. A heart or a rating step repaints ONE dish (roadmap 510/150) ----
    // Every dish holds its own subscription to the shared store, which is right
    // (a cross-tab or sync change must repaint every control) and used to mean
    // one tap rebuilt every control on the menu: 795 DOM changes for a heart and
    // 2,430 for a rating step on a 264-dish menu. The assertion is about WHERE
    // the changes land: after a tap, nothing inside any OTHER dish may be
    // touched — and the tapped dish must have changed, or "nothing moved" would
    // be satisfied by a tap that did nothing. The control: the tapped dish's own
    // heart flips and then the same tap is repeated to put it back.
    const scoped = (expr) =>
      evalPage(`(async () => {
        const rows = [...document.querySelectorAll("li.dish")].filter(
          (d) => d.querySelector(".dish-actions .heart") && d.querySelector(".dish-rating [role=slider]")
        );
        const target = rows.find((d) => d.dataset.name !== ${JSON.stringify(seedDish.name.toLowerCase())});
        let mine = 0, others = 0;
        const seen = [];
        // Collected in the callback: awaiting a frame lets the observer deliver
        // first, and takeRecords() afterwards would then read an empty queue.
        const mo = new MutationObserver((recs) => seen.push(...recs));
        mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
        await (${expr})(target);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        for (const m of [...seen, ...mo.takeRecords()]) {
          const row = (m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest("li.dish");
          if (!row) continue;
          if (row === target) mine++; else others++;
        }
        mo.disconnect();
        return { rows: rows.length, mine, others, name: target.dataset.name };
      })()`);
    const heartTap = await scoped(`(d) => d.querySelector(".dish-actions .heart").click()`);
    report.check(
      "a heart repaints that dish and no other",
      heartTap.mine > 0 && heartTap.others === 0 && heartTap.rows > 2,
      `${heartTap.name}: ${heartTap.mine} change(s) in it, ${heartTap.others} in the other ${heartTap.rows - 1} dishes`
    );
    const stepKey = `(d) => d.querySelector(".dish-rating [role=slider]")
      .dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true, cancelable: true }))`;
    const ratingTap = await scoped(stepKey);
    report.check(
      "a rating step repaints that dish and no other",
      ratingTap.mine > 0 && ratingTap.others === 0,
      `${ratingTap.name}: ${ratingTap.mine} change(s) in it, ${ratingTap.others} in the other ${ratingTap.rows - 1} dishes`
    );
    // The reason the subscription exists: a change that did NOT come from a tap
    // here (another tab, a sync pull) must still reach every control.
    const external = await evalPage(`(async () => {
      const rows = [...document.querySelectorAll("li.dish")].filter(
        (d) => d.querySelector(".dish-actions .heart") && d.querySelector(".dish-rating [role=slider]")
      );
      const t = rows.find((d) => d.dataset.name === ${JSON.stringify(seedDish.name.toLowerCase())});
      const before = [t.querySelector(".heart").getAttribute("aria-pressed"), t.querySelector("[role=slider]").getAttribute("aria-valuenow")];
      const m = await import("/js/favourites.js"), r = await import("/js/ratings.js");
      // Drop the seeded heart + rating straight in the stores, then reload them
      // from storage exactly as a storage event does.
      const key = m.favKey({ type: "dish", venueId: ${JSON.stringify(opts.id)}, name: ${JSON.stringify(seedDish.name)}, dishId: t.dataset.dishId });
      m.favourites.removeKey(key);
      r.ratings.clear({ type: "dish", venueId: ${JSON.stringify(opts.id)}, name: ${JSON.stringify(seedDish.name)}, dishId: t.dataset.dishId });
      await new Promise((r) => requestAnimationFrame(r));
      return { before, after: [t.querySelector(".heart").getAttribute("aria-pressed"), t.querySelector("[role=slider]").getAttribute("aria-valuenow")] };
    })()`);
    report.check(
      "a change made outside the tapped control still repaints every control that shows it",
      external.before[0] === "true" && external.before[1] === String(SEED_RATING) &&
        external.after[0] === "false" && external.after[1] === "0",
      `heart ${external.before[0]} → ${external.after[0]}, rating ${external.before[1]} → ${external.after[1]}`
    );

    report.check(
      "still one page load for the whole run",
      back.sentinel === "alive" && navigations === navsAfterLoad,
      `navigations since load=${navigations - navsAfterLoad}`
    );

    // --- 8. The home list is not rebuilt for a heart that cannot move it ------
    // (roadmap 510/150.) The list is ranked on the SET of hearted venues, so a
    // dish hearted at a venue that is already hearted changes nothing the list
    // shows — yet the subscriber used to rebuild all 57 cards for it. A venue
    // heart, by contrast, may legitimately re-rank, so it is only the CONTROL:
    // it must light its own card's heart, proving the store really did change.
    await cdp.send("Page.navigate", { url: url.replace(/restaurant\.html.*$/, "index.html") }, sessionId);
    await untilPresent(async () => (await evalPage("document.querySelectorAll('#restaurant-list .card .card-heart').length")) > 0, {
      label: "the home list to render",
    });
    const home = await evalPage(`(async () => {
      const list = document.querySelector("#restaurant-list");
      const { favourites } = await import("/js/favourites.js");
      const card = list.querySelector(".card:has(.card-heart)");
      const heart = card.querySelector(".card-heart");
      const href = new URL(card.querySelector("a.card-link").href).searchParams.get("id");
      const venue = { type: "venue", venueId: href, venueName: card.querySelector(".card-name").textContent };
      favourites.toggle(venue); // control: the card's own heart must light
      await new Promise((r) => setTimeout(r, 300));
      const live = [...list.querySelectorAll(".card")].find((c) => c.querySelector("a.card-link")?.href.includes("id=" + href));
      const lit = live?.querySelector(".card-heart")?.getAttribute("aria-pressed");
      const before = [...list.children];
      let moved = 0;
      const mo = new MutationObserver((recs) => { moved += recs.length; });
      mo.observe(list, { subtree: true, childList: true, attributes: true, characterData: true });
      favourites.toggle({ type: "dish", venueId: href, venueName: venue.venueName, name: "Probe dish", dishId: "probe-dish" });
      await new Promise((r) => setTimeout(r, 300));
      mo.disconnect();
      const same = before.length === list.children.length && before.every((c, i) => c === list.children[i]);
      favourites.removeKey("d:" + href + " probe-dish");
      favourites.toggle(venue);
      return { lit, moved, same, cards: before.length };
    })()`);
    report.check(
      "a venue heart lights its card on the home list (control)",
      home.lit === "true",
      `aria-pressed=${home.lit}`
    );
    report.check(
      "hearting a dish at an already-hearted venue leaves the home list alone",
      home.moved === 0 && home.same,
      `${home.moved} DOM change(s) in the list, same ${home.cards} card elements: ${home.same}`
    );

    // --- 9. Favourites: your own recipes sit INSIDE Cook at Home -------------
    // (roadmap 510/290, owner-ruled 2026-10-01: "I should see all the recipes
    // together under Cook at home".) The home screen's Favourites view used to
    // list a hearted personal recipe under a separate "My recipes" heading. Now it
    // is a row of the Cook at Home group, in the order it was hearted among the
    // published ones, wearing a "My recipe" label in words. Only HEARTED ones show.
    //
    // Driven through the page's OWN store modules (the same singletons app.js
    // holds), exactly as section 8 does, because the seed above rewrites storage
    // on every document load and a reload would erase the hearts. Fixture names are
    // synthetic; the one published recipe is named here and checked against the
    // data first, so a corpus change moves the subject loudly, not silently.
    const cookRecord = JSON.parse(await readFile(join(SITE, "data", "restaurants", "cook-at-home.json"), "utf8"));
    const published = (cookRecord.menu || []).flatMap((x) => x.items || []).find((i) => i.dishId === PUBLISHED_RECIPE.dishId);
    if (!published || published.name !== PUBLISHED_RECIPE.name) {
      throw new Error(
        `cook-at-home has no "${PUBLISHED_RECIPE.name}" (${PUBLISHED_RECIPE.dishId}) — pick another published recipe rather than let section 9 test nothing`
      );
    }
    const mineA = { dishId: "u:fixture-home-stew", name: "Fixture Home Stew" };
    const mineB = { dishId: "u:fixture-home-tart", name: "Fixture Home Tart" };
    const unhearted = { dishId: "u:fixture-unhearted-bake", name: "Fixture Unhearted Bake" };
    const venueDish = { type: "dish", venueId: opts.id, venueName: venue.name, name: seedDish.name, dishId: seedDish.dishId || undefined, isRecipe: false };
    await evalPage(`(async () => {
      const f = await import("/js/favourites.js"), r = await import("/js/recipes.js");
      for (const e of [...f.favourites.items()]) f.favourites.removeKey(f.favKey(e));
      for (const rec of ${JSON.stringify([mineA, mineB, unhearted])}) r.recipes.put({ ...rec, section: "Fixtures" });
      const mine = (x) => ({ type: "dish", venueId: r.MY_RECIPES, venueName: r.MY_RECIPES_NAME, name: x.name, dishId: x.dishId, isRecipe: true });
      // Hearted in THIS order: personal, a place's dish, published, personal.
      f.favourites.toggle(mine(${JSON.stringify(mineA)}));
      f.favourites.toggle(${JSON.stringify(venueDish)});
      f.favourites.toggle({ type: "dish", venueId: "cook-at-home", venueName: "Cook at Home", name: ${JSON.stringify(PUBLISHED_RECIPE.name)}, dishId: ${JSON.stringify(PUBLISHED_RECIPE.dishId)}, isRecipe: true });
      f.favourites.toggle(mine(${JSON.stringify(mineB)}));
    })()`);
    // Favourites lives in the ⋯ menu on the home screen, behind its button.
    await click("#overflow-btn");
    await click("#favourites-toggle");
    await untilPresent(() => evalPage(`document.querySelectorAll("#favourites-groups .fav-venue-group").length > 0`), {
      label: "the Favourites view to render its groups",
    });
    await settle();
    const favView = () => evalPage(`(() => {
      const root = document.querySelector("#favourites-groups");
      const groups = [...root.querySelectorAll(".fav-venue-group")].map((g) => {
        const head = g.querySelector(".fav-venue-head");
        const rows = [...g.querySelectorAll("li.search-row:not(.fav-venue-head)")].map((li) => {
          const a = li.querySelector("a.search-link");
          const owner = a?.querySelector(".recipe-owner");
          return {
            name: li.querySelector(".search-row-name")?.textContent.trim(),
            href: a?.getAttribute("href"),
            owner: owner ? owner.textContent.trim() : null,
            ownerInLink: !!owner && a.contains(owner),
            linkText: (a?.textContent || "").replace(/\\s+/g, " ").trim(),
            height: Math.round(a?.getBoundingClientRect().height || 0),
          };
        });
        return {
          head: head?.querySelector(".search-row-name")?.textContent.trim(),
          headHref: head?.querySelector("a.fav-venue-link")?.getAttribute("href") || null,
          rows,
        };
      });
      return {
        groups,
        summary: document.querySelector("#favourites-summary")?.textContent.trim(),
        text: root.textContent,
        marked: root.querySelectorAll(".fav-recheck, .fav-drop").length,
        scrollX: document.documentElement.scrollWidth > innerWidth,
      };
    })()`);
    const fv = await favView();
    const cook = fv.groups.find((g) => g.headHref === "restaurant.html?id=cook-at-home");
    const cookRows = cook ? cook.rows : [];
    const rowOf = (g, name) => g?.rows.find((r) => r.name === name);

    report.check(
      "Favourites: a hearted personal recipe is a row inside the Cook at Home group, with the published one",
      !!cook && !!rowOf(cook, mineA.name) && !!rowOf(cook, mineB.name) && !!rowOf(cook, PUBLISHED_RECIPE.name),
      JSON.stringify(cookRows.map((r) => r.name))
    );
    report.check(
      'Favourites: …and it carries a "My recipe" label, inside its link so a screen reader says it with the name',
      [mineA, mineB].every((m) => {
        const r = rowOf(cook, m.name);
        return r && r.owner === "My recipe" && r.ownerInLink && /My recipe/.test(r.linkText);
      }),
      JSON.stringify(cookRows.map((r) => [r.name, r.owner, r.ownerInLink]))
    );
    report.check(
      "Favourites: …and still opens its own recipe page",
      rowOf(cook, mineA.name)?.href === `recipe.html?id=u:mine&dish=${mineA.dishId}`,
      String(rowOf(cook, mineA.name)?.href)
    );
    report.check(
      "Favourites: the personal row's tap target is still at least 44 px tall, with no sideways scroll",
      cookRows.length > 0 && cookRows.every((r) => r.height >= 44) && !fv.scrollX,
      `row heights ${JSON.stringify(cookRows.map((r) => r.height))}, horizontal scroll ${fv.scrollX}`
    );
    report.check(
      'Favourites: there is no "My recipes" group, heading or text anywhere in the view',
      !/My recipes\b/.test(fv.text) && fv.groups.every((g) => g.headHref !== null),
      `groups ${JSON.stringify(fv.groups.map((g) => g.head))}`
    );
    report.check(
      "Favourites: an unhearted personal recipe does not show (owner: only hearted ones)",
      !fv.text.includes(unhearted.name),
      `"${unhearted.name}" ${fv.text.includes(unhearted.name) ? "IS" : "is not"} in the view`
    );
    report.check(
      "Favourites: a published Cook at Home heart still shows, in the same group, WITHOUT the label",
      rowOf(cook, PUBLISHED_RECIPE.name)?.owner === null,
      `owner label ${JSON.stringify(rowOf(cook, PUBLISHED_RECIPE.name)?.owner)}`
    );
    report.check(
      "Favourites: the group lists personal and published rows in the order they were hearted",
      JSON.stringify(cookRows.map((r) => r.name)) === JSON.stringify([mineA.name, PUBLISHED_RECIPE.name, mineB.name]),
      JSON.stringify(cookRows.map((r) => r.name))
    );
    report.check(
      "Favourites: another place's dish still sits under its own place, unlabelled (control)",
      fv.groups.length === 2 && fv.groups.some((g) => g.headHref === `restaurant.html?id=${opts.id}` && g.rows.length === 1 && g.rows[0].owner === null),
      JSON.stringify(fv.groups.map((g) => [g.headHref, g.rows.length]))
    );
    report.check(
      "Favourites: Cook at Home counts as one place and each personal recipe as a dish — 2 places, 4 dishes",
      /^2 places, 4 dishes saved\./.test(fv.summary || "") && fv.marked === 0,
      `${JSON.stringify(fv.summary)}, ${fv.marked} marked row(s)`
    );

    // Only personal recipes hearted: the Cook at Home group must still appear,
    // under its own name and link, not under a "My recipes" one.
    await evalPage(`(async () => {
      const f = await import("/js/favourites.js");
      for (const e of [...f.favourites.items()]) {
        if (e.venueId !== "u:mine") f.favourites.removeKey(f.favKey(e));
      }
    })()`);
    await settle();
    const only = await favView();
    report.check(
      "Favourites: with ONLY personal recipes hearted, a Cook at Home group still appears, with its place link",
      only.groups.length === 1 && only.groups[0].head?.includes("Cook at Home") &&
        only.groups[0].headHref === "restaurant.html?id=cook-at-home" && only.groups[0].rows.length === 2 &&
        only.groups[0].rows.every((r) => r.owner === "My recipe") && !/My recipes\b/.test(only.text),
      JSON.stringify(only.groups.map((g) => [g.head, g.headHref, g.rows.map((r) => r.owner)]))
    );
    report.check(
      "Favourites: …and that is 1 place, 2 dishes",
      /^1 place, 2 dishes saved\./.test(only.summary || ""),
      JSON.stringify(only.summary)
    );

    // Leave the profile as it was found.
    await evalPage(`(async () => {
      const f = await import("/js/favourites.js"), r = await import("/js/recipes.js");
      for (const e of [...f.favourites.items()]) f.favourites.removeKey(f.favKey(e));
      for (const id of ${JSON.stringify([mineA.dishId, mineB.dishId, unhearted.dishId])}) r.recipes.remove(id);
    })()`);

    // --- 10. The Cook at Home PAGE lists your own recipes (roadmap 510/300) ----
    // Owner-ruled 2026-10-01: "Yes, all of mine." Every recipe in the active
    // person's cookbook is on restaurant.html?id=cook-at-home beside the published
    // ones, hearted or not, each wearing the "My recipe" label; its heart, rating
    // and the page's filter work as on a published row; a switch of person changes
    // the list live; and nothing of it is fetched or published. The recipe's own
    // page wears the label too.
    //
    // Driven through the page's own store modules, as sections 8 and 9 are, because
    // the seed rewrites favourites on every document load. The Network log runs for
    // the whole section: "nothing is fetched for them" is a claim about requests,
    // and only the log can say so.
    const net = [];
    cdp.on("Network.requestWillBeSent", (p) =>
      net.push({ url: p.request.url, type: p.type, body: p.request.postData || "" })
    );
    await cdp.send("Network.enable", {}, sessionId);
    const homeFixture = { ...mineA, section: "Desserts", tags: ["v"], desc: "A fixture." };
    const ownFixtures = [homeFixture, { ...mineB, section: "Fixtures" }, { ...unhearted }];
    await evalPage(`(async () => {
      const r = await import("/js/recipes.js");
      for (const rec of ${JSON.stringify(ownFixtures)}) r.recipes.put(rec);
    })()`);
    const cookUrl = url.replace(/restaurant\.html.*$/, "restaurant.html?id=cook-at-home");
    await cdp.send("Page.navigate", { url: cookUrl }, sessionId);
    await untilPresent(() => evalPage(`document.querySelectorAll("li.dish").length > 0`), {
      label: "the Cook at Home page to render",
    });
    await settle();
    await evalPage("window.__favesDeviceCheck = 'alive'");
    const navsOnCook = navigations;
    const cookView = () => evalPage(`(() => {
      const rows = [...document.querySelectorAll("li.dish")].map((li) => {
        const h3 = li.querySelector(".dish-name");
        const own = h3?.querySelector(".recipe-owner");
        const a = li.querySelector("a.dish-name-link");
        const sec = li.closest(".menu-section");
        return {
          id: li.dataset.dishId,
          name: a?.textContent.trim(),
          href: a?.getAttribute("href"),
          section: sec?.querySelector(".section-title")?.textContent.trim(),
          sectionId: sec?.id,
          owner: own ? own.textContent.trim() : null,
          ownerInName: !!own && h3.contains(own),
          hidden: li.hidden,
          heart: li.querySelector(".dish-actions .heart")?.getAttribute("aria-pressed"),
          rating: li.querySelector(".dish-rating [role=slider]")?.getAttribute("aria-valuenow"),
          chips: li.querySelectorAll(".dish-tags .tag").length,
        };
      });
      return {
        rows,
        nav: [...document.querySelectorAll(".section-link")].map((a) => a.textContent.trim()),
        labels: document.querySelectorAll(".recipe-owner").length,
        scrollX: document.documentElement.scrollWidth > innerWidth,
        sentinel: window.__favesDeviceCheck || null,
        profile: document.querySelector(".profile-caption-name")?.textContent || null,
        count: document.querySelector(".menu-count:not([hidden]) .menu-count-text")?.textContent || null,
      };
    })()`);
    const typeFilter = async (q) => {
      await evalPage(`(() => { const s = ${need(".menu-search")}; s.value = ${JSON.stringify(q)};
        s.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      await settle();
    };
    const publishedCount = (cookRecord.menu || []).flatMap((x) => x.items || []).length;
    const rowFor = (v, d) => v.rows.find((r) => r.id === d.dishId);

    const c1 = await cookView();
    report.check(
      "Cook at Home page: every recipe in your cookbook is listed beside the published ones — hearted or not",
      c1.rows.length === publishedCount + 3 && [mineA, mineB, unhearted].every((d) => rowFor(c1, d)),
      `${c1.rows.length} rows (${publishedCount} published + 3 own): ${JSON.stringify(c1.rows.map((r) => r.name))}`
    );
    report.check(
      "Cook at Home page: …including the one that was never hearted (the imported-curry case)",
      !!rowFor(c1, unhearted) && rowFor(c1, unhearted).heart === "false",
      JSON.stringify(rowFor(c1, unhearted))
    );
    report.check(
      'Cook at Home page: each of your own rows carries "My recipe" in its heading, and no published row does',
      [mineA, mineB, unhearted].every((d) => rowFor(c1, d)?.owner === "My recipe" && rowFor(c1, d)?.ownerInName) &&
        c1.rows.filter((r) => !r.id.startsWith("u:")).every((r) => r.owner === null) && c1.labels === 3,
      `${c1.labels} label(s) on the page; own rows ${JSON.stringify([mineA, mineB, unhearted].map((d) => rowFor(c1, d)?.owner))}`
    );
    report.check(
      "Cook at Home page: a recipe whose section matches a published one sits INSIDE it, after the published recipes",
      (() => {
        const inDesserts = c1.rows.filter((r) => r.section === "Desserts").map((r) => r.id);
        return rowFor(c1, mineA)?.sectionId === "section-desserts" && inDesserts.at(-1) === mineA.dishId && inDesserts.length > 1;
      })(),
      JSON.stringify(c1.rows.filter((r) => r.section === "Desserts").map((r) => r.name))
    );
    report.check(
      'Cook at Home page: any other recipe gets a section of its own after the published ones ("Fixtures", "My recipes")',
      rowFor(c1, mineB)?.section === "Fixtures" && rowFor(c1, unhearted)?.section === "My recipes" &&
        c1.nav.slice(-2).join("|") === "Fixtures|My recipes" && c1.rows.at(-1).id === unhearted.dishId,
      `nav ${JSON.stringify(c1.nav)}`
    );
    report.check(
      "Cook at Home page: a personal row opens its own page, under u:mine — not under the page it is listed on",
      rowFor(c1, mineA)?.href === `recipe.html?id=u:mine&dish=${mineA.dishId}` &&
        rowFor(c1, PUBLISHED_RECIPE)?.href === `recipe.html?id=cook-at-home&dish=${PUBLISHED_RECIPE.dishId}`,
      `${rowFor(c1, mineA)?.href} | ${rowFor(c1, PUBLISHED_RECIPE)?.href}`
    );
    report.check(
      'Cook at Home page: an untagged recipe shows NO tag chips — "not stated", never "free from"',
      rowFor(c1, unhearted)?.chips === 0 && rowFor(c1, mineB)?.chips === 0 && rowFor(c1, mineA)?.chips > 0,
      `chips: untagged ${rowFor(c1, unhearted)?.chips}, tagged ${rowFor(c1, mineA)?.chips}`
    );
    report.check("Cook at Home page: no sideways scroll at 390 px with the labels on", !c1.scrollX, `scrollX=${c1.scrollX}`);

    // Hearts and ratings, as on a published row.
    await evalPage(`document.querySelector('li.dish[data-dish-id="${unhearted.dishId}"] .dish-actions .heart').click()`);
    await settle();
    const h1 = await cookView();
    const stored = await evalPage(`(async () => {
      const f = await import("/js/favourites.js");
      return f.favourites.items().filter((e) => e.venueId === "u:mine").map((e) => [e.dishId, e.venueName, e.isRecipe]);
    })()`);
    report.check(
      "Cook at Home page: tapping an own recipe's heart hearts it under u:mine, exactly as the recipe page does",
      rowFor(h1, unhearted)?.heart === "true" && JSON.stringify(stored) === JSON.stringify([[unhearted.dishId, "My recipes", true]]),
      `${rowFor(h1, unhearted)?.heart} ${JSON.stringify(stored)}`
    );
    await evalPage(`document.querySelector('li.dish[data-dish-id="${unhearted.dishId}"] .dish-rating [role=slider]')
      .dispatchEvent(new KeyboardEvent("keydown", { key: "4", bubbles: true, cancelable: true }))`);
    await settle();
    report.check(
      "Cook at Home page: …and its rating steps",
      rowFor(await cookView(), unhearted)?.rating === "4",
      `rating ${rowFor(await cookView(), unhearted)?.rating}`
    );
    // The filter. "favourites" reads the heart under u:mine; a diet word reads
    // only what the recipe states.
    await typeFilter("favourites");
    const fav = await cookView();
    report.check(
      'Cook at Home page: typing "favourites" finds the own recipe you hearted (a heart under u:mine)',
      fav.rows.filter((r) => !r.hidden).map((r) => r.id).join() === unhearted.dishId,
      JSON.stringify(fav.rows.filter((r) => !r.hidden).map((r) => r.name))
    );
    await evalPage(`document.querySelector('li.dish[data-dish-id="${unhearted.dishId}"] .dish-actions .heart').click()`);
    await settle();
    report.check(
      "Cook at Home page: …and un-hearting it takes it out of that filter on the spot",
      (await cookView()).rows.every((r) => r.hidden),
      "all rows hidden"
    );
    await typeFilter("home stew");
    const byName = await cookView();
    report.check(
      "Cook at Home page: the filter finds your own recipe by name, and only it",
      byName.rows.filter((r) => !r.hidden).map((r) => r.id).join() === mineA.dishId,
      JSON.stringify(byName.rows.filter((r) => !r.hidden).map((r) => r.name))
    );
    await typeFilter("vegetarian");
    const veg = await cookView();
    const shownIds = veg.rows.filter((r) => !r.hidden).map((r) => r.id);
    report.check(
      'Cook at Home page: a diet word finds the own recipe that states it ("v") and NOT the untagged ones',
      shownIds.includes(mineA.dishId) && !shownIds.includes(mineB.dishId) && !shownIds.includes(unhearted.dishId),
      `${shownIds.length} shown; tagged ${shownIds.includes(mineA.dishId)}, untagged ${shownIds.includes(mineB.dishId) || shownIds.includes(unhearted.dishId)}`
    );
    await typeFilter("");

    // A different person's recipes are NOT on this person's page, and the page
    // follows a switch live (no reload): the cookbook is per person (510/120).
    const switchTo = async (who) => {
      // The first switch leaves the sheet open on the profile list (as sections
      // 3 and 4 rely on), so the second one only taps the chip.
      if (!(await evalPage(`!!document.querySelector("dialog.settings-sheet[open]")`))) {
        await click("#overflow-btn");
        await click("#settings-btn");
        await untilPresent(() => evalPage(`!!document.querySelector("dialog.settings-sheet[open]")`), { label: "Settings to open" });
        await click(".settings-row", "using Faves");
      }
      await click(".profile-list .profile-chip", who);
      await settle();
    };
    await switchTo(GUEST_NAME);
    const guest = await cookView();
    report.check(
      "Cook at Home page: a different profile's recipes are NOT listed — the page follows the switch, with no reload",
      guest.profile === GUEST_NAME && guest.rows.length === publishedCount && guest.labels === 0 &&
        guest.sentinel === "alive" && navigations === navsOnCook,
      `as "${guest.profile}": ${guest.rows.length} rows (${publishedCount} published), ${guest.labels} label(s), navigations ${navigations - navsOnCook}`
    );
    await evalPage(`(async () => {
      const r = await import("/js/recipes.js");
      r.recipes.put({ dishId: "u:fixture-guest-salad", name: "Fixture Guest Salad", section: "Dinners" });
    })()`);
    await settle();
    await new Promise((r) => setTimeout(r, 150)); // the page repaints on a microtask after the store changes
    const guestAdd = await cookView();
    report.check(
      "Cook at Home page: a recipe added in the store while the page is open appears on it live, labelled",
      guestAdd.rows.some((r) => r.id === "u:fixture-guest-salad" && r.owner === "My recipe" && r.section === "Dinners"),
      JSON.stringify(guestAdd.rows.filter((r) => r.id.startsWith("u:")).map((r) => [r.name, r.owner]))
    );
    await switchTo(firstProfile);
    const mine2 = await cookView();
    report.check(
      "Cook at Home page: switching back restores YOUR recipes and drops the other profile's",
      [mineA, mineB, unhearted].every((d) => rowFor(mine2, d)) && !mine2.rows.some((r) => r.id === "u:fixture-guest-salad") &&
        navigations === navsOnCook,
      JSON.stringify(mine2.rows.filter((r) => r.id.startsWith("u:")).map((r) => r.name))
    );
    // Leave the Guest cookbook as found: it is deleted with the throwaway profile.

    // The recipe's own page wears the same label; a published recipe's does not.
    await cdp.send("Page.navigate", { url: url.replace(/restaurant\.html.*$/, `recipe.html?id=u:mine&dish=${mineA.dishId}`) }, sessionId);
    await untilPresent(() => evalPage(`!!document.querySelector("h1.menu-title")`), { label: "the personal recipe page" });
    await settle();
    const own = await evalPage(`(() => {
      const o = document.querySelector(".recipe-owner");
      const t = document.querySelector("h1.menu-title");
      return { text: o?.textContent.trim() ?? null, cls: o?.className ?? null, title: t?.textContent.trim(),
        below: !!o && !!t && o.getBoundingClientRect().top >= t.getBoundingClientRect().bottom - 1,
        scrollX: document.documentElement.scrollWidth > innerWidth };
    })()`);
    report.check(
      'a personal recipe\'s own page carries the "My recipe" label under its title',
      own.text === "My recipe" && /recipe-owner-mine/.test(own.cls || "") && own.title === mineA.name && own.below && !own.scrollX,
      JSON.stringify(own)
    );
    await cdp.send("Page.navigate", { url: url.replace(/restaurant\.html.*$/, `recipe.html?id=cook-at-home&dish=${PUBLISHED_RECIPE.dishId}`) }, sessionId);
    await untilPresent(() => evalPage(`!!document.querySelector("h1.menu-title")`), { label: "the published recipe page" });
    report.check(
      "a PUBLISHED recipe's page carries no label (control)",
      (await evalPage(`document.querySelectorAll(".recipe-owner").length`)) === 0,
      "no .recipe-owner element"
    );

    // Nothing is fetched or published for them. Every NON-document request this
    // section made (a navigation to your own recipe's page necessarily names it in
    // the page's own address; that is a link, not a transfer) is searched for the
    // fixtures' words, and the two shipped indexes are read as bytes.
    const personal = /fixture|u:mine|u:fixture/i;
    const leaked = net.filter((r) => r.type !== "Document" && (personal.test(decodeURIComponent(r.url)) || personal.test(r.body)));
    report.check(
      "no request other than a page navigation carries any of your recipes' text",
      net.length > 20 && leaked.length === 0,
      `${net.length} request(s) logged, ${leaked.length} naming a fixture${leaked[0] ? `: ${leaked[0].url}` : ""}`
    );
    const shipped = await evalPage(`(async () => {
      const out = {};
      for (const f of ["search-index.json", "summary.json", "catalogue.json", "index.json"]) {
        out[f] = (await (await fetch("/data/" + f, { cache: "no-store" })).text()).toLowerCase();
      }
      return out;
    })()`);
    report.check(
      "the shipped search index, summaries and catalogue hold none of them",
      Object.values(shipped).every((t) => t.length > 100 && !/fixture home|fixture unhearted|u:fixture|u:mine/.test(t)),
      Object.entries(shipped).map(([f, t]) => `${f} ${t.length}B`).join(", ")
    );

    // Leave the profile as it was found.
    await evalPage(`(async () => {
      const f = await import("/js/favourites.js"), r = await import("/js/recipes.js");
      for (const e of [...f.favourites.items()]) f.favourites.removeKey(f.favKey(e));
      for (const id of ${JSON.stringify([mineA.dishId, mineB.dishId, unhearted.dishId])}) r.recipes.remove(id);
    })()`);

    return report.summary(SITE) ? 0 : 1;
  } finally {
    cdp?.close();
    await stopChrome(chrome?.proc, { keepProfile: opts.keepProfile });
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    if (opts.keepProfile) console.log(`Chrome profile kept at ${profileDir}`);
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
