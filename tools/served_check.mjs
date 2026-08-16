// Faves served check — a menu section's serving window on screen, in a real
// browser at 390 px, on a FROZEN clock. Eighth of the family, on the same
// harness (tools/lib/browser.mjs).
//
// WHY THIS EXISTS. `section.served` (ROADMAP 28c) is the first thing on this
// site whose rendering depends on the time of DAY, and it was built on one
// decision that is easy to state and easy to lose: **it annotates, it never
// filters**. Every failure this guards is a failure of that decision, and every
// one of them is invisible to a unit test:
//
//   a) THE SECTION VANISHES. Filtering an out-of-window section — the way
//      `available` filters a seasonal one — is the obvious implementation and
//      the wrong one. A reader at 9pm then cannot discover that the venue HAS a
//      Gold Card menu, which is exactly what they wanted to know for tomorrow.
//   b) THE DEEP LINK BREAKS ON THE CLOCK. `#section-gold-card` is a URL someone
//      was sent. A link that resolves at 1pm and 404s at 1am is the opposite of
//      what Theme 34 is for, and nothing in the repo would say so: the page
//      still renders, just without the section the fragment names.
//   c) THE PRICES GO UNREADABLE. Dimming or disabling an out-of-window section
//      is the other tempting half-measure. The prices are still true; only the
//      hour is different.
//   d) A START TIME IS INVENTED. Two of this corpus's four windows state an end
//      and no start ("served till 2pm"). The reasoning resolves that null open
//      against the venue's hours (or midnight), and if that resolved number
//      ever reaches the screen we are printing a time nobody told us.
//
// THE CLOCK IS FROZEN, NOT READ. Every assertion below is pinned to a fixed
// instant injected before any page script runs (Page.addScriptToEvaluateOnNewDocument
// replacing `Date`), and the browser's own zone is overridden to match. So this
// check has the same verdict at 1pm and at 1am — which is the house rule
// (branch_check.mjs says it too): a check that passes at one hour and fails at
// another gets switched off within a week. Freezing the clock is also the only
// way to assert the OUTSIDE-window state at all; waiting until 9pm to run it is
// not a test strategy.
//
// WHAT A GREEN RUN HERE STILL CANNOT TELL YOU.
//   • It cannot tell you the window is TRUE. That the Gold Card menu really
//     stops at 5:30pm is a claim made by whoever transcribed the board, and no
//     browser can check it against the shop's door.
//   • It cannot tell you the marker READS as quiet rather than as an error.
//     Contrast is measured in the CSS review; "muted, not alarming" is a
//     judgement only a person makes.
//   • It cannot tell you a real reader connects "not served right now" to the
//     prices below it, or that they would rather have been told at all.
//   • It says nothing about the four sections it does not open, and nothing
//     about a fifth venue added tomorrow — the fixtures below are named, not
//     discovered.
//   • It exercises only Pacific/Auckland, because that is every venue in the
//     corpus (none carries a `timezone`). A venue abroad would be new ground.
//
// NOT PART OF THE SHIPPED SITE. Dev tooling, like tools/serve.py — no npm
// install, no dependency added to the site (ADR 0001). Fresh Chrome profile per
// run, because a stale service worker will happily serve the last run's modules
// and a hard reload does not bust it.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Cdp,
  Report,
  createDriver,
  launchChrome,
  settleUntil,
  startServer,
  stopChrome,
  until,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");
const TZ = "Pacific/Auckland"; // every venue in the corpus; none carries its own

// Three instants, all in NZST (June — no DST edge to argue about), and all a
// MONDAY so the "next serving" answers are stable and easy to read:
//   inside   13:00  both fixtures are being served
//   before   09:00  before either window opens, later the same day
//   after    21:00  after both have closed, so "next" wraps to tomorrow
const WHEN = {
  inside: { iso: "2026-06-01T01:00:00Z", label: "Mon 13:00 NZST" },
  before: { iso: "2026-05-31T21:00:00Z", label: "Mon 09:00 NZST" },
  after: { iso: "2026-06-01T09:00:00Z", label: "Mon 21:00 NZST" },
};

