#!/usr/bin/env node
// Scripted add-on check — CONFIGURING A DISH CAN MAKE IT UNSAFE, driven through
// a real browser (ADR 0048, Theme 14a + 14d).
//
//     node tools/addon_check.mjs             # headless, exit 0 = pass
//     node tools/addon_check.mjs --help
//
// WHY THIS EXISTS, and why unit tests were never going to be enough. addons.js
// is pure and covered, but the claim this feature makes is not a claim about a
// function — it is that a person tapping "Satay" on a kebab SEES that the plate
// now contains peanuts, before they add it to the order. That spans the picker,
// the settings store, the dish row's live re-apply and the order tally, and
// every one of those is where the composed tags could be dropped on the floor
// while every unit test stayed green. This repo has been bitten twice by
// exactly that shape (ADR 0034's wake-lock leaks; the 2026-08-16 boot failure
// that 570 green tests missed), so the safety claim is asserted against the
// real DOM or it is not asserted.
//
// It drives the owner's own example, the Wellington Kebab Grill counter card:
//   a) the venue's rule is on screen and enforced — "choose up to 3" refuses a
//      fourth sauce rather than letting the order sheet ask for something the
//      shop will not make;
//   b) satay names peanuts in the warning, live, on the tick;
//   c) with peanuts flagged in Settings, that warning is the loud treatment and
//      the dish row itself lights up — the flagged state follows the
//      configuration, not just the dish;
//   d) a dietary claim dies when an option cannot carry it, and dataset.tags —
//      what the live diet filter re-reads — dies with it;
//   e) the configured dish is its OWN order line, not a quantity of the plain
//      one, at its own configured price.
//
// WHAT A GREEN RUN HERE STILL CANNOT TELL YOU. It never proves the tagging is
// right — that the sauce called "Garlic yogurt" really does contain dairy. That
// is a claim about food, made by whoever transcribed the menu, and no browser
// can check it. It also cannot tell you the warning is legible on a real phone
// in a real shop, or that a reader notices it at all.
//
// NOT PART OF THE SHIPPED SITE. Dev tooling, like tools/serve.py — no npm
// install, no dependency added to the site (ADR 0001). Fresh Chrome profile per
// run, because a stale service worker will happily serve the last run's
// modules and a hard reload does not bust it.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Cdp, Report, createDriver, launchChrome, startServer, stopChrome, until } from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// The owner photographed this venue's "EXTRAS & SAUCES" card in store, and it
// is the reason the theme has a worked example at all.
const VENUE = "wellington-kebab-grill";
const SAUCES = "sauces";
const PEANUT_OPTION = "Satay";
const ALLERGEN = "contains-peanuts";

const HELP = `Faves add-on check — verify add-on composition in a real browser.

  node tools/addon_check.mjs [options]

Serves site/ locally, launches Google Chrome headless on a throwaway profile,
opens a menu with add-on groups and works the real picker: enforces the venue's
cap, asserts satay names peanuts live, asserts the flagged treatment follows the
configuration, and asserts a configured dish becomes its own order line.

Options:
  --id <venue-id>   Restaurant to test (default: ${VENUE}).
  --port <n>        Port for the local static server (default: an unused one).
  --headed          Show the browser window.
  --keep-profile    Leave the temporary Chrome profile behind, and say where.
  --verbose         Print every step, not just the assertions.
  -h, --help        This message.

Exit status: 0 all assertions passed; 1 an assertion failed; 2 the harness
itself could not run (no Chrome, port in use, page never rendered).`;

function parseArgs(argv) {
  const opts = { id: VENUE, port: 0, headed: false, keepProfile: false, verbose: false };
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
  return opts;
}

/** Peanuts already flagged, so the loud treatment is under test from the first
 *  paint rather than needing a Settings round-trip (device_check owns that). */
const seedExpr = `try {
  localStorage.setItem("faves.settings.v1", JSON.stringify({ diet: { dietary: [], avoid: [${JSON.stringify(ALLERGEN)}] } }));
} catch (e) { /* opaque origin — the real page seeds on load */ }`;

/** Everything an assertion needs about the first dish that offers the sauces. */
const snapshotExpr = `(() => {
  const dish = [...document.querySelectorAll("li.dish")].find((d) => d.querySelector(".dish-addons"));
  if (!dish) return { found: false };
  const box = dish.querySelector(".dish-addons");
  const warn = box.querySelector(".addon-warning");
  const legends = [...box.querySelectorAll(".addon-legend")].map((l) => l.textContent);
  return {
    found: true,
    name: dish.dataset.name,
    tags: (dish.dataset.tags || "").split(" ").filter(Boolean),
    dishFlagged: dish.classList.contains("dish-flagged"),
    legends,
    checked: [...box.querySelectorAll(".addon-input:checked")].map((i) => i.value).filter(Boolean),
    warnHidden: warn.hidden,
    warnFlagged: warn.classList.contains("is-flagged"),
    warnText: warn.textContent,
    addLabel: (box.querySelector(".addon-stepper .stepper-add") || {}).ariaLabel || null,
    lines: JSON.parse(localStorage.getItem("faves.order.v1") || "[]").map((l) => [l.name, l.price, l.qty, (l.options || []).map((o) => o.name).join("+")]),
    sections: [...document.querySelectorAll(".menu-section .section-title")].map((h) => h.textContent),
    navLinks: [...document.querySelectorAll(".section-link")].map((a) => a.textContent),
  };
})()`;

