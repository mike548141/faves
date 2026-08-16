// Faves branch check — the branch picker on a chain's menu page, in a real
// browser at 390 px. Fourth of the family after device_check, cook_check and
// addon_check, on the same harness (tools/lib/browser.mjs).
//
// WHY THIS EXISTS. Choosing a branch is choosing where your food comes from, and
// the card now makes that choice for you: one branch leads expanded, picked by a
// rule ("nearest, and open"), and the rest are hidden behind one or two taps.
// Three things can go wrong that unit tests cannot see:
//
//   a) the LEAD IS WRONG on screen. locations.leadBranch is unit-tested against
//      a fake oracle; this drives the real one — real hours, real per-branch
//      timezone, real clock — and asserts the rendered lead is not a branch we
//      know to be shut while a known-open one exists.
//   b) a STATUS IS INVENTED. 10 of this corpus's 22 branches carry no hours at
//      all (every McDonald's, every Subway). A card that prints "Open" beside a
//      branch whose hours nobody captured is a lie that sends someone across
//      town. No hours must mean no chip — not a guess, not a blank "Closed".
//   c) the ONE-STEP PROMISE IS BROKEN. The whole point of the redesign is that
//      picking a different branch costs one tap. This asserts a collapsed row
//      really does open on a single real mouse click, and that what it reveals
//      is that branch's own phone and address rather than the lead's.
//
// It also asserts the second step DISAPPEARS where it should: a five-branch
// chain now fits in a lead plus four rows, so "Show all 5 branches" — the
// control in the owner's 2026-08-16 screenshot — should no longer be rendered
// for McDonald's at all.
//
// WHAT A GREEN RUN HERE STILL CANNOT TELL YOU. It cannot tell you the hours are
// TRUE. A branch marked open at 9pm because our stored hours say so is a claim
// made by whoever transcribed them, and no browser can check it against the
// shop's door. It cannot tell you the distance dial behaves on a real phone —
// there is no captured location in a fresh profile, so the dial is untested here
// and lives in the unit tests instead. And it cannot tell you a reader
// understands that the collapsed rows are tappable; that needs a person.
//
// TIME-INDEPENDENCE IS DELIBERATE. Every assertion below holds at any hour. A
// check that passes at 1pm and fails at 1am would be worse than none: it would
// be switched off within a week.
//
// NOT PART OF THE SHIPPED SITE. Dev tooling, like tools/serve.py — no npm
// install, no dependency added to the site (ADR 0001). Fresh Chrome profile per
// run, because a stale service worker will happily serve the last run's modules
// and a hard reload does not bust it.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Cdp, Report, createDriver, launchChrome, startServer, stopChrome, until } from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// Two shapes, both real, chosen because they fail differently.
//   tj-katsu   7 branches, ALL with hours → exercises the openness rule and is
//              the only venue left that still needs the second step.
//   mcdonalds  5 branches, NONE with hours → exercises the honesty rule, and is
//              the venue in the screenshot that prompted the redesign.
const VENUES = ["tj-katsu", "mcdonalds"];
const NEAR_LIMIT = 4; // must match locations.NEAR_BRANCH_LIMIT

const HELP = `Faves branch check — verify the branch picker in a real browser.

  node tools/branch_check.mjs [options]

Serves site/ locally, launches Google Chrome headless on a throwaway profile at
390 px, and opens each multi-branch venue's menu page. Asserts one branch leads
expanded, that the lead is never a known-closed branch while a known-open one
exists, that a branch without hours gets no status chip, that a collapsed row
opens on ONE click and reveals its own contact details, and that the second step
appears only when there are more branches than the card can hold.

Options:
  --id <venue-id>   Check only this venue (default: ${VENUES.join(", ")}).
  --port <n>        Port for the local static server (default: an unused one).
  --headed          Show the browser window.
  --keep-profile    Leave the temporary Chrome profile behind, and say where.
  --verbose         Print every step, not just the assertions.
  -h, --help        This message.

Exit status: 0 all assertions passed; 1 an assertion failed; 2 the harness
itself could not run (no Chrome, port in use, page never rendered).`;

