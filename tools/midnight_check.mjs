// Faves midnight check — a venue that trades past midnight, on screen, in a
// real browser, on a FROZEN clock. On the same harness as the rest of the
// family (tools/lib/browser.mjs).
//
// WHY THIS EXISTS. Until 2026-09-07 `hours` could not express a close after
// midnight. `segments()` in site/js/hours.js turned `["16:30", "03:00"]` into a
// segment running from minute 990 to minute 180 — one that ENDS BEFORE IT
// STARTS. Nothing rejected it, and `openStatus` simply never found `now` inside
// it, so a venue trading till 3am read **closed for the whole evening**. ADR
// 0094 made a close at or before its open mean the next day.
//
// The claim that ruling is worth anything for is not an arithmetic one. It is:
// **"at 1am on a Saturday, Dragonfly's page says Open."** No unit test can make
// that claim — tests/hours.test.js pins the minutes, and the minutes were
// already pinned by a function nobody had looked at. What is asserted here is
// the RENDER: the badge a person reads, on two different screens that build it
// through two different code paths (menu.js `hoursRow`, app.js `hoursBadge`),
// with the clock held still.
//
// THE CLOCK IS FROZEN, NOT READ — same mechanism and same reason as
// served_check.mjs. A check whose verdict depends on the hour it ran gets
// switched off within a week, and this one's whole subject is an hour nobody
// runs a test suite at. Every instant below is a fixed UTC moment injected
// before any page script runs (Page.addScriptToEvaluateOnNewDocument replacing
// `Date`), with the browser's zone pinned to match. June — NZST, no DST edge to
// argue about.
//
// THE ABSENCE ASSERTION IS THE ONE MOST LIKELY TO ROT. A change that made
// EVERY venue read open at 1am would satisfy every positive assertion here.
// So a control venue that closes at 23:00 (sprig-and-fern-petone) is opened at
// the same frozen instants and must read CLOSED. Without it this file would
// pass with `openStatus` hard-wired to return "open".
//
// THE WEEK BOUNDARY IS A SEPARATE FAILURE FROM THE WRAP. A Saturday night
// closing at 3am ends at absolute minute 10260 where the week is 10080 long, so
// Sunday 1am (minute 60) is not inside it by direct comparison. ADR 0006 named
// exactly this edge when it REJECTED the wrap in 2026-07. A fix that handles
// Friday night and not Saturday night passes every other assertion in this file
// and fails the venue on its busiest hour — so Sunday 01:00 is asserted on its
// own.
//
// WHAT A GREEN RUN HERE STILL CANNOT TELL YOU.
//   • It cannot tell you Dragonfly really trades till 3am. That came off the
//     venue's own website via a person; no browser can check it against the door.
//   • It says nothing about the 55 other venues, or about a venue abroad —
//     every fixture here is Pacific/Auckland, because every venue in the corpus
//     is.
//   • It cannot tell you the badge READS well at 1am, only that it says the
//     right words.
//   • It does not exercise a DST boundary. NZDT starts in late September; a
//     wrapped span crossing the switch is untested ground, named in ADR 0094.
//
// NOT PART OF THE SHIPPED SITE. Dev tooling — no npm install, no dependency
// added to the site (ADR 0001). Fresh Chrome profile per run, because a stale
// service worker will happily serve the last run's modules.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");
const TZ = "Pacific/Auckland"; // every venue in the corpus; none carries its own

// Six instants. Monday 1 June 2026 anchors the week (so Fri = 5th, Sat = 6th,
// Sun = 7th), NZST throughout. Each was confirmed against Intl before being
// written down rather than worked out in the head — an off-by-one day here
// would silently move every assertion to a different set of hours.
const WHEN = {
  friEvening: { iso: "2026-06-05T08:00:00Z", label: "Fri 20:00 NZST" },
  satEarly: { iso: "2026-06-05T13:00:00Z", label: "Sat 01:00 NZST" },
  satClosing: { iso: "2026-06-05T14:55:00Z", label: "Sat 02:55 NZST" },
  satShut: { iso: "2026-06-05T15:30:00Z", label: "Sat 03:30 NZST" },
  sunEarly: { iso: "2026-06-06T13:00:00Z", label: "Sun 01:00 NZST" },
  thuLate: { iso: "2026-06-04T11:30:00Z", label: "Thu 23:30 NZST" },
};

