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
// AND SINCE 14h (ADR 0092), a second venue and a second question: WHAT THE
// WARNING SAYS WHEN A CLAIM DIES. The composer's two shapes — a fact we hold, an
// absence we don't — are unit-tested in tests/addons.test.js; what no unit test
// can see is the SENTENCE, its shape, and above all how many of them there are.
// Before 14h a vegetarian brunch with spinach and tomatoes on it printed one
// absence sentence per claim per option, each repeating the option's name, and
// the volume did the discounting that the careful wording was written to
// prevent. So Sprig & Fern Tawa's brunch sides are driven at 390 px to assert:
//   f) a tagged option produces the FACT — "Bacon is meat, so this is no longer
//      vegetarian" — and the words "can't say" appear nowhere on the page;
//   g) the residue collapses to exactly ONE sentence for the whole
//      configuration, naming each untagged option once and each label once;
//   h) with both on the plate, the fact leads and the one quiet sentence closes.
//
// AND SINCE ADR 0095, A SECOND ALLERGEN — because everything above is peanuts.
// Peanuts were always inside the `contains-` namespace, so every assertion in
// (b)(c) could pass while a whole allergen axis was silent, and one was: an
// add-on naming a finfish carried `has-fish` (a DIETARY marker, outside the
// namespace) and nothing else, so the picker's allergen union never saw it. The
// fish block at the end drives a dish that makes NO dietary claim, which is the
// only configuration where the allergen path has to speak for itself:
//   i) with fish flagged in Settings, ticking Salmon warns at all (it did not),
//      names the option and the allergen, puts `contains-fish` on the composed
//      tags, and lights the ROW — and no chip on that row is a raw `has-fish`.
//
// AND SINCE 2026-09-07, TWO OWNER RULINGS ON THIS SURFACE (roadmap 200/050 and
// 200/060), both of them defects that shipped for weeks with this file green:
//   j) THE PICKER SAID ONE CLAUSE TWICE. An allergen an option brings in and the
//      dietary claim that same allergen kills are two consequences of one fact,
//      and they were two sentences that both opened with it — "Halloumi contains
//      dairy — you asked to avoid it. Halloumi contains dairy, so this is no
//      longer vegan." One sentence now, allergen half leading. Asserted by
//      COUNTING the shared clause, not by matching the merged string alone: a
//      merge that appends the consequence and forgets to drop the old sentence
//      passes an `includes` and fails a count.
//   k) THE CHIP ROW WENT STALE. It was built once from `item.tags` and never
//      rebuilt, so a `v` pizza with salmon on it wore a green `Veg` chip beside
//      a warning saying it is no longer vegetarian. The chips are recomposed
//      now, which is also what makes (i)'s raw-identifier assertion load-bearing
//      for the first time — before this, NOTHING composed reached `tagChip`.
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

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Cdp, Report, createDriver, exitFromError, launchChrome, need, startServer, stopChrome, untilPresent } from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// The owner photographed this venue's "EXTRAS & SAUCES" card in store, and it
// is the reason the theme has a worked example at all.
const VENUE = "wellington-kebab-grill";
const SAUCES = "sauces";
const PEANUT_OPTION = "Satay";
const ALLERGEN = "contains-peanuts";

// 🛑 A SECOND ALLERGEN, AND THE REASON THIS FILE NEEDED ONE (ADR 0095).
// Everything above drives a PEANUT option, and peanuts were always inside the
// `contains-` namespace this whole feature is built on. So a green run here was
// evidence about peanuts and was being read as evidence about ALLERGENS — and
// underneath it, for as long as `contains-fish` had existed, a reader who ticked
// "avoid Fish" and added Salmon to a fish-free dish was told nothing whatsoever.
// Every assertion in this file passed while that was true, because the fish axis
// walked straight past all of them.
const FISH_ALLERGEN = "contains-fish";
const FISH_OPTION = "Salmon";
// Chosen because it makes NO dietary claim. On a `v` dish the picker would have
// said "Salmon is fish, so this is no longer vegetarian" — a true sentence that
// masks the bug, since it is spoken by the DIETARY axis and would be there with
// the allergen still missing. With no claim to die, the allergen path is the
// only thing that can speak, and before the fix the warning was hidden outright.
const FISH_DISH = "Housemade Waffles";

