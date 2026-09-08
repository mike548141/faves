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
//   d) the CARD CONTRADICTS ITS OWN PAGE. A venue-level closure is folded once,
//      for the whole venue (temporal.js `venueState`), and the header banner
//      renders it. The branch card read only each branch's posted hours, so a
//      chain that had shut down printed "Open" chips on every branch row
//      underneath a header saying "Permanently closed" — one screen, two
//      answers, and the wrong one was the actionable-looking one. Asserted here
//      because both halves are drawn by the same render and only a browser puts
//      them on the same page (Theme 27, item 040).
//   e) the FIX FOR (d) IS OVER- OR UNDER-DONE. Saying it on every branch meant a
//      shut seven-branch chain printed "Permanently closed" EIGHT times at one
//      weight (Theme 27, item 050). The owner ruled the repeats be muted, not
//      dropped — so this asserts both directions: every branch section still
//      carries exactly one closure badge (an over-eager tidy leaves a reader who
//      scrolls into one row with nothing), AND the row's rendered weight and
//      size are strictly below the banner's (an under-done fix leaves them
//      identical). Both are computed-style facts: a CSS rule that loses a
//      specificity fight or names a token that does not exist looks right in the
//      stylesheet and changes nothing on screen. It also MEASURES the muted
//      colour's contrast against whatever actually paints behind it, in light
//      and in dark, against the 4.5:1 AA floor — because "muted" is one bad
//      guess away from "illegible", and this is the most consequential sentence
//      on the card.
//
// A FIXTURE, AND WHY. The shipped corpus holds NO closed venue — measured
// 2026-08-19: 55 records, all 55 with `lifecycle.added` and not one
// `lifecycle.events` entry between them. So (d) is a LATENT fault, and no real
// file can exercise it. It is exercised by serving real chains back with one
// closure event injected (startServer's `overlay`), under fixture ids so the
// genuine venues are untouched and still checked as themselves in the same run.
// The date is a decade old on purpose: a closure that began in the past and
// never reopened is closed at every hour of every day, which keeps these
// assertions as time-independent as the rest.
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

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Cdp, Report, createDriver, exitFromError, launchChrome, need, startServer, stopChrome, untilPresent } from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// Three shapes, all real, chosen because they fail differently.
//   tj-katsu   7 branches, ALL with hours → exercises the openness rule.
//   mcdonalds  5 branches, NONE with hours → exercises the honesty rule, and is
//              the venue in the screenshot that prompted the redesign.
//   hell-pizza 14 branches, all with hours → the corpus's largest chain since
//              the 2026-08-16 Wellington sweep, and the reason this line is no
//              longer two ids. The comment above used to call tj-katsu "the
//              only venue left that still needs the second step"; that stopped
//              being true the moment a chain grew, and nothing would have said
//              so. A fixture list justified by a corpus fact goes stale exactly
//              when the corpus changes — which is when the check matters most.
//              At 14 it is also the only venue where "Show all" hides NINE
//              branches rather than one or two, so a mistake in the remainder
//              arithmetic is visible here and nowhere else.
const VENUES = ["tj-katsu", "mcdonalds", "hell-pizza"];
const NEAR_LIMIT = 4; // must match locations.NEAR_BRANCH_LIMIT

// The closed-venue fixtures, and why these two of the three. tj-katsu has hours
// on all seven branches — it is where a stale "Open" chip would actually be
// printed. mcdonalds has hours on none, which is the opposite risk: the closure
// chip is NOT gated on a branch having hours (the venue's closure is a fact
// about the branch regardless), so this is the venue that proves the closure
// chip appears where the hours chip correctly never does. hell-pizza would add
// only run time.
// Long past, never reopened → shut at every hour of every day. See the header.
const CLOSED_EVENT = { type: "closed-permanently", date: "2016-04-01", note: "fixture" };
// Two hours blocks whose state does not depend on the clock. `{}` has no
// segments at all, which hours.js answers as "closed" (not "unknown" — that
// needs no `hours` key whatsoever). "00:00"–"24:00" every day ends each
// segment exactly where the next begins, so there is no minute of the week it
// is shut. They are the only invented data in this file, and they exist so the
// lead-branch probe below can be true at 1am as well as 1pm.
const NEVER_OPEN = {};
const ALWAYS_OPEN = Object.fromEntries(
  ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, [["00:00", "24:00"]]]),
);