// Expected strings are written out in full rather than recomputed from
// hours.js. A check that derives its expectation from the code under test
// agrees with that code by construction, including when the code is wrong
// (ADR 0072). These were read off the data by hand:
//   dragonfly              Mon–Tue 16:30–23:00, Wed–Thu 16:30–00:00, Fri–Sat 16:30–03:00, Sun closed
//   sprig-and-fern-petone  Fri and Sat 12:00–23:00  (the control — never wraps)
const SUBJECT = "dragonfly";
const CONTROL = "sprig-and-fern-petone";

// What the badge must say on the MENU page, per instant.
const SUBJECT_BADGE = {
  friEvening: "Open · until 3am",
  satEarly: "Open · until 3am",
  satClosing: "Closes in 5 min",
  satShut: "Closed · opens 4:30pm",
  sunEarly: "Open · until 3am",
  thuLate: "Closes in 30 min",
};

// The control closes at 11pm every night it opens, and is shut all six of
// these instants except Friday evening. If any of these ever reads "Open",
// the wrap has leaked onto records that never asked for it.
const CONTROL_BADGE = {
  friEvening: "Open · until 11pm",
  satEarly: "Closed · opens 12pm",
  satClosing: "Closed · opens 12pm",
  satShut: "Closed · opens 12pm",
  sunEarly: "Closed · opens 12pm",
  // The control's Thursday is 12:00–23:00, so at 23:30 it has ALREADY shut and
  // the next opening is Friday. Written wrong the first time — copied from the
  // subject's row, where 23:30 is half an hour before a midnight close — and
  // the check caught it, which is the only reason this comment can be honest
  // about it: the two venues differ here and that is the point of the control.
  thuLate: "Closed · opens Fri 12pm",
};

const HELP = `Usage: node tools/midnight_check.mjs [options]

Drives a real Chrome at 390 px, freezes the page clock at six fixed instants,
and asserts what a venue trading past midnight says on screen — on the menu
page and on the home card — plus a control venue that must stay closed.

Options:
  --port <n>       serve site/ on this port (default: an ephemeral one)
  --headed         show the browser
  --keep-profile   keep the throwaway Chrome profile for inspection
  --verbose        trace every page action
  -h, --help       this
`;

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
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
 * `getTime` would throw there. Lifted verbatim from served_check.mjs; the two
 * freeze the same way on purpose.
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

/** The hours badge and the week table as a reader sees them, on a menu page. */
const menuSnapshotExpr = `(() => {
  const text = (el) => (el ? el.textContent.replace(/\\s+/g, " ").trim() : null);
  const row = document.querySelector(".contact-hours");
  const badge = row ? row.querySelector(".hours-badge") : null;
  return {
    // Named separately so a missing contact row is not reported as a wrong
    // badge — two different faults with two different fixes.
    hasRow: !!row,
    badge: text(badge),
    state: badge ? badge.dataset.state : null,
    // The weekly table. The wrapped close has to survive into the printed
    // hours too: "4:30pm-3am" is what the venue's card should read, and a
    // formatter that stringified the WRAPPED minutes would print "27am".
    week: [...(row ? row.querySelectorAll(".hours-list li") : [])].map((li) => [
      text(li.querySelector(".hours-days")),
      text(li.querySelector(".hours-time")),
    ]),
    todayRows: [...(row ? row.querySelectorAll(".hours-list li.is-today") : [])].map((li) =>
      text(li.querySelector(".hours-days")),
    ),
  };
})()`;