// The expected strings are written out in full rather than recomputed from
// hours.js. A check that derives its own expectation from the code it is
// checking agrees with that code by construction, including when the code is
// wrong (ADR 0072) — so these are an independent oracle, read off the data by
// hand:
//   sprig-and-fern-tawa / Gold Card   Mon–Fri 11:30–17:30, Sat–Sun 10:00–17:30
//   1841-bar-restaurant / Brunch      [[null, "15:00"]] every day; venue opens 10:00
const FIXTURES = [
  {
    id: "sprig-and-fern-tawa",
    anchor: "section-gold-card",
    what: "Gold Card (a window the section states both ends of)",
    line: "Served Mon–Fri 11:30am–5:30pm, Sat–Sun 10am–5:30pm",
    marker: {
      inside: null,
      before: "Not served right now · next served at 11:30am",
      after: "Not served right now · next served Tue at 11:30am",
    },
    // A section on the same page with no `served` at all: it must gain neither
    // line nor marker, or the feature has leaked onto every heading.
    quiet: "section-mains",
  },
  {
    id: "1841-bar-restaurant",
    anchor: "section-brunch",
    what: "Brunch (\"till 3pm\" — an end, and no start anyone stated)",
    line: "Served every day till 3pm",
    marker: {
      inside: null,
      // "from opening", never "at 10am": 10am is the VENUE's opening, and the
      // section never claimed brunch starts then. This is assertion (d).
      before: "Not served right now · next served from opening",
      after: "Not served right now · next served Tue from opening",
    },
    quiet: "section-mains",
  },
];