const FIXTURES = [
  // Hours on all seven branches — where a stale "Open" chip would actually be
  // printed on a chain that has shut down.
  { id: "tj-katsu-closed-fixture", from: "tj-katsu" },
  // Hours on NONE. The opposite risk: the closure chip is not gated on a
  // branch having hours (the venue's closure is a fact about the branch
  // whatever its opening times are, or are not), so this is the venue that
  // proves the closure chip appears where an hours chip correctly never does.
  // It is also the venue that caught the first fix being half a fix — the LEAD
  // branch gets no hours row at all, so hanging the badge off the hours row
  // left the most prominent row on the card silent.
  { id: "mcdonalds-closed-fixture", from: "mcdonalds" },
  // The third function's probe. `branchOpenStateOf` feeds locations.leadBranch,
  // whose tier 1 is "a branch we know is open". With the first branch never
  // open and the second always open, tier 1 picks the SECOND unless the venue's
  // closure has silenced the hours — so the lead's identity is the one place a
  // browser can see that change. Without this the third of the three functions
  // the item names was measured, on 2026-08-19, to be covered by nothing.
  { id: "tj-katsu-lead-fixture", from: "tj-katsu", hours: [NEVER_OPEN, ALWAYS_OPEN], leadIsFirst: true },
  // 490/100 defect 3. The PINNED COMPACT BAR — the strip that replaces this
  // card once it scrolls away on a phone — read `r.hours`, the projected
  // PRIMARY branch, while the card, the header caveat and every section's
  // serving window resolve the NEAREST once an origin is known. So on a chain
  // the bar could say "Closed" over a card saying the branch you are reading is
  // open, and the bar's own comment claimed the opposite.
  //
  // Not closed: a lifecycle closure outranks the hours everywhere and would
  // hide the exact disagreement this fixture exists to create. Branch 1 never
  // opens, branch 2 always does, and the origin is branch 2's own coordinate —
  // so at EVERY hour of every day the primary reads closed and the nearest
  // reads open, and one number tells you which the bar followed.
  {
    id: "tj-katsu-origin-fixture",
    from: "tj-katsu",
    closed: false,
    hours: [NEVER_OPEN, ALWAYS_OPEN],
    // Two branches, so the card is a lead plus one row with no second step and
    // nothing for the distance dial to drop — the disagreement under test, and
    // none of the other machinery this file already covers on the seven-branch
    // chains above.
    keepBranches: 2,
    originBranch: 1,
  },
];

// The states hours.js can produce. A chip carrying one of these is a claim
// derived from the branch's posted hours; a chip carrying anything else is a
// claim derived from the venue's lifecycle. The two are checked differently,
// which is why they have to be told apart by `data-state` rather than by
// counting chips.
const HOURS_STATES = new Set(["open", "closed", "closing-soon", "opening-soon", "unknown"]);