// --- 200/050 + 200/060: one clause once, and a chip row that keeps up --------
// `vg` + an option whose ONLY tag is `contains-dairy`, so the allergen line and
// the contradiction line name the same option and the same tag — the exact
// configuration the owner was shown. Dairy is flagged in Settings below so the
// LOUD half of the merge is what is under test; the merge must not weaken it.
const MERGE_DISH = "Garden Salad";
const MERGE_OPTION = "Halloumi";
const MERGE_ALLERGEN = "contains-dairy";
// A dish whose chips must CHANGE. `["v", "gf-option", "contains-nuts"]` renders
// ["⚠ nuts", "Veg", "GF option"]; ticking Salmon kills both claims and adds an
// allergen, so all three chips have something to prove — two leave, one arrives,
// and `has-fish` must not appear at all.
const CHIP_DISH = "Potato, Rosemary + Basil Pesto";

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

/** Peanuts, fish AND dairy already flagged, so the loud treatment is under test
 *  from the first paint rather than needing a Settings round-trip (device_check
 *  owns that). Three allergens rather than one: each arms one block and none of
 *  them can quietly satisfy another's assertions. Flagging fish changes nothing
 *  about the peanut and 14h assertions (neither venue has a dish tagged
 *  `contains-fish`); flagging dairy arms the merge block — the merged sentence's
 *  loud half only exists when the reader has declared that allergen, and the
 *  ruling's own constraint is that the loud half still LEADS. Its side effect is
 *  that Sprig & Fern's dairy dishes start out `dish-flagged`, which no assertion
 *  in this file reads on a dish it has not configured. */
const seedExpr = `try {
  localStorage.setItem("faves.settings.v1", JSON.stringify({ diet: { dietary: [], avoid: [${JSON.stringify(ALLERGEN)}, ${JSON.stringify(FISH_ALLERGEN)}, ${JSON.stringify(MERGE_ALLERGEN)}] } }));
} catch (e) { /* opaque origin — the real page seeds on load */ }`;