const HELP = `Faves served check — a section's serving window on a frozen clock.

  node tools/served_check.mjs [options]

Serves site/ locally, launches Google Chrome headless on a throwaway profile at
390 px, freezes the page's clock at three fixed instants, and opens each
fixture's menu page. Asserts the "Served …" line reads correctly, that the
"not served right now" marker appears outside the window and only there, that
an out-of-window section keeps its dishes and their prices readable, and that
its #section-<id> deep link still resolves at 9pm.

Options:
  --id <venue-id>   Check only this venue (default: ${FIXTURES.map((f) => f.id).join(", ")}).
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

/**
 * Replace the page's `Date` before any module can read it. A subclass, not a
 * stub: `Intl.DateTimeFormat.formatToParts` — which is how hours.js reads the
 * venue's zone — needs a real Date's internal slot, and a plain object with a
 * `getTime` would throw there. `Date.parse`/`Date.UTC` come along as inherited
 * statics, so nothing else in the page notices.
 */
const freezeClock = (iso) => `(() => {
  const RealDate = Date;
  const FIXED = RealDate.parse(${JSON.stringify(iso)});
  class FrozenDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [FIXED]));
    }
    static now() {
      return FIXED;
    }
  }
  globalThis.Date = FrozenDate;
})()`;

/** Everything an assertion needs about one rendered section. */
const snapshotExpr = (anchor) => `(() => {
  const sec = document.getElementById(${JSON.stringify(anchor)});
  if (!sec) return { found: false };
  const text = (el) => (el ? el.textContent.replace(/\\s+/g, " ").trim() : null);
  const marker = sec.querySelector(".section-not-served");
  // The MESSAGE, without the decorative glyph beside it — comparing against
  // the paragraph's whole textContent would bake the icon into the expected
  // string and turn a change of glyph into a failed behaviour assertion.
  const markerText = sec.querySelector(".section-not-served-text");
  const dishes = [...sec.querySelectorAll(".dish")];
  // EFFECTIVE opacity, walking up to the section — not the dish's own. Opacity
  // composites, it does not inherit, so \`getComputedStyle(dish).opacity\` reads
  // 1 while an ancestor renders the whole list at 0.32. Measured, because the
  // obvious version of this assertion passed a dimmed menu silently when it was
  // tried (the decorative-guard failure, ADR 0072).
  const readable = dishes.filter((d) => {
    if (d.hidden || !d.offsetParent) return false;
    if (d.getBoundingClientRect().height <= 0) return false;
    let opacity = 1;
    for (let n = d; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.display === "none") return false;
      opacity *= Number(cs.opacity);
    }
    return opacity > 0.9;
  });
  return {
    found: true,
    // The heading is the section's own; a wrong anchor would still "find"
    // something, so the assertions name what they landed on.
    heading: text(sec.querySelector(".section-title")),
    served: text(sec.querySelector(".section-served")),
    marker: text(markerText),
    markerWhole: text(marker),
    // Real text in the accessibility tree, not a colour and not a ::before.
    // \`innerText\` is what an assistive tree would surface; a pseudo-element's
    // content never appears in it.
    markerInAccessibilityTree: marker
      ? marker.innerText.trim().length > 0 && marker.closest("[aria-hidden='true']") === null
      : null,
    // The icon must be decorative — the message is carried by the words.
    markerIconHidden: marker
      ? [...marker.children].every((c) => !c.classList.contains("section-not-served-ico") || c.getAttribute("aria-hidden") === "true")
      : null,
    // Every note under this heading, in order — so an assertion can see that
    // the venue's own prose survives beside the structured line.
    notes: [...sec.querySelectorAll(".section-note")].map(text),
    // Mobile first: the marker is a new block on a 390 px screen, and a block
    // that pushes the document sideways is a regression a text assertion cannot
    // see. Measured against the DOCUMENT, so a marker that overflows its own
    // section is caught even where the section clips it.
    docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    markerWidth: marker ? Math.round(marker.getBoundingClientRect().width) : null,
    sectionWidth: Math.round(sec.getBoundingClientRect().width),
    dishes: dishes.length,
    readableDishes: readable.length,
    firstDish: text(dishes[0]?.querySelector(".dish-name")),
    firstPrice: text(dishes[0]?.querySelector(".dish-price")),
    // The jump-nav chip that addresses this section — the other half of the
    // deep-link promise, and the thing that disappears if the section is
    // filtered out of the render rather than annotated.
    navLink: !!document.querySelector('.section-link[href="#' + ${JSON.stringify(anchor)} + '"]'),
  };
})()`;

async function checkAt(driver, report, fx, when, key) {
  const anchor = fx.anchor;
  const at = `${fx.id} @ ${when.label}`;
  await driver.reload();
  // Wait for the MENU to render, never for this section to appear. Waiting on
  // the section makes its absence a harness timeout — exit 2, no "FAIL" line,
  // and a run that does not look like a failure at all. That is precisely the
  // shape of failure CLAUDE.md flags on sync_check, and the section vanishing
  // is the single most important thing this check exists to catch (a). Gate on
  // the page, assert the section.
  await until(
    async () => await driver.evalPage(`!!document.querySelector(".menu-sections .menu-section")`),
    { label: `${fx.id}'s menu to render at ${when.label}` },
  );
  const s = await driver.evalPage(snapshotExpr(anchor));
  const wantMarker = fx.marker[key];

  // (a) the section survives the clock. First, because everything below it is
  // meaningless if the section is not on the page.
  if (
    !report.check(
      `${at}: the section is still on the page — annotated, never filtered away`,
      s.found === true,
      s.found ? "" : `#${anchor} is not in the document`,
    )
  ) {
    return;
  }

  report.check(
    `${at}: the served line reads as the venue's hours table does`,
    s.served === fx.line,
    `got ${JSON.stringify(s.served)}\n        want ${JSON.stringify(fx.line)}`,
  );

  // The load-bearing pair: the marker is there when, and ONLY when, the venue's
  // clock is outside the window.
  report.check(
    wantMarker
      ? `${at}: outside the window, a marker says so and names the next serving`
      : `${at}: inside the window, there is no marker to explain away`,
    s.marker === wantMarker,
    `got ${JSON.stringify(s.marker)}\n        want ${JSON.stringify(wantMarker)}`,
  );

  if (wantMarker) {
    report.check(
      `${at}: the marker is real text in the accessibility tree, not a colour`,
      s.markerInAccessibilityTree === true && s.markerIconHidden === true,
      `in tree=${s.markerInAccessibilityTree}, icon aria-hidden=${s.markerIconHidden}`,
    );
    report.check(
      `${at}: the marker fits its section at 390 px and pushes nothing sideways`,
      s.docOverflow === false && s.markerWidth <= s.sectionWidth,
      `marker ${s.markerWidth}px in a ${s.sectionWidth}px section; document overflows horizontally: ${s.docOverflow}`,
    );
  }

  // (c) its prices are still legible. Asserted at every instant, not only the
  // awkward one — "it survives 9pm" is worth nothing unless we also know what
  // it looked like at 1pm.
  report.check(
    `${at}: every dish in it is still readable — nothing dimmed, nothing hidden`,
    s.dishes > 0 && s.readableDishes === s.dishes,
    `${s.readableDishes}/${s.dishes} dish(es) readable under "${s.heading}"; first = ${JSON.stringify(s.firstDish)} ${JSON.stringify(s.firstPrice)}`,
  );
  report.check(
    `${at}: the first dish still carries a price a reader can act on`,
    typeof s.firstPrice === "string" && /\d/.test(s.firstPrice),
    `firstPrice = ${JSON.stringify(s.firstPrice)}`,
  );
  report.check(
    `${at}: the section still has its jump-nav chip`,
    s.navLink === true,
  );

  // (d) — nothing anywhere on the section may print a start time we derived
  // rather than were told. For the "till 3pm" fixture the venue opens at 10am,
  // and 00:00 is the no-hours fallback; neither may surface.
  if (fx.line.includes("till")) {
    const printed = [s.served, s.marker].filter(Boolean).join(" ");
    report.check(
      `${at}: no start time we made up reaches the screen`,
      !/\b10am\b/.test(printed) && !/\b12am\b/.test(printed),
      `rendered: ${JSON.stringify(printed)}`,
    );
  }

  // The feature has not leaked onto sections that never asked for it.
  const quiet = await driver.evalPage(snapshotExpr(fx.quiet));
  report.check(
    `${at}: a section with no window gets neither a line nor a marker`,
    quiet.found && quiet.served === null && quiet.marker === null,
    `"${quiet.heading}": served=${JSON.stringify(quiet.served)}, marker=${JSON.stringify(quiet.marker)}`,
  );
}

