#!/usr/bin/env node
// Faves fixture check — the degenerate-state fixtures, and the gate that stops
// them drifting away from the real schema.
//
//   node tools/fixture_check.mjs             # both halves
//   node tools/fixture_check.mjs --selftest  # …and prove the schema half refuses
//
// ─── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────
//
// The shipped corpus is uniformly healthy, so a whole class of behaviour ships
// unexercised (roadmap 340/150). `tools/lib/fixtures.mjs` answers that with
// named degenerate states derived from real records. This is the check that
// keeps that library honest — and it has to, because the failure mode of every
// fixture library is the same one: it encodes a shape the product has moved
// past, and then the check standing on it passes against a fiction while
// printing PASS. That is worse than no fixture at all, because the green run is
// read as coverage.
//
// ─── HALF ONE: THE SCHEMA GATE, AND WHY IT IS THE REAL VALIDATOR ─────────────
//
// Every state in `STATES` — not a hand-listed subset, the whole object, so a
// state added tomorrow is gated the day it lands with nothing to remember — is
// built over TWO structurally different real venues, written into a sandbox
// copy of the tree, and put through `python3 tools/validate.py`. The one the
// corpus itself passes through. Zero new ERROR lines, or this fails.
//
// It is deliberately NOT a re-implementation of the schema in JavaScript. A
// second copy of the rules is a rule that can be locally right and globally
// wrong, and this repo has already paid for that shape twice. Shelling out to
// the real gate costs a subprocess and cannot diverge.
//
// It found two faults on its first run, before any of it had been committed:
// the empty-section transform wrote `{id, name}` where the schema says
// `{section, sectionId}`, and the unpriced dish collided on a derived `dishId`.
// NEITHER would have shown up in a browser — the page renders *something* for
// both, and the assertions would have measured it and passed.
//
// TWO SOURCES, on purpose. `tj-katsu` is a seven-branch chain with per-branch
// hours and no top-level `hours` key; `gold-lining-cafe` is a single site with
// top-level hours and a 106-dish menu. A transform that reaches only one of
// those shapes — `unknown-day` is exactly that risk — is caught by the pair and
// invisible to either alone.
//
// `--selftest` is the answer to ADR 0072: a gate whose output is the same
// whether or not the thing it guards is broken is decorative. It breaks each
// fixture in a specific way and demands validate.py name that fixture. One of
// its cases is the UNMUTATED set, so a gate mangled into refusing everything
// cannot pass either.
//
// ─── HALF TWO: THE BROWSER, BECAUSE A VALID FIXTURE NOBODY SERVES IS NOTHING ─
//
// A fixture that validates and is never rendered proves only that the JSON is
// well formed. So each state is also SERVED — through `startServer`'s overlay,
// one HTTP GET of one venue JSON, exactly what the browser does in life — and
// the rendered page is asserted.
//
// Every assertion here is PAIRED WITH A CONTROL, because the degenerate half
// alone is satisfiable by a page that rendered nothing:
//   · the empty section's heading is present with zero rows AND another
//     section on the same page still has rows;
//   · the unpriced dish's cell reads "—" AND a priced dish on the same page
//     still reads its money (so "$null", "$NaN" and "$0.00" all fail, and so
//     does a page whose prices all vanished);
//   · the two closure states produce banners that DIFFER from each other (a
//     formatter that printed one string for both passes a naive `includes`).
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU. It cannot tell you the states below
// are the ones that matter — they are the ones the schema can hold and the
// corpus does not, which is a different claim. It cannot tell you a reader
// understands an empty section or a "—" price; that needs a person. And it says
// nothing about the states nobody has thought of, which is the standing
// consequence 340/150 names and which no check can retire.
//
// NOT PART OF THE SHIPPED SITE. Dev tooling. No npm install, no dependency
// added to the site (ADR 0001). Nothing here is ever written into `site/data/`
// — a venue file there is precached onto every phone (ADR 0047).