/** Everything an assertion needs about the first dish that offers the sauces. */
const snapshotExpr = `(() => {
  const dish = [...document.querySelectorAll("li.dish")].find((d) => d.querySelector(".dish-addons"));
  if (!dish) return { found: false };
  const box = dish.querySelector(".dish-addons");
  const warn = ${need(".addon-warning", "box")};
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

// --- 14h: what the warning SAYS when a claim dies (ADR 0092) --------------
// A second venue, because the kebab card has no dish making a dietary claim and
// this half of the check is entirely about the sentence a dying claim produces.
const WARN_VENUE = "sprig-and-fern-tawa";
// `v`, and brunch sides. Ticking bacon on the vegetarian breakfast is the
// bluntest form of the question 14h asked.
const VEG_DISH = "The Vegetarian Breakfast";
// `v` + `gf-option`: TWO claims, so the collapsed sentence has to name two
// labels without repeating either option. One claim would hide that bug.
const TWO_CLAIM_DISH = "Eggs on Toast";
const MEAT_OPTION = "Bacon";
const SILENT_OPTIONS = ["Spinach", "Tomatoes"];

// `li.dish` carries the SEARCH-FOLDED name (menu.js `foldSearchText`), not the
// menu's own capitalisation — lower-cased with macrons folded. Addressing a
// dish by its printed name silently matches nothing, which arrives as a harness
// error rather than a failed assertion, so the fold is applied here too.
const FOLD = { "\u0101": "a", "\u0113": "e", "\u012b": "i", "\u014d": "o", "\u016b": "u" };
const dishSel = (name) =>
  `li.dish[data-name=${JSON.stringify(name.toLowerCase().replace(/[\u0101\u0113\u012b\u014d\u016b]/g, (c) => FOLD[c]))}]`;

/** One dish's picker, addressed by name rather than "the first one with add-ons". */
const dishExpr = (name) => `(() => {
  const dish = ${need(dishSel(name))};
  const box = ${need(".dish-addons", "dish")};
  const warn = ${need(".addon-warning", "box")};
  return {
    tags: (dish.dataset.tags || "").split(" ").filter(Boolean),
    checked: [...box.querySelectorAll(".addon-input:checked")].map((i) => i.value).filter(Boolean),
    warnHidden: warn.hidden,
    warnText: warn.textContent,
    dishFlagged: dish.classList.contains("dish-flagged"),
    // The chip row, verbatim. Read for an ABSENCE (see the fish block): the
    // owner's worry when he ruled this was "a flood of noisy tags on the menu",
    // and the ugliest form of it would be a raw internal identifier.
    chips: [...dish.querySelectorAll(".dish-tags .tag")].map((c) => c.textContent),
  };
})()`;

/** How many times `needle` occurs in `hay` — the assertion 14h is actually about. */
const occurrences = (hay, needle) => hay.split(needle).length - 1;

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
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
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
    // The refused tap must not cost the reader the peanut sentence: Satay is
    // still ticked, so the warning that names it must still be there, with the
    // cap message ADDED to it. Until 2026-08-17 the cap message replaced the
    // whole warning, and the flagged allergen went silent on exactly the tap
    // that was refused.
    report.check(
      "a refused fourth sauce adds the cap message and keeps the allergen warning",
      !s.warnHidden && s.warnText.includes(PEANUT_OPTION) && /peanuts/i.test(s.warnText) &&
        /choose up to/i.test(s.warnText) && s.warnFlagged,
      JSON.stringify(s.warnText),
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

    // --- (f)(g)(h) 14h: the sentence a dying claim produces --------------
    const warnUrl = `http://127.0.0.1:${port}/restaurant.html?id=${WARN_VENUE}`;
    await cdp.send("Page.navigate", { url: warnUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
      label: `${WARN_VENUE} to render a dish offering add-ons`,
    });

    // (f) a tagged option is a FACT, and it reads like one.
    const vegDish = dishSel(VEG_DISH);
    await driver.click(`${vegDish} .dish-addons-summary`);
    await driver.click(`${vegDish} .addon-option`, MEAT_OPTION);
    let w = await driver.evalPage(dishExpr(VEG_DISH));
    report.check(
      `${MEAT_OPTION} on a vegetarian dish is stated as a FACT, not as an absence`,
      !w.warnHidden && w.warnText.includes(`${MEAT_OPTION} is meat, so this is no longer vegetarian.`),
      JSON.stringify(w.warnText),
    );
    report.check(
      "…and the words \"can't say\" are nowhere on that warning",
      !/can'?t say/i.test(w.warnText),
      JSON.stringify(w.warnText),
    );
    report.check(
      "the vegetarian claim is actually gone from the row, not merely narrated",
      !w.tags.includes("v"),
      `dataset.tags = ${w.tags.join(" ") || "(none)"}`,
    );

    // (g) the residue is ONE sentence, however many options and claims feed it.
    const twoClaim = dishSel(TWO_CLAIM_DISH);
    await driver.click(`${twoClaim} .dish-addons-summary`);
    for (const name of SILENT_OPTIONS) await driver.click(`${twoClaim} .addon-option`, name);
    w = await driver.evalPage(dishExpr(TWO_CLAIM_DISH));
    report.check(
      "two untagged options and two claims collapse into ONE sentence",
      !w.warnHidden &&
        occurrences(w.warnText, "aren't tagged") === 1 &&
        occurrences(w.warnText, "isn't tagged") === 0,
      JSON.stringify(w.warnText),
    );
    report.check(
      "…naming each option ONCE and each label ONCE — the repetition 14h removed",
      SILENT_OPTIONS.every((n) => occurrences(w.warnText, n) === 1) &&
        occurrences(w.warnText, "vegetarian") === 1 &&
        occurrences(w.warnText, "gluten free") === 1,
      JSON.stringify(w.warnText),
    );
    report.check(
      "…and it still says the labels no longer cover what was configured",
      /describe the dish as listed\.$/.test(w.warnText.trim()),
      JSON.stringify(w.warnText),
    );

    // (h) both together: the fact leads, the quiet sentence closes.
    await driver.click(`${twoClaim} .addon-option`, MEAT_OPTION);
    w = await driver.evalPage(dishExpr(TWO_CLAIM_DISH));
    const factAt = w.warnText.indexOf(`${MEAT_OPTION} is meat`);
    const residueAt = w.warnText.indexOf("aren't tagged");
    report.check(
      "with a fact and an absence on the same plate, the FACT is said first",
      factAt >= 0 && residueAt > factAt,
      JSON.stringify(w.warnText),
    );
    report.check(
      "…and the residue is STILL one sentence, with a fact standing beside it",
      occurrences(w.warnText, "aren't tagged") === 1 && occurrences(w.warnText, "isn't tagged") === 0,
      JSON.stringify(w.warnText),
    );
    // Bacon is named in BOTH sentences, and that is correct rather than the
    // repetition 14h removed. The fact is about VEGETARIAN; bacon says nothing
    // about GLUTEN, so leaving it out of the gluten sentence would understate
    // the hedge — and understating a safety hedge is the wrong direction. What
    // must never happen is the same option named twice for the same reason, so
    // each sentence is checked separately.
    const sentences = w.warnText.split(/(?<=\.)\s+/).filter(Boolean);
    const factPart = sentences.find((x) => x.includes("is meat")) || "";
    const residuePart = sentences.find((x) => x.includes("aren't tagged")) || "";
    report.check(
      `…and ${MEAT_OPTION} is named once per sentence — never twice for one reason`,
      occurrences(factPart, MEAT_OPTION) === 1 && occurrences(residuePart, MEAT_OPTION) === 1,
      `fact: ${JSON.stringify(factPart)} · residue: ${JSON.stringify(residuePart)}`,
    );

    // --- (i) ADR 0095: an add-on that names a fish IS an allergen -------
    // Same venue, a dish that makes no dietary claim at all. Before the option
    // carried `contains-fish` this whole block was silent: measured 2026-09-07
    // in headless Chrome, ticking Salmon on the waffles left
    // `warnHidden = true`, `warnText = ""` and `dish-flagged` off, with
    // `contains-fish` ticked in Settings.
    const fishDish = dishSel(FISH_DISH);
    await driver.click(`${fishDish} .dish-addons-summary`);
    await driver.click(`${fishDish} .addon-option`, FISH_OPTION);
    const f = await driver.evalPage(dishExpr(FISH_DISH));
    report.check(
      `${FISH_OPTION} on a dish that claims nothing still WARNS — the dietary axis cannot speak here`,
      !f.warnHidden,
      `warning hidden=${f.warnHidden}, text=${JSON.stringify(f.warnText)}`,
    );
    report.check(
      "…and the warning names the option, the allergen, and that the reader asked to avoid it",
      f.warnText.includes(FISH_OPTION) && /\bfish\b/i.test(f.warnText) &&
        /asked to avoid/i.test(f.warnText),
      JSON.stringify(f.warnText),
    );
    report.check(
      "the fish allergen reaches the composed tags, which is what the filter re-reads",
      f.tags.includes(FISH_ALLERGEN),
      `dataset.tags = ${f.tags.join(" ") || "(none)"}`,
    );
    report.check(
      "…and the ROW lights up — the flagged treatment follows the configuration",
      f.dishFlagged,
      `dish-flagged=${f.dishFlagged}`,
    );
    // The absence half of the owner's ruling, and the assertion most likely to
    // rot: `has-fish` is a dietary marker with no entry in menu.js `tagChip`,
    // so anything that ever composes option tags onto the chip row paints it as
    // a bare `has-fish` beside a proper `⚠ fish` — two chips saying one thing,
    // one of them an internal identifier. It refuses to run against a dish with
    // no chips at all, which would compare [] to [] and pass with the row
    // deleted.
    report.check(
      "no chip on the row is a raw internal tag — the reader never sees `has-fish`",
      f.chips.length > 0 && !f.chips.some((c) => /^\s*has-/.test(c)),
      `${f.chips.length} chip(s): ${JSON.stringify(f.chips)}`,
    );

    // --- (j) 200/050: the same clause is not said twice ------------------
    // Measured verbatim before the fix, headless Chrome, this exact dish and
    // option with dairy flagged: "Halloumi contains dairy — you asked to avoid
    // it. Halloumi contains dairy, so this is no longer vegan."
    const mergeDish = dishSel(MERGE_DISH);
    await driver.click(`${mergeDish} .dish-addons-summary`);
    await driver.click(`${mergeDish} .addon-option`, MERGE_OPTION);
    const m = await driver.evalPage(dishExpr(MERGE_DISH));
    const clause = `${MERGE_OPTION} contains dairy`;
    report.check(
      "the fact is said ONCE — the allergen clause does not open two sentences",
      occurrences(m.warnText, clause) === 1,
      `${occurrences(m.warnText, clause)}× "${clause}" in ${JSON.stringify(m.warnText)}`,
    );
    report.check(
      "…and the ALLERGEN half still leads, in the words the reader is scanning for",
      new RegExp(`^\\s*${MERGE_OPTION} contains dairy — you asked to avoid it`).test(m.warnText),
      JSON.stringify(m.warnText),
    );
    report.check(
      "…and the dietary consequence SURVIVES the merge, in the same sentence",
      /you asked to avoid it, and this is no longer vegan\./.test(m.warnText),
      JSON.stringify(m.warnText),
    );
    report.check(
      "…so the whole warning is one sentence, not two",
      m.warnText.trim().split(/(?<=\.)\s+/).filter(Boolean).length === 1,
      JSON.stringify(m.warnText),
    );

    // --- (k) 200/060: the chip row follows the configuration --------------
    // Read BEFORE and AFTER on the same row. Before-and-after rather than an
    // absolute expectation, because "Veg is gone" is satisfiable by a chip row
    // that was never drawn — so the before read is what makes the after read
    // mean anything, and it refuses to run if the row starts with no chips.
    const chipDish = dishSel(CHIP_DISH);
    const before = await driver.evalPage(dishExpr(CHIP_DISH));
    report.check(
      "the chip row starts with the dish's own claims on it — the baseline this rests on",
      before.chips.length > 0 && before.chips.some((c) => /^Veg$/.test(c.trim())) &&
        before.chips.some((c) => /GF option/.test(c)),
      `${before.chips.length} chip(s): ${JSON.stringify(before.chips)}`,
    );
    await driver.click(`${chipDish} .dish-addons-summary`);
    await driver.click(`${chipDish} .addon-option`, FISH_OPTION);
    const after = await driver.evalPage(dishExpr(CHIP_DISH));
    report.check(
      "a claim the configuration killed LEAVES the chip row — no green `Veg` beside the warning",
      !after.chips.some((c) => /^Veg$/.test(c.trim())),
      `before ${JSON.stringify(before.chips)} → after ${JSON.stringify(after.chips)}`,
    );
    report.check(
      "…and so does the second claim, so this is not one hard-coded chip going away",
      !after.chips.some((c) => /GF option/.test(c)),
      JSON.stringify(after.chips),
    );
    report.check(
      "an allergen the configuration ADDED arrives on the chip row",
      after.chips.some((c) => /fish/i.test(c)),
      JSON.stringify(after.chips),
    );
    report.check(
      "…and the row that gained it still carries no raw internal identifier",
      after.chips.length > 0 && !after.chips.some((c) => /^\s*has-/.test(c)),
      JSON.stringify(after.chips),
    );
    report.check(
      "the warning and the chips now agree about what this dish is",
      /no longer vegetarian/.test(after.warnText) &&
        !after.chips.some((c) => /^Veg$/.test(c.trim())) &&
        !after.tags.includes("v"),
      `chips ${JSON.stringify(after.chips)} · tags ${after.tags.join(" ")} · ${JSON.stringify(after.warnText)}`,
    );
    // Untick it: a row that can only ever LOSE chips is half a feature, and the
    // rebuild has to survive going backwards as well as forwards.
    await driver.click(`${chipDish} .addon-option`, "None");
    const undone = await driver.evalPage(dishExpr(CHIP_DISH));
    report.check(
      "unticking the option puts the dish's own claims BACK on the row",
      JSON.stringify(undone.chips) === JSON.stringify(before.chips),
      `${JSON.stringify(undone.chips)} vs the original ${JSON.stringify(before.chips)}`,
    );

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