/** (b): the deep link still resolves — and lands — with the window shut. */
async function checkDeepLink(driver, report, fx, url) {
  await driver.cdpNavigate(`${url}#${fx.anchor}`);
  await until(
    async () => await driver.evalPage(`!!document.querySelector(".menu-sections .menu-section")`),
    { label: `${fx.id}'s menu to render from a deep link` },
  );
  // menu.js scrolls to the fragment SMOOTHLY (instant only under reduced
  // motion), so the first frame after render is mid-flight and the rect there
  // is a lie. Settle rather than sleep — and settleUntil returns the last value
  // it saw on timeout instead of throwing, so a deep link that genuinely never
  // lands reads as a FAILED ASSERTION rather than as a broken harness.
  const landed = await settleUntil(
    () =>
      driver.evalPage(`(() => {
        const el = document.getElementById(${JSON.stringify(fx.anchor)});
        if (!el) return { resolved: false };
        const r = el.getBoundingClientRect();
        return {
          resolved: true,
          // The fragment must resolve to something ON the page and IN view, not
          // to a node that exists but was never scrolled to.
          inViewport: r.top < innerHeight && r.bottom > 0,
          scrolled: scrollY,
          heading: el.querySelector(".section-title")?.textContent ?? null,
          dishes: el.querySelectorAll(".dish").length,
        };
      })()`),
    (v) => v.resolved && v.inViewport,
  );
  report.check(
    `${fx.id} @ ${WHEN.after.label}: #${fx.anchor} still resolves, and lands on the section`,
    landed.resolved && landed.inViewport && landed.dishes > 0,
    `heading=${JSON.stringify(landed.heading)}, in viewport=${landed.inViewport}, scrollY=${landed.scrolled}, ${landed.dishes} dish(es)`,
  );
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const fixtures = opts.ids ? FIXTURES.filter((f) => opts.ids.includes(f.id)) : FIXTURES;
  if (!fixtures.length) throw new Error(`no fixture matches ${opts.ids.join(", ")}`);
  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-served-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log(`Faves served check — when a section is on, and what it says when it isn't`);
    console.log(`  venues   ${fixtures.map((f) => f.id).join(", ")}`);
    console.log(`  clock    frozen at ${Object.values(WHEN).map((w) => w.label).join(" · ")} (${TZ})`);
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
    // Pin the BROWSER's zone as well as the page's clock. hours.js always names
    // the venue's zone explicitly so this cannot change an answer — but
    // `viewerOnVenueTime` reads the device's, and a run whose output depends on
    // the machine it ran on is a run nobody can compare.
    await cdp.send("Emulation.setTimezoneOverride", { timezoneId: TZ }, sessionId);

    const driver = createDriver(cdp, sessionId, (m) => report.step(m));
    driver.cdpNavigate = (url) => cdp.send("Page.navigate", { url }, sessionId);

    let frozen = null;
    const setClock = async (iso) => {
      if (frozen) await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: frozen }, sessionId);
      const r = await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClock(iso) }, sessionId);
      frozen = r.identifier;
    };

    for (const fx of fixtures) {
      const url = `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(fx.id)}`;
      console.log(`\n  ${fx.id} — ${fx.what}`);
      // The clock is installed for the NEXT document, so it must be set before
      // the navigation that will read it.
      await setClock(WHEN.inside.iso);
      await driver.cdpNavigate(url);
      driver.reload = () => driver.cdpNavigate(url);
      await checkAt(driver, report, fx, WHEN.inside, "inside");

      for (const key of ["before", "after"]) {
        await setClock(WHEN[key].iso);
        await checkAt(driver, report, fx, WHEN[key], key);
      }

      // Still on the 21:00 clock — the hour at which a filtered section would
      // have taken the fragment down with it.
      await checkDeepLink(driver, report, fx, url);
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
