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
//   f) a tagged option produces the FACT — "Bacon contains pork, so this is no
//      longer vegetarian" since ADR 0140 (was "Bacon is meat, …"), said once,
//      and the words "can't say" appear nowhere on the page;
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
//   l) AND SINCE 2026-09-08 (roadmap 200/070), THE SHAPE (j) DELIBERATELY LEFT
//      STANDING: one SUBSTANCE said through two tags. "Salmon contains fish —
//      you asked to avoid it. Salmon is fish, so this is no longer
//      vegetarian." (j) keys on the literal tag, so it merges a clause said
//      twice and not a fish said twice — the allergen half comes from
//      `contains-fish`, the contradiction half from `has-fish`, and ADR 0095
//      §1 keeps those two independent on purpose. The merge keys on the
//      SUBSTANCE now, which is a presentation equivalence and relates no two
//      tags anywhere else. Counted the same way (j) is, plus the absence — the
//      second phrasing is GONE — and a control on the dish's unrelated absence
//      sentence, so a merge that ate one sentence too many cannot pass.
//   m) AND SINCE 2026-09-21 (roadmap 200/080, owner-ruled), HEAT BEFORE THE
//      TICK. `validate.py` accepts a `spicy-*` tag on an add-on option and two
//      of the kebab card's sauces carry one — "Mild chilli" and "Hot chilli",
//      side by side in one group, drawn identically. Composition already spoke
//      heat AFTER a tick (k's path carries it onto the dish row), so the silence
//      was in the only moment it is any use: while you are choosing. The picker
//      now paints the dish row's own chip on the option row, from the shared
//      vocabulary in site/js/heat.js, which this file IMPORTS rather than
//      re-types. Two levels and one untagged-but-chilli-named sauce, so neither
//      a hard-coded chip nor a chip on every row can pass.
//   k) THE CHIP ROW WENT STALE. It was built once from `item.tags` and never
//      rebuilt, so a `v` pizza with salmon on it wore a green `Veg` chip beside
//      a warning saying it is no longer vegetarian. The chips are recomposed
//      now, which is also what makes (i)'s raw-identifier assertion load-bearing
//      for the first time — before this, NOTHING composed reached `tagChip`.
//
// AND SINCE 2026-09-08, WHAT CURRENCY THE ORDER LINE IS IN (roadmap `490/100`,
// defect 1). A line is added by exactly two call sites — the dish row's stepper
// (menu.js) and this picker's (addons-ui.js) — and NEITHER passed a currency, so
// `cart.js` defaulted every line to "NZD" and `cart-ui.js` formatted the line
// price with no currency at all. The venue SUBTOTAL right beneath it already
// read the stored value, so a GBP order printed "$8.95" above a "£8.95"
// subtotal. It is latent — the corpus has no non-NZD venue — which is exactly
// why it needs a fixture: the same kebab record served back under a second id
// with `currency: "GBP"` (startServer's `overlay`), so the real render path runs
// over a real menu that is not priced in dollars. The reader's currency
// preference is seeded to "as-charged" for the whole run so no conversion sits
// between the stored line and the rendered one; on the NZD venue that is a
// no-op, because NZD is already what it charges in.
//
// AND SINCE 2026-09-08, WHETHER A SECTION HEADING IS TRANSLATED (roadmap
// `490/100`, defect 4). `validate.py` has accepted `translations` on a section
// since ADR 0044 and ARCHITECTURE.md says why — "a heading is read before any
// dish under it" — and nothing rendered it: a translated menu handed an English
// reader translated dish names under an untranslated heading. A third overlay
// declares the kebab record's canonical language as Thai and writes its first
// heading in it, which is the only way to see this at all (0 records carry a
// section translation). It lives in THIS file, rather than a new one, because
// this is the only browser check that already reads `.section-title` and
// `.section-link` — it does so for the `addOnsOnly` assertion above.
//
// AND SINCE 2026-10-16 (roadmap 200/130, ADR 0158), AN UNFINISHED DISH ON THE
// ORDER SHEET — block (aa). The menu cannot make a line that lacks a compulsory
// choice (block z), so every such line is STAGED in storage, as a phone from
// before the flag, a recalled saved order or a shared order would hold it. It
// drives, at 390 px and from a non-menu page (so the record is fetched), that the
// line shows with its warning in words, cannot grow, prices as a floor with a
// total that says it is short; that the finish control asks the picker's own
// question and its allergen sentence equals the MENU picker's word for word;
// that finishing moves the price by exactly the choice, clears the warning and
// lands focus; that finishing onto an identical line MERGES (1 + 2 = 3); and
// that recall lands the line flagged. Its three load-bearing assertions were
// break-probed by reintroducing the bug (no merge; total silent; finish ignoring
// the choice when composing) — see the roadmap item's closing note.
//
// AND SINCE 2026-09-28 (roadmap 28m, ADR 0133), A DISH WITH SIZES. A `selects`
// group (ADR 0130) chooses WHICH plate rather than adding to it, and its price
// is the WHOLE plate (`dishPrice`), never a surcharge. No record carries one
// until 28n, so Sprig & Fern Tawa's Eggs on Toast is served back under a fourth
// id with a synthetic three-rung ladder — Regular (the default), Large (which
// adds sesame) and an UNLABELLED third rung, the shape 26 real rows have:
//   n) the default is chosen on open and priced on the row before any tap, the
//      group states no cap, and the unlabelled rung has visible words;
//   o) choosing Large puts Large's `dishPrice` on the row — asserted NOT to be
//      the dish's price plus it, which is the misreading ADR 0130 exists to
//      prevent — and the row's own ＋ Add follows the choice;
//   p) a variant adds NO residue sentence (a dish with two claims to lose,
//      read before and after), and its allergen is said when it is chosen and
//      gone when it is not — union, following the choice;
//   q) Regular and Large are TWO order lines, each at its whole price;
//   r) a line stored before the dish had a ladder — the plain dish, no options
//      — is the SAME line as the default, so it still merges; Large is not.
//
// AND SINCE 2026-10-16 (roadmap 200/120, ADR 0159), A MUST-SEE CHOICE OPENS WHEN
// YOU PRESS ADD — block (ab). The owner's ruling: a choice the reader must at
// least SEE (every size ladder by rule, any other group by a `mustSee` flag)
// expands the picker when the row's ＋ Add is pressed, so a default that was
// chosen for them is not missed. The absence is the half that rots, so the block
// asserts both: the same optional picker on the REAL record stays CLOSED on Add,
// and a required group, which is gated rather than must-see, is not re-opened
// after it was answered. Focus is asserted to stay on the stepper the person just
// pressed, never to move into the picker.
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
import { Cdp, Report, createDriver, exitFromError, launchChrome, need, startServer, stopChrome, untilPresent, answerGeoAskBeforeLoad } from "./lib/browser.mjs";
// The shipped heat vocabulary, imported rather than re-typed (roadmap 200/080).
// heat.js is DOM-free, so this is the app's OWN words — which makes the heat
// assertions below a claim that the picker renders the shared vocabulary, not a
// claim that it renders a string this file also happens to know.
import { heatLabel } from "../site/js/heat.js";
// The app's own money formatter, for the size block's expected prices (28m).
import { formatMoney } from "../site/js/place.js";

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
// --- 200/080: heat, said BEFORE the tick (owner-ruled 2026-09-21) ----------
// The same counter card, and the reason this item is not academic: these two
// sauces sit side by side in one group and the picker drew them identically. A
// reader had to TICK one to learn which was which, and ticking is how you order
// it. Two levels rather than one, because a single hard-coded chip passes any
// assertion made about one of them.
const HOT_OPTION = "Hot chilli";
const HOT_TAG = "spicy-2";
const MILD_OPTION = "Mild chilli";
const MILD_TAG = "spicy-1";
// 🔑 THE ABSENCE FIXTURE, AND IT IS CHOSEN ON PURPOSE. "Sweet chilli" carries no
// heat tag at all, and its NAME says chilli — so a build that read heat off the
// option's name instead of its tags, or that painted the chip on every row,
// fails here and nowhere else. An untagged sauce is not a mild one: we do not
// know, and a chip would be a claim about food (ADR 0025's line).
const NEUTRAL_OPTION = "Sweet chilli";

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
//  `currency: "as-charged"` is the currency block's requirement, not this one's:
//  the default is LOCAL, which converts a GBP price into the reader's money and
//  would put a conversion between the line the fixture stores and the line it
//  renders. "As charged" is a supported setting, so nothing here is a mode the
//  product does not have.
const seedExpr = `try {
  localStorage.setItem("faves.settings.v1", JSON.stringify({ currency: "as-charged", diet: { dietary: [], avoid: [${JSON.stringify(ALLERGEN)}, ${JSON.stringify(FISH_ALLERGEN)}, ${JSON.stringify(MERGE_ALLERGEN)}] } }));
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
    // The dish's own chip row, verbatim — the same read dishExpr does for the
    // named-dish blocks, so the kebab venue's heat block (m) can assert the
    // picker's words and the row's words are one vocabulary. (No backticks in
    // this comment: the whole expression is a template literal.)
    chips: [...dish.querySelectorAll(".dish-tags .tag")].map((c) => c.textContent),
    addLabel: (box.querySelector(".addon-stepper .stepper-add") || {}).ariaLabel || null,
    lines: JSON.parse(localStorage.getItem("faves.order.v1") || "[]").map((l) => [l.name, l.price, l.qty, (l.options || []).map((o) => o.name).join("+")]),
    sections: [...document.querySelectorAll(".menu-section .section-title")].map((h) => h.textContent),
    navLinks: [...document.querySelectorAll(".section-link")].map((a) => a.textContent),
  };
})()`;

/** The order sheet's own reading of the lines, for the currency block. Read from
 *  the DOM rather than from storage: the stored value and the rendered one are
 *  the two halves that disagreed, so asserting one from the other proves
 *  nothing. */
const sheetExpr = `(() => {
  const sheet = document.querySelector('dialog.order-sheet');
  if (!sheet || !sheet.open) return { open: false };
  return {
    open: true,
    lines: [...sheet.querySelectorAll(".order-line-price")].map((e) => e.textContent.trim()),
    subtotals: [...sheet.querySelectorAll(".order-subtotal-amount")].map((e) => e.textContent.trim()),
    stored: JSON.parse(localStorage.getItem("faves.order.v1") || "[]").map((l) => [l.name, l.currency ?? null, (l.options || []).length]),
  };
})()`;

/** One printed section's heading, its jump-nav chip and its anchor (490/100·4).
 *  Every string is read WITH its `lang`, because an untagged passage in another
 *  script is a WCAG 2.2 AA 3.1.2 failure and reads identically without it. */
const headingExpr = (sectionId) => `(() => {
  const sec = document.getElementById(${JSON.stringify(`section-${sectionId}`)});
  if (!sec) return { found: false, ids: [...document.querySelectorAll(".menu-section")].map((s) => s.id) };
  const h = sec.querySelector(".section-title");
  const alt = sec.querySelector(".section-title-alt");
  const link = [...document.querySelectorAll(".section-link")].find((a) => a.getAttribute("href") === "#" + sec.id);
  return {
    found: true,
    heading: h ? h.textContent : null,
    headingLang: h ? h.getAttribute("lang") : null,
    alts: alt ? [...alt.querySelectorAll("span[lang]")].map((s) => [s.textContent, s.getAttribute("lang")]) : [],
    link: link ? link.textContent : null,
    linkLang: link ? link.getAttribute("lang") : null,
  };
})()`;

/** Tick the nth sauce by its visible label, through a real mouse click. */
const sauceSelector = (name) => `.addon-option`;

/**
 * Every option row in the first picker on the page — name, the chips it carries,
 * and its box (roadmap 200/080).
 *
 * Read with NOTHING ticked, which is the whole of what this item is about: the
 * composed chip row on the dish already spoke heat once an option was chosen.
 * The box travels with it because the chip goes INSIDE a 44px tap target, and
 * "the words are there" and "the row is still tappable at 390px" are two claims
 * that fail independently.
 */
const optionsExpr = `(() => {
  const dish = [...document.querySelectorAll("li.dish")].find((d) => d.querySelector(".dish-addons"));
  if (!dish) return { found: false };
  return {
    found: true,
    width: window.innerWidth,
    rows: [...dish.querySelectorAll(".addon-option")].map((l) => {
      const r = l.getBoundingClientRect();
      return {
        name: (l.querySelector(".addon-option-name") || { textContent: "" }).textContent,
        // The label's WHOLE text — what a screen reader announces as the
        // control's accessible name, price and all.
        label: l.textContent.replace(/\\s+/g, " ").trim(),
        chips: [...l.querySelectorAll(".tag")].map((c) => c.textContent),
        heatChips: [...l.querySelectorAll(".tag-spicy")].map((c) => c.textContent),
        height: Math.round(r.height),
        right: Math.round(r.right),
      };
    }),
  };
})()`;

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

// --- the currency fixture (490/100 · 1) ------------------------------------
// The same kebab record, served back under a second id priced in pounds. A
// fixture rather than a real venue because there is no non-NZD venue to use:
// measured 2026-09-08, all 57 records carry `"currency": "NZD"`. Everything but
// the id and the currency is the genuine menu, so the prices, the add-on groups
// and the render path under test are the corpus's own.
const GBP_ID = `${VENUE}-gbp-fixture`;
const GBP_SYMBOL = "£";

// --- the section-heading fixture (490/100 · 4) -----------------------------
// `validate.py` has accepted `translations` on a SECTION since ADR 0044 and
// ARCHITECTURE.md says why — "a heading is read before any dish under it" —
// and menu.js rendered `section.section` raw until 2026-09-08, so a translated
// menu handed an English reader translated dishes under an untranslated
// heading. 0 records carry one, hence a fixture: the same kebab record served
// back with its canonical language declared as Thai and its first heading
// written in it, which is the shape ADR 0044 is actually for.
const LANG_ID = `${VENUE}-lang-fixture`;
const LANG_CANONICAL = "ซุป"; // "ซุป" — soup
const LANG_ENGLISH = "Soups";

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

// --- 28q (ADR 0126): an order line stored before option ids existed -------
// The kebab record served back under a third id with ONE option renamed and its
// id pinned — what a transcriber does when a venue renames something. The name
// is chosen to still contain the old one, so a text match on "Satay" alone
// would find it and this block addresses it by the full new name instead.
const RENAME_ID = `${VENUE}-rename-fixture`;
const RENAMED_OPTION = "Satay (peanut sauce)";

// --- 28m (ADR 0133): a dish with sizes -------------------------------------
// A synthetic ladder on a real dish, served as overlay bytes — site/data is
// untouched, and nothing there carries a `selects` group until 28n. Every
// variant restates the dish's claims (`v`, `gf-option`) as validate.py
// requires; Large alone adds an allergen, so (p) has something to union and
// the unlabelled rung has nothing, which is the pure residue probe.
const SIZE_ID = `${WARN_VENUE}-size-fixture`;
const SIZE_DISH = TWO_CLAIM_DISH; // "Eggs on Toast": v + gf-option, $13
const SIZE_GROUP = {
  id: "size",
  name: "Size",
  kind: "selects",
  options: [
    { name: "Regular", id: "regular", dishPrice: 13, default: true, tags: ["v", "gf-option"] },
    { name: "Large", id: "large", dishPrice: 19.5, tags: ["v", "gf-option", "contains-sesame"] },
    { id: "size-3", dishPrice: 24, tags: ["v", "gf-option"] },
  ],
};
// What the page must print, formatted by the app's OWN formatter (imported
// above), so a change to money formatting cannot fail this for the wrong reason.
const REGULAR_LABEL = "Regular";
const LARGE_LABEL = "Large";
const THIRD_LABEL = `${formatMoney(24, "NZD")} size`;

/** The size fixture's dish: its row price, its variant radios, its warning. */
// --- 200/090 (ADR 0156): a REQUIRED pick-one group, on two REAL records -------
// Satay Kingdom's stir fry is "with choice of sweet & sour sauce, satay sauce or
// chef special sauce" — the case that found this. Sprig & Fern Berhampore's
// kids' pizza has an OPTIONAL pick-one ("Add a sauce swirl (if you want)"): the
// other shape, which must keep its None. Both are served from disk untouched,
// not through an overlay, so the data's own `required` flags are what is tested.
const REQ_VENUE = "satay-kingdom-cafe";
const REQ_DISH = "Stir Fry Vegetables";
const REQ_GROUP = "Sauce";
const REQ_OPTION = "Satay sauce";
const OPT_VENUE = "sprig-and-fern-berhampore";

// --- 200/130 (ADR 0158): an UNFINISHED dish on the order sheet ---------------
// Satay Kingdom's record served back under a second id with two changes the real
// one cannot supply: the stir fry's own tags drop the peanuts it already carries
// (so choosing the satay sauce genuinely ADDS an allergen — on the real record
// the dish pre-declares everything and the composer has nothing to say), and the
// satay sauce costs $2 (all three are free in the corpus, and a free choice can
// never show whether the total is honest about what it is missing).
const FIN_ID = `${REQ_VENUE}-finish-fixture`;
const FIN_SAUCE_COST = 2;
const OPT_DISH = "Mini Pizza + Fries";

// --- 200/120 (ADR 0159): a MUST-SEE group ------------------------------------
// The optional record above, served back with `mustSee: true` on ONE of the dish's
// three optional groups (site/data carries the flag nowhere: which groups deserve
// it is the owner's call). The real record, untouched, is the control that the
// same picker stays closed on Add. Flagging a group other than the first, and
// leaving the other two unflagged, is what stops "any group on the dish" and
// "the first group" passing as "the flagged group".
const MUST_ID = `${OPT_VENUE}-mustsee-fixture`;
const MUST_GROUP = "kids-sauce-swirl";
const MUST_GROUP_NAME = "Add a sauce swirl (if you want)";

// --- 200/140 (ADR 0163): HOW MANY a group asks for, and what extras cost -------
// Charley Noble's "Cheese Selection (Two)" carries the REAL minimum ("Choose
// two": min 2, max 2), served from disk untouched. The allowance-then-fee shape
// has no real record yet (no menu structures one), so the kebab record is served
// back with its sauces group given `included: 1, extraPrice: 4` - the fee the
// owner's grill example prints. The unmodified kebab record (the file's base
// venue) is the control: a group with NONE of the new fields behaves as before.
const MIN_VENUE = "charley-noble";
const MIN_DISH = "Cheese Selection (Two)";
const MIN_GROUP_NAME = "Choose two";
const FEE_ID = `${VENUE}-allowance-fixture`;
const FEE_INCLUDED = 1;
const FEE_EACH = 4;