import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
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
import { STATES, STATE_NAMES, buildFixture, buildFixtures, readVenue } from "./lib/fixtures.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// See the header: two shapes that fail differently.
const SOURCES = ["tj-katsu", "gold-lining-cafe"];

// The fixtures the BROWSER half drives. tj-katsu throughout, so one page's
// worth of real menu, real branches and real hours sits under every assertion.
const BROWSER_SPECS = [
  { from: "tj-katsu", states: ["permanently-closed"] },
  { from: "tj-katsu", states: ["temporarily-closed"] },
  { from: "tj-katsu", states: ["no-hours-anywhere"] },
  { from: "tj-katsu", states: ["empty-section"] },
  { from: "tj-katsu", states: ["unpriced-dish"] },
];

// The states hours.js can produce. A badge carrying one of these is a claim
// derived from posted hours; on a shut venue there must be none of them.
const HOURS_STATES = new Set(["open", "closed", "closing-soon", "opening-soon", "unknown"]);

// --- the schema gate ---------------------------------------------------------

/** Run the real validate.py inside `work` and return its reported lines. */
function runValidate(work) {
  return new Promise((done, fail) => {
    const p = spawn("python3", ["tools/validate.py"], { cwd: work });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", fail);
    p.on("close", (code) => done({ code, out }));
  });
}

/**
 * A sandbox holding the tools, the whole real dataset, and the three shipped JS
 * modules validate.py reads its tables out of.
 *
 * The JS modules are not optional: `_load_vibes` EXITS rather than returning an
 * empty vocabulary, so omitting one is fatal and not silently permissive. This
 * mirrors `test_validate.py`, which built the same sandbox first.
 */
async function sandbox() {
  const work = await mkdtemp(join(tmpdir(), "faves-fixture-check-"));
  await cp(join(ROOT, "tools"), join(work, "tools"), { recursive: true });
  await cp(join(SITE, "data"), join(work, "site", "data"), { recursive: true });
  for (const mod of ["renames.js", "addons.js", "vibes.js"]) {
    await cp(join(SITE, "js", mod), join(work, "site", "js", mod), { recursive: true });
  }
  return work;
}