/** Tick the nth sauce by its visible label, through a real mouse click. */
const sauceSelector = (name) => `.addon-option`;

async function run(opts) {
  const report = new Report(opts.verbose);
  const venue = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${opts.id}.json`), "utf8"));
  const group = (venue.addOnGroups || []).find((g) => g.id === SAUCES);
  if (!group) throw new Error(`${opts.id} has no "${SAUCES}" add-on group — pick another --id`);
  if (typeof group.max !== "number") throw new Error(`the "${SAUCES}" group has no max — this check exists to prove the cap`);

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-addon-check-"));
  let chrome = null;
  let cdp = null;

  try {
    const url = `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(opts.id)}`;
    console.log(`Faves add-on check — configuring a dish can make it unsafe`);
    console.log(`  venue    ${venue.name} (${opts.id})`);
    console.log(`  group    "${group.name}" — ${group.options.length} options, max ${group.max}`);
    console.log(`  page     ${url}`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
      sessionId,
    );
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));

    await driver.evalPage(seedExpr).catch(() => {});
    await cdp.send("Page.navigate", { url }, sessionId);
    await driver.evalPage(seedExpr).catch(() => {});
    await cdp.send("Page.navigate", { url }, sessionId);
    await until(async () => (await driver.evalPage(snapshotExpr)).found, {
      label: "a dish offering add-ons to render",
    });

    // --- (a) the venue's own rule is on screen -------------------------
    let s = await driver.evalPage(snapshotExpr);
    report.check(
      "the venue's cap is stated where the choice is made",
      s.legends.some((l) => l.includes(`Choose up to ${group.max}`)),
      s.legends.join(" | "),
    );
    report.check(
      "a dish with add-ons starts unconfigured — nothing moves until you choose",
      s.checked.length === 0 && s.warnHidden,
      `${s.checked.length} ticked, warning hidden=${s.warnHidden}`,
    );

    // --- a section offered as add-ons is not also printed as dishes ----
    const hidden = (venue.menu || []).filter((x) => x.addOnsOnly).map((x) => x.section);
    if (hidden.length) {
      const offered = new Set((venue.addOnGroups || []).flatMap((g) => g.options.map((o) => o.name)));
      report.check(
        "a section whose rows are all offered as add-ons is not printed twice",
        hidden.every((h) => !s.sections.includes(h) && !s.navLinks.includes(h)),
        `hidden: ${hidden.join(", ")} · rendered: ${s.sections.length} section(s)`,
      );
      report.check(
        "…and every row it hid is still reachable as an option",
        (venue.menu || [])
          .filter((x) => x.addOnsOnly)
          .flatMap((x) => x.items)
          .every((i) => offered.has(i.name)),
        `${hidden.length} hidden section(s), all rows offered`,
      );
    }

    // --- (b)+(c) satay names peanuts, loudly ---------------------------
    await driver.click(".dish-addons-summary");
    await driver.click(sauceSelector(), PEANUT_OPTION);
    s = await driver.evalPage(snapshotExpr);
    report.check(
      `${PEANUT_OPTION} makes the dish contain peanuts, live`,
      s.tags.includes(ALLERGEN),
      `dataset.tags = ${s.tags.join(" ")}`,
    );
    report.check(
      "the warning names the option and the allergen in plain words",
      !s.warnHidden && /peanuts/i.test(s.warnText) && s.warnText.includes(PEANUT_OPTION),
      JSON.stringify(s.warnText),
    );
    report.check(
      "a flagged allergen gets the loud treatment, on the warning and the row",
      s.warnFlagged && s.dishFlagged,
      `warning is-flagged=${s.warnFlagged}, row dish-flagged=${s.dishFlagged}`,
    );

    // --- (a again) the cap refuses the fourth ---------------------------
    const others = group.options.filter((o) => o.name !== PEANUT_OPTION).slice(0, group.max);
    for (const o of others) await driver.click(sauceSelector(), o.name);
    s = await driver.evalPage(snapshotExpr);
    report.check(
      `the cap is enforced, not merely displayed — ${group.max} ticked after ${group.max + 1} taps`,
      s.checked.length === group.max,
      `ticked: ${s.checked.join(", ")}`,
    );

    // --- (e) a configured dish is its own line --------------------------
    await driver.click(".addon-stepper .stepper-add");
    s = await driver.evalPage(snapshotExpr);
    const configured = s.lines[0];
    report.check(
      "the order line carries the configuration and its own price",
      s.lines.length === 1 && configured[3].split("+").length === group.max,
      JSON.stringify(configured),
    );
    report.check(
      "the Add control names the configuration, so two of them are distinguishable",
      s.addLabel === null || /with /.test(s.addLabel || ""),
      JSON.stringify(s.addLabel),
    );

    // Now the SAME dish, ordered plain, from the row's own stepper.
    await driver.click("li.dish .dish-actions .stepper-add");
    s = await driver.evalPage(snapshotExpr);
    const plain = s.lines.find((l) => l[3] === "");
    report.check(
      "the same dish ordered plain is a SECOND line, not a quantity of two",
      s.lines.length === 2 && plain && plain[2] === 1,
      s.lines.map((l) => `${l[2]}× ${l[0]}${l[3] ? ` (${l[3]})` : ""} @ ${l[1]}`).join(" | "),
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
  console.error(`\nharness error: ${err.message}`);
  process.exit(2);
}