function parseArgs(argv) {
  const opts = { ids: null, port: 0, headed: false, keepProfile: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--id") (opts.ids ||= []).push(argv[++i]);
    else if (a === "--port") opts.port = Number(argv[++i]);
    else if (a === "--headed") opts.headed = true;
    else if (a === "--keep-profile") opts.keepProfile = true;
    else if (a === "--verbose") opts.verbose = true;
    else throw new Error(`unknown option: ${a} (try --help)`);
  }
  return opts;
}

/** Everything an assertion needs about the rendered branch card. */
const snapshotExpr = `(() => {
  const card = document.querySelector(".contact-card-multi");
  if (!card) return { found: false };
  const chip = (el) => {
    const b = el.querySelector(".hours-badge");
    return b ? { state: b.dataset.state, text: b.textContent } : null;
  };
  const lead = card.querySelector(".contact-branch:not(.contact-branch-row)");
  // Direct children only. The rows behind "Show all" live inside
  // .contact-branches-rest, and counting those as one-tap rows would let the
  // second step grow without this check noticing.
  const rows = [...card.children].filter((n) => n.classList.contains("contact-branch-row"));
  const hidden = card.querySelector(".contact-branches-rest");
  return {
    found: true,
    lead: lead && {
      name: (lead.querySelector(".branch-name") || {}).textContent || null,
      chip: chip(lead),
      phone: (lead.querySelector('a[href^="tel:"]') || {}).getAttribute?.("href") || null,
      rows: lead.querySelectorAll(".contact-row").length,
    },
    rows: rows.map((r) => ({
      name: (r.querySelector(".branch-name") || {}).textContent || null,
      chip: chip(r),
      expanded: r.querySelector(".branch-toggle").getAttribute("aria-expanded"),
      controls: r.querySelector(".branch-toggle").getAttribute("aria-controls"),
      panelHidden: r.querySelector(".branch-detail").hidden,
      panelPhone: (r.querySelector('.branch-detail a[href^="tel:"]') || {}).getAttribute?.("href") || null,
      // A ≥44px target is the house rule for anything you tap.
      tapHeight: Math.round(r.querySelector(".branch-toggle").getBoundingClientRect().height),
    })),
    hiddenRows: hidden ? hidden.querySelectorAll(".contact-branch-row").length : 0,
    hiddenIsHidden: hidden ? hidden.hidden : null,
    showAll: (card.querySelector(".contact-branches-more") || {}).textContent || null,
    dialNote: (card.querySelector(".contact-branches-dial") || {}).textContent || null,
    headings: [...card.querySelectorAll("h3")].length,
  };
})()`;