/** One venue's card on the HOME screen — a different render path to the above. */
const homeSnapshotExpr = (id) => `(() => {
  const text = (el) => (el ? el.textContent.replace(/\\s+/g, " ").trim() : null);
  const link = [...document.querySelectorAll("#restaurant-list .card-link")].find(
    (a) => new URL(a.href, location.href).searchParams.get("id") === ${JSON.stringify(id)},
  );
  const card = link ? link.closest(".card") : null;
  const badge = card ? card.querySelector(".hours-badge") : null;
  return {
    // A venue filtered off the home list would give a null badge that reads
    // exactly like a missing one, so the card's presence is its own answer.
    found: !!card,
    badge: text(badge),
    state: badge ? badge.dataset.state : null,
  };
})()`;

async function checkMenu(driver, report, id, expected, when) {
  await driver.reload();
  await untilPresent(
    async () => await driver.evalPage(`!!document.querySelector(".contact-hours")`),
    { label: `${id}: the contact card's hours row` },
  );
  const s = await driver.evalPage(menuSnapshotExpr);
  const at = `${id} @ ${when.label}`;
  report.check(`${at}: the menu page's badge reads "${expected}"`, s.badge === expected, `got ${JSON.stringify(s.badge)}`);
  return s;
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-midnight-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log(`Faves midnight check — a venue that trades past midnight, on a frozen clock`);
    console.log(`  subject  ${SUBJECT} (Fri–Sat 16:30–03:00, Wed–Thu 16:30–00:00)`);
    console.log(`  control  ${CONTROL} (closes 23:00 — must never read open at 1am)`);
    console.log(`  clock    ${Object.values(WHEN).map((w) => w.label).join(" · ")} (${TZ})`);
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
    // Pin the BROWSER's zone as well as the page's clock. hours.js names the
    // venue's zone explicitly so this cannot change an answer — but
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

    const menuUrl = (id) => `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(id)}`;
    const homeUrl = `http://127.0.0.1:${port}/index.html`;

    // ——— The subject, on its menu page, at every instant ———————————————————
    console.log(`\n  ${SUBJECT} — the menu page, across the wrap`);
    for (const key of Object.keys(WHEN)) {
      await setClock(WHEN[key].iso);
      driver.reload = () => driver.cdpNavigate(menuUrl(SUBJECT));
      const s = await checkMenu(driver, report, SUBJECT, SUBJECT_BADGE[key], WHEN[key]);
      if (key === "satEarly") {
        // The whole point of the ruling, stated as a reader would: it is 1am on
        // a Saturday and the place is trading.
        report.check(
          `${SUBJECT} @ ${WHEN[key].label}: the state is "open", not "closed"`,
          s.state === "open",
          `dataset.state was ${JSON.stringify(s.state)}`,
        );
        // The printed week must carry the wrapped close in wall-clock words.
        // A formatter fed the wrapped minutes (180 + 1440 = 1620) would print
        // something like "3am" for the wrong day or "27am"; this pins the row.
        const friSat = s.week.find((r) => r[0] === "Fri–Sat");
        report.check(
          `${SUBJECT}: the week table prints "Fri–Sat 4:30pm–3am"`,
          !!friSat && friSat[1] === "4:30pm–3am",
          `got ${JSON.stringify(friSat)} from ${JSON.stringify(s.week)}`,
        );
        const wedThu = s.week.find((r) => r[0] === "Wed–Thu");
        report.check(
          `${SUBJECT}: a midnight close prints as "4:30pm–12am", not as "late"`,
          !!wedThu && wedThu[1] === "4:30pm–12am",
          `got ${JSON.stringify(wedThu)}`,
        );
      }
      if (key === "sunEarly") {
        // The week-boundary case, asserted on its own: Saturday's segment runs
        // past the end of the week, so this is the one a half-applied fix
        // fails. See the header.
        report.check(
          `${SUBJECT} @ ${WHEN[key].label}: SATURDAY'S span survives the week boundary into Sunday`,
          s.state === "open",
          `dataset.state was ${JSON.stringify(s.state)}`,
        );
      }
      if (key === "satShut") {
        report.check(
          `${SUBJECT} @ ${WHEN[key].label}: past the wrapped close it is shut again`,
          s.state === "closed",
          `dataset.state was ${JSON.stringify(s.state)}`,
        );
      }
    }

    // ——— The control, same instants — the absence assertion ————————————————
    console.log(`\n  ${CONTROL} — the control: closes at 11pm, must not have moved`);
    for (const key of Object.keys(WHEN)) {
      await setClock(WHEN[key].iso);
      driver.reload = () => driver.cdpNavigate(menuUrl(CONTROL));
      const s = await checkMenu(driver, report, CONTROL, CONTROL_BADGE[key], WHEN[key]);
      if (key === "satEarly" || key === "sunEarly") {
        report.check(
          `${CONTROL} @ ${WHEN[key].label}: a venue that closes at 11pm is CLOSED at 1am`,
          s.state === "closed",
          `dataset.state was ${JSON.stringify(s.state)} — the wrap has leaked onto a record that never asked for it`,
        );
      }
    }

    // ——— The home card: a second render path to the same answer ———————————
    // app.js `hoursBadge` builds this, menu.js `hoursRow` built the ones above.
    // Two call sites, one engine — and a fix applied to only one of them is a
    // real shape (this repo has shipped that exact bug in ranking.js).
    console.log(`\n  the home screen — the same answer, built by app.js instead`);
    for (const key of ["satEarly", "sunEarly", "satShut"]) {
      await setClock(WHEN[key].iso);
      await driver.cdpNavigate(homeUrl);
      // Readiness must be something ONLY app.js can produce. The fail-soft <ul>
      // in index.html uses the same `.card-link` class as the rendered cards,
      // so waiting on THAT is satisfied by the fallback — this check did
      // exactly that on its first run and reported four null badges as
      // failures, when the truth was that it had sampled the static list.
      // `#result-count` is empty in the HTML and only app.js ever fills it
      // (the same marker, and the same reasoning, as boot_check.mjs).
      await untilPresent(
        async () =>
          await driver.evalPage(
            `(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`,
          ),
        { label: "home: app.js filled the result count" },
      );
      // And assert it, rather than only waiting for it: a wait that times out
      // is a harness story, an assertion is a claim about the site. If the
      // fallback is on screen then every badge below is null for a reason that
      // has nothing to do with opening hours, and saying so here stops this
      // file blaming the wrong subsystem.
      const drawn = await driver.evalPage(`(() => {
        const note = document.querySelector(".fallback-note");
        const visible = note && !note.hidden && getComputedStyle(note).display !== "none";
        return !visible;
      })()`);
      report.check(`home @ ${WHEN[key].label}: app.js drew the list, not the no-JS fallback`, drawn === true);
      const subj = await driver.evalPage(homeSnapshotExpr(SUBJECT));
      const ctrl = await driver.evalPage(homeSnapshotExpr(CONTROL));
      const at = WHEN[key].label;
      report.check(`home @ ${at}: ${SUBJECT}'s card is on the page`, subj.found === true);
      report.check(
        `home @ ${at}: ${SUBJECT}'s card badge reads "${SUBJECT_BADGE[key]}"`,
        subj.badge === SUBJECT_BADGE[key],
        `got ${JSON.stringify(subj.badge)}`,
      );
      report.check(`home @ ${at}: ${CONTROL}'s card is on the page`, ctrl.found === true);
      report.check(
        `home @ ${at}: ${CONTROL}'s card badge reads "${CONTROL_BADGE[key]}"`,
        ctrl.badge === CONTROL_BADGE[key],
        `got ${JSON.stringify(ctrl.badge)}`,
      );
    }

    return report.summary(SITE) ? 0 : 1;
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
  // Classified in ONE place (lib/browser.mjs's exitFromError): a missing element
  // is a claim about the site (exit 1), a dead transport is not (exit 2).
  process.exit(exitFromError(err));
}