// --- 200/160 (ADR 0168): a swap NAMES what it replaces, and removes nothing --------
// Hotel Bristol's "No gluten added bun" carries the REAL `replaces: "milk bun"`,
// served from disk untouched; every Bristol burger's own description says "milk
// bun", which is why the validator lets it. Sprig & Fern Tawa's Mains Cheeseburger
// offers a group of the same shape that states NOTHING (its Gold Card twin shares
// the group and the menu does not say what that bun is), so it is the control: the
// same picker, no words, the plain name on the line.
const SWAP_VENUE = "hotel-bristol";
const SWAP_DISH = "Cheeseburger";
const SWAP_GROUP = "No gluten added bun";
const SWAP_WORDS = "instead of the milk bun";
const SWAP_LINE_NAME = `${SWAP_GROUP} (${SWAP_WORDS})`;
const NOSWAP_VENUE = "sprig-and-fern-tawa";

const sizeExpr = `(() => {
  const dish = ${need(dishSel(SIZE_DISH))};
  const box = ${need(".dish-addons", "dish")};
  const warn = ${need(".addon-warning", "box")};
  const variant = box.querySelector(".addon-group-variant");
  const radios = variant ? [...variant.querySelectorAll("input.addon-input")] : [];
  const plain = dish.querySelector(".dish-actions .stepper");
  const picker = box.querySelector(".addon-stepper .stepper");
  return {
    price: (dish.querySelector(".dish-head .dish-price") || {}).textContent ?? null,
    summary: (box.querySelector(".dish-addons-summary") || {}).textContent ?? null,
    legend: variant ? (variant.querySelector(".addon-legend") || {}).textContent : null,
    firstGroupIsVariant: box.querySelector(".addon-group") === variant,
    radios: radios.map((r) => ({ type: r.type, value: r.value, checked: r.checked,
      label: r.closest("label").textContent.replace(/\\s+/g, " ").trim() })),
    noneOption: variant ? [...variant.querySelectorAll(".addon-option-name")].some((n) => n.textContent === "None") : null,
    tags: (dish.dataset.tags || "").split(" ").filter(Boolean),
    warnHidden: warn.hidden,
    warnText: warn.textContent,
    plainQty: plain ? Number(plain.dataset.qty) : null,
    pickerQty: picker ? Number(picker.dataset.qty) : null,
  };
})()`;

/** The raw stored order — the thing a family's phone actually holds. */
/** One dish's picker as the required-choice block reads it (ADR 0156). */
const requiredExpr = (name) => `(() => {
  const dish = ${need(dishSel(name))};
  const box = ${need(".dish-addons", "dish")};
  const groups = [...box.querySelectorAll("fieldset.addon-group")].map((f) => ({
    name: f.querySelector(".addon-group-name")?.textContent ?? null,
    rule: f.querySelector(".addon-rule")?.textContent ?? null,
    options: [...f.querySelectorAll(".addon-option-name")].map((n) => n.textContent),
    radios: [...f.querySelectorAll("input[type=radio]")].length,
    checked: [...f.querySelectorAll("input:checked")].map((i) => i.value),
  }));
  const pick = box.querySelector(".addon-stepper .stepper-add");
  const row = dish.querySelector(".dish-actions .stepper-add");
  const need = box.querySelector(".addon-need");
  const chip = box.querySelector(".addon-summary-need");
  const a = document.activeElement;
  return {
    groups,
    open: box.open,
    pickAdd: pick ? { disabled: pick.getAttribute("aria-disabled"), label: pick.getAttribute("aria-label") } : null,
    rowAdd: row ? { disabled: row.getAttribute("aria-disabled"), label: row.getAttribute("aria-label") } : null,
    needText: need && !need.hidden ? need.textContent : null,
    chipText: chip && !chip.hidden ? chip.textContent : null,
    focus: a && a.closest("li.dish") === dish ? { tag: a.tagName, type: a.type || null, value: a.value || null } : null,
  };
})()`;

const storedExpr = `JSON.parse(localStorage.getItem("faves.order.v1") || "[]")`;

// --- 200/120: what a must-see reveal looks like to the reader -------------------
// Whether the picker is open, the sentence that says why (on the page AND in the
// status region a screen reader hears), and where keyboard focus is — which must
// still be on the row's stepper, never inside the picker it just opened.
const seeExpr = (name) => `(() => {
  const dish = ${need(dishSel(name))};
  const box = ${need(".dish-addons", "dish")};
  const note = box.querySelector(".addon-seen");
  const live = dish.querySelector(":scope > .sr-only[role=status]");
  const a = document.activeElement;
  const stepper = dish.querySelector(".dish-actions .stepper");
  return {
    open: box.open,
    noteVisible: !!note && !note.hidden && note.getBoundingClientRect().height > 0,
    noteText: note ? note.textContent : null,
    live: live ? live.textContent : null,
    focus: a ? {
      tag: a.tagName, text: (a.textContent || "").trim(),
      inRowStepper: !!stepper && stepper.contains(a),
      inPicker: box.contains(a),
      isBody: a === document.body,
    } : null,
    rowQty: stepper ? stepper.dataset.qty : null,
    checkedRadios: [...box.querySelectorAll("input[type=radio]:checked")].map((r) => r.value),
    variantChecked: [...box.querySelectorAll(".addon-group-variant input[type=radio]:checked")].map((r) => r.value),
  };
})()`;

/** What the first picker's OWN stepper counts: `order.qtyOf` for exactly the
 *  dish, selection and note the picker currently holds. A count of 1 before
 *  anything is added through it means the store matched a line that was
 *  already there — which is the merge, observed from the reader's side. */
const pickerQtyExpr = `(() => {
  const dish = [...document.querySelectorAll("li.dish")].find((d) => d.querySelector(".dish-addons"));
  const st = dish && dish.querySelector(".addon-stepper .stepper");
  return st ? Number(st.dataset.qty) : null;
})()`;

/** How many times `needle` occurs in `hay` — the assertion 14h is actually about. */
const occurrences = (hay, needle) => hay.split(needle).length - 1;