const HELP = `Faves branch check — verify the branch picker in a real browser.

  node tools/branch_check.mjs [options]

Serves site/ locally, launches Google Chrome headless on a throwaway profile at
390 px, and opens each multi-branch venue's menu page. Asserts one branch leads
expanded, that the lead is never a known-closed branch while a known-open one
exists, that a branch without hours gets no status chip, that a collapsed row
opens on ONE click and reveals its own contact details, and that the second step
appears only when there are more branches than the card can hold.

Also serves two of those chains back with a permanent-closure event injected
(the corpus holds no closed venue) and asserts the branch card says what the
page header says, rather than offering an "Open" branch of a shut chain — and
that it says it QUIETLY: on every branch still, but at a lower weight than the
header banner and at a contrast ratio measured against the AA floor in both
light and dark mode.

Options:
  --id <venue-id>   Check only this venue (default: ${VENUES.join(", ")}
                    plus ${FIXTURES.map((f) => f.id).join(", ")}).
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

/** The pinned compact bar (490/100 defect 3) and the card's lead, read together
 *  — the two elements that must agree about which branch the page is about.
 *  The bar starts `hidden` (an IntersectionObserver reveals it once the card
 *  scrolls away), which changes nothing here: its text is built at render. */
const barExpr = `(() => {
  const bar = document.querySelector(".contact-bar");
  const lead = document.querySelector(".contact-card-multi .contact-branch:not(.contact-branch-row)");
  const leadChip = lead && lead.querySelector(".hours-badge");
  const barChip = bar && bar.querySelector(".contact-bar-status");
  return {
    found: !!bar,
    barState: barChip ? barChip.dataset.state ?? null : null,
    barText: barChip ? barChip.textContent : null,
    barPhone: (bar && bar.querySelector(".contact-bar-call")) ? bar.querySelector(".contact-bar-call").getAttribute("href") : null,
    leadName: lead ? (lead.querySelector(".branch-name") || {}).textContent ?? null : null,
    leadState: leadChip ? leadChip.dataset.state ?? null : null,
    leadText: leadChip ? leadChip.textContent : null,
  };
})()`;

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
      expanded: ${need(".branch-toggle", "r")}.getAttribute("aria-expanded"),
      controls: ${need(".branch-toggle", "r")}.getAttribute("aria-controls"),
      panelHidden: ${need(".branch-detail", "r")}.hidden,
      panelPhone: (r.querySelector('.branch-detail a[href^="tel:"]') || {}).getAttribute?.("href") || null,
      // A ≥44px target is the house rule for anything you tap.
      tapHeight: Math.round(${need(".branch-toggle", "r")}.getBoundingClientRect().height),
    })),
    hiddenRows: hidden ? hidden.querySelectorAll(".contact-branch-row").length : 0,
    hiddenIsHidden: hidden ? hidden.hidden : null,
    // EVERY badge anywhere in the card, not just the first one per branch.
    // The first draft of (d) read one chip per branch via querySelector, which
    // returns the FIRST in document order — the branch heading's. That silently
    // exempted the second place a status is printed: the hours row inside the
    // expanded lead and inside every collapsed panel, which is where the
    // "Open · until 7:30pm" line actually lived. A probe that removed the
    // suppression there passed. This also reaches the branches behind "Show
    // all", which the per-row snapshot deliberately does not.
    allChips: [...card.querySelectorAll(".hours-badge")].map((b) => ({
      state: b.dataset.state,
      text: b.textContent,
    })),
    // The other half of assertion (d): what the PAGE HEADER says about this
    // venue, read from the same DOM in the same instant as the chips above.
    // Comparing the card against a value this tool computed itself would only
    // prove the tool agrees with itself.
    headerClosure: (() => {
      const b = document.querySelector(".menu-closure .hours-badge");
      return b ? { state: b.dataset.state, text: b.textContent } : null;
    })(),
    showAll: (card.querySelector(".contact-branches-more") || {}).textContent || null,
    dialNote: (card.querySelector(".contact-branches-dial") || {}).textContent || null,
    headings: [...card.querySelectorAll("h3")].length,
    // --- item 050: the repeats are MUTED, never removed -------------------
    // How many lifecycle-closure badges each branch section carries, ONE ENTRY
    // PER BRANCH rather than a card-wide total. The total above (allChips)
    // would be satisfied by two badges on one row and none on another, which
    // is exactly the shape a half-finished "tidy up the repeats" leaves behind.
    perBranchClosures: [...card.querySelectorAll(".contact-branch")].map(
      (b) => b.querySelectorAll('.hours-badge[data-state^="closed-"]').length,
    ),
    // What the closure actually LOOKS like on a branch row versus in the header
    // banner. Read from computed style in the browser, because "muted" is a
    // rendered property: a rule that loses a specificity fight, or names a
    // token that does not exist, reads as perfect in the stylesheet.
    closureStyle: (() => {
      // The first ancestor that actually paints. .branch-toggle,
      // .contact-branch and .branch-head are all transparent, so reading the
      // badge's own parent would compare the text against rgba(0,0,0,0) and
      // return a contrast ratio of 1 — or, worse, a flattering number.
      const paintedBg = (node) => {
        for (let n = node; n; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor;
          const parts = (c.match(/[\\d.]+/g) || []).map(Number);
          if (parts.length < 4 || parts[3] > 0) return c;
        }
        return getComputedStyle(document.documentElement).backgroundColor;
      };
      const lum = (c) => {
        const [r, g, b] = (c.match(/[\\d.]+/g) || []).slice(0, 3).map(Number).map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrast = (fg, bg) => {
        const a = lum(fg), b = lum(bg);
        return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
      };
      const read = (node) => {
        if (!node) return null;
        const cs = getComputedStyle(node);
        const bg = paintedBg(node);
        return {
          color: cs.color,
          bg,
          weight: Number(cs.fontWeight),
          px: Math.round(parseFloat(cs.fontSize) * 100) / 100,
          contrast: contrast(cs.color, bg),
        };
      };
      return {
        row: read(card.querySelector('.contact-branch .hours-badge[data-state^="closed-"]')),
        header: read(document.querySelector(".menu-closure .hours-badge")),
      };
    })(),
  };
})()`;