/** Write records into the sandbox's dataset and list them in its index. */
async function stage(work, records) {
  const indexPath = join(work, "site", "data", "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const ids = records.map((r) => r.id);
  for (const r of records) {
    await writeFile(
      join(work, "site", "data", "restaurants", `${r.id}.json`),
      JSON.stringify(r, null, 2) + "\n",
    );
  }
  // Listed, so the run is not buried under one "not in index.json" warning per
  // fixture. The sandbox's index is thrown away with the sandbox.
  await writeFile(indexPath, JSON.stringify([...index, ...ids], null, 2) + "\n");
}

const reported = (out) =>
  out.split("\n").filter((l) => l.startsWith("ERROR:") || l.startsWith("warning:"));

/** Build one fixture per state per source. Every state, read off STATES.
 *
 *  A (state, source) pair the source cannot HOLD is skipped and named, not
 *  built: `branch-without-hours` over a single-site venue produces a record
 *  byte-identical to the real one, which validates perfectly and asserts
 *  nothing. See `requires` in fixtures.mjs. */
async function everyFixture(skipped) {
  const records = [];
  for (const from of SOURCES) {
    const real = await readVenue(SITE, from);
    for (const state of STATE_NAMES) {
      if (!STATES[state].requires(real)) {
        skipped.push(`${state} × ${from}`);
        continue;
      }
      records.push(await buildFixture(SITE, { from, states: [state] }));
    }
  }
  // One composed fixture, because composition is the thing a per-state sweep
  // cannot see: two transforms that are each fine and together produce a shape
  // the schema refuses.
  records.push(
    await buildFixture(SITE, {
      from: "tj-katsu",
      states: ["permanently-closed", "no-hours-anywhere", "empty-section", "unpriced-dish"],
    }),
  );
  return records;
}

async function schemaHalf(report) {
  const work = await sandbox();
  try {
    const before = await runValidate(work);
    if (before.code !== 0) {
      // Not our failure to report as a fixture fault: the tree itself does not
      // validate, and every line below would be noise on top of it.
      report.check(
        "the unmutated tree validates, so a new line can only be a fixture's",
        false,
        before.out.trim().split("\n").slice(-6).join("\n        "),
      );
      return;
    }
    const baseline = new Set(reported(before.out));
    report.step(`baseline: clean, ${baseline.size} line(s) subtracted from every case`);

    const skipped = [];
    const records = await everyFixture(skipped);
    for (const s of skipped) report.step(`skipped (the source cannot hold it): ${s}`);
    await stage(work, records);
    const after = await runValidate(work);
    const fresh = reported(after.out).filter((l) => !baseline.has(l));
    const errors = fresh.filter((l) => l.startsWith("ERROR:"));

    report.check(
      `every degenerate state validates against the REAL validate.py ` +
        `(${STATE_NAMES.length} state(s) × ${SOURCES.length} source(s), plus one composed)`,
      errors.length === 0,
      errors.length
        ? errors.slice(0, 8).join("\n        ")
        : `${records.length} fixture(s), 0 new errors, ` +
          `${fresh.length - errors.length} new warning(s)`,
    );

    // Named separately, because "the states are all covered" and "each one
    // validates" fail for different reasons and want different fixes. Reading
    // STATE_NAMES rather than a list here is what makes a new state impossible
    // to add without gating it.
    const covered = new Set(records.flatMap((r) => idStates(r.id)));
    const missing = STATE_NAMES.filter((s) => !covered.has(s));
    report.check(
      "every state in STATES is built and gated, none merely declared",
      missing.length === 0,
      missing.length ? `never built: ${missing.join(", ")}` : STATE_NAMES.join(", "),
    );

    // A fixture that changed nothing about the record is a fixture that proves
    // nothing, and it validates perfectly. This is the mutation-testing lesson
    // from test_validate.py, applied to the other direction — and it fired on
    // its first run, which is how `requires` came to exist.
    const inert = [];
    for (const record of records) {
      const from = SOURCES.find((s) => record.id.startsWith(`${s}-`));
      const real = await readVenue(SITE, from);
      // The id is the one field a fixture ALWAYS changes, so it is normalised
      // away before the comparison — otherwise every fixture differs and this
      // assertion is decorative.
      if (JSON.stringify({ ...record, id: real.id }) === JSON.stringify(real)) {
        inert.push(record.id);
      }
    }
    report.check(
      "…and each one actually CHANGED its source record",
      inert.length === 0,
      inert.length ? `identical to the real record: ${inert.join(", ")}` : `all ${records.length} differ`,
    );

    if (fresh.length - errors.length > 0) {
      report.step(`new warnings (allowed — a degenerate record may well warn):`);
      for (const w of fresh.filter((l) => l.startsWith("warning:")).slice(0, 10)) {
        report.step(`  ${w}`);
      }
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** The states named inside a default fixture id, e.g. `tj-katsu-empty-section-fixture`. */
function idStates(id) {
  return STATE_NAMES.filter((s) => id.includes(s));
}

// --- the self-test: prove the schema gate still refuses ----------------------

/**
 * Each case breaks one fixture in one way that must make validate.py complain,
 * and names THE REGEX ITS OWN NEW COMPLAINT MUST MATCH.
 *
 * The regex is not decoration. The first version of this asserted only that
 * SOME new error mentioning the fixture appeared, and it went green while
 * reporting the *previous* case's error every time — a module-level constant
 * was being aliased into every fixture, so one case's mutation leaked into the
 * next five and satisfied all of them. Every case passed; two of them proved
 * nothing at all. That is `test_validate.py`'s 2026-08-17 lesson arriving here
 * by the same route, so the same remedy is used.
 *
 * `null` mutates nothing — the control, so a gate broken into refusing
 * everything fails here rather than passing the lot.
 */
const SELFTEST = {
  "the unmutated fixtures still pass": [null, null],
  "a closure event with a nonsense date": [
    (r) => {
      r.lifecycle.events[0].date = "sometime in 2016";
    },
    /lifecycle\.events\[0\]: date must be an ISO date/,
  ],
  "a closure event of an unknown type": [
    (r) => {
      r.lifecycle.events[0].type = "closed-forever";
    },
    /lifecycle\.events\[0\]: type must be one of/,
  ],
  "an empty section with no sectionId": [
    (r) => {
      delete r.menu[r.menu.length - 1].sectionId;
    },
    /no sectionId/,
  ],
  "an unpriced dish whose price became a string": [
    (r) => {
      lastDish(r).price = "$0";
    },
    /price for 'Fixture Unpriced Dish' must be a number or null/,
  ],
  "an unpriced dish that lost its name": [
    (r) => {
      delete lastDish(r).name;
    },
    /menu item missing a name/,
  ],
  "a fixture that lost its lifecycle entirely": [
    (r) => {
      delete r.lifecycle;
    },
    /lifecycle is required/,
  ],
  "a fixture carrying a key no screen reads": [
    (r) => {
      r.notAField = true;
    },
    /unknown key 'notAField'/,
  ],
};

const lastDish = (r) => {
  const s = r.menu.find((x) => (x.items || []).some((i) => i.dishId === "fixture-unpriced"));
  return s.items[s.items.length - 1];
};

async function selfTest(report) {
  const work = await sandbox();
  try {
    const before = await runValidate(work);
    const baseline = new Set(reported(before.out));
    for (const [name, [mutate, wanted]] of Object.entries(SELFTEST)) {
      if ((mutate === null) !== (wanted === null)) {
        // A case with a mutation and no regex is the shape that made the first
        // version of this file able to lie about itself. Refuse it outright
        // rather than running it and reporting a pass.
        report.check(`--selftest: ${name} — carries both a mutation and its expected complaint`, false);
        continue;
      }
      const record = await buildFixture(SITE, {
        from: "tj-katsu",
        states: ["permanently-closed", "empty-section", "unpriced-dish"],
      });
      if (mutate) mutate(record);
      await stage(work, [record]);
      const after = await runValidate(work);
      const errors = reported(after.out).filter(
        (l) => !baseline.has(l) && l.startsWith("ERROR:") && l.includes(record.id),
      );
      const ok = wanted === null ? errors.length === 0 : errors.some((l) => wanted.test(l));
      report.check(
        `--selftest: ${name} — validate.py ${wanted ? "REFUSES" : "accepts"} it`,
        ok,
        wanted === null
          ? errors.length
            ? errors.slice(0, 3).join("\n        ")
            : "no new error for this fixture, as it must be"
          : `wanted ${wanted} — got ${errors.length ? `\n        ${errors.slice(0, 3).join("\n        ")}` : "no new error at all"}`,
      );
      await rm(join(work, "site", "data", "restaurants", `${record.id}.json`), { force: true });
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

// --- the browser half --------------------------------------------------------

/** One menu page as a reader sees it, reduced to what these states are about. */
const SNAPSHOT = `(() => {
  const text = (el) => (el ? el.textContent.replace(/\\s+/g, " ").trim() : null);
  const banner = document.querySelector(".venue-closed, .closure, [data-closure]");
  const badges = [...document.querySelectorAll(".hours-badge")].map((b) => ({
    text: text(b),
    state: b.dataset.state ?? null,
  }));
  const sections = [...document.querySelectorAll(".menu-sections > section, .menu-section")].map((s) => ({
    id: s.id || null,
    heading: text(s.querySelector("h2, h3")),
    rows: s.querySelectorAll(".dish, .dish-row, [data-dish-id]").length,
  }));
  const prices = [...document.querySelectorAll("[data-dish-id]")].map((d) => ({
    id: d.dataset.dishId,
    price: text(d.querySelector(".dish-price")),
  }));
  return {
    heading: text(document.querySelector("#venue-name, h1")),
    closureText: text(banner),
    bodyText: document.body.textContent.replace(/\\s+/g, " ").trim(),
    badges,
    sections,
    prices,
  };
})()`;

async function open(driver, base, id) {
  await driver.cdpNavigate(`${base}/restaurant.html?id=${id}`);
  await untilPresent(
    () =>
      driver.evalPage(`(() => {
        const h = document.querySelector("#venue-name, h1");
        return h && h.textContent.trim() ? h.textContent.trim() : null;
      })()`),
    { label: `${id}: the menu page rendered a venue name` },
  );
  return driver.evalPage(SNAPSHOT);
}

async function browserHalf(report, opts) {
  const { records, overlay } = await buildFixtures(SITE, BROWSER_SPECS);
  const { server, port } = await startServer(opts.port, SITE, overlay);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-fixture-check-profile-"));
  let chrome = null;
  let cdp = null;
  const base = `http://127.0.0.1:${port}`;
  try {
    console.log(`  fixtures ${[...records.keys()].join(", ")}`);
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

    const id = (states) => [...records.keys()].find((k) => states.every((s) => k.includes(s)));

    // --- permanently closed: no branch may be given a posted-hours status ----
    // THE ASSERTION THAT WAS CERTIFYING THE WRECK. Before 2026-09-06 the guard
    // meant to cover a shut-down chain passed *"the lead is not a branch we
    // know is closed"* on a permanently-closed one, because with no closed
    // venue in the corpus the rule was never exercised and its vacuous pass
    // read exactly like a real one.
    const shut = await open(driver, base, id(["permanently-closed"]));
    const hoursDerived = shut.badges.filter((b) => HOURS_STATES.has(b.state));
    report.check(
      "a permanently-closed chain: NO branch is given a posted-hours status",
      hoursDerived.length === 0,
      hoursDerived.length
        ? hoursDerived.map((b) => `${b.state}: ${b.text}`).join(" | ")
        : `${shut.badges.length} badge(s) on the card, none of them an hours claim`,
    );
    report.check(
      "…and the closure is SAID, not merely implied by a missing chip",
      /closed/i.test(shut.bodyText),
      `banner ${JSON.stringify(shut.closureText)}, ${shut.badges.length} badge(s)`,
    );
    // The control for the pair above: a shut venue must still be a MENU. A page
    // that failed to render satisfies "no hours chip" perfectly.
    report.check(
      "…and it is still a menu — a shut venue renders its dishes, it does not 404",
      shut.prices.length > 0,
      `${shut.prices.length} dish row(s), heading ${JSON.stringify(shut.heading)}`,
    );

    // --- temporarily closed: a DIFFERENT sentence from the permanent one -----
    const temp = await open(driver, base, id(["temporarily-closed"]));
    report.check(
      "a temporary closure reads differently from a permanent one",
      temp.closureText !== null &&
        shut.closureText !== null &&
        temp.closureText !== shut.closureText,
      `temporary ${JSON.stringify(temp.closureText)} vs permanent ${JSON.stringify(shut.closureText)}`,
    );

    // --- no hours anywhere ---------------------------------------------------
    const noHours = await open(driver, base, id(["no-hours-anywhere"]));
    const claims = noHours.badges.filter((b) => b.state && b.state !== "unknown");
    report.check(
      "a venue with no published hours claims neither open nor closed",
      claims.length === 0,
      claims.length
        ? claims.map((b) => `${b.state}: ${b.text}`).join(" | ")
        : `${noHours.badges.length} badge(s), none asserting a state`,
    );
    report.check(
      "…and it still renders its menu",
      noHours.prices.length > 0,
      `${noHours.prices.length} dish row(s)`,
    );

    // --- an empty section ----------------------------------------------------
    const empty = await open(driver, base, id(["empty-section"]));
    const emptySec = empty.sections.find((s) => s.id === "section-fixture-empty");
    const filled = empty.sections.filter((s) => s.rows > 0);
    report.check(
      "an empty section still gets its heading, and holds no rows",
      !!emptySec && emptySec.rows === 0,
      emptySec
        ? `${JSON.stringify(emptySec.heading)} with ${emptySec.rows} row(s)`
        : `no #section-fixture-empty among ${JSON.stringify(empty.sections.map((s) => s.id))}`,
    );
    // The control. "The empty section has no rows" is satisfied by a page whose
    // sections ALL lost their rows, which is a much worse bug.
    report.check(
      "…while the sections beside it still have theirs",
      filled.length > 0,
      `${filled.length} of ${empty.sections.length} section(s) carry rows`,
    );

    // --- a dish with no price ------------------------------------------------
    const unpriced = await open(driver, base, id(["unpriced-dish"]));
    const row = unpriced.prices.find((p) => p.id === "fixture-unpriced");
    const priced = unpriced.prices.filter((p) => /\d/.test(p.price || ""));
    report.check(
      'a dish with no recorded price renders "—", not a number invented for it',
      !!row && row.price === "—",
      row ? `price cell reads ${JSON.stringify(row.price)}` : "the row was not rendered at all",
    );
    report.check(
      "…while a priced dish on the same page still shows its money",
      priced.length > 0,
      `${priced.length} of ${unpriced.prices.length} row(s) carry a number ` +
        `(e.g. ${JSON.stringify(priced[0]?.price ?? null)})`,
    );
  } finally {
    if (chrome) await stopChrome(chrome.proc ?? chrome, { keepProfile: opts.keepProfile });
    if (cdp) cdp.close?.();
    server.close?.();
  }
}

// --- entry point -------------------------------------------------------------

const HELP = `Faves fixture check — the degenerate-state fixtures, and their schema gate.

  node tools/fixture_check.mjs [options]

Half one builds every state in tools/lib/fixtures.mjs over two structurally
different real venues, writes them into a sandbox copy of the tree, and runs the
REAL tools/validate.py over it. Zero new ERROR lines, or a fixture has drifted
from the schema it is meant to stand in for.

Half two serves those fixtures through startServer's overlay — one HTTP GET of
one venue JSON, exactly what the browser does in life — and asserts what the
page does with a shut chain, a venue with no hours, an empty section and a dish
with no price. Nothing is ever written into site/data/ (ADR 0047).

Options:
  --selftest      Also break each fixture and prove validate.py still refuses.
  --schema-only   Skip the browser half.
  --port <n>      Port for the local static server (default: an unused one).
  --headed        Show the browser window.
  --keep-profile  Leave the temporary Chrome profile behind.
  --verbose, -v   Print every step, not just the assertions.
  -h, --help      This message.
`;

async function run(opts) {
  const report = new Report(opts.verbose);
  console.log("Faves fixture check — the states the corpus does not hold");
  console.log(`  states   ${STATE_NAMES.length}: ${STATE_NAMES.join(", ")}`);
  for (const [name, s] of Object.entries(STATES)) report.step(`${name} — ${s.summary} (${s.absent})`);
  await schemaHalf(report);
  if (opts.selftest) await selfTest(report);
  if (!opts.schemaOnly) await browserHalf(report, opts);
  return report.summary(SITE);
}

const { values } = parseArgs({
  options: {
    selftest: { type: "boolean", default: false },
    "schema-only": { type: "boolean", default: false },
    port: { type: "string", default: "0" },
    headed: { type: "boolean", default: false },
    "keep-profile": { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

process.exit(
  (await run({
    ...values,
    schemaOnly: values["schema-only"],
    keepProfile: values["keep-profile"],
    port: Number(values.port),
  }).catch(exitFromError))
    ? 0
    : 1,
);