async function checkVenue(driver, report, id, url) {
  const venue = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${id}.json`), "utf8"));
  const branches = venue.locations || [];
  const withHours = branches.filter((b) => b.hours).length;
  console.log(`\n  ${venue.name} (${id}) — ${branches.length} branches, ${withHours} with hours`);

  await driver.cdpNavigate(url);
  await until(async () => (await driver.evalPage(snapshotExpr)).found, {
    label: `${id}'s branch card to render`,
  });
  let s = await driver.evalPage(snapshotExpr);

  // --- one lead, expanded, with its details already on screen -----------
  report.check(
    `${id}: exactly one branch leads, already expanded`,
    s.lead !== null && s.lead.rows > 0,
    `lead "${s.lead?.name}" with ${s.lead?.rows} contact row(s)`,
  );

  const expectedRows = Math.min(NEAR_LIMIT, branches.length - 1);
  report.check(
    `${id}: ${expectedRows} branch(es) sit beside it as one-tap rows`,
    s.rows.length === expectedRows,
    `${s.rows.length} collapsed row(s): ${s.rows.map((r) => r.name).join(", ")}`,
  );

  // --- (b) a status is never invented ------------------------------------
  // Asserted against the DATA, not against a guess: a branch with no hours in
  // the file must have no chip on screen, whatever the clock says.
  const named = new Map(branches.map((b) => [b.label || b.address, b]));
  const shown = [s.lead, ...s.rows].filter(Boolean);
  const invented = shown.filter((x) => x.chip && !named.get(x.name)?.hours);
  report.check(
    `${id}: no branch is given a status it has no hours to support`,
    invented.length === 0,
    withHours === 0
      ? `${shown.length} branch(es) rendered, ${shown.filter((x) => x.chip).length} chip(s) — expected 0`
      : `${shown.filter((x) => x.chip).length} chip(s) across ${shown.length} rendered branch(es)`,
  );

  // --- (a) the lead is never known-shut while a known-open one exists ----
  const anyOpen = shown.some((x) => x.chip?.state === "open");
  report.check(
    `${id}: the lead is not a branch we know is closed while an open one is offered`,
    !(anyOpen && s.lead.chip?.state === "closed"),
    anyOpen
      ? `lead "${s.lead.name}" is ${s.lead.chip?.state ?? "unknown"}; an open branch is on the card`
      : `nothing on the card is known-open right now — rule not exercised, and that is honest`,
  );

  // --- the second step appears only when it is needed --------------------
  const needsStep = branches.length - 1 > NEAR_LIMIT;
  report.check(
    needsStep
      ? `${id}: more branches than the card holds, so "Show all" is offered`
      : `${id}: every branch fits, so the old second step is gone`,
    needsStep ? /Show all \d+ branches/.test(s.showAll || "") : s.showAll === null,
    `showAll = ${JSON.stringify(s.showAll)}`,
  );
  if (needsStep) {
    report.check(
      `${id}: "Show all" counts every branch, not just the hidden ones`,
      s.showAll.includes(String(branches.length)),
      s.showAll,
    );
    report.check(
      `${id}: the remainder starts hidden and accounts for every branch`,
      s.hiddenIsHidden === true && 1 + s.rows.length + s.hiddenRows === branches.length,
      `1 lead + ${s.rows.length} row(s) + ${s.hiddenRows} behind the step = ${branches.length}`,
    );
  }

  // A fresh profile has no captured location, so the dial cannot have dropped
  // anything. If a note appears here, the dial is filtering on Infinity.
  report.check(
    `${id}: with no location captured, the distance dial hides nothing`,
    s.dialNote === null,
    `dialNote = ${JSON.stringify(s.dialNote)}`,
  );

  // --- (c) one tap, and it is that branch's own detail --------------------
  if (s.rows.length) {
    const target = s.rows[0];
    report.check(
      `${id}: a collapsed row is a ≥44px target with its panel wired to it`,
      target.tapHeight >= 44 && target.expanded === "false" && target.panelHidden && !!target.controls,
      `${target.tapHeight}px, aria-expanded=${target.expanded}, aria-controls=${target.controls}`,
    );
    await driver.click(".contact-branch-row .branch-toggle");
    s = await driver.evalPage(snapshotExpr);
    const opened = s.rows[0];
    report.check(
      `${id}: ONE click opens it — the single step the redesign promised`,
      opened.expanded === "true" && !opened.panelHidden,
      `aria-expanded=${opened.expanded}, panel hidden=${opened.panelHidden}`,
    );
    const wantPhone = named.get(opened.name)?.phone;
    if (wantPhone) {
      report.check(
        `${id}: what it reveals is THAT branch's number, not the lead's`,
        opened.panelPhone === `tel:${wantPhone.replace(/\s+/g, "")}` ||
          (opened.panelPhone || "").replace(/\s+/g, "") === `tel:${wantPhone}`.replace(/\s+/g, ""),
        `panel ${opened.panelPhone} vs branch ${wantPhone} vs lead ${s.lead.phone}`,
      );
    }
    // Every branch on the card, including the ones behind the second step —
    // revealing them must not produce a run of unlabelled rows.
    const onCard = 1 + s.rows.length + s.hiddenRows;
    report.check(
      `${id}: every branch is a heading, so a screen reader can navigate branch by branch`,
      s.headings === onCard,
      `${s.headings} heading(s) for ${onCard} branch(es)`,
    );
  }
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const ids = opts.ids || VENUES;
  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-branch-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log(`Faves branch check — choosing a branch is choosing where the food comes from`);
    console.log(`  venues   ${ids.join(", ")}`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)`);

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
    driver.cdpNavigate = (url) => cdp.send("Page.navigate", { url }, sessionId);

    for (const id of ids) {
      const url = `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(id)}`;
      await checkVenue(driver, report, id, url);
    }

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