async function checkVenue(driver, report, id, url, venue, spec = null) {
  const branches = venue.locations || [];
  const withHours = branches.filter((b) => b.hours).length;
  const closed = (venue.lifecycle?.events || []).length > 0;
  console.log(
    `\n  ${venue.name} (${id}) — ${branches.length} branches, ${withHours} with hours` +
      (closed ? " — FIXTURE: permanently closed" : ""),
  );

  // The viewer's captured location, or the absence of one. Written on every
  // venue, not only the fixture that wants it: sessionStorage outlives a
  // navigation, so a fixture that sets an origin would otherwise silently
  // change the answer for every venue checked after it.
  const originBranch = spec?.originBranch ?? null;
  const origin = originBranch === null ? null : branches[originBranch];
  await driver.cdpNavigate(url);
  await untilPresent(async () => await driver.evalPage("!!document.body"), {
    label: `${id}'s document to exist`,
  });
  await driver.evalPage(
    origin
      ? `sessionStorage.setItem("faves.origin.v1", ${JSON.stringify(JSON.stringify({ lat: origin.lat, lng: origin.lng }))}); true`
      : `sessionStorage.removeItem("faves.origin.v1"); true`,
  );
  await driver.cdpNavigate(url);
  await untilPresent(async () => (await driver.evalPage(snapshotExpr)).found, {
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
  // Scoped to HOURS-DERIVED chips. A closure chip on a hoursless branch is not
  // an invented status — it restates the venue's own lifecycle, which is a fact
  // about that branch whatever its opening times are (or are not). Without this
  // scope the rule would have read "a shut McDonald's must stay silent about
  // being shut", which is the very failure the closure precedence fixes.
  const invented = shown.filter((x) => x.chip && HOURS_STATES.has(x.chip.state) && !named.get(x.name)?.hours);
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

  // --- (d) a venue-level closure outranks every branch's posted hours ----
  // Only meaningful for a closed venue; for a trading one the two assertions
  // below would be vacuously true, so they are not printed at all rather than
  // padding the count with green that proves nothing.
  if (closed) {
    if (spec?.leadIsFirst) {
      report.check(
        `${id}: a shut chain leads with its nearest branch, not one its posted hours call open`,
        s.lead?.name === (branches[0].label || branches[0].address),
        `lead "${s.lead?.name}" — branch 1 is never open, branch 2 always is`,
      );
    }
    const hoursDerived = s.allChips.filter((c) => HOURS_STATES.has(c.state));
    report.check(
      `${id}: nowhere on the card is a posted-hours status still printed`,
      hoursDerived.length === 0,
      hoursDerived.length === 0
        ? `${s.allChips.length} badge(s) across the whole card, every one the closure`
        : `${hoursDerived.map((c) => `${c.state}: ${c.text}`).join(" | ")}`,
    );
    // Not "no contradiction" but "the same answer, once per branch". The
    // weaker form is satisfied by a card that says nothing at all, which is
    // what the first fix left for a chain with no captured hours: the lead row
    // — the prominent one — was silent while the header said it was shut.
    const agree = s.headerClosure !== null &&
      s.allChips.length === branches.length &&
      s.allChips.every((c) => c.state === s.headerClosure.state);
    report.check(
      `${id}: every branch says exactly what the page header says, the lead included`,
      agree,
      `header ${JSON.stringify(s.headerClosure?.text ?? null)} vs ${s.allChips.length} ` +
        `badge(s) for ${branches.length} branch(es): ` +
        `${JSON.stringify([...new Set(s.allChips.map((c) => c.text))])}`,
    );

    // --- item 050: muted on the rows, full weight on the banner ------------
    // Owner-ruled 2026-09-06 (option 3). A shut seven-branch chain said
    // "Permanently closed" eight times at identical weight. The fix is CSS
    // only, and it has to fail in BOTH directions:
    //   too little — the rows keep shouting, which is the bug;
    //   too much   — a future session reads "muted" as "tidy the rows away"
    //                and a reader who scrolls into one branch finds no closure
    //                at all, which is the option the owner declined.
    // The per-branch count guards the second; the weight comparison the first.
    const bare = s.perBranchClosures.filter((n) => n !== 1).length;
    report.check(
      `${id}: EVERY branch row still states the closure — muted is not removed`,
      s.perBranchClosures.length === branches.length && bare === 0,
      `closure badges per branch section: ${JSON.stringify(s.perBranchClosures)} ` +
        `(${branches.length} branch(es) — want exactly one each)`,
    );

    // Pinned to light before reading any computed style. Without this the
    // evidence line below reports whatever theme the OPERATOR'S machine is in
    // — it printed the dark palette on the laptop this was written on — and a
    // check whose printed evidence depends on the reader's OS is one nobody can
    // compare across two runs. The assertion itself holds in both themes; the
    // number beside it should not move.
    await driver.setColorScheme("light");
    s = await driver.evalPage(snapshotExpr);
    const { row, header } = s.closureStyle;
    report.check(
      `${id}: the repeats are SUBORDINATE to the header banner, not equal to it`,
      !!row && !!header && row.weight < header.weight && row.px < header.px &&
        row.color !== header.color,
      row && header
        ? `row ${row.weight}/${row.px}px ${row.color} vs banner ${header.weight}/${header.px}px ${header.color}`
        : `row=${JSON.stringify(row)} header=${JSON.stringify(header)}`,
    );

    // "Muted" must not mean "inaccessible". This is the single most
    // consequential fact on the card, so the floor is WCAG 2.2 AA for normal
    // text (1.4.3, 4.5:1) against whatever actually paints behind it — read in
    // the browser rather than reasoned about from the token, because the token
    // is only half the answer and a `color-mix` or an inherited alpha is where
    // a pleasing grey stops being a legible one.
    for (const mode of ["light", "dark"]) {
      await driver.setColorScheme(mode);
      s = await driver.evalPage(snapshotExpr);
      const st = s.closureStyle.row;
      const hd = s.closureStyle.header;
      report.check(
        `${id}: the muted closure still meets WCAG AA in ${mode} mode`,
        !!st && st.contrast >= 4.5,
        st
          ? `${st.contrast}:1 — ${st.color} on ${st.bg} (floor 4.5:1); banner ${hd?.contrast}:1`
          : "no closure badge on any branch row to measure",
      );
    }
    await driver.setColorScheme(null);
    s = await driver.evalPage(snapshotExpr);
  }

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
  // Skipped where an origin IS captured (the 490/100 fixture): the dial then
  // has real distances to work with and dropping a far branch is its job, so
  // asserting a null note there would assert the feature away.
  if (!origin) {
    report.check(
      `${id}: with no location captured, the distance dial hides nothing`,
      s.dialNote === null,
      `dialNote = ${JSON.stringify(s.dialNote)}`,
    );
  }

  // --- (f) 490/100 defect 3: the pinned bar and the card agree ------------
  // Only where an origin makes the question answerable. Without one, "nearest"
  // is the primary by definition and every assertion below is vacuous — so
  // they are not printed at all rather than padding the count with green that
  // proves nothing.
  if (origin) {
    const bar = await driver.evalPage(barExpr);
    const primary = branches[0];
    report.check(
      `${id}: the fixture actually disagrees — the primary is shut and the nearest is open`,
      primary.hours && Object.keys(primary.hours).length === 0 &&
        origin !== primary && Object.keys(origin.hours || {}).length === 7,
      `primary "${primary.label}" has ${Object.keys(primary.hours || {}).length} day(s); ` +
        `nearest "${origin.label}" has ${Object.keys(origin.hours || {}).length}`,
    );
    report.check(
      `${id}: the pinned bar exists to be read at all`,
      bar.found && bar.barState !== null,
      `bar found=${bar.found}, status=${JSON.stringify(bar.barText)}`,
    );
    // NOT `=== "open"`: a segment ending at 24:00 reads "closing-soon" for the
    // last half hour of the day, so an equality here would pass at 1pm and fail
    // at 11:49pm — which is how it first ran. The time-independent fact is that
    // the never-open primary can only ever produce "closed" and the always-open
    // nearest can never produce it.
    report.check(
      `${id}: the pinned bar follows the NEAREST branch, not the primary`,
      bar.barState !== null && bar.barState !== "closed",
      `bar says ${JSON.stringify(bar.barText)} (state ${bar.barState}); ` +
        `the primary branch is never open, the nearest never shut`,
    );
    report.check(
      `${id}: …and it says the same thing as the card it floats above, word for word`,
      bar.leadName === origin.label && bar.barState === bar.leadState && bar.barText === bar.leadText,
      `bar ${JSON.stringify(bar.barText)} vs lead "${bar.leadName}" ${JSON.stringify(bar.leadText)}`,
    );
    // The number the bar dials. TJ Katsu publishes one number, on its primary
    // branch, so this is the FALLBACK path — the assertion is that the bar
    // still offers a call rather than going silent on a branch with no number
    // of its own, which is the regression a naive per-branch read would ship.
    report.check(
      `${id}: the bar still offers a call on a branch that publishes no number`,
      bar.barPhone !== null,
      `href=${JSON.stringify(bar.barPhone)}; nearest "${origin.label}" publishes ${JSON.stringify(origin.phone ?? null)}`,
    );
  }

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

/** The real record for a venue id, or the injected-closure fixture for one of
 *  the `<id>-closed-fixture` ids. Keyed by the path the page will actually GET,
 *  so the overlay and the assertions cannot disagree about which bytes ran. */
async function buildRecords(ids) {
  const records = new Map();
  const specs = new Map();
  const overlay = new Map();
  for (const id of ids) {
    const spec = FIXTURES.find((f) => f.id === id) || null;
    const real = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${spec?.from ?? id}.json`), "utf8"));
    if (spec === null) {
      records.set(id, real);
      continue;
    }
    // A shallow clone with the id and lifecycle replaced — everything else is
    // the genuine venue, so the branches, hours and timezones under test are
    // the corpus's own rather than a hand-written miniature that could be wrong
    // in ways the real data never is. `spec.hours` overrides the first few
    // branches' hours where a fixture needs a clock-independent one.
    // `closed: false` opts a fixture OUT of the injected closure: a closure
    // outranks every branch's posted hours, so a fixture whose whole point is a
    // disagreement between two branches' hours cannot also be shut.
    const fixture = spec.closed === false
      ? { ...real, id }
      : { ...real, id, lifecycle: { ...(real.lifecycle || {}), events: [CLOSED_EVENT] } };
    if (spec.hours) {
      fixture.locations = (real.locations || []).map((b, i) =>
        i < spec.hours.length ? { ...b, hours: spec.hours[i] } : b,
      );
    }
    if (spec.keepBranches) {
      fixture.locations = (fixture.locations || real.locations || []).slice(0, spec.keepBranches);
    }
    records.set(id, fixture);
    specs.set(id, spec);
    overlay.set(`/data/restaurants/${id}.json`, JSON.stringify(fixture));
  }
  return { records, specs, overlay };
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const ids = opts.ids || [...VENUES, ...FIXTURES.map((f) => f.id)];
  const { records, specs, overlay } = await buildRecords(ids);
  const { server, port } = await startServer(opts.port, SITE, overlay);
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
    // Dark mode is a supported theme, not a nicety, and the muted closure has
    // to clear AA in it too. Emulating the media query is enough: the tokens
    // live in `@media (prefers-color-scheme: dark)`, so nothing re-renders and
    // the same DOM can be measured twice. `null` restores the OS setting, so a
    // venue checked after a fixture is not silently checked in the dark.
    driver.setColorScheme = (scheme) =>
      cdp.send(
        "Emulation.setEmulatedMedia",
        { features: scheme ? [{ name: "prefers-color-scheme", value: scheme }] : [] },
        sessionId,
      );

    for (const id of ids) {
      const url = `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(id)}`;
      await checkVenue(driver, report, id, url, records.get(id), specs.get(id));
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