async function run(opts) {
  const report = new Report(opts.verbose);
  const realVenue = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${opts.id}.json`), "utf8"));
  // ADR 0156: Wellington Kebab Grill's kebab-style group ("Choose your kebab
  // toasted or fresh") is REQUIRED in the data, so Add would wait on it in every
  // block below that adds the first dish. Those blocks are about sauces, caps,
  // currency and saved orders — not about that choice — so they run on this
  // record with the flag lifted, served in place of the real path and used as
  // the base of every fixture derived from it. The flag itself is asserted in
  // block (z) on two untouched records. (Cost, stated: nothing here shows the
  // kebab venue's own gate; Satay Kingdom stands in for it.)
  const venue = {
    ...realVenue,
    addOnGroups: (realVenue.addOnGroups || []).map(({ required: _lifted, ...g }) => g),
  };
  const group = (venue.addOnGroups || []).find((g) => g.id === SAUCES);
  if (!group) throw new Error(`${opts.id} has no "${SAUCES}" add-on group — pick another --id`);
  if (typeof group.max !== "number") throw new Error(`the "${SAUCES}" group has no max — this check exists to prove the cap`);

  // The first section that is actually printed — an `addOnsOnly` one is not
  // rendered at all, so translating its heading would assert nothing.
  const langSection = (venue.menu || []).find((s) => !s.addOnsOnly);
  if (!langSection?.sectionId) throw new Error(`${opts.id} has no printed section with a sectionId`);
  const overlay = new Map([
    [`/data/restaurants/${opts.id}.json`, JSON.stringify(venue)],
    [`/data/restaurants/${GBP_ID}.json`, JSON.stringify({ ...venue, id: GBP_ID, currency: "GBP" })],
    // 28q: the venue renamed its satay, and its transcriber — correctly — left
    // the option's id where it was. Nothing else about the record moves.
    [
      `/data/restaurants/${RENAME_ID}.json`,
      JSON.stringify({
        ...venue,
        id: RENAME_ID,
        addOnGroups: venue.addOnGroups.map((g) =>
          g.id !== SAUCES
            ? g
            : { ...g, options: g.options.map((o) => (o.name === PEANUT_OPTION ? { ...o, name: RENAMED_OPTION } : o)) },
        ),
      }),
    ],
    [
      `/data/restaurants/${LANG_ID}.json`,
      JSON.stringify({
        ...venue,
        id: LANG_ID,
        language: "th",
        menu: venue.menu.map((s) =>
          s === langSection
            ? { ...s, section: LANG_CANONICAL, translations: { section: { en: LANG_ENGLISH } } }
            : s,
        ),
      }),
    ],
  ]);
  // 28m: the size fixture, derived from the real Sprig & Fern Tawa record.
  const warnVenue = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${WARN_VENUE}.json`), "utf8"));
  const sizeDishDef = warnVenue.menu.flatMap((x) => x.items).filter((i) => i.name === SIZE_DISH);
  if (sizeDishDef.length !== 1 || sizeDishDef[0].price !== SIZE_GROUP.options[0].dishPrice) {
    throw new Error(
      `${WARN_VENUE} has ${sizeDishDef.length} "${SIZE_DISH}" row(s) at ${sizeDishDef[0]?.price} — the size ` +
        `fixture needs exactly one, priced at its default's dishPrice (${SIZE_GROUP.options[0].dishPrice})`,
    );
  }
  overlay.set(
    `/data/restaurants/${SIZE_ID}.json`,
    JSON.stringify({
      ...warnVenue,
      id: SIZE_ID,
      addOnGroups: [...warnVenue.addOnGroups, SIZE_GROUP],
      menu: warnVenue.menu.map((x) => ({
        ...x,
        items: x.items.map((i) => (i.name === SIZE_DISH ? { ...i, addOns: [...(i.addOns || []), SIZE_GROUP.id] } : i)),
      })),
    }),
  );
  // 200/130: the unfinished-dish fixture, derived from the real Satay Kingdom record.
  const reqVenue = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${REQ_VENUE}.json`), "utf8"));
  const finSauce = reqVenue.addOnGroups.find((g) => g.required);
  if (!finSauce || !finSauce.options.some((o) => o.name === REQ_OPTION)) {
    throw new Error(`${REQ_VENUE} no longer has a required group offering "${REQ_OPTION}" — the 200/130 block needs one`);
  }
  const finDishDef = reqVenue.menu.flatMap((x) => x.items).find((i) => i.name === REQ_DISH);
  // A dish with NO add-on groups at all, as the control line that must stay complete.
  const finOther = reqVenue.menu
    .filter((x) => !(x.addOns || []).length)
    .flatMap((x) => x.items)
    .find((i) => !(i.addOns || []).length && typeof i.price === "number");
  overlay.set(
    `/data/restaurants/${FIN_ID}.json`,
    JSON.stringify({
      ...reqVenue,
      id: FIN_ID,
      addOnGroups: reqVenue.addOnGroups.map((g) =>
        g.id !== finSauce.id
          ? g
          : { ...g, options: g.options.map((o) => (o.name === REQ_OPTION ? { ...o, price: FIN_SAUCE_COST } : o)) },
      ),
      menu: reqVenue.menu.map((x) => ({
        ...x,
        items: x.items.map((i) => (i.name === REQ_DISH ? { ...i, tags: ["v"], tagNotes: undefined } : i)),
      })),
    }),
  );
  // 200/120: the optional record with ONE group flagged must-see.
  const optVenue = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${OPT_VENUE}.json`), "utf8"));
  const mustDef = optVenue.addOnGroups.find((g) => g.id === MUST_GROUP);
  if (!mustDef || mustDef.name !== MUST_GROUP_NAME || mustDef.required || mustDef.mustSee) {
    throw new Error(`${OPT_VENUE} no longer has an optional, unflagged "${MUST_GROUP_NAME}" group — the 200/120 block needs one`);
  }
  overlay.set(
    `/data/restaurants/${MUST_ID}.json`,
    JSON.stringify({
      ...optVenue,
      id: MUST_ID,
      addOnGroups: optVenue.addOnGroups.map((g) => (g.id === MUST_GROUP ? { ...g, mustSee: true } : g)),
    }),
  );
  overlay.set(
    `/data/restaurants/${FEE_ID}.json`,
    JSON.stringify({
      ...venue,
      id: FEE_ID,
      addOnGroups: venue.addOnGroups.map((g) => (g.id === SAUCES ? { ...g, included: FEE_INCLUDED, extraPrice: FEE_EACH } : g)),
    }),
  );
  const { server, port } = await startServer(opts.port, SITE, overlay);
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
    // Section (aa) opens the HOME page and clicks its order button; app.js opens
    // the location dialog over that page ~900 ms after the list paints for a
    // reader who has not answered it. This check is about the order sheet, not
    // the ask, so it starts as a returning reader would (roadmap 510/420;
    // geo_check owns the ask itself).
    await answerGeoAskBeforeLoad(cdp, sessionId);

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

    // --- (m) 200/080: heat is said WHILE YOU ARE CHOOSING ----------------
    // 🛑 STATE THE DEFECT PRECISELY, because the item's own summary — "a
    // `spicy-*` tag on an add-on option is legal and renders NOTHING" — is
    // broader than what was measured here on 2026-09-21, and a fix aimed at the
    // summary would have been aimed at nothing. Since 200/060 wired the chip row
    // to the composed tags, ticking a hot sauce DID paint "🌶🌶 Spicy" on the
    // dish row. What rendered nothing was the picker itself: the group below
    // offers "Mild chilli" and "Hot chilli" side by side and drew them
    // identically, so the only way to find out which was which was to tick one.
    // Everything here is read with the selection still empty, for that reason.
    const picker = await driver.evalPage(optionsExpr);
    const rowOf = (name) => picker.rows.find((x) => x.name === name);
    const hotRow = rowOf(HOT_OPTION);
    const mildRow = rowOf(MILD_OPTION);
    const neutralRow = rowOf(NEUTRAL_OPTION);
    // Refuse to run against a picker missing a fixture, rather than passing on
    // three `undefined`s: `need()`'s rule, applied to data rather than to a node.
    if (!hotRow || !mildRow || !neutralRow) {
      throw new Error(
        `the "${SAUCES}" group no longer offers ${[HOT_OPTION, MILD_OPTION, NEUTRAL_OPTION]
          .filter((n) => !rowOf(n))
          .join(", ")} — this block needs two heat levels and one untagged sauce`,
      );
    }
    report.check(
      `a hot sauce says so BEFORE it is ticked — "${HOT_OPTION}" carries its heat on the row`,
      hotRow.heatChips.length === 1 && hotRow.heatChips[0] === heatLabel(HOT_TAG),
      `${JSON.stringify(hotRow.heatChips)} · expected ${JSON.stringify([heatLabel(HOT_TAG)])}`,
    );
    report.check(
      "…in the SAME words the dish row and the recipe page use, not a second vocabulary",
      // heatLabel is the shipped module (site/js/heat.js), imported at the top
      // of this file — so this asserts the picker renders what the app renders,
      // and would fail if the picker grew its own copy of the template.
      hotRow.heatChips[0] === heatLabel(HOT_TAG) && /Spicy/.test(hotRow.heatChips[0] || ""),
      JSON.stringify(hotRow.heatChips[0]),
    );
    report.check(
      `…and the two levels are DIFFERENT — "${MILD_OPTION}" is not the same chip`,
      mildRow.heatChips.length === 1 && mildRow.heatChips[0] === heatLabel(MILD_TAG) &&
        mildRow.heatChips[0] !== hotRow.heatChips[0],
      `mild ${JSON.stringify(mildRow.heatChips)} vs hot ${JSON.stringify(hotRow.heatChips)}`,
    );
    // The absence half, and the assertion most likely to rot. Without it a build
    // that painted a chip on all twelve sauces passes everything above.
    report.check(
      `a sauce with no heat tag carries NO heat chip — "${NEUTRAL_OPTION}" is named for one and is not tagged`,
      neutralRow.heatChips.length === 0,
      `${JSON.stringify(neutralRow.heatChips)} on a row reading ${JSON.stringify(neutralRow.label)}`,
    );
    report.check(
      "…and it is the only kind of chip the picker paints — an option's other tags stay in the warning line",
      picker.rows.every((r) => r.chips.length === r.heatChips.length) &&
        picker.rows.filter((r) => r.chips.length > 0).length === 2,
      `${picker.rows.filter((r) => r.chips.length > 0).length} row(s) with chips, of ${picker.rows.length}`,
    );
    // WCAG 2.2 AA, and the reason the chip is not three chillies on their own:
    // a reader whose renderer drops emoji, or who is listening to the page, gets
    // the level from the word or not at all. Asserted on the RENDERED string.
    report.check(
      "the heat is carried in WORDS as well as glyphs — never by colour or emoji alone",
      /Spicy/.test(hotRow.heatChips[0] || "") && /Spicy/.test(mildRow.heatChips[0] || ""),
      `${JSON.stringify(hotRow.heatChips[0])} · ${JSON.stringify(mildRow.heatChips[0])}`,
    );
    report.check(
      "…and it is INSIDE the label, so the control announces it with its name and price",
      hotRow.label.includes(HOT_OPTION) && hotRow.label.includes(heatLabel(HOT_TAG)),
      JSON.stringify(hotRow.label),
    );
    // 🛑 AND THE COMPUTED ACCESSIBLE NAME, WHICH IS NOT THE SAME READ. The
    // label's `textContent` is "Hot chilli🌶🌶 Spicy" — no space, because the two
    // spans are adjacent. Chrome's accname algorithm inserts one only because
    // `.tag` is `display: inline-flex` rather than `inline`; change that one CSS
    // word and a screen reader says "Hot chillinot-a-word" while every
    // assertion above, and every pixel on the page, stays exactly as it is.
    // Measured through the AX tree, which is the only place that fact lives.
    await cdp.send("DOM.enable", {}, sessionId);
    await cdp.send("Accessibility.enable", {}, sessionId);
    const axName = async (selector) => {
      const { root } = await cdp.send("DOM.getDocument", { depth: -1 }, sessionId);
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector }, sessionId);
      if (!nodeId) return null;
      const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false }, sessionId);
      return nodes.find((n) => n.name)?.name?.value ?? null;
    };
    const hotName = await axName(`.addon-option input[value=${JSON.stringify(HOT_OPTION)}]`);
    const neutralName = await axName(`.addon-option input[value=${JSON.stringify(NEUTRAL_OPTION)}]`);
    report.check(
      "the CONTROL is announced as its name AND its heat, with the two words apart",
      hotName === `${HOT_OPTION} ${heatLabel(HOT_TAG)}`,
      `${JSON.stringify(hotName)} · expected ${JSON.stringify(`${HOT_OPTION} ${heatLabel(HOT_TAG)}`)}`,
    );
    report.check(
      "…and the untagged sauce is announced as its name alone — the control on the absence half",
      neutralName === NEUTRAL_OPTION,
      `${JSON.stringify(neutralName)} · expected ${JSON.stringify(NEUTRAL_OPTION)}`,
    );
    // Mobile first: the chip went inside a 44px tap target and the page is 390px
    // wide. Both are measured rather than reasoned about — a chip that pushes a
    // row past the viewport is a horizontal scroll on a phone.
    report.check(
      "every option row is still a 44px target at 390px, with the chip on it",
      picker.rows.every((r) => r.height >= 44) && picker.rows.every((r) => r.right <= picker.width),
      `${picker.rows.length} row(s), shortest ${Math.min(...picker.rows.map((r) => r.height))}px, ` +
        `widest right edge ${Math.max(...picker.rows.map((r) => r.right))} of ${picker.width}px`,
    );
    // The other half of the item, pinned rather than assumed: ticking it puts
    // the SAME words on the dish row. This is 200/060's path, and it is the
    // behaviour the item reported as missing — so it is asserted here, once,
    // rather than left as a paragraph claiming it already worked.
    await driver.click(sauceSelector(), HOT_OPTION);
    const heated = await driver.evalPage(snapshotExpr);
    report.check(
      "ticking it carries the heat onto the dish row, in the same words again",
      heated.tags.includes(HOT_TAG) && heated.chips.includes(heatLabel(HOT_TAG)),
      `dataset.tags = ${heated.tags.join(" ")} · chips ${JSON.stringify(heated.chips)}`,
    );
    // …and back off. The rest of this run counts taps against the venue's cap of
    // three, so the selection must be empty again before (b) starts.
    await driver.click(sauceSelector(), HOT_OPTION);
    const cooled = await driver.evalPage(snapshotExpr);
    report.check(
      "…and unticking it takes the heat back off — the row does not keep a claim the reader undid",
      !cooled.tags.includes(HOT_TAG) && cooled.checked.length === 0 &&
        !cooled.chips.includes(heatLabel(HOT_TAG)),
      `dataset.tags = ${cooled.tags.join(" ") || "(none)"} · ${cooled.checked.length} ticked · ` +
        `chips ${JSON.stringify(cooled.chips)}`,
    );

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
    // Since ADR 0140 Bacon carries `has-meat` AND `contains-pork`, one
    // substance through two tags, so the fact is said ONCE through the pork
    // clause ("Bacon contains pork, so this is no longer vegetarian") — never
    // as "Bacon contains pork. Bacon is meat, so …", which is 200/070's defect.
    const MEAT_FACT = `${MEAT_OPTION} contains pork, so this is no longer vegetarian.`;
    const vegDish = dishSel(VEG_DISH);
    await driver.click(`${vegDish} .dish-addons-summary`);
    await driver.click(`${vegDish} .addon-option`, MEAT_OPTION);
    let w = await driver.evalPage(dishExpr(VEG_DISH));
    report.check(
      `${MEAT_OPTION} on a vegetarian dish is stated as a FACT, not as an absence`,
      !w.warnHidden && w.warnText.includes(MEAT_FACT),
      JSON.stringify(w.warnText),
    );
    report.check(
      "…said ONCE: the meat and the pork are one substance, not two sentences",
      occurrences(w.warnText, MEAT_OPTION) === 1 && !w.warnText.includes("is meat"),
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
    const factAt = w.warnText.indexOf(`${MEAT_OPTION} contains pork`);
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
    const factPart = sentences.find((x) => x.includes("contains pork")) || "";
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
    // 🛑 Since 2026-09-28 (roadmap 350/020) a row past three chips COLLAPSES
    // behind a labelled "+N", and this dish's `Veg` and `GF option` are exactly
    // what collapses. Unopened, the three "claim left the row" assertions below
    // pass on a claim that was never on screen — the first run after the
    // collapse landed did precisely that. So open the row first; it stays open
    // across the configuration's repaint (tags.js keeps `expanded`).
    await driver.evalPage(`document.querySelector(${JSON.stringify(`${chipDish} .tag-more`)})?.click()`);
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
    // --- (l) 200/070: one SUBSTANCE, said once ---------------------------
    // Same row, same tick — the warning `after` already carries. Measured
    // verbatim here BEFORE the fix, 390 px, fish flagged in Settings:
    //
    //   "Salmon contains fish — you asked to avoid it. Salmon is fish, so this
    //    is no longer vegetarian. Salmon isn't tagged gluten free, so that
    //    label describes the dish as listed."
    //
    // One option, one fish, two sentences opening with it. (j)'s merge could
    // not reach it and that was deliberate: it keys on the literal tag, and
    // here the allergen half comes from `contains-fish` while the
    // contradiction half comes from `has-fish` — two tags ADR 0095 keeps
    // independent on purpose. The picker now keys on the SUBSTANCE.
    //
    // COUNTED rather than matched, for the reason (j) is counted: a merge that
    // appends the consequence and forgets to delete the old sentence passes an
    // `includes` and fails a count.
    const fishSentences = after.warnText.trim().split(/(?<=\.)\s+/).filter(Boolean);
    report.check(
      `the allergen clause is said ONCE — "${FISH_OPTION} contains fish" opens one sentence, not two`,
      occurrences(after.warnText, `${FISH_OPTION} contains fish`) === 1,
      `${occurrences(after.warnText, `${FISH_OPTION} contains fish`)}× in ${JSON.stringify(after.warnText)}`,
    );
    // The ABSENCE half, and the one this item is actually about: the second
    // phrasing of the same fish is GONE, not merely joined to the first.
    report.check(
      `…and the second phrasing of the same fish is gone — no "${FISH_OPTION} is fish" beside it`,
      occurrences(after.warnText, `${FISH_OPTION} is fish`) === 0,
      JSON.stringify(after.warnText),
    );
    // Broader than the two clauses above, and the one that survives a rewording:
    // however the picker says it, the substance is named once in the whole
    // warning. (Safe here only because the dish's own name carries no "fish" —
    // asserted rather than assumed, because a future CHIP_DISH could.)
    report.check(
      "…so the SUBSTANCE is named exactly once in the whole warning",
      !/fish/i.test(CHIP_DISH) && occurrences(after.warnText, "fish") === 1,
      `${occurrences(after.warnText, "fish")}× "fish" in ${JSON.stringify(after.warnText)}`,
    );
    report.check(
      "…and the ALLERGEN half still leads, exactly as the 200/050 ruling requires",
      new RegExp(`^\\s*${FISH_OPTION} contains fish — you asked to avoid it`).test(after.warnText),
      JSON.stringify(after.warnText),
    );
    report.check(
      "…with the dietary consequence SURVIVING in that same sentence",
      /you asked to avoid it, and this is no longer vegetarian\./.test(after.warnText),
      JSON.stringify(after.warnText),
    );
    // The control. A merge that ate one sentence too many would pass every
    // count above; this dish's SECOND, unrelated fact — the gluten-free label
    // it can no longer vouch for — must still be on the page, and the whole
    // warning must be two sentences where it was three.
    report.check(
      "…and the unrelated absence sentence is untouched — three sentences became two, not one",
      fishSentences.length === 2 && occurrences(after.warnText, "isn't tagged gluten free") === 1,
      `${fishSentences.length} sentence(s): ${JSON.stringify(fishSentences)}`,
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

    // --- 490/100 · 1: the order line is in the venue's own money ----------
    // A fresh order, on the GBP fixture, added through BOTH call sites — the
    // dish row's stepper and the picker's — because they are two separate
    // omissions and either could be fixed alone.
    //
    // First the CONTROL, read before the order is cleared: the two lines block
    // (e) added on the REAL, NZD-priced venue. Without it a build that
    // hard-coded a pound sign passes every assertion below.
    const nzd = await driver.evalPage(
      `JSON.parse(localStorage.getItem("faves.order.v1") || "[]").map((l) => l.currency ?? null)`,
    );
    report.check(
      "the NZD venue's lines are stored as NZD — the control the GBP block rests on",
      Array.isArray(nzd) && nzd.length === 2 && nzd.every((c) => c === "NZD"),
      JSON.stringify(nzd),
    );

    const gbpUrl = `http://127.0.0.1:${port}/restaurant.html?id=${GBP_ID}`;
    await cdp.send("Page.navigate", { url: gbpUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
      label: `${GBP_ID} to render a dish offering add-ons`,
    });
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await cdp.send("Page.navigate", { url: gbpUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
      label: `${GBP_ID} to render again with an empty order`,
    });
    await driver.click("li.dish .dish-actions .stepper-add");
    await driver.click(".dish-addons-summary");
    // A NAMED option, not "the first one": an empty selection keys to the same
    // line as the plain add above and merges into it, so the picker's call site
    // would never be exercised and the assertion would silently test one of the
    // two it names.
    await driver.click(".dish-addons .addon-option", PEANUT_OPTION);
    await driver.click(".addon-stepper .stepper-add");
    await driver.click(".order-fab");
    await untilPresent(async () => (await driver.evalPage(sheetExpr)).open, {
      label: "the order sheet on the GBP fixture",
    });
    const gbp = await driver.evalPage(sheetExpr);
    report.check(
      "both call sites store the venue's currency on the line, not the default",
      gbp.stored.length === 2 && gbp.stored.every((l) => l[1] === "GBP") &&
        gbp.stored.some((l) => l[2] === 0) && gbp.stored.some((l) => l[2] > 0),
      JSON.stringify(gbp.stored),
    );
    report.check(
      "…and the LINE PRICE renders in it — the half the subtotal already had right",
      gbp.lines.length === 2 && gbp.lines.every((t) => t.startsWith(GBP_SYMBOL)),
      JSON.stringify(gbp.lines),
    );
    report.check(
      "…so the line and the subtotal above it name ONE currency, which is the bug",
      gbp.subtotals.length > 0 && gbp.subtotals.every((t) => t.startsWith(GBP_SYMBOL)),
      `lines ${JSON.stringify(gbp.lines)} · subtotals ${JSON.stringify(gbp.subtotals)}`,
    );

    // --- 490/100 · 4: a section heading is translated too -----------------
    // First the CONTROL, on the real record, which carries no translations at
    // all: the heading is exactly the string in the file, tagged with the
    // record's OWN language (`en-NZ` — the truth, and what a dish name already
    // does), and there is no second line under it. Without this, a build that
    // rendered an alternates line where none exists — or that translated
    // everything — passes everything below.
    await cdp.send("Page.navigate", { url }, sessionId);
    await untilPresent(async () => (await driver.evalPage(headingExpr(langSection.sectionId))).found, {
      label: `${opts.id} to render its own section heading`,
    });
    const ownHeading = await driver.evalPage(headingExpr(langSection.sectionId));
    report.check(
      "a section with no translations renders its own heading, unchanged, and no second line",
      ownHeading.found && ownHeading.heading === langSection.section && ownHeading.alts.length === 0 &&
        ownHeading.headingLang === "en-NZ",
      `${JSON.stringify(ownHeading.heading)} lang=${JSON.stringify(ownHeading.headingLang)} · ${ownHeading.alts.length} alt(s)`,
    );

    const langUrl = `http://127.0.0.1:${port}/restaurant.html?id=${LANG_ID}`;
    await cdp.send("Page.navigate", { url: langUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(headingExpr(langSection.sectionId))).found, {
      label: `${LANG_ID} to render the translated section`,
    });
    const tr = await driver.evalPage(headingExpr(langSection.sectionId));
    report.check(
      "a translated heading leads in the reader's language, not the venue's script",
      tr.heading === LANG_ENGLISH && tr.headingLang === "en",
      `${JSON.stringify(tr.heading)} lang=${JSON.stringify(tr.headingLang)}`,
    );
    report.check(
      "…with the canonical heading beneath it, TAGGED — WCAG 3.1.2, not decoration",
      tr.alts.length === 1 && tr.alts[0][0] === LANG_CANONICAL && tr.alts[0][1] === "th",
      JSON.stringify(tr.alts),
    );
    report.check(
      "the jump-nav chip says the same thing as the heading it jumps to",
      tr.link === LANG_ENGLISH && tr.linkLang === "en",
      `${JSON.stringify(tr.link)} lang=${JSON.stringify(tr.linkLang)}`,
    );
    // The reason translating a heading is safe at all (ADR 0058): the anchor is
    // the STORED id, so the words are display text and nothing links to them.
    // `found` is `getElementById("section-<sectionId>")`, so the fact is already
    // established — restated because it is the load-bearing one and should not
    // hide inside a helper.
    report.check(
      "…and the anchor is unmoved by it — the id, never the words (ADR 0058)",
      tr.found,
      `#section-${langSection.sectionId} still resolves with the heading in another language`,
    );

    // --- 28q (ADR 0126): a line stored BEFORE option ids still merges -----
    // The order line keys on the option's id now, not its display name. That is
    // only safe if the lines ALREADY on people's phones — `{ group, name }`, no
    // id — key the same way, so this stages one: add a configured dish through
    // the real picker, strip the id back out of storage to leave the exact shape
    // cart.js wrote until this change, and ask the picker to add it again.
    const peanutDef = group.options.find((o) => o.name === PEANUT_OPTION);
    await cdp.send("Page.navigate", { url }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
      label: `${opts.id} to render for the stored-line block`,
    });
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await cdp.send("Page.navigate", { url }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
      label: `${opts.id} to render with an empty order`,
    });
    await driver.click(".dish-addons-summary");
    await driver.click(".dish-addons .addon-option", PEANUT_OPTION);
    await driver.click(".addon-stepper .stepper-add");
    const fresh = await driver.evalPage(storedExpr);
    const freshOpt = fresh[0]?.options?.[0] || {};
    report.check(
      "the picker writes the option's id onto the order line, beside its name",
      fresh.length === 1 && freshOpt.id === peanutDef?.id && freshOpt.name === PEANUT_OPTION,
      JSON.stringify(freshOpt),
    );

    // The legacy shape: same line, option id removed. Stored, then reloaded, so
    // the store reads it cold exactly as it would a line saved last month.
    const legacy = (venueId) =>
      fresh.map((l) => ({ ...l, venueId, qty: 1, options: l.options.map(({ id: _drop, ...rest }) => rest) }));
    const stash = (lines) =>
      driver.evalPage(`localStorage.setItem("faves.order.v1", ${JSON.stringify(JSON.stringify(lines))}); true`);
    await stash(legacy(opts.id));
    await cdp.send("Page.navigate", { url }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
      label: `${opts.id} to render over a legacy stored line`,
    });
    await driver.click(".dish-addons-summary");
    // The CONTROL, read with nothing ticked: the plain dish is NOT the stored
    // line. Without it, a key that ignored the selection entirely would read 1
    // below and pass.
    const plainQty = await driver.evalPage(pickerQtyExpr);
    await driver.click(".dish-addons .addon-option", PEANUT_OPTION);
    const legacyQty = await driver.evalPage(pickerQtyExpr);
    report.check(
      "a line stored before option ids existed is FOUND by today's picker for the same choice",
      plainQty === 0 && legacyQty === 1,
      `plain ${plainQty} (want 0) · with ${PEANUT_OPTION} ${legacyQty} (want 1)`,
    );
    // "＋" matches BOTH the stepper's increment and the "＋ Add" button, so a
    // broken merge adds a second line and the assertion below says so, rather
    // than the run stopping on a missing element.
    await driver.click(".addon-stepper button", "＋");
    let stored = await driver.evalPage(storedExpr);
    report.check(
      "…and adding it again MERGES into that line — one line of 2, not two lines of 1",
      stored.length === 1 && stored[0].qty === 2,
      stored.map((l) => `${l.qty}× ${l.name} [${(l.options || []).map((o) => `${o.group}/${o.id ?? "(no id)"}/${o.name}`).join(",")}]`).join(" | "),
    );

    // And the case the id exists for: the venue has RENAMED the option since
    // that line was stored. The old line holds the old name and no id; the
    // picker now shows the new name and carries the pinned id.
    await stash(legacy(RENAME_ID));
    const renameUrl = `http://127.0.0.1:${port}/restaurant.html?id=${RENAME_ID}`;
    await cdp.send("Page.navigate", { url: renameUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
      label: `${RENAME_ID} to render over a line stored under the old name`,
    });
    await driver.click(".dish-addons-summary");
    await driver.click(".dish-addons .addon-option", RENAMED_OPTION);
    const renamedQty = await driver.evalPage(pickerQtyExpr);
    // "＋" matches BOTH the stepper's increment and the "＋ Add" button, so a
    // broken merge adds a second line and the assertion below says so, rather
    // than the run stopping on a missing element.
    await driver.click(".addon-stepper button", "＋");
    stored = await driver.evalPage(storedExpr);
    report.check(
      `after the venue renames "${PEANUT_OPTION}" to "${RENAMED_OPTION}", the old line still merges`,
      renamedQty === 1 && stored.length === 1 && stored[0].qty === 2,
      `picker saw ${renamedQty} (want 1) · ` +
        stored.map((l) => `${l.qty}× ${l.name} [${(l.options || []).map((o) => o.name).join(",")}]`).join(" | "),
    );

    // --- (n)–(r) 28m, ADR 0133: a dish with sizes ------------------------
    const sizeUrl = `http://127.0.0.1:${port}/restaurant.html?id=${SIZE_ID}`;
    const sizeDish = dishSel(SIZE_DISH);
    const openSize = async (label) => {
      await cdp.send("Page.navigate", { url: sizeUrl }, sessionId);
      await untilPresent(async () => (await driver.evalPage(`!!document.querySelector(${JSON.stringify(`${sizeDish} .dish-addons`)})`)), {
        label,
      });
    };
    await openSize(`${SIZE_ID} to render the size fixture`);
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openSize(`${SIZE_ID} to render with an empty order`);
    // (n) read BEFORE anything is tapped — the disclosure is not even open.
    let z = await driver.evalPage(sizeExpr);
    report.check(
      "(n) the default variant is chosen on open — exactly one radio, and it is Regular",
      z.radios.length === 3 && z.radios.every((r) => r.type === "radio") &&
        z.radios.filter((r) => r.checked).map((r) => r.value).join() === REGULAR_LABEL,
      JSON.stringify(z.radios),
    );
    report.check(
      "(n) …and the row is priced at the default's dishPrice before any tap",
      z.price === formatMoney(13, "NZD"),
      `row reads ${JSON.stringify(z.price)}`,
    );
    report.check(
      "(n) a size group states NO cap — no \"Choose up to\", and no \"None\" (a plate always has a size)",
      z.legend && z.legend.includes("Size") && !/choose up to/i.test(z.legend) && z.noneOption === false,
      `legend ${JSON.stringify(z.legend)} · None offered: ${z.noneOption}`,
    );
    report.check(
      "(n) which plate comes first: the size group leads the picker, and the summary says it is there",
      z.firstGroupIsVariant && /^Size and extras$/.test((z.summary || "").trim()),
      `first group is the variant: ${z.firstGroupIsVariant} · summary ${JSON.stringify(z.summary)}`,
    );
    report.check(
      "(n) an UNLABELLED variant has visible words — its price and the group, nothing invented",
      z.radios[2]?.label === THIRD_LABEL,
      `${JSON.stringify(z.radios[2]?.label)} · expected ${JSON.stringify(THIRD_LABEL)}`,
    );
    report.check(
      "(p) the default adds no warning at all — the baseline (p) reads against",
      z.warnHidden && z.tags.includes("v") && z.tags.includes("gf-option"),
      `hidden=${z.warnHidden} ${JSON.stringify(z.warnText)} · tags ${z.tags.join(" ")}`,
    );
    // (o) choose Large.
    await driver.click(`${sizeDish} .dish-addons-summary`);
    // Read once the disclosure is open: a closed <details> keeps its controls
    // out of the accessibility tree, so the name would read null.
    const regularAx = await axName(`${sizeDish} .addon-group-variant input[value=${JSON.stringify(REGULAR_LABEL)}]`);
    report.check(
      "(n) the control is announced as the variant AND its whole price",
      regularAx === `${REGULAR_LABEL} ${formatMoney(13, "NZD")}`,
      `${JSON.stringify(regularAx)}`,
    );
    await driver.click(`${sizeDish} .addon-group-variant .addon-option`, LARGE_LABEL);
    z = await driver.evalPage(sizeExpr);
    report.check(
      "(o) choosing Large puts Large's dishPrice on the row",
      z.price === formatMoney(19.5, "NZD"),
      `row reads ${JSON.stringify(z.price)} · want ${formatMoney(19.5, "NZD")}`,
    );
    report.check(
      "(o) …and NOT the dish's price plus it — dishPrice is the plate, never a surcharge",
      z.price !== formatMoney(13 + 19.5, "NZD"),
      `row reads ${JSON.stringify(z.price)}; the sum would be ${formatMoney(13 + 19.5, "NZD")}`,
    );
    // (p) Large carries sesame: said while chosen — union — and no residue.
    report.check(
      "(p) Large's allergen is said the moment it is chosen, and joins the composed tags",
      !z.warnHidden && z.warnText.includes(`${LARGE_LABEL} contains sesame`) && z.tags.includes("contains-sesame"),
      `${JSON.stringify(z.warnText)} · tags ${z.tags.join(" ")}`,
    );
    report.check(
      "(p) …and choosing a size costs the dish NO claim — no residue sentence, both claims still on it",
      occurrences(z.warnText, "tagged") === 0 && !/no longer/.test(z.warnText) &&
        z.tags.includes("v") && z.tags.includes("gf-option"),
      `${JSON.stringify(z.warnText)} · tags ${z.tags.join(" ")}`,
    );
    // The unlabelled rung carries no allergen, so the warning must go away
    // ENTIRELY — the purest form of "a variant adds no residue".
    await driver.click(`${sizeDish} .addon-group-variant .addon-option`, THIRD_LABEL);
    z = await driver.evalPage(sizeExpr);
    report.check(
      "(p) a size with no allergen of its own leaves NO warning — and takes Large's sesame back off",
      z.warnHidden && !z.tags.includes("contains-sesame") && z.tags.includes("v") && z.tags.includes("gf-option"),
      `hidden=${z.warnHidden} ${JSON.stringify(z.warnText)} · tags ${z.tags.join(" ")}`,
    );
    report.check(
      "(o) …and the row now reads that rung's whole price",
      z.price === formatMoney(24, "NZD"),
      `row reads ${JSON.stringify(z.price)}`,
    );

    // (q) two sizes, two lines. Regular through the ROW's ＋ Add, Large
    // through the picker's — both call sites, as the currency block does.
    await driver.click(`${sizeDish} .addon-group-variant .addon-option`, REGULAR_LABEL);
    await driver.click(`${sizeDish} .dish-actions .stepper-add`);
    await driver.click(`${sizeDish} .addon-group-variant .addon-option`, LARGE_LABEL);
    // "＋" matches the "＋ Add" button AND a stepper increment, so a build that
    // merged Large into the Regular line reaches the assertion below and fails
    // THERE, by name, instead of stopping on a missing "Add" button.
    await driver.click(`${sizeDish} .addon-stepper button`, "＋");
    stored = await driver.evalPage(storedExpr);
    const describe = (lines) =>
      lines.map((l) => `${l.qty}× ${l.name} @ ${l.price} [${(l.options || []).map((o) => `${o.group}/${o.id}`).join(",")}]`).join(" | ");
    report.check(
      "(q) Regular and Large of one dish are TWO order lines, each at its whole price",
      stored.length === 2 &&
        stored.some((l) => l.price === 13 && (l.options || []).length === 0) &&
        stored.some((l) => l.price === 19.5 && l.options?.[0]?.id === "large" && l.options?.[0]?.price === 0),
      describe(stored),
    );
    // The row's ＋ Add follows the chosen size: with Large chosen it counts the
    // Large line, not the Regular one beside it.
    z = await driver.evalPage(sizeExpr);
    report.check(
      "(o) the row's own ＋ Add follows the choice — with Large chosen it counts the Large line",
      z.plainQty === 1 && z.pickerQty === 1,
      `row stepper ${z.plainQty} · picker stepper ${z.pickerQty}`,
    );
    await driver.click(`${sizeDish} .dish-actions .stepper button`, "＋");
    stored = await driver.evalPage(storedExpr);
    report.check(
      "(q) …and a second Large from the row is a quantity of that line, not a third line",
      stored.length === 2 && stored.find((l) => l.price === 19.5)?.qty === 2,
      describe(stored),
    );

    // (r) a line stored before the dish had a ladder: the plain dish.
    await stash([{ venueId: SIZE_ID, venueName: warnVenue.name, currency: "NZD", phone: null,
      name: SIZE_DISH, dishId: sizeDishDef[0].dishId, price: 13, options: [], qty: 1, collected: false }]);
    await openSize(`${SIZE_ID} to render over a line stored before the ladder`);
    await driver.click(`${sizeDish} .dish-addons-summary`);
    z = await driver.evalPage(sizeExpr);
    const defaultQty = z.pickerQty;
    await driver.click(`${sizeDish} .addon-group-variant .addon-option`, LARGE_LABEL);
    z = await driver.evalPage(sizeExpr);
    const largeQty = z.pickerQty;
    await driver.click(`${sizeDish} .addon-group-variant .addon-option`, REGULAR_LABEL);
    await driver.click(`${sizeDish} .addon-stepper button`, "＋");
    stored = await driver.evalPage(storedExpr);
    report.check(
      "(r) a line stored before the ladder is FOUND by the default — and Large (the control) does not find it",
      defaultQty === 1 && largeQty === 0,
      `default sees ${defaultQty} (want 1) · Large sees ${largeQty} (want 0)`,
    );
    report.check(
      "(r) …and adding the default again MERGES into it — one line of 2, not two lines of 1",
      stored.length === 1 && stored[0].qty === 2,
      describe(stored),
    );

    // --- (s)–(z) Theme 26a: save an order, recall it, delete it ---------------
    // The owner's ask — "saving an order for Subway that I use each time" — is a
    // claim about a flow that spans the order sheet, storage, a RELOAD and the
    // venue's menu page, and every join between them is where it can break with
    // the unit tests green: a save that never reaches storage, a panel that does
    // not appear after a reload, a recall that adds a line which keys differently
    // from the original (so "my usual" doubles up beside what is already there).
    // So it is driven end to end at 390 px, and the assertion that carries the
    // weight is the last of the round trip: the tally after recall is the tally
    // before save, line for line and total for total.
    const SAVED_KEY = "faves.p.default.savedorders.v1";
    const savedExpr = `JSON.parse(localStorage.getItem(${JSON.stringify(SAVED_KEY)}) || "[]")`;
    const tallyShape = (ls) =>
      JSON.stringify(
        ls.map((l) => [l.dishId, l.qty, l.price, (l.options || []).map((o) => `${o.group}/${o.id}`).join("+"), l.note ?? null]),
      );
    const sheetTotal = `(document.querySelector("dialog.order-sheet .order-total") || {}).textContent`;
    const openSheet = async () => {
      await driver.click(".order-fab");
      await untilPresent(async () => await driver.evalPage(`!!document.querySelector("dialog.order-sheet[open]")`), {
        label: "the order sheet to open",
      });
    };
    const loadMenu = async (label) => {
      await cdp.send("Page.navigate", { url }, sessionId);
      await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, { label });
    };
    const panelExpr = `(() => {
      const p = document.querySelector(".saved-orders");
      const q = (sel) => (p ? p.querySelector(sel) : null);
      const box = (e) => (e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null);
      return {
        present: !!p,
        hidden: p ? p.hidden : null,
        head: (q(".saved-head") || {}).textContent || null,
        names: p ? [...p.querySelectorAll(".saved-name")].map((e) => e.textContent) : [],
        lines: p ? [...p.querySelectorAll(".saved-lines")].map((e) => e.textContent) : [],
        addLabels: p ? [...p.querySelectorAll(".saved-add")].map((e) => e.getAttribute("aria-label")) : [],
        addBox: box(q(".saved-add")),
        delBox: box(q(".saved-delete")),
        delText: (q(".saved-delete") || {}).textContent || null,
        status: (q(".saved-status") || {}).textContent || "",
        skipped: p ? [...p.querySelectorAll(".saved-skipped li")].map((e) => e.textContent) : [],
        focus: document.activeElement ? (document.activeElement.className || document.activeElement.tagName) : null,
        hOverflow: document.documentElement.scrollWidth > window.innerWidth,
        fabCount: (document.querySelector(".order-fab-count") || {}).textContent || null,
        fabHidden: document.querySelector(".order-fab") ? document.querySelector(".order-fab").hidden : null,
        panelBeforeMenu: p && document.querySelector(".menu-sections")
          ? !!(p.compareDocumentPosition(document.querySelector(".menu-sections")) & Node.DOCUMENT_POSITION_FOLLOWING)
          : null,
      };
    })()`;

    // Build an order through the real picker: two sauces on the first dish that
    // offers them, added twice, plus a note — so a saved line carries options by
    // id, a quantity, and free text.
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); localStorage.removeItem(${JSON.stringify(SAVED_KEY)}); true`);
    await loadMenu(`${opts.id} to render for the saved-order flow`);
    let pn = await driver.evalPage(panelExpr);
    report.check(
      "(s) with nothing saved the panel is absent from view — no empty heading, nothing to tab through",
      pn.present && pn.hidden === true,
      JSON.stringify({ present: pn.present, hidden: pn.hidden }),
    );
    await driver.click(".dish-addons-summary");
    await driver.click(".dish-addons .addon-option", MILD_OPTION);
    await driver.click(".dish-addons .addon-option", NEUTRAL_OPTION);
    await driver.click(".addon-stepper .stepper-add");
    await driver.click(".addon-stepper button", "＋");
    const original = await driver.evalPage(storedExpr);
    report.check(
      "(s) the fixture order is what the flow needs: one line, two sauces, quantity 2",
      original.length === 1 && original[0].qty === 2 && original[0].options.length === 2,
      JSON.stringify(original),
    );
    await openSheet();
    await driver.click('dialog.order-sheet .order-note-btn');
    await driver.evalPage(`${need("dialog.order-sheet .order-note-input")}.value = "extra napkins"; true`);
    await driver.click("dialog.order-sheet .order-note-save");
    const beforeSave = await driver.evalPage(storedExpr);
    const totalBefore = await driver.evalPage(sheetTotal);

    // (t) the save control: where the lines are, a real target, named for the venue.
    const saveUi = await driver.evalPage(`(() => {
      const b = document.querySelector("dialog.order-sheet .order-save-btn");
      const r = b ? b.getBoundingClientRect() : null;
      return { text: b ? b.textContent : null, label: b ? b.getAttribute("aria-label") : null, h: r ? Math.round(r.height) : null };
    })()`);
    report.check(
      "(t) the order sheet offers \"Save this order\" under the venue's lines, named for the venue, as a 44 px target",
      saveUi.text === "Save this order" && /^Save this .+ order to use again$/.test(saveUi.label || "") && saveUi.h >= 44,
      JSON.stringify(saveUi),
    );
    await driver.click("dialog.order-sheet .order-save-btn");
    const editor = await driver.evalPage(`(() => {
      const i = document.querySelector("dialog.order-sheet .order-save-input");
      const l = i ? document.querySelector('label[for="' + i.id + '"]') : null;
      const r = i ? i.getBoundingClientRect() : null;
      return { value: i ? i.value : null, max: i ? i.maxLength : null, h: r ? Math.round(r.height) : null,
        font: i ? getComputedStyle(i).fontSize : null, label: l ? l.textContent : null,
        focused: document.activeElement === i, described: i ? !!document.getElementById(i.getAttribute("aria-describedby")) : null };
    })()`);
    report.check(
      "(t) the name field is pre-filled \"My <venue>\", labelled, focused, 44 px tall and 16 px type (no iOS zoom)",
      editor.value === `My ${venue.name}`.slice(0, 40) && editor.label && editor.focused && editor.h >= 44 &&
        parseFloat(editor.font) >= 16 && editor.max === 40 && editor.described,
      JSON.stringify(editor),
    );
    await driver.evalPage(`${need("dialog.order-sheet .order-save-input")}.value = "  Kebab   usual "; true`);
    await driver.click("dialog.order-sheet .order-save-row .order-note-save");
    const savedNow = await driver.evalPage(savedExpr);
    report.check(
      "(t) saving files ONE order, name normalised, for this venue — and its line holds dish and option IDS",
      savedNow.length === 1 && savedNow[0].name === "Kebab usual" && savedNow[0].venueId === opts.id &&
        savedNow[0].lines.length === 1 && savedNow[0].lines[0].dishId === original[0].dishId &&
        savedNow[0].lines[0].qty === 2 && savedNow[0].lines[0].note === "extra napkins" &&
        JSON.stringify(savedNow[0].lines[0].options.map((o) => `${o.group}/${o.id}`)) ===
          JSON.stringify(original[0].options.map((o) => `${o.group}/${o.id}`)),
      JSON.stringify(savedNow),
    );
    report.check(
      "(t) …and nothing per-visit leaks into it — no `collected`, no phone",
      !("collected" in savedNow[0].lines[0]) && !("phone" in savedNow[0].lines[0]),
      JSON.stringify(Object.keys(savedNow[0].lines[0])),
    );
    report.check(
      "(t) saving did not touch the tally",
      tallyShape(await driver.evalPage(storedExpr)) === tallyShape(beforeSave),
      "tally unchanged",
    );

    // (u) the real test of "kept on this device": empty the tally, reload.
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await loadMenu(`${opts.id} to render after a reload, with an empty order`);
    pn = await driver.evalPage(panelExpr);
    report.check(
      "(u) after a reload, with an EMPTY tally, the venue's page shows the saved order — the recall needs no order button",
      pn.present && pn.hidden === false && pn.names.join() === "Kebab usual" && pn.fabHidden === true,
      JSON.stringify({ hidden: pn.hidden, names: pn.names, fabHidden: pn.fabHidden }),
    );
    report.check(
      "(u) …it reads the lines the way the tally does, note and all",
      /2× .+ with Mild chilli, Sweet chilli \(extra napkins\)/.test(pn.lines[0] || ""),
      JSON.stringify(pn.lines),
    );
    report.check(
      "(u) …sits BELOW the search/picks controls' block and ABOVE the menu, and the page does not scroll sideways",
      pn.panelBeforeMenu === true && pn.hOverflow === false,
      `panelBeforeMenu=${pn.panelBeforeMenu} hOverflow=${pn.hOverflow}`,
    );
    report.check(
      "(u) …Add and Delete are 44 px targets, each named for the order it acts on",
      pn.addBox.h >= 44 && pn.delBox.h >= 44 && pn.addLabels[0] === "Add “Kebab usual” to your order",
      JSON.stringify({ add: pn.addBox, del: pn.delBox, label: pn.addLabels[0] }),
    );

    // (v) one tap, and the tally is what it was.
    await driver.click(".saved-orders .saved-add");
    const recalled = await driver.evalPage(storedExpr);
    pn = await driver.evalPage(panelExpr);
    report.check(
      "(v) ONE tap on Add puts the order back: the tally is the saved one, line for line (dish, qty, price, option ids, note)",
      tallyShape(recalled) === tallyShape(beforeSave),
      `${tallyShape(recalled)} vs ${tallyShape(beforeSave)}`,
    );
    report.check(
      "(v) …and the button count and the sheet's total match what they were before it was saved",
      pn.fabCount === "2" && (await (async () => { await openSheet(); return (await driver.evalPage(sheetTotal)) === totalBefore; })()),
      `fab ${pn.fabCount} · total ${totalBefore}`,
    );
    report.check(
      "(v) …and the panel says what it did, politely, in a status region",
      /^Added 2 items from “Kebab usual” to your order\.$/.test(pn.status.trim()),
      JSON.stringify(pn.status),
    );
    await driver.click("dialog.order-sheet .order-close");
    // Adding again ADDS (the tally is never overwritten): quantity doubles on the one line.
    await driver.click(".saved-orders .saved-add");
    const twice = await driver.evalPage(storedExpr);
    report.check(
      "(v) recalling again adds to the tally rather than replacing it — one line, quantity 4, not a second line",
      twice.length === 1 && twice[0].qty === 4,
      JSON.stringify(twice.map((l) => [l.name, l.qty])),
    );

    // (w) a saved order that no longer fits the menu: skip, name, never alter.
    const good = savedNow[0].lines[0];
    await driver.evalPage(`localStorage.removeItem("faves.order.v1");
      localStorage.setItem(${JSON.stringify(SAVED_KEY)}, ${JSON.stringify(JSON.stringify([{
        ...savedNow[0],
        lines: [
          good,
          { dishId: "a-dish-the-venue-dropped", name: "Dropped Special", qty: 1, price: 9, currency: "NZD" },
          { ...good, name: good.name, qty: 3, options: [...good.options.slice(0, 1), { group: good.options[1].group, id: "an-option-that-went", name: "Vanished sauce", price: 0 }], note: "should not appear" },
        ],
      }]))}); true`);
    await loadMenu(`${opts.id} to render over a saved order that no longer fits`);
    await driver.click(".saved-orders .saved-add");
    const partial = await driver.evalPage(storedExpr);
    pn = await driver.evalPage(panelExpr);
    report.check(
      "(w) the line that still resolves comes back; the two that do not are NOT added — not even \"the line without its missing sauce\"",
      partial.length === 1 && partial[0].qty === 2 && partial[0].dishId === good.dishId && partial.every((l) => l.note !== "should not appear"),
      JSON.stringify(partial.map((l) => [l.name, l.qty, (l.options || []).map((o) => o.id)])),
    );
    report.check(
      "(w) …and the panel NAMES what was left out and why, in words",
      pn.skipped.length === 2 &&
        pn.skipped.some((t) => /1× Dropped Special — no longer on the menu/.test(t)) &&
        pn.skipped.some((t) => /3× .+ — “Vanished sauce” is no longer offered/.test(t)),
      JSON.stringify(pn.skipped),
    );

    // (w) …and a line that DOES resolve at a different price is landed at TODAY'S
    // price and the change is SAID (roadmap 220/030). Three recalls of the same
    // line: saved 2 under today's (a rise), saved dearer (a fall — also news),
    // and saved with NO price snapshot (no evidence, no claim: nothing said).
    const livePrice = good.price;
    const recallWith = async (price, label) => {
      const line = { ...good };
      if (price === undefined) delete line.price; else line.price = price;
      await driver.evalPage(`localStorage.removeItem("faves.order.v1");
        localStorage.setItem(${JSON.stringify(SAVED_KEY)}, ${JSON.stringify(JSON.stringify([{ ...savedNow[0], lines: [line] }]))}); true`);
      await loadMenu(`${opts.id} to render over a saved order priced differently (${label})`);
      await driver.click(".saved-orders .saved-add");
      return {
        tally: await driver.evalPage(storedExpr),
        changed: await driver.evalPage(`[...document.querySelectorAll(".saved-orders .saved-changed li")].map((e) => e.textContent)`),
        head: await driver.evalPage(`(document.querySelector(".saved-orders .saved-changed-head") || {}).textContent || null`),
      };
    };
    const rise = await recallWith(livePrice - 2, "rise");
    report.check(
      "(w) a price that ROSE since saving is said in words, both prices and the amount",
      rise.changed.length === 1 && /^2× .+ — now \$[\d.]+ each, was \$[\d.]+ when you saved it \(up \$2\)$/.test(rise.changed[0]) &&
        /changed/.test(rise.head || ""),
      JSON.stringify(rise.changed),
    );
    report.check(
      "(w) …and the tally holds TODAY'S price, never the saved one",
      rise.tally.length === 1 && rise.tally[0].price === livePrice,
      JSON.stringify(rise.tally.map((l) => [l.name, l.qty, l.price])) + ` live ${livePrice}`,
    );
    const fall = await recallWith(livePrice + 1.5, "fall");
    report.check(
      "(w) a price that FELL is said too",
      fall.changed.length === 1 && /was \$[\d.]+ when you saved it \(down \$1\.50\)$/.test(fall.changed[0]) && fall.tally[0].price === livePrice,
      JSON.stringify([fall.changed, fall.tally.map((l) => l.price)]),
    );
    const bare = await recallWith(undefined, "no snapshot");
    report.check(
      "(w) a saved line with NO price snapshot is added and says nothing about a change",
      bare.tally.length === 1 && bare.tally[0].price === livePrice && bare.changed.length === 0 && bare.head === null,
      JSON.stringify([bare.changed, bare.head]),
    );
    // The three status blocks must read alike (bold heading, indented list): the
    // unfinished one cannot be provoked here, so build the markup recall builds
    // and ask the stylesheet — an unstyled class falls back to a plain <p>/<ul>.
    const look = await driver.evalPage(`(() => {
      const s = document.querySelector(".saved-orders .saved-status");
      const mk = (cls) => { const h = document.createElement("p"); h.className = "saved-status-line " + cls + "-head"; const u = document.createElement("ul"); u.className = cls; s.append(h, u);
        const c = (e) => getComputedStyle(e); return [c(h).fontWeight, c(h).marginTop, c(u).paddingLeft]; };
      const out = { skipped: mk("saved-skipped"), unfinished: mk("saved-unfinished"), changed: mk("saved-changed") };
      return out;
    })()`);
    report.check(
      "(w) the changed and unfinished blocks look like the left-out one: bold heading, same top margin, indented list",
      JSON.stringify(look.unfinished) === JSON.stringify(look.skipped) && JSON.stringify(look.changed) === JSON.stringify(look.skipped) &&
        Number(look.skipped[0]) >= 700 && look.skipped[2] !== "0px",
      JSON.stringify(look),
    );

    // (x) delete: two taps, then gone, and focus does not fall to <body>.
    await driver.evalPage(`localStorage.setItem(${JSON.stringify(SAVED_KEY)}, ${JSON.stringify(JSON.stringify([
      savedNow[0], { ...savedNow[0], id: "second", name: "Second usual" },
    ]))}); true`);
    await loadMenu(`${opts.id} to render with two saved orders`);
    await driver.click(".saved-orders .saved-delete");
    pn = await driver.evalPage(panelExpr);
    report.check(
      "(x) the first Delete tap only ASKS — it reads \"Delete — sure?\" and nothing is deleted",
      /sure\?/.test(pn.delText || "") && (await driver.evalPage(savedExpr)).length === 2,
      JSON.stringify(pn.delText),
    );
    await driver.click(".saved-orders .saved-delete");
    const afterDelete = await driver.evalPage(savedExpr);
    pn = await driver.evalPage(panelExpr);
    report.check(
      "(x) the second tap deletes that one and only that one, and the panel follows without a reload",
      afterDelete.length === 1 && afterDelete[0].id === "second" && pn.names.join() === "Second usual",
      JSON.stringify({ stored: afterDelete.map((x) => x.name), shown: pn.names }),
    );
    report.check(
      "(x) …and keyboard focus moved to the remaining order's Add button, not to <body>",
      pn.focus === "saved-add",
      JSON.stringify(pn.focus),
    );

    // (y) saved orders are per venue: another venue's page shows none of them.
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/restaurant.html?id=${WARN_VENUE}` }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, { label: `${WARN_VENUE} to render for the per-venue check` });
    pn = await driver.evalPage(panelExpr);
    report.check(
      "(y) another venue's page does not list this venue's saved orders",
      pn.present && pn.hidden === true && pn.names.length === 0,
      JSON.stringify({ hidden: pn.hidden, names: pn.names }),
    );

    // --- (z) 200/090, ADR 0156: a required choice, and an optional one -------
    // Two shapes, because either alone proves little: a build that dropped None
    // from EVERY pick-one group, or that blocked Add on every dish, passes the
    // required half and breaks the optional one.
    const reqUrl = `http://127.0.0.1:${port}/restaurant.html?id=${REQ_VENUE}`;
    const reqDish = dishSel(REQ_DISH);
    const openAt = async (u, sel, label) => {
      await cdp.send("Page.navigate", { url: u }, sessionId);
      await untilPresent(async () => (await driver.evalPage(`!!document.querySelector(${JSON.stringify(`${sel} .dish-addons`)})`)), { label });
    };
    await openAt(reqUrl, reqDish, `${REQ_VENUE} to render the required-choice dish`);
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openAt(reqUrl, reqDish, `${REQ_VENUE} to render with an empty order`);
    let rq = await driver.evalPage(requiredExpr(REQ_DISH));
    const sauce = rq.groups.find((g) => g.name === REQ_GROUP);
    report.check(
      "(z) a REQUIRED group offers no None — the three sauces and nothing else",
      !!sauce && sauce.options.length === 3 && !sauce.options.includes("None") && sauce.radios === 3,
      JSON.stringify(sauce),
    );
    report.check(
      "(z) …nothing is pre-selected: a default would be a choice the reader never made",
      !!sauce && sauce.checked.length === 0,
      JSON.stringify(sauce?.checked),
    );
    report.check(
      "(z) …and says it is required in WORDS, in the legend",
      !!sauce && /required/i.test(sauce.rule || ""),
      JSON.stringify(sauce?.rule),
    );
    report.check(
      "(z) Add is aria-disabled on the picker AND on the row, and each says why in its label",
      rq.pickAdd?.disabled === "true" && rq.rowAdd?.disabled === "true" &&
        /choose Sauce first/.test(rq.pickAdd?.label || "") && /choose Sauce first/.test(rq.rowAdd?.label || ""),
      JSON.stringify({ picker: rq.pickAdd, row: rq.rowAdd }),
    );
    report.check(
      "(z) …with the reason visible as text beside the picker and as a chip on its summary",
      /Sauce/.test(rq.needText || "") && /choice needed/i.test(rq.chipText || ""),
      JSON.stringify({ need: rq.needText, chip: rq.chipText }),
    );
    // The row's Add first: closed disclosure, the commonest way in.
    await driver.click(`${reqDish} .dish-actions .stepper-add`);
    let rs = await driver.evalPage(storedExpr);
    rq = await driver.evalPage(requiredExpr(REQ_DISH));
    report.check(
      "(z) a tap on the row's blocked Add orders NOTHING…",
      rs.length === 0,
      JSON.stringify(rs),
    );
    report.check(
      "(z) …opens the picker and moves keyboard focus to the first sauce, not to <body>",
      rq.open === true && rq.focus?.type === "radio" && rq.focus?.value === "Sweet & sour sauce",
      JSON.stringify({ open: rq.open, focus: rq.focus }),
    );
    await driver.click(`${reqDish} .addon-stepper .stepper-add`);
    rs = await driver.evalPage(storedExpr);
    report.check("(z) …and so does a tap on the picker's own blocked Add", rs.length === 0, JSON.stringify(rs));
    // Choose, and it opens up.
    await driver.click(`${reqDish} .addon-option`, REQ_OPTION);
    rq = await driver.evalPage(requiredExpr(REQ_DISH));
    report.check(
      "(z) choosing a sauce lifts the gate on both Adds and takes the reason away",
      !rq.pickAdd?.disabled && !rq.rowAdd?.disabled && rq.needText === null && rq.chipText === null,
      JSON.stringify({ picker: rq.pickAdd?.disabled, row: rq.rowAdd?.disabled, need: rq.needText, chip: rq.chipText }),
    );
    await driver.click(`${reqDish} .addon-stepper .stepper-add`);
    rs = await driver.evalPage(storedExpr);
    report.check(
      "(z) …and Add now orders the dish WITH that sauce on the line",
      rs.length === 1 && rs[0].options?.length === 1 && rs[0].options[0].name === REQ_OPTION,
      JSON.stringify(rs.map((l) => [l.name, l.qty, (l.options || []).map((o) => o.name)])),
    );
    // The row's own Add must carry the choice too, or it reopens the hole.
    await driver.click(`${reqDish} .dish-actions .stepper-add, ${reqDish} .dish-actions .stepper-btn`, "＋");
    rs = await driver.evalPage(storedExpr);
    report.check(
      "(z) the row's Add, once unblocked, adds the SAME configured line — it cannot order the dish bare",
      rs.length === 1 && rs[0].qty === 2 && rs[0].options?.[0]?.name === REQ_OPTION,
      JSON.stringify(rs.map((l) => [l.name, l.qty, (l.options || []).map((o) => o.name)])),
    );

    // The optional shape, on a real record whose pick-one groups are optional.
    const optUrl = `http://127.0.0.1:${port}/restaurant.html?id=${OPT_VENUE}`;
    const optDish = dishSel(OPT_DISH);
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openAt(optUrl, optDish, `${OPT_VENUE} to render the optional-choice dish`);
    const oq = await driver.evalPage(requiredExpr(OPT_DISH));
    const pickOnes = oq.groups.filter((g) => g.radios > 0);
    report.check(
      "(z) OPTIONAL pick-one groups still offer None, first, and start on it",
      pickOnes.length >= 1 && pickOnes.every((g) => g.options[0] === "None" && g.checked.join() === "" && !/required/i.test(g.rule || "")),
      JSON.stringify(pickOnes),
    );
    report.check(
      "(z) …and Add is NOT blocked, with no reason shown, before anything is chosen",
      oq.pickAdd?.disabled === null && oq.rowAdd?.disabled === null && oq.needText === null && oq.chipText === null,
      JSON.stringify({ picker: oq.pickAdd?.disabled, row: oq.rowAdd?.disabled, need: oq.needText, chip: oq.chipText }),
    );
    await driver.click(`${optDish} .dish-actions .stepper-add`);
    rs = await driver.evalPage(storedExpr);
    report.check(
      "(z) …so the row's Add orders the plain dish in one tap",
      rs.length === 1 && rs[0].qty === 1 && (rs[0].options || []).length === 0,
      JSON.stringify(rs.map((l) => [l.name, l.qty, (l.options || []).length])),
    );

    // --- (ab) 200/120, ADR 0159: a must-see choice opens when you press Add ----
    // Pressing Add is the moment a default is chosen FOR the reader, so that is
    // the moment the picker opens. Three things must hold and each fails alone:
    // it opens (a build that never wired the callback), it stays closed where the
    // group is purely optional (a build that opens every picker), and it does not
    // take focus off the button just pressed (a build that focuses the first
    // radio, as the blocked Add of block z rightly does).
    //
    // CONTROL FIRST, on the real record: the same picker, three optional groups,
    // no flag. Row Add orders the dish and the picker is still closed.
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openAt(optUrl, optDish, `${OPT_VENUE} for the optional-stays-closed control`);
    let sv = await driver.evalPage(seeExpr(OPT_DISH));
    report.check("(ab) CONTROL: before Add, the optional picker is closed and says nothing", sv.open === false && !sv.noteVisible, JSON.stringify(sv));
    await driver.click(`${optDish} .dish-actions .stepper-add`);
    sv = await driver.evalPage(seeExpr(OPT_DISH));
    report.check(
      "(ab) CONTROL: pressing Add on a purely optional picker orders the dish and leaves it CLOSED, with no note",
      (await driver.evalPage(storedExpr)).length === 1 && sv.open === false && !sv.noteVisible && !sv.live,
      JSON.stringify(sv),
    );

    // The flagged group: the same dish, one group opted in.
    const mustUrl = `http://127.0.0.1:${port}/restaurant.html?id=${MUST_ID}`;
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openAt(mustUrl, optDish, `${MUST_ID} to render the must-see fixture`);
    sv = await driver.evalPage(seeExpr(OPT_DISH));
    report.check("(ab) before Add, even a flagged picker is closed — a menu of dishes is not a menu of forms", sv.open === false, JSON.stringify(sv));
    await driver.click(`${optDish} .dish-actions .stepper-add`);
    sv = await driver.evalPage(seeExpr(OPT_DISH));
    const mustStored = await driver.evalPage(storedExpr);
    report.check(
      "(ab) pressing Add on a dish with a must-see group ORDERS it AND opens the picker",
      mustStored.length === 1 && mustStored[0].qty === 1 && (mustStored[0].options || []).length === 0 && sv.open === true,
      JSON.stringify({ lines: mustStored.map((l) => [l.name, l.qty]), open: sv.open }),
    );
    report.check(
      "(ab) …and says why in WORDS, on the page and in the status region, naming the group",
      sv.noteVisible && sv.noteText.includes(`Check “${MUST_GROUP_NAME}” below`) &&
        sv.live === sv.noteText,
      JSON.stringify({ note: sv.noteText, visible: sv.noteVisible, live: sv.live }),
    );
    report.check(
      "(ab) …shows the choice that was made for the reader — nothing in the group is ticked but None",
      sv.checkedRadios.length >= 1 && sv.checkedRadios.every((v) => v === ""),
      JSON.stringify(sv.checkedRadios),
    );
    report.check(
      "(ab) …and focus did NOT move into the picker: it is still on the row's stepper (the ＋ that replaced Add), not <body>",
      sv.focus?.inRowStepper === true && sv.focus.inPicker === false && sv.focus.isBody === false && sv.focus.text === "＋",
      JSON.stringify(sv.focus),
    );
    // A repeat-tapper: ＋ is not Add. Close the picker, press ＋, it stays closed.
    await driver.click(`${optDish} .dish-addons-summary`);
    sv = await driver.evalPage(seeExpr(OPT_DISH));
    report.check(
      "(ab) closing the picker clears the sentence from the page and from the status region",
      sv.open === false && !sv.noteVisible && !sv.noteText && !sv.live,
      JSON.stringify(sv),
    );
    await driver.click(`${optDish} .dish-actions .stepper button`, "＋");
    sv = await driver.evalPage(seeExpr(OPT_DISH));
    report.check(
      "(ab) a second tap on ＋ adds another and does NOT re-open the picker — a repeat-tapper is not interrupted",
      sv.rowQty === "2" && sv.open === false && !sv.noteVisible,
      JSON.stringify({ qty: sv.rowQty, open: sv.open, note: sv.noteVisible }),
    );
    // Back to none and Add again: that IS an Add press, so it opens.
    await driver.click(`${optDish} .dish-actions .stepper button`, "−");
    await driver.click(`${optDish} .dish-actions .stepper button`, "−");
    sv = await driver.evalPage(seeExpr(OPT_DISH));
    report.check(
      "(ab) removing the dish and pressing Add again is an Add press — it opens again (focus on the Add that came back)",
      sv.rowQty === "0" && sv.open === false && sv.focus?.inRowStepper === true && /Add/.test(sv.focus.text),
      JSON.stringify(sv),
    );
    await driver.click(`${optDish} .dish-actions .stepper-add`);
    sv = await driver.evalPage(seeExpr(OPT_DISH));
    report.check("(ab) …and it does", sv.open === true && sv.noteVisible, JSON.stringify(sv));

    // By rule: a size ladder needs NO flag. The synthetic ladder of block n–r.
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openSize(`${SIZE_ID} for the ladder-is-must-see-by-rule case`);
    sv = await driver.evalPage(seeExpr(SIZE_DISH));
    report.check("(ab) a size ladder is closed before Add", sv.open === false, JSON.stringify(sv));
    await driver.click(`${sizeDish} .dish-actions .stepper-add`);
    sv = await driver.evalPage(seeExpr(SIZE_DISH));
    report.check(
      "(ab) pressing Add on a dish with a size ladder opens it with NO flag in the data, naming Size, default still chosen",
      sv.open === true && /Check “Size” below/.test(sv.noteText || "") && sv.variantChecked.join() === REGULAR_LABEL &&
        sv.focus?.inRowStepper === true && sv.focus.inPicker === false,
      JSON.stringify(sv),
    );

    // --- (ab) B, owner-ruled 2026-10-16: a change made in the picker that opened on
    // Add UPDATES the line just added. The state here: Regular added, picker open.
    // What the ORDER holds is asserted, not what the picker shows, because the
    // defect B removes (Full left ordered beside Half) lives only in the order.
    const sizeLines = async () =>
      (await driver.evalPage(storedExpr)).map((l) => `${l.options?.[0]?.id ?? "default"}×${l.qty}@${l.price}`).sort().join(" | ");
    const pickSize = (label) => driver.click(`${sizeDish} .addon-group-variant .addon-option`, label);
    await pickSize(LARGE_LABEL);
    let bl = await sizeLines();
    sv = await driver.evalPage(seeExpr(SIZE_DISH));
    report.check(
      "(ab) B: choosing Large after Add leaves ONE line, at Large's price — Regular is not left ordered beside it",
      bl === "large×1@19.5",
      bl,
    );
    report.check(
      "(ab) B: …and the order changing under a radio tap is SAID, on the page and in the status region",
      sv.noteVisible && /Updated in your order: Eggs on Toast, Large\./.test(sv.noteText || "") && sv.live === sv.noteText,
      JSON.stringify({ note: sv.noteText, live: sv.live }),
    );
    await pickSize(REGULAR_LABEL);
    bl = await sizeLines();
    report.check("(ab) B: choosing back to the default is still ONE line, the plain dish", bl === "default×1@13", bl);
    await pickSize(THIRD_LABEL);
    bl = await sizeLines();
    report.check("(ab) B: …and a third rung is still ONE line, at its price", bl === "size-3×1@24", bl);

    // Confirming a quantity ends it: ＋ on the row is a decision, not a draft.
    await driver.click(`${sizeDish} .dish-actions .stepper button`, "＋");
    await pickSize(LARGE_LABEL);
    bl = await sizeLines();
    report.check(
      "(ab) B: after ＋ the quantity is confirmed — choosing Large no longer moves anything (the old rule)",
      bl === "size-3×2@24",
      bl,
    );
    await driver.click(`${sizeDish} .addon-stepper .stepper-add`);
    bl = await sizeLines();
    report.check("(ab) …and the picker's own Add then makes the second line, as it always did", bl === "large×1@19.5 | size-3×2@24", bl);

    // The unit just added may share a line with ones ordered before: it MOVES ALONE,
    // and it may land on a line that already exists.
    await pickSize(REGULAR_LABEL);
    await driver.click(`${sizeDish} .dish-addons-summary`); // close
    await driver.click(`${sizeDish} .dish-actions .stepper-add`); // Regular, picker opens
    sv = await driver.evalPage(seeExpr(SIZE_DISH));
    const reopened = sv.open === true;
    await pickSize(LARGE_LABEL);
    bl = await sizeLines();
    report.check(
      "(ab) B: the unit just added JOINS an existing Large line (1 + 1 = 2), and no Regular remains",
      reopened && bl === "large×2@19.5 | size-3×2@24",
      `reopened=${reopened} ${bl}`,
    );
    await pickSize(REGULAR_LABEL);
    bl = await sizeLines();
    report.check(
      "(ab) B: moving it back takes ONE unit off the line of two — the other Large is not rewritten (split)",
      bl === "default×1@13 | large×1@19.5 | size-3×2@24",
      bl,
    );
    // Closing the picker accepts what is in the order.
    await driver.click(`${sizeDish} .dish-addons-summary`);
    await driver.click(`${sizeDish} .dish-addons-summary`);
    await pickSize(LARGE_LABEL);
    bl = await sizeLines();
    report.check(
      "(ab) B: after the picker is closed and reopened by hand, a change no longer touches the order",
      bl === "default×1@13 | large×1@19.5 | size-3×2@24",
      bl,
    );

    // A REQUIRED group is gated, not must-see: after it was answered and the
    // picker closed, Add does not open it again. (The decision ADR 0159 records.)
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openAt(reqUrl, reqDish, `${REQ_VENUE} for the required-is-not-must-see case`);
    await driver.click(`${reqDish} .dish-actions .stepper-add`); // blocked: opens + focuses the first sauce
    await driver.click(`${reqDish} .addon-option`, REQ_OPTION);
    await driver.click(`${reqDish} .dish-addons-summary`); // close it again
    sv = await driver.evalPage(seeExpr(REQ_DISH));
    const reqClosed = sv.open === false;
    await driver.click(`${reqDish} .dish-actions .stepper-add`);
    sv = await driver.evalPage(seeExpr(REQ_DISH));
    report.check(
      "(ab) a required group the reader has answered is NOT re-opened by Add — the gate already made them see it",
      reqClosed && (await driver.evalPage(storedExpr)).length === 1 && sv.open === false && !sv.noteVisible,
      JSON.stringify({ closedFirst: reqClosed, ...sv }),
    );

    {
    // --- (aa) 200/130, ADR 0158: an UNFINISHED dish on the order sheet --------
    // The owner's ruling (2026-10-03): a dish missing a compulsory choice SHOWS on
    // the order screen with a warning, and the choice can be made THERE, which
    // clears the warning. The menu cannot make such a line (block z) — so every
    // line here is STAGED in storage, the way a phone that held one before the
    // flag, a recalled saved order or a shared order would. What is asserted is
    // what the READER sees and what the store then holds, not the pure verdict
    // (tests/order-finish.test.js has that).
    const finUrl = `http://127.0.0.1:${port}/restaurant.html?id=${FIN_ID}`;
    const homeUrl = `http://127.0.0.1:${port}/`;
    const finLine = (over) => ({
      venueId: FIN_ID,
      venueName: reqVenue.name,
      currency: "NZD",
      phone: null,
      name: REQ_DISH,
      dishId: finDishDef.dishId,
      price: finDishDef.price,
      options: [],
      qty: 1,
      collected: false,
      ...over,
    });
    const finOtherLine = finLine({ name: finOther.name, dishId: finOther.dishId, price: finOther.price });
    const finSatay = { group: finSauce.id, id: "satay-sauce", name: REQ_OPTION, price: FIN_SAUCE_COST };
    const stage = (lines) => driver.evalPage(`localStorage.setItem("faves.order.v1", ${JSON.stringify(JSON.stringify(lines))}); true`);
    const money = (n) => formatMoney(n, "NZD");

    // What the MENU's picker says for the same configuration — the reference the
    // sheet's sentence must equal. Read on the real menu page, picker ticked.
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openAt(finUrl, dishSel(REQ_DISH), `${FIN_ID} to render`);
    await driver.click(`${dishSel(REQ_DISH)} .dish-addons-summary`);
    await driver.click(`${dishSel(REQ_DISH)} .addon-option`, REQ_OPTION);
    const menuSaid = await driver.evalPage(dishExpr(REQ_DISH));
    report.check(
      "(aa) fixture sanity: on the MENU the satay sauce adds peanuts, and that is the flagged treatment",
      /Satay sauce contains peanuts/.test(menuSaid.warnText),
      JSON.stringify(menuSaid.warnText),
    );

    // The sheet is read from a page that is NOT a menu (the home screen), so the
    // venue's record has to be fetched — and the unfinished line is flagged anyway.
    const sheetFin = `(() => {
      const sheet = document.querySelector("dialog.order-sheet[open]");
      const norm = (t) => (t || "").replace(/\\s+/g, " ").trim();
      const a = document.activeElement;
      const li = a && a.closest ? a.closest("li.order-line") : null;
      const f = sheet.querySelector(".order-finish-form");
      const done = sheet.querySelector(".order-finish-done");
      const note = sheet.querySelector(".order-unfinished-note");
      const box = (e) => (e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null);
      return {
        lines: [...sheet.querySelectorAll("li.order-line")].map((l) => ({
          name: l.querySelector(".order-line-name")?.firstChild?.textContent ?? null,
          unfinished: l.classList.contains("is-unfinished"),
          warn: norm(l.querySelector(".order-line-unfinished")?.textContent) || null,
          price: norm(l.querySelector(".order-line-price")?.textContent),
          buttons: [...l.querySelectorAll(".stepper button")].map((b) => b.textContent),
          count: l.querySelector(".stepper-count")?.textContent ?? null,
          config: norm(l.querySelector(".order-line-config")?.textContent) || null,
        })),
        total: norm(sheet.querySelector(".order-total")?.textContent),
        subtotal: norm(sheet.querySelector(".order-subtotal-amount")?.textContent),
        note: note && !note.hidden ? norm(note.textContent) : null,
        open: !!f,
        opener: box(sheet.querySelector(".order-finish-open")),
        form: f
          ? {
              groups: [...f.querySelectorAll("fieldset")].map((g) => ({
                name: g.querySelector(".addon-group-name")?.textContent ?? null,
                rule: g.querySelector(".addon-rule")?.textContent ?? null,
                options: [...g.querySelectorAll(".addon-option-name")].map((n) => n.textContent),
                radios: g.querySelectorAll("input[type=radio]").length,
                checked: [...g.querySelectorAll("input:checked")].map((i) => i.value),
              })),
              warnHidden: f.querySelector(".addon-warning").hidden,
              warnText: f.querySelector(".addon-warning").textContent,
              warnFlagged: f.querySelector(".addon-warning").classList.contains("is-flagged"),
              need: f.querySelector(".addon-need").hidden ? null : f.querySelector(".addon-need").textContent,
              doneDisabled: done?.getAttribute("aria-disabled") ?? null,
              doneBox: box(done),
              cancelBox: box(f.querySelector(".order-finish-cancel")),
              radioRows: [...f.querySelectorAll(".addon-option")].map((r) => Math.round(r.getBoundingClientRect().height)),
              hint: norm(f.querySelector(".order-note-help")?.textContent) || null,
            }
          : null,
        focus: a
          ? {
              tag: a.tagName,
              type: a.type || null,
              value: a.value || null,
              cls: a.className || null,
              line: li ? li.querySelector(".order-line-name")?.firstChild?.textContent : null,
              inSheet: !!sheet.contains(a),
            }
          : null,
        hOverflow: sheet.scrollWidth > sheet.clientWidth,
      };
    })()`;
    const openFinSheet = async (label) => {
      await cdp.send("Page.navigate", { url: homeUrl }, sessionId);
      // The pathname matters: `Page.navigate` returns before the old page is gone,
      // and its own order button would satisfy the wait on the WRONG page.
      await untilPresent(
        async () => await driver.evalPage(`location.pathname === "/" && !!document.querySelector(".order-fab:not([hidden])")`),
        { label },
      );
      await openSheet();
      await untilPresent(async () => await driver.evalPage(`!!document.querySelector("dialog.order-sheet .order-line")`), {
        label: "the sheet's lines",
      });
    };

    await stage([finLine({ qty: 2 }), finOtherLine]);
    await openFinSheet("the order button, with an unfinished line staged");
    // The verdict needs the venue's record, fetched after the sheet opened.
    await untilPresent(async () => await driver.evalPage(`!!document.querySelector("dialog.order-sheet .order-line.is-unfinished")`), {
      label: "the unfinished line to be flagged (the record is fetched off a non-menu page)",
    });
    let fin = await driver.evalPage(sheetFin);
    const bad = fin.lines.find((l) => l.name === REQ_DISH);
    const ok = fin.lines.find((l) => l.name === finOther.name);
    report.check(
      "(aa) a line missing a compulsory choice is ON the sheet, flagged, and says what it needs in WORDS",
      !!bad && bad.unfinished && /^⚠️?\s*Needs a choice: Sauce$/.test(bad.warn || ""),
      JSON.stringify(bad),
    );
    report.check(
      "(aa) …while a complete line beside it carries no warning at all",
      !!ok && !ok.unfinished && ok.warn === null,
      JSON.stringify(ok),
    );
    report.check(
      "(aa) an unfinished line can be lowered but not GROWN: − and the count, no ＋ (ADR 0156 §4)",
      !!bad && bad.buttons.join() === "−" && bad.count === "2",
      JSON.stringify(bad),
    );
    const naive = finDishDef.price * 2 + finOther.price;
    report.check(
      "(aa) the unfinished line's price is a floor (\"+\"), never the base dish priced as if complete",
      !!bad && bad.price.startsWith(money(finDishDef.price * 2)) && bad.price.includes("+"),
      JSON.stringify(bad?.price),
    );
    report.check(
      "(aa) the TOTAL says it is short — a \"+\" and a sentence — rather than pricing the dish at its base",
      fin.total === `${money(naive)}+` && /1 dish still needs a choice, so this total is short/.test(fin.note || ""),
      JSON.stringify({ total: fin.total, note: fin.note }),
    );

    // Open the finish control.
    await driver.click("dialog.order-sheet .order-finish-open");
    fin = await driver.evalPage(sheetFin);
    const sg = fin.form?.groups?.[0];
    report.check(
      "(aa) the finish control is the picker's own question: Sauce, required, three options, NO None, nothing pre-selected",
      fin.form?.groups?.length === 1 && sg.name === REQ_GROUP && /required/i.test(sg.rule) && sg.radios === 3 &&
        !sg.options.includes("None") && sg.checked.length === 0,
      JSON.stringify(fin.form?.groups),
    );
    report.check(
      "(aa) …focus moves INTO it, to the first sauce (not left on the button that vanished)",
      fin.focus?.type === "radio" && fin.focus?.value === "Sweet & sour sauce" && fin.focus?.inSheet === true,
      JSON.stringify(fin.focus),
    );
    report.check(
      "(aa) …Finish waits (aria-disabled), says why in words, and a quantity of 2 is told the choice covers both",
      fin.form?.doneDisabled === "true" && /choose one under .*Sauce/.test(fin.form?.need || "") && /all 2/.test(fin.form?.hint || ""),
      JSON.stringify({ done: fin.form?.doneDisabled, need: fin.form?.need, hint: fin.form?.hint }),
    );
    report.check(
      "(aa) …every target is at least 44 px tall, and the sheet does not scroll sideways at 390 px",
      fin.form.doneBox.h >= 44 && fin.form.cancelBox.h >= 44 && fin.form.radioRows.every((h) => h >= 44) && !fin.hOverflow,
      JSON.stringify({ done: fin.form.doneBox, cancel: fin.form.cancelBox, rows: fin.form.radioRows, overflow: fin.hOverflow }),
    );
    // A blocked Finish changes nothing and takes the reader to the question.
    const before = JSON.stringify(await driver.evalPage(storedExpr));
    await driver.click("dialog.order-sheet .order-finish-done");
    fin = await driver.evalPage(sheetFin);
    report.check(
      "(aa) a tap on the blocked Finish changes NOTHING in the order and puts focus on the first unanswered radio",
      JSON.stringify(await driver.evalPage(storedExpr)) === before && fin.focus?.type === "radio" && fin.open,
      JSON.stringify({ focus: fin.focus }),
    );

    // Choose the satay sauce: the SAME sentence the menu gave, before committing.
    await driver.click("dialog.order-sheet .addon-option", REQ_OPTION);
    fin = await driver.evalPage(sheetFin);
    report.check(
      "(aa) choosing shows the allergen sentence BEFORE committing — word for word what the MENU picker said, flagged the same",
      fin.form.warnText === menuSaid.warnText && fin.form.warnHidden === false && fin.form.warnFlagged === true,
      JSON.stringify({ sheet: fin.form.warnText, menu: menuSaid.warnText, flagged: fin.form.warnFlagged }),
    );
    report.check(
      "(aa) …and Finish is live now",
      fin.form.doneDisabled === "false" && fin.form.need === null,
      JSON.stringify({ done: fin.form.doneDisabled, need: fin.form.need }),
    );
    // Not now: back to the opener, focus on it, nothing changed.
    await driver.click("dialog.order-sheet .order-finish-cancel");
    fin = await driver.evalPage(sheetFin);
    report.check(
      "(aa) \"Not now\" closes the control, changes nothing, and returns focus to the button that opened it",
      !fin.open && fin.focus?.cls === "order-finish-open" && JSON.stringify(await driver.evalPage(storedExpr)) === before,
      JSON.stringify(fin.focus),
    );

    // Finish for real.
    await driver.click("dialog.order-sheet .order-finish-open");
    await driver.click("dialog.order-sheet .addon-option", REQ_OPTION);
    await driver.click("dialog.order-sheet .order-finish-done");
    fin = await driver.evalPage(sheetFin);
    let st = await driver.evalPage(storedExpr);
    const done = st.find((l) => l.name === REQ_DISH);
    report.check(
      "(aa) FINISH: the stored line now carries the sauce, the same quantity, and the price moved by exactly the sauce's cost",
      st.length === 2 && done?.qty === 2 && done.options?.length === 1 && done.options[0].id === "satay-sauce" &&
        Math.abs(done.price - (finDishDef.price + FIN_SAUCE_COST)) < 1e-9,
      JSON.stringify(st.map((l) => [l.name, l.qty, l.price, (l.options || []).map((o) => o.name)])),
    );
    const now = fin.lines.find((l) => l.name === REQ_DISH);
    report.check(
      "(aa) …the warning is GONE and the line reads its sauce like any configured line, with − and ＋ back",
      !!now && !now.unfinished && now.warn === null && now.config === REQ_OPTION && now.buttons.join() === "−,＋",
      JSON.stringify(now),
    );
    const finished = (finDishDef.price + FIN_SAUCE_COST) * 2 + finOther.price;
    report.check(
      "(aa) …the total is exact again (no \"+\", no sentence) and equals the sum of the real lines",
      fin.total === money(finished) && fin.note === null,
      JSON.stringify({ total: fin.total, note: fin.note, want: money(finished) }),
    );
    report.check(
      "(aa) …and focus lands on the finished line's note button, not on <body>",
      fin.focus?.cls === "order-note-btn" && fin.focus?.line === REQ_DISH,
      JSON.stringify(fin.focus),
    );

    // The MERGE: finishing onto a line that is already the finished one.
    await stage([finLine({ qty: 1 }), finLine({ qty: 2, price: finDishDef.price + FIN_SAUCE_COST, options: [finSatay] })]);
    await openFinSheet("the order button, for the merge case");
    await untilPresent(async () => await driver.evalPage(`!!document.querySelector("dialog.order-sheet .order-line.is-unfinished")`), {
      label: "the unfinished line to be flagged (merge case)",
    });
    await driver.click("dialog.order-sheet .order-finish-open");
    await driver.click("dialog.order-sheet .addon-option", REQ_OPTION);
    await driver.click("dialog.order-sheet .order-finish-done");
    st = await driver.evalPage(storedExpr);
    fin = await driver.evalPage(sheetFin);
    report.check(
      "(aa) MERGE: finishing a line identical to an existing finished one makes ONE line of the summed quantity (1 + 2 = 3)",
      st.length === 1 && st[0].qty === 3 && st[0].options?.[0]?.id === "satay-sauce" &&
        Math.abs(st[0].price - (finDishDef.price + FIN_SAUCE_COST)) < 1e-9,
      JSON.stringify(st.map((l) => [l.name, l.qty, l.price, (l.options || []).map((o) => o.name)])),
    );
    report.check(
      "(aa) …the sheet shows that one line, warning-free, with focus still on its note button",
      fin.lines.length === 1 && fin.lines[0].count === "3" && !fin.lines[0].unfinished && fin.focus?.cls === "order-note-btn",
      JSON.stringify({ lines: fin.lines, focus: fin.focus }),
    );

    // A venue whose choice is FREE: nothing for the total to be short by.
    // (The real record: all three sauces cost nothing.)
    await stage([{ ...finLine({ venueId: REQ_VENUE, qty: 1 }) }]);
    await openAt(`http://127.0.0.1:${port}/restaurant.html?id=${REQ_VENUE}`, dishSel(REQ_DISH), `${REQ_VENUE} for the free-choice case`);
    await openSheet();
    await untilPresent(async () => await driver.evalPage(`!!document.querySelector("dialog.order-sheet .order-line.is-unfinished")`), {
      label: "the unfinished line to be flagged on a MENU page (record handed over by the page)",
    });
    fin = await driver.evalPage(sheetFin);
    report.check(
      "(aa) a line is flagged on a menu page too, and when every option is FREE the total is not called short",
      fin.lines[0]?.unfinished === true && !fin.total.endsWith("+") && /still needs a choice\. Finish it above/.test(fin.note || "") &&
        !/short/.test(fin.note || ""),
      JSON.stringify({ total: fin.total, note: fin.note, price: fin.lines[0]?.price }),
    );

    // RECALL lands the line, flagged, instead of dropping it (the owner's ruling).
    await driver.evalPage(`localStorage.removeItem("faves.order.v1");
      localStorage.setItem(${JSON.stringify(SAVED_KEY)}, ${JSON.stringify(JSON.stringify([
        {
          id: "usual-1",
          venueId: REQ_VENUE,
          venueName: reqVenue.name,
          name: "My usual",
          lines: [{ dishId: finDishDef.dishId, name: REQ_DISH, qty: 1, price: finDishDef.price, currency: "NZD" }],
        },
      ]))}); true`);
    await openAt(`http://127.0.0.1:${port}/restaurant.html?id=${REQ_VENUE}`, dishSel(REQ_DISH), `${REQ_VENUE} for the recall`);
    await driver.click(".saved-orders .saved-add");
    const rc = await driver.evalPage(panelExpr);
    st = await driver.evalPage(storedExpr);
    report.check(
      "(aa) RECALL lands a saved line that lacks the now-compulsory choice — on the order, not dropped",
      st.length === 1 && st[0].dishId === finDishDef.dishId && (st[0].options || []).length === 0,
      JSON.stringify(st.map((l) => [l.name, l.qty, (l.options || []).length])),
    );
    report.check(
      "(aa) …and the recall says so in words (not \"left out\"), naming the dish and the group",
      /Needs a choice/.test(rc.status) && new RegExp(`${REQ_DISH}.*choose ${REQ_GROUP}`).test(rc.status) && rc.skipped.length === 0,
      JSON.stringify({ status: rc.status, skipped: rc.skipped }),
    );
    await openSheet();
    fin = await driver.evalPage(sheetFin);
    report.check(
      "(aa) …and the sheet flags that recalled line, ready to finish",
      fin.lines[0]?.unfinished === true && /Needs a choice: Sauce/.test(fin.lines[0]?.warn || ""),
      JSON.stringify(fin.lines),
    );
    await driver.evalPage(`localStorage.removeItem(${JSON.stringify(SAVED_KEY)}); localStorage.removeItem("faves.order.v1"); true`);

    // --- (ad) 200/170, ADR 0166: a MINIMUM ORDER and what a price is FOR ------
    // Charley Noble prints "minimum order 3" on its oysters, "Minimum order of 2"
    // on its arancini, and "Per 100g" on two steaks. Before this the stepper
    // started at 1, so the sheet took one oyster and totalled it as though the
    // venue would; and it multiplied a per-100 g price by a count, which is not
    // what two steaks cost. Asserted against the REAL menu and the REAL sheet at
    // 390 px, because the claim spans five modules (the row, the stepper, the
    // store, the live-record join, recall) and a unit test of any one of them
    // passes while the others disagree.
    const CN = "charley-noble";
    const cnUrl = `http://127.0.0.1:${port}/restaurant.html?id=${CN}`;
    const OYSTER = "live-marlborough-oysters-natural";
    const ARANCINI = "arancini";
    const WAGYU = "southern-stations-nz-wagyu-ribeye-on-the-bone";
    const rowOf = (id) => `li.dish[data-dish-id=${JSON.stringify(id)}]`;
    const openCn = async (label) => {
      await cdp.send("Page.navigate", { url: cnUrl }, sessionId);
      await untilPresent(async () => await driver.evalPage(`!!document.querySelector(${JSON.stringify(rowOf(OYSTER))})`), { label });
    };
    const norm1 = (t) => (t || "").replace(/\s+/g, " ").trim();
    const rowExpr = (id) => `(() => {
      const r = document.querySelector(${JSON.stringify(rowOf(id))});
      const t = (sel) => (r.querySelector(sel)?.textContent || "").replace(/\\s+/g, " ").trim();
      return {
        price: t(".dish-price"), min: r.querySelector(".dish-min") ? t(".dish-min") : null,
        buttons: [...r.querySelectorAll(".dish-actions .stepper button")].map((b) => [b.textContent, b.getAttribute("aria-label")]),
        count: r.querySelector(".dish-actions .stepper-count")?.textContent ?? null,
      };
    })()`;
    const sheetAc = `(() => {
      const sheet = document.querySelector("dialog.order-sheet[open]");
      const n = (t) => (t || "").replace(/\\s+/g, " ").trim();
      const q = (e, s) => e.querySelector(s);
      return {
        lines: [...sheet.querySelectorAll("li.order-line")].map((l) => ({
          name: q(l, ".order-line-name")?.firstChild?.textContent ?? null,
          price: n(q(l, ".order-line-price")?.textContent),
          unit: n(q(l, ".order-line-unit")?.textContent) || null,
          min: n(q(l, ".order-line-min")?.textContent) || null,
          short: !!q(l, ".order-line-min.is-short"),
          buttons: [...l.querySelectorAll(".stepper button")].map((b) => b.textContent),
          count: q(l, ".stepper-count")?.textContent ?? null,
        })),
        total: n(q(sheet, ".order-total")?.textContent),
        subtotal: n(q(sheet, ".order-subtotal-amount")?.textContent),
        rules: (() => { const e = q(sheet, ".order-rules-note"); return e && !e.hidden ? n(e.textContent) : null; })(),
        hOverflow: sheet.scrollWidth > sheet.clientWidth,
      };
    })()`;
    const lineAc = (id, over = {}) => ({
      venueId: CN, venueName: "Charley Noble", currency: "NZD", phone: null,
      name: id, dishId: id, price: null, options: [], qty: 1, collected: false, ...over,
    });

    // The rows say it in words, beside the price.
    await driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);
    await openCn(`${CN} to render`);
    let oy = await driver.evalPage(rowExpr(OYSTER));
    const ar = await driver.evalPage(rowExpr(ARANCINI));
    const wg = await driver.evalPage(rowExpr(WAGYU));
    report.check(
      "(ad) a dish with a minimum SAYS so on its row, in words: \"Minimum 3\" (oysters), \"Minimum 2\" (arancini)",
      oy.min === "Minimum 3" && ar.min === "Minimum 2",
      JSON.stringify({ oy: oy.min, ar: ar.min }),
    );
    report.check(
      "(ad) a per-weight dish reads \"$26 per 100 g\" beside its price, and a dish with no unit gets no words after its price",
      wg.price === `${money(26)} per 100 g` && ar.price === money(8.5),
      JSON.stringify({ wagyu: wg.price, arancini: ar.price }),
    );

    // The stepper: Add puts the MINIMUM on the sheet, and nothing goes below it.
    const seen = [];
    const rowCount = async () => (await driver.evalPage(rowExpr(OYSTER))).count;
    await driver.click(`${rowOf(OYSTER)} .dish-actions .stepper-add`);
    seen.push(Number(await rowCount()));
    oy = await driver.evalPage(rowExpr(OYSTER));
    st = await driver.evalPage(storedExpr);
    report.check(
      "(ad) ＋ Add on \"minimum order 3\" puts THREE on the order, not one",
      st.length === 1 && st[0].qty === 3 && seen[0] === 3,
      JSON.stringify(st.map((l) => [l.name, l.qty])),
    );
    report.check(
      "(ad) …at the minimum the − becomes ✕ and SAYS it removes the line (the minimum is 3), never a silent \"one fewer\"",
      oy.buttons[0][0] === "✕" && /^Remove .* from your order — the minimum is 3$/.test(oy.buttons[0][1]) && /^One more /.test(oy.buttons[1][1]),
      JSON.stringify(oy.buttons),
    );
    await driver.click(`${rowOf(OYSTER)} .dish-actions .stepper-btn`, "＋");
    seen.push(Number(await rowCount()));
    await driver.click(`${rowOf(OYSTER)} .dish-actions .stepper-btn`, "−");
    seen.push(Number(await rowCount()));
    report.check(
      "(ad) ＋ goes 3 → 4 and − comes back 4 → 3 (above the minimum it is an ordinary − again)",
      seen.join() === "3,4,3",
      seen.join(),
    );
    await driver.click(`${rowOf(OYSTER)} .dish-actions .stepper-btn`, "✕");
    st = await driver.evalPage(storedExpr);
    oy = await driver.evalPage(rowExpr(OYSTER));
    report.check(
      "(ad) the ✕ at the minimum takes the line OFF (0, never 2 or 1), and the row is back to ＋ Add",
      st.length === 0 && oy.buttons.length === 1 && oy.buttons[0][0] === "＋ Add",
      JSON.stringify({ stored: st.length, buttons: oy.buttons }),
    );
    await driver.click(`${rowOf(ARANCINI)} .dish-actions .stepper-add`);
    st = await driver.evalPage(storedExpr);
    report.check(
      "(ad) the minimum is per dish: arancini start at 2, and carry their price (8.5) on the line",
      st.length === 1 && st[0].qty === 2 && st[0].price === 8.5 && !("minQty" in st[0]),
      JSON.stringify(st.map((l) => [l.name, l.qty, l.price, "minQty" in l])),
    );

    // The sheet: a line SHORT of its minimum (it predates the rule, or came in a
    // link) is flagged in words and raised by one press of ＋; the total says so.
    await stage([lineAc(OYSTER, { name: "Live Marlborough Oysters — Natural", qty: 1 }), lineAc(ARANCINI, { name: "Arancini", price: 8.5, qty: 2 })]);
    await openCn(`${CN} for the short-line case`);
    await openSheet();
    await untilPresent(async () => (await driver.evalPage(sheetAc)).lines.some((l) => l.short), { label: "the short line to be flagged" });
    let sh = await driver.evalPage(sheetAc);
    const short = sh.lines.find((l) => /Oysters/.test(l.name || ""));
    report.check(
      "(ad) a line BELOW its minimum is flagged on the sheet in words: \"Minimum 3 — 2 short\"",
      !!short && short.short && /Minimum 3 — 2 short/.test(short.min || ""),
      JSON.stringify(short),
    );
    report.check(
      "(ad) …and the sheet's total says one dish is below the minimum, rather than total it as though nothing were wrong",
      /1 dish is below the minimum order/.test(sh.rules || ""),
      JSON.stringify(sh.rules),
    );
    report.check(
      "(ad) …a line AT its minimum carries \"Minimum 2\" quietly, and no warning",
      sh.lines.find((l) => l.name === "Arancini")?.min === "Minimum 2" && !sh.lines.find((l) => l.name === "Arancini").short,
      JSON.stringify(sh.lines.find((l) => l.name === "Arancini")),
    );
    await driver.click(`dialog.order-sheet li.order-line .stepper-btn`, "＋");
    sh = await driver.evalPage(sheetAc);
    st = await driver.evalPage(storedExpr);
    report.check(
      "(ad) one press of ＋ on the short line raises it TO the minimum (1 → 3, not 2), and the warning goes",
      st.find((l) => /Oysters/.test(l.name))?.qty === 3 && !sh.lines.some((l) => l.short) && sh.rules === null,
      JSON.stringify({ stored: st.map((l) => [l.name, l.qty]), rules: sh.rules }),
    );

    // Per weight: shown at its unit price, NOT totalled.
    await stage([
      lineAc(WAGYU, { name: "Southern Stations NZ Wagyu Ribeye on the Bone", price: 26, qty: 2 }),
      lineAc(ARANCINI, { name: "Arancini", price: 8.5, qty: 2 }),
    ]);
    await openCn(`${CN} for the per-weight case`);
    await openSheet();
    await untilPresent(async () => (await driver.evalPage(sheetAc)).lines.some((l) => l.unit && /100 g/.test(l.unit)), { label: "the per-weight line's unit" });
    sh = await driver.evalPage(sheetAc);
    const wgl = sh.lines.find((l) => /Wagyu/.test(l.name || ""));
    report.check(
      "(ad) a per-weight line shows its UNIT price and says it is not in the total — it shows no total of its own",
      !!wgl && wgl.unit === `${money(26)} per 100 g — priced by weight, so not in the total` && wgl.price === "—",
      JSON.stringify(wgl),
    );
    report.check(
      "(ad) the venue subtotal and the TOTAL leave it out (arancini 2 × 8.50 = 17.00) and carry the \"+\" — never 17 + 2 × 26",
      sh.total === `${money(17)}+` && sh.subtotal === `${money(17)}+` && !sh.total.includes(money(69)),
      JSON.stringify({ total: sh.total, subtotal: sh.subtotal }),
    );
    report.check(
      "(ad) …and a sentence under the total says one dish priced by weight is not in it",
      /1 dish priced by weight isn't in this total/.test(sh.rules || ""),
      JSON.stringify(sh.rules),
    );
    report.check(
      "(ad) …without the sheet scrolling sideways at 390 px",
      !sh.hOverflow,
      String(sh.hOverflow),
    );

    // RECALL: a saved order under today's minimum is raised, said, and not dropped.
    await driver.evalPage(`localStorage.removeItem("faves.order.v1");
      localStorage.setItem(${JSON.stringify(SAVED_KEY)}, ${JSON.stringify(JSON.stringify([
        {
          id: "usual-ac",
          venueId: CN,
          venueName: "Charley Noble",
          name: "Oysters usual",
          lines: [{ dishId: OYSTER, name: "Live Marlborough Oysters — Natural", qty: 1, price: null, currency: "NZD" }],
        },
      ]))}); true`);
    await openCn(`${CN} for the recall`);
    await driver.click(".saved-orders .saved-add");
    const rcAc = await driver.evalPage(panelExpr);
    st = await driver.evalPage(storedExpr);
    report.check(
      "(ad) RECALL of a saved 1 oyster lands THREE (the minimum), not dropped and not left short",
      st.length === 1 && st[0].dishId === OYSTER && st[0].qty === 3,
      JSON.stringify(st.map((l) => [l.name, l.qty])),
    );
    report.check(
      "(ad) …and the recall says so in words: \"Raised to the minimum order\", naming the dish and both numbers",
      /Raised to the minimum order/.test(rcAc.status) && /minimum order is 3, so 1 is now 3/.test(rcAc.status) && rcAc.skipped.length === 0,
      JSON.stringify({ status: rcAc.status, skipped: rcAc.skipped }),
    );
    await driver.evalPage(`localStorage.removeItem(${JSON.stringify(SAVED_KEY)}); localStorage.removeItem("faves.order.v1"); true`);

    }

    {
    // --- (ac) 200/140, ADR 0163: how many a group asks for, and what extras cost --
    // Owner-ruled 2026-10-03: a pick-many group may FORCE a number of picks, and may
    // allow more than an allowance at a fee. Three claims no unit test can see, each
    // failing alone:
    //   1. a group under its `min` blocks Add - on the picker AND on the row, in
    //      words, exactly as a required pick-one group does (block z), and lifts
    //      the moment the minimum is met - and goes BACK if the reader unticks;
    //   2. the fee shows on the order line beyond the allowance and never within it,
    //      and the picker says so in words as it starts to apply;
    //   3. a group with NONE of the new fields is exactly what it was: the same
    //      legend, no fee note, Add not gated, no fee on the line (the control).
    const acMoney = (n) => formatMoney(n, "NZD");
    const pickExpr = (liSel, groupName) => `(() => {
      const dish = ${need(liSel)};
      const box = ${need(".dish-addons", "dish")};
      const f = [...box.querySelectorAll("fieldset.addon-group")]
        .find((x) => x.querySelector(".addon-group-name")?.textContent === ${JSON.stringify(groupName)});
      const pick = box.querySelector(".addon-stepper .stepper-add");
      const row = dish.querySelector(".dish-actions .stepper-add");
      const needEl = box.querySelector(".addon-need");
      const fee = f ? f.querySelector(".addon-fee-note") : null;
      const warn = box.querySelector(".addon-warning");
      const a = document.activeElement;
      return {
        open: box.open,
        found: !!f,
        rule: f ? (f.querySelector(".addon-rule") || {}).textContent ?? null : null,
        boxes: f ? f.querySelectorAll("input[type=checkbox]").length : 0,
        radios: f ? f.querySelectorAll("input[type=radio]").length : 0,
        checked: f ? [...f.querySelectorAll("input:checked")].map((i) => i.value) : [],
        pickAdd: pick ? { disabled: pick.getAttribute("aria-disabled"), label: pick.getAttribute("aria-label") } : null,
        rowAdd: row ? { disabled: row.getAttribute("aria-disabled"), label: row.getAttribute("aria-label") } : null,
        needText: needEl && !needEl.hidden ? needEl.textContent : null,
        feeNote: fee && !fee.hidden ? fee.textContent : null,
        feeNoteCount: box.querySelectorAll(".addon-fee-note").length,
        warnText: warn && !warn.hidden ? warn.textContent : "",
        chip: !!box.querySelector(".addon-summary-need"),
        focus: a && a.closest("li.dish") === dish ? { tag: a.tagName, type: a.type || null, value: a.value || null } : null,
      };
    })()`;
    const clearOrder = () => driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);

    // ---- 1. a REAL minimum: Charley Noble's "Choose two" -------------------
    const minUrl = `http://127.0.0.1:${port}/restaurant.html?id=${MIN_VENUE}`;
    const minDish = dishSel(MIN_DISH);
    await clearOrder();
    await openAt(minUrl, minDish, `${MIN_VENUE} to render ${MIN_DISH}`);
    let pk = await driver.evalPage(pickExpr(minDish, MIN_GROUP_NAME));
    report.check(
      "(ac) a pick-many group with min 2 / max 2 says \"Required - choose 2\" in words, as 3 checkboxes (no radios, no None)",
      pk.found && pk.rule === "Required — choose 2" && pk.boxes === 3 && pk.radios === 0 && pk.checked.length === 0,
      JSON.stringify({ rule: pk.rule, boxes: pk.boxes, radios: pk.radios, checked: pk.checked }),
    );
    report.check(
      "(ac) …and Add waits on the picker AND the row, each saying how many in its label (the 0156 mechanism, not a second one)",
      pk.pickAdd?.disabled === "true" && pk.rowAdd?.disabled === "true" &&
        /choose 2 under .Choose two. first/.test(pk.pickAdd?.label || "") && /choose 2 under .Choose two. first/.test(pk.rowAdd?.label || "") &&
        pk.chip,
      JSON.stringify({ picker: pk.pickAdd, row: pk.rowAdd, chip: pk.chip }),
    );
    await driver.click(`${minDish} .dish-actions .stepper-add`); // blocked: opens + focuses the first box
    pk = await driver.evalPage(pickExpr(minDish, MIN_GROUP_NAME));
    report.check(
      "(ac) a tap on the blocked row Add orders NOTHING, opens the picker and puts focus on the first checkbox",
      (await driver.evalPage(storedExpr)).length === 0 && pk.open && pk.focus?.type === "checkbox" && /choose 2 under/.test(pk.needText || ""),
      JSON.stringify({ open: pk.open, focus: pk.focus, need: pk.needText }),
    );
    await driver.click(`${minDish} .addon-option`, "Brie de Moutere");
    pk = await driver.evalPage(pickExpr(minDish, MIN_GROUP_NAME));
    report.check(
      "(ac) ONE of two is still blocked, and the words say 1 more",
      pk.pickAdd?.disabled === "true" && pk.rowAdd?.disabled === "true" && /choose 1 more under/.test(pk.needText || ""),
      JSON.stringify({ picker: pk.pickAdd?.disabled, row: pk.rowAdd?.disabled, need: pk.needText }),
    );
    await driver.click(`${minDish} .addon-option`, "Goat's Blue");
    pk = await driver.evalPage(pickExpr(minDish, MIN_GROUP_NAME));
    report.check(
      "(ac) TWO lifts the gate on both Adds and clears the reason",
      pk.pickAdd?.disabled !== "true" && pk.rowAdd?.disabled !== "true" && pk.needText === null && !pk.chip,
      JSON.stringify({ picker: pk.pickAdd, row: pk.rowAdd, need: pk.needText, chip: pk.chip }),
    );
    await driver.click(`${minDish} .addon-option`, "Barry's Bay Extra Mature Cheddar");
    pk = await driver.evalPage(pickExpr(minDish, MIN_GROUP_NAME));
    report.check(
      "(ac) a THIRD is refused by the cap (max 2): still exactly two ticked, and the refusal is in words",
      pk.checked.length === 2 && !pk.checked.includes("Barry's Bay Extra Mature Cheddar") && /Choose two: choose up to 2\./.test(pk.warnText),
      JSON.stringify({ checked: pk.checked, warn: pk.warnText }),
    );
    // Untick one: the gate must come BACK, or a dish could be added short.
    await driver.click(`${minDish} .addon-option`, "Goat's Blue");
    pk = await driver.evalPage(pickExpr(minDish, MIN_GROUP_NAME));
    report.check(
      "(ac) UNTICKING back under the minimum puts the gate back - the dish cannot be added short",
      pk.pickAdd?.disabled === "true" && pk.rowAdd?.disabled === "true" && /choose 1 more under/.test(pk.needText || ""),
      JSON.stringify({ picker: pk.pickAdd?.disabled, row: pk.rowAdd?.disabled, need: pk.needText }),
    );
    await driver.click(`${minDish} .addon-option`, "Goat's Blue");
    await driver.click(`${minDish} .addon-stepper .stepper-add`);
    let acSt = await driver.evalPage(storedExpr);
    report.check(
      "(ac) Add with the minimum met records the line WITH both cheeses, at the dish's own price (the cheeses are free)",
      acSt.length === 1 && acSt[0].qty === 1 && (acSt[0].options || []).map((o) => o.name).sort().join("|") === "Brie de Moutere|Goat's Blue" &&
        acSt[0].price === 24,
      JSON.stringify(acSt.map((l) => [l.name, l.qty, l.price, (l.options || []).map((o) => o.name)])),
    );

    // ---- the sheet: a stored line short of the minimum is flagged and finished THERE
    await clearOrder();
    const briePick = { group: "cheese-two", id: "brie-de-moutere", name: "Brie de Moutere", price: 0 };
    const minRec = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${MIN_VENUE}.json`), "utf8"));
    const minDef = minRec.menu.flatMap((x) => x.items).find((i) => i.name === MIN_DISH);
    await driver.evalPage(`localStorage.setItem("faves.order.v1", ${JSON.stringify(JSON.stringify([{
      venueId: MIN_VENUE, venueName: minRec.name, currency: "NZD", phone: null, name: MIN_DISH, dishId: minDef.dishId,
      price: minDef.price, options: [briePick], qty: 1, collected: false,
    }]))}); true`);
    await openAt(minUrl, minDish, `${MIN_VENUE} for the short-line sheet`);
    await driver.click(".order-fab");
    await untilPresent(async () => await driver.evalPage(`!!document.querySelector("dialog.order-sheet .order-line.is-unfinished")`), {
      label: "a line holding one of two cheeses to be flagged on the sheet",
    });
    const shFlag = await driver.evalPage(`(() => {
      const l = document.querySelector("dialog.order-sheet .order-line.is-unfinished");
      const norm = (t) => (t || "").replace(/\\s+/g, " ").trim();
      return { warn: norm(l.querySelector(".order-line-unfinished")?.textContent), buttons: [...l.querySelectorAll(".stepper button")].map((b) => b.textContent) };
    })()`);
    report.check(
      "(ac) the SHEET flags a line holding one of two cheeses, in words, and it cannot grow",
      /Needs a choice: Choose two/.test(shFlag.warn) && !shFlag.buttons.includes("＋"),
      JSON.stringify(shFlag),
    );
    await driver.click("dialog.order-sheet .order-finish-open");
    const shForm = await driver.evalPage(`(() => {
      const f = document.querySelector("dialog.order-sheet .order-finish-form");
      const g = f.querySelector("fieldset");
      const done = f.querySelector(".order-finish-done");
      return {
        rule: g.querySelector(".addon-rule")?.textContent,
        options: [...g.querySelectorAll(".addon-option-name")].map((n) => n.textContent),
        boxes: g.querySelectorAll("input[type=checkbox]").length,
        doneDisabled: done.getAttribute("aria-disabled"),
        need: (f.querySelector(".addon-need") || {}).textContent || null,
      };
    })()`);
    report.check(
      "(ac) the finish control asks for the ONE more: checkboxes, the cheese already held is not offered twice, Finish waits",
      shForm.rule === "Required — choose 1 more" && shForm.boxes === 2 && !shForm.options.includes("Brie de Moutere") &&
        shForm.doneDisabled === "true" && /choose 1 more under/.test(shForm.need || ""),
      JSON.stringify(shForm),
    );
    await driver.click("dialog.order-sheet .addon-option", "Goat's Blue");
    await driver.click("dialog.order-sheet .order-finish-done");
    acSt = await driver.evalPage(storedExpr);
    report.check(
      "(ac) FINISH: the stored line now holds BOTH cheeses (the one it had, plus the one chosen), same quantity, same price",
      acSt.length === 1 && acSt[0].qty === 1 && (acSt[0].options || []).map((o) => o.name).sort().join("|") === "Brie de Moutere|Goat's Blue" &&
        acSt[0].price === 24,
      JSON.stringify(acSt.map((l) => [l.name, l.qty, l.price, (l.options || []).map((o) => o.name)])),
    );

    // ---- 2. an allowance then a fee (fixture: the sauces group, 1 included, then $4) ----
    const feeUrl = `http://127.0.0.1:${port}/restaurant.html?id=${FEE_ID}`;
    await clearOrder();
    await cdp.send("Page.navigate", { url: feeUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, { label: `${FEE_ID} to render a dish offering add-ons` });
    const feeDishName = await driver.evalPage(`(() => {
      const d = [...document.querySelectorAll("li.dish")].find((x) => x.querySelector(".dish-addons") &&
        [...x.querySelectorAll(".addon-group-name")].some((n) => n.textContent === ${JSON.stringify(group.name)}));
      return d ? d.dataset.name : null;
    })()`);
    if (!feeDishName) throw new Error(`no dish on ${FEE_ID} offers the "${group.name}" group - block (ac) needs one`);
    const feeDish = `li.dish[data-name=${JSON.stringify(feeDishName)}]`;
    await driver.click(`${feeDish} .dish-actions .stepper-add`); // the plain dish: its own price
    const plainLine = (await driver.evalPage(storedExpr))[0];
    await clearOrder();
    await cdp.send("Page.navigate", { url: feeUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, { label: `${FEE_ID} again, empty order` });
    await driver.click(`${feeDish} .dish-addons-summary`);
    const sauceNames = group.options.map((o) => o.name);
    let fk = await driver.evalPage(pickExpr(feeDish, group.name));
    report.check(
      "(ac) the legend says the cap AND the allowance in words: \"Choose up to 3 · 1 included, then $4 each\"",
      fk.rule === `Choose up to ${group.max} · ${FEE_INCLUDED} included, then ${acMoney(FEE_EACH)} each` && fk.feeNote === null,
      JSON.stringify({ rule: fk.rule, note: fk.feeNote }),
    );
    await driver.click(`${feeDish} .addon-option`, sauceNames[0]);
    fk = await driver.evalPage(pickExpr(feeDish, group.name));
    report.check("(ac) WITHIN the allowance the picker says nothing about a fee", fk.feeNote === null, JSON.stringify(fk.feeNote));
    await driver.click(`${feeDish} .addon-stepper .stepper-add`);
    let feeSt = await driver.evalPage(storedExpr);
    report.check(
      "(ac) …and the line is priced at the dish's own price - the first pick is included",
      feeSt.length === 1 && feeSt[0].price === plainLine.price && feeSt[0].options.length === 1,
      JSON.stringify({ line: feeSt.map((l) => [l.price, l.options.length]), plain: plainLine.price }),
    );
    await clearOrder();
    await cdp.send("Page.navigate", { url: feeUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, { label: `${FEE_ID} for the fee line` });
    await driver.click(`${feeDish} .dish-addons-summary`);
    await driver.click(`${feeDish} .addon-option`, sauceNames[0]);
    await driver.click(`${feeDish} .addon-option`, sauceNames[1]);
    fk = await driver.evalPage(pickExpr(feeDish, group.name));
    report.check(
      "(ac) BEYOND the allowance the picker SAYS what it costs, in words: \"1 extra at $4.00 each: +$4.00\"",
      fk.feeNote === `1 extra at ${acMoney(FEE_EACH)} each: +${acMoney(FEE_EACH)} on this dish.`,
      JSON.stringify(fk.feeNote),
    );
    await driver.click(`${feeDish} .addon-stepper .stepper-add`);
    feeSt = await driver.evalPage(storedExpr);
    report.check(
      "(ac) …and the LINE carries it: the dish plus $4 for the one pick beyond the allowance",
      feeSt.length === 1 && feeSt[0].options.length === 2 && Math.abs(feeSt[0].price - (plainLine.price + FEE_EACH)) < 1e-9,
      JSON.stringify({ line: feeSt.map((l) => [l.price, l.options.length]), want: plainLine.price + FEE_EACH }),
    );
    await clearOrder();
    await cdp.send("Page.navigate", { url: feeUrl }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, { label: `${FEE_ID} for the third pick` });
    await driver.click(`${feeDish} .dish-addons-summary`);
    for (const n of sauceNames.slice(0, 3)) await driver.click(`${feeDish} .addon-option`, n);
    fk = await driver.evalPage(pickExpr(feeDish, group.name));
    await driver.click(`${feeDish} .addon-stepper .stepper-add`);
    feeSt = await driver.evalPage(storedExpr);
    report.check(
      "(ac) a THIRD pick (the cap) is two beyond the allowance: +$8, and the note says 2 extra",
      /^2 extra at/.test(fk.feeNote || "") && feeSt.length === 1 && Math.abs(feeSt[0].price - (plainLine.price + 2 * FEE_EACH)) < 1e-9,
      JSON.stringify({ note: fk.feeNote, price: feeSt[0]?.price, want: plainLine.price + 2 * FEE_EACH }),
    );

    // ---- 3. the CONTROL: a group with none of the new fields is what it was ----
    await clearOrder();
    await cdp.send("Page.navigate", { url }, sessionId);
    await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, { label: `${opts.id} for the unchanged-group control` });
    const ctlDishName = await driver.evalPage(`(() => {
      const d = [...document.querySelectorAll("li.dish")].find((x) => x.querySelector(".dish-addons") &&
        [...x.querySelectorAll(".addon-group-name")].some((n) => n.textContent === ${JSON.stringify(group.name)}));
      return d ? d.dataset.name : null;
    })()`);
    const ctlDish = `li.dish[data-name=${JSON.stringify(ctlDishName)}]`;
    await driver.click(`${ctlDish} .dish-addons-summary`);
    let ck = await driver.evalPage(pickExpr(ctlDish, group.name));
    report.check(
      "(ac) CONTROL: a group with none of the new fields reads exactly \"Choose up to 3\", has no fee note, and Add is NOT gated",
      ck.rule === `Choose up to ${group.max}` && ck.feeNoteCount === 0 && ck.pickAdd?.disabled !== "true" && ck.rowAdd?.disabled !== "true" &&
        ck.needText === null && !ck.chip,
      JSON.stringify(ck),
    );
    for (const n of sauceNames.slice(0, group.max)) await driver.click(`${ctlDish} .addon-option`, n);
    await driver.click(`${ctlDish} .addon-stepper .stepper-add`);
    const ctlSt = await driver.evalPage(storedExpr);
    await clearOrder();
    await driver.click(`${ctlDish} .dish-actions .stepper-add`);
    const ctlPlain = (await driver.evalPage(storedExpr))[0];
    report.check(
      "(ac) CONTROL: three free sauces cost nothing - the line is the plain dish's price, no fee anywhere",
      ctlSt.length === 1 && ctlSt[0].options.length === group.max && Math.abs(ctlSt[0].price - ctlPlain.price) < 1e-9,
      JSON.stringify({ line: ctlSt.map((l) => [l.price, l.options.length]), plain: ctlPlain.price }),
    );
    await clearOrder();
    }

    {
    // --- (ae) 200/160, ADR 0168: a swap names what it replaces, and removes nothing --
    // Four claims no unit test can see, each failing alone:
    //   1. the picker's option row says what the swap replaces, in words, in the
    //      label (so it is in the control's accessible name too);
    //   2. the ORDER LINE the kitchen reads says it, on the stored line (so a shared
    //      order, which carries that name, carries it) and on the sheet;
    //   3. THE SAFETY HALF: choosing the swap leaves every `contains-*` the dish had
    //      on the dish row's composed tags and does not blank the warning - a swap
    //      is words only (composition still unions allergens in);
    //   4. the CONTROL: a swap group that states nothing reads exactly as before.
    const adSel = (name) => dishSel(name);
    const adGroup = (liSel, groupName) => `(() => {
      const dish = ${need(liSel)};
      const box = ${need(".dish-addons", "dish")};
      const f = [...box.querySelectorAll("fieldset.addon-group")]
        .find((x) => x.querySelector(".addon-group-name")?.textContent === ${JSON.stringify(groupName)});
      const norm = (t) => (t || "").replace(/\\s+/g, " ").trim();
      const opts = f ? [...f.querySelectorAll("label.addon-option")] : [];
      const replaces = f ? [...f.querySelectorAll(".addon-option-replaces")] : [];
      const warn = box.querySelector(".addon-warning");
      return {
        found: !!f,
        labels: opts.map((l) => norm(l.textContent)),
        replacesVisible: replaces.map((r) => norm(r.textContent) !== "" && r.getBoundingClientRect().height > 0),
        replacesText: replaces.map((r) => norm(r.textContent)),
        tags: (dish.dataset.tags || "").split(" ").filter(Boolean),
        warnText: warn && !warn.hidden ? warn.textContent : "",
      };
    })()`;
    const adClear = () => driver.evalPage(`localStorage.removeItem("faves.order.v1"); true`);

    // ---- the real swap: Hotel Bristol ------------------------------------------
    await adClear();
    const swUrl = `http://127.0.0.1:${port}/restaurant.html?id=${SWAP_VENUE}`;
    const swDish = adSel(SWAP_DISH);
    await openAt(swUrl, swDish, `${SWAP_VENUE} to render ${SWAP_DISH}`);
    await driver.click(`${swDish} .dish-addons-summary`);
    let sw = await driver.evalPage(adGroup(swDish, SWAP_GROUP));
    report.check(
      "(ae) the picker's option row SAYS what the swap replaces, in words: \"No gluten added bun, instead of the milk bun\"",
      sw.found && sw.labels.some((l) => /^No gluten added bun,? instead of the milk bun\b/.test(l)) &&
        sw.replacesText.length === 1 && sw.replacesText[0].replace(/^,\s*/, "") === SWAP_WORDS && sw.replacesVisible[0] === true,
      JSON.stringify({ labels: sw.labels, replaces: sw.replacesText }),
    );
    const adTagsBefore = sw.tags;
    const adGluten = adTagsBefore.filter((t) => t.startsWith("contains-"));
    await driver.click(`${swDish} .addon-option`, SWAP_GROUP);
    sw = await driver.evalPage(adGroup(swDish, SWAP_GROUP));
    report.check(
      "(ae) SAFETY: choosing the swap leaves EVERY contains-* the dish carried on its composed tags (words only - nothing is removed)",
      adGluten.length >= 2 && adGluten.every((t) => sw.tags.includes(t)),
      JSON.stringify({ before: adGluten, after: sw.tags.filter((t) => t.startsWith("contains-")) }),
    );
    await driver.click(`${swDish} .addon-stepper .stepper-add`);
    const swSt = await driver.evalPage(storedExpr);
    report.check(
      "(ae) the stored LINE names what it replaces - and keeps the option's id, so it keys exactly as before",
      swSt.length === 1 && swSt[0].options.length === 1 && swSt[0].options[0].name === SWAP_LINE_NAME &&
        swSt[0].options[0].id === "no-gluten-added-bun" && swSt[0].options[0].group === "no-gluten-added-bun",
      JSON.stringify(swSt.map((l) => l.options)),
    );
    await driver.click(".order-fab");
    await untilPresent(async () => await driver.evalPage(`!!document.querySelector("dialog.order-sheet .order-line")`), {
      label: "the swap line to appear on the sheet",
    });
    const swSheet = await driver.evalPage(`(() => {
      const norm = (t) => (t || "").replace(/\\s+/g, " ").trim();
      return [...document.querySelectorAll("dialog.order-sheet .order-line")].map((l) => ({
        name: norm(l.querySelector(".order-line-name")?.firstChild?.textContent),
        config: norm(l.querySelector(".order-line-config")?.textContent),
      }));
    })()`);
    report.check(
      "(ae) the ORDER SHEET line reads \"Cheeseburger\" then \"No gluten added bun (instead of the milk bun)\" - the kitchen no longer infers it",
      swSheet.length === 1 && swSheet[0].name === SWAP_DISH && swSheet[0].config === SWAP_LINE_NAME,
      JSON.stringify(swSheet),
    );
    await adClear();

    // ---- the control: a swap group that states nothing ---------------------------
    const nsUrl = `http://127.0.0.1:${port}/restaurant.html?id=${NOSWAP_VENUE}`;
    const nsDish = adSel(SWAP_DISH);
    await openAt(nsUrl, nsDish, `${NOSWAP_VENUE} to render ${SWAP_DISH}`);
    await driver.click(`${nsDish} .dish-addons-summary`);
    const ns = await driver.evalPage(adGroup(nsDish, SWAP_GROUP));
    report.check(
      "(ae) CONTROL: a swap group that states nothing reads exactly as before - no replaces words anywhere on its option row",
      // The label list also holds "None" (an optional pick-one group has it), so the swap's own row is found by its name.
      ns.found && ns.labels.some((l) => l.startsWith(SWAP_GROUP)) && ns.replacesText.length === 0 && !ns.labels.some((l) => /instead of/.test(l)),
      JSON.stringify({ labels: ns.labels, replaces: ns.replacesText }),
    );
    await driver.click(`${nsDish} .addon-option`, SWAP_GROUP);
    await driver.click(`${nsDish} .addon-stepper .stepper-add`);
    const nsSt = await driver.evalPage(storedExpr);
    report.check(
      "(ae) CONTROL: …and its line keeps the plain name \"No gluten added bun\"",
      nsSt.length === 1 && nsSt[0].options.length === 1 && nsSt[0].options[0].name === SWAP_GROUP,
      JSON.stringify(nsSt.map((l) => l.options)),
    );
    await adClear();
    }

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
