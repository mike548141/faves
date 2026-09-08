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
//
// DAYLIGHT SAVING — added 2026-09-07, roadmap 190/030, owner-ruled the same day
// (*"not just wrapping spans but every hours computation across the switch"*).
// The four lines above used to end with *"It does not exercise a DST boundary…
// untested ground"*. It does now, and the second half of this file is that
// coverage. New Zealand moves to NZDT at 02:00 on Sunday 2026-09-27 (a
// 23-HOUR day: the wall clock 02:00–02:59 never occurs) and back at 03:00 on
// Sunday 2027-04-04 (a 25-HOUR day: 02:00–02:59 occurs TWICE). `segments()`
// works in absolute minutes-of-week and has no notion of either.
//
// The finding, so a reader of this header knows what a green run is asserting
// rather than assuming: the VERDICT is wall-clock and correct, because `hours`
// are wall-clock times and `nowIn` reads the venue's wall clock through Intl, so
// the two agree through a transition by construction.
//
// 🛑 THE COUNTDOWN IS NOT WALL-CLOCK, AND TWO EXPECTATIONS HERE FLIPPED ON
// 2026-09-08 (ADR 0098, roadmap 190/040, owner-ruled). This header used to pin
// two consequences as surprising-but-right:
//   • SEPTEMBER SWALLOWED THE COUNTDOWN — the "closing soon" window for a 3am
//     close was 02:00–02:59, exactly the hour that does not exist, so the badge
//     stepped from "Open · until 3am" straight to "Closed" and `sepLastNzst`
//     expected "Open · until 3am".
//   • APRIL REPEATED IT — the identical badge at 02:30 NZDT and 02:30 NZST, with
//     the first pass understating the real time left by an hour; `aprFirstPass`
//     expected "Closes in 30 min".
// The owner overruled leaving that documented. The countdown now measures REAL
// minutes between two instants, so `sepLastNzst` reads "Closes in 1 min" (03:00
// NZDT is one real minute after 01:59 NZST) and `aprFirstPass` reads
// "Open · until 3am" (ninety real minutes remain). `aprSecondPass` is
// unchanged at "Closes in 30 min", which is what makes the pair the assertion:
// the same wall clock an hour apart must now read DIFFERENTLY.
// The DST CONTROL is a pair of ordinary Mondays a week apart, both read at
// 14:30 local — one NZST, one NZDT — whose badges must be IDENTICAL. 14:30 is
// chosen so that an hour's error lands outside the control venue's 14:00
// opening: a clock hard-wired to the winter offset fails there and passes
// nearly everywhere else. Unit coverage, including the every-minute sweeps this
// file is too slow to run, is tests/hours-dst.test.js.
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

// ——————————————————— The daylight-saving instants (roadmap 190/030) ———————————
//
// Seven more, on the two real New Zealand transitions rather than in June. Each
// was confirmed against Intl before being written down — the offsets are the
// whole subject, so an instant assumed rather than checked would prove nothing
// and look like it proved something.
//
// The pairs are what carry the weight, not the individual instants:
//   sepLastNzst / sepFirstNzdt   ONE MINUTE apart in real time; the wall clock
//                                moves an hour and Dragonfly shuts.
//   aprFirstPass / aprSecondPass ONE HOUR apart in real time; the wall clock is
//                                the same and the badge must be too.
//   monNzst / monNzdt            the CONTROL: same wall clock, different
//                                offset, identical answer.
const DST = {
  sepLastNzst: { iso: "2026-09-26T13:59:00Z", label: "Sun 27 Sep 01:59 NZST" },
  sepFirstNzdt: { iso: "2026-09-26T14:00:00Z", label: "Sun 27 Sep 03:00 NZDT" },
  sepMiddayNzdt: { iso: "2026-09-27T00:00:00Z", label: "Sun 27 Sep 13:00 NZDT" },
  aprFirstPass: { iso: "2027-04-03T13:30:00Z", label: "Sun 4 Apr 02:30 NZDT" },
  aprSecondPass: { iso: "2027-04-03T14:30:00Z", label: "Sun 4 Apr 02:30 NZST" },
  monNzst: { iso: "2026-09-21T02:30:00Z", label: "Mon 21 Sep 14:30 NZST" },
  monNzdt: { iso: "2026-09-28T01:30:00Z", label: "Mon 28 Sep 14:30 NZDT" },
};

// Derived BY HAND off the data, then cross-checked against openStatus before
// being written down — and they agreed. The order matters: an expectation read
// out of the code under test agrees with that code by construction, including
// when the code is wrong (ADR 0072), so the hand reading is the expectation and
// the cross-check is only a guard against a typo.
//   dragonfly              Mon–Tue 16:30–23:00, Wed–Thu 16:30–00:00, Fri–Sat 16:30–03:00, Sun closed
//   sprig-and-fern-petone  Mon 14:00–22:00, Tue 12:00–22:00, Wed–Sat 12:00–23:00, Sun 12:00–22:00
const DST_SUBJECT_BADGE = {
  // Saturday's wrapped span, still running — and ONE REAL MINUTE from its 3am
  // close, because the next minute of real time is 03:00 NZDT (ADR 0098). Was
  // "Open · until 3am" until 2026-09-08, on the wall clock's 61 minutes.
  sepLastNzst: "Closes in 1 min",
  sepFirstNzdt: "Closed · opens Mon 4:30pm", // one minute later; Sunday is shut
  sepMiddayNzdt: "Closed · opens Mon 4:30pm",
  // 02:30 NZDT is NINETY real minutes from a 03:00 NZST close, so it is not
  // closing soon and the badge names the wall-clock close instead. Was
  // "Closes in 30 min" until 2026-09-08 — the understatement the item was filed
  // for, and the assertion that pinned it.
  aprFirstPass: "Open · until 3am",
  aprSecondPass: "Closes in 30 min", // an hour of real time on, and thirty left
  monNzst: "Closed · opens 4:30pm",
  monNzdt: "Closed · opens 4:30pm",
};

// The control's Sunday is 12:00–22:00, so it is shut for every small-hours
// instant here and open at Sunday lunchtime. Its Monday opens at 14:00, which
// is why 14:30 is the offset-invariance instant: read an hour early it is not
// open yet, and the badge would differ between the pair.
const DST_CONTROL_BADGE = {
  sepLastNzst: "Closed · opens 12pm",
  sepFirstNzdt: "Closed · opens 12pm",
  sepMiddayNzdt: "Open · until 10pm",
  aprFirstPass: "Closed · opens 12pm",
  aprSecondPass: "Closed · opens 12pm",
  monNzst: "Open · until 10pm",
  monNzdt: "Open · until 10pm",
};

// ——————————— A DAY THE VENUE NEVER PUBLISHED (roadmap 190/020, ADR 0105) ——————
//
// WHY IT LIVES IN THIS FILE AND NOT IN served_check. Both freeze the clock, and
// that is the only thing they share. `served_check` is about a menu SECTION's
// window — a thing that annotates and never filters. This is a claim about the
// venue's own open/closed BADGE, rendered from `hours` through the same two
// paths (menu.js `hoursRow`, app.js `hoursBadge`) that every other assertion
// here drives, and it is the neighbouring half of the same defect: 190/010 was
// "the week cannot hold a close after midnight", 190/020 is "the week cannot
// hold a day it was never told about". One subject, one file.
//
// 🛑 THE FIXTURE IS STAGED, AND SAYING SO IS THE POINT. No record in the corpus
// carries an unknown day. Abrakebabra is the venue that needs one — it publishes
// Sun–Tue, Thu, Fri and Sat and no Wednesday line at all — but NOTHING IN THIS
// REPO RECORDS ITS TIMES, only which days it publishes, so its hours were not
// restored and nothing here pretends to know them. Instead the control venue's
// own response is intercepted in the page and its Wednesday replaced with
// `null`, which stages the SHAPE without inventing a fact about any real venue.
// The interception rewrites the parsed body rather than the network response, so
// it survives the service worker answering from cache.
//
// THE PAIR IS THE ASSERTION, not either half. Every instant below is read TWICE
// — once with the day nulled and once against the untouched record — because
// "the badge says we do not know" is satisfiable by an engine that says it about
// every venue on every day, which would be a worse bug than the one being fixed.
// The unpatched reading at the same frozen instant is what refuses that.
const UNKNOWN_SUBJECT = CONTROL; // 12:00–23:00 Wed; a full, ordinary week
const UNKNOWN_DAY = "wed";

// Two instants, and they fail differently.
//   onTheDay  — ON the unpublished day. The verdict itself must change: a false
//               "Closed" here is the bug, and a BLANK is the same shape as it.
//   theEveBefore — the night before, when the venue really is shut and we know
//               it. The verdict is unchanged and correct; what must change is
//               the claim about which opening comes NEXT, because the answer
//               "Thu 12pm" quietly re-asserts the Wednesday the record was
//               rewritten to stop asserting.
const UNKNOWN_WHEN = {
  onTheDay: { iso: "2026-06-03T01:00:00Z", label: "Wed 3 Jun 13:00 NZST" },
  theEveBefore: { iso: "2026-06-02T10:30:00Z", label: "Tue 2 Jun 22:30 NZST" },
};

// Read off the data by hand (sprig-and-fern-petone: Mon 14:00–22:00, Tue
// 12:00–22:00, Wed–Sat 12:00–23:00, Sun 12:00–22:00), not derived from the
// engine — an expectation read out of the code under test agrees with that code
// by construction, including when the code is wrong (ADR 0072).
const UNKNOWN_BADGE = {
  onTheDay: "Hours not published today",
  theEveBefore: "Closed · next published opening Thu 12pm",
};
const KNOWN_BADGE = {
  onTheDay: "Open · until 11pm",
  theEveBefore: "Closed · opens Wed 12pm",
};

const HELP = `Usage: node tools/midnight_check.mjs [options]

Drives a real Chrome at 390 px, freezes the page clock at thirteen fixed
instants — six in June, seven on the two real New Zealand daylight-saving
transitions — and asserts what a venue trading past midnight says on screen, on
the menu page and on the home card, plus a control venue that must stay closed.

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

/**
 * Blank one day out of one venue's record, in the page, before any module runs.
 *
 * It wraps `fetch` and rewrites the PARSED BODY rather than the network
 * response, which is what makes it survive the service worker: whatever answers
 * — network, cache, or the worker's own fallback — the page sees the staged
 * shape. Nothing on disk is touched, so this cannot leak into the corpus or into
 * another check's run.
 */
const nullOneDay = (id, day) => `(() => {
  const real = globalThis.fetch;
  const target = "data/restaurants/" + ${JSON.stringify(id)} + ".json";
  globalThis.fetch = async (input, init) => {
    const res = await real(input, init);
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (!url.includes(target) || !res.ok) return res;
    const body = await res.clone().json();
    if (body && body.hours) body.hours[${JSON.stringify(day)}] = null;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
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
    console.log(`  and dst  ${Object.values(DST).map((w) => w.label).join(" · ")}`);
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

    // ——— DAYLIGHT SAVING: the same engine across a real transition ————————
    // Roadmap 190/030. Everything above is June — NZST, no transition within a
    // fortnight of it — which is exactly why this ground was untested.
    console.log(`\n  across the daylight-saving switch — 23-hour and 25-hour Sundays`);
    const dstSubject = {};
    const dstControl = {};
    for (const key of Object.keys(DST)) {
      await setClock(DST[key].iso);
      driver.reload = () => driver.cdpNavigate(menuUrl(SUBJECT));
      dstSubject[key] = await checkMenu(driver, report, SUBJECT, DST_SUBJECT_BADGE[key], DST[key]);
      driver.reload = () => driver.cdpNavigate(menuUrl(CONTROL));
      dstControl[key] = await checkMenu(driver, report, CONTROL, DST_CONTROL_BADGE[key], DST[key]);
    }

    // The September jump, stated as a reader would: one minute of real time
    // passes and the wall clock moves an hour, so a venue that was trading is
    // shut. These two are the crux of the whole item.
    // 🔁 FLIPPED 2026-09-08 (ADR 0098): this expected `"open"`. The venue is
    // still trading — that has not changed — but with the countdown measured in
    // real minutes it is one minute from shutting, which is the "closing-soon"
    // state. A fix that lost the wrap or the week boundary would say "closed"
    // here, so this still refuses the failure it was written for.
    report.check(
      `${SUBJECT} @ ${DST.sepLastNzst.label}: the last minute of NZST, and it is still TRADING`,
      dstSubject.sepLastNzst.state === "closing-soon",
      `dataset.state was ${JSON.stringify(dstSubject.sepLastNzst.state)}`,
    );
    report.check(
      `${SUBJECT} @ ${DST.sepFirstNzdt.label}: ONE MINUTE later the clock reads 3am and it is CLOSED`,
      dstSubject.sepFirstNzdt.state === "closed",
      `dataset.state was ${JSON.stringify(dstSubject.sepFirstNzdt.state)}`,
    );
    // 🔁 FLIPPED 2026-09-08 (ADR 0098). This asserted the countdown was
    // SWALLOWED — badge "Open · until 3am" at 01:59 NZST, then "Closed" — on the
    // reasoning that 02:00–02:59 is where "Closes in N min" would have lived and
    // that hour does not exist. It now asserts the opposite, and asserts it as
    // one claim rather than two: the badge names a number, and that number COMES
    // TRUE. One real minute is what it says, and one real minute later the venue
    // is shut. A wall-clock countdown said 61 and could not satisfy this.
    report.check(
      `${SUBJECT} @ ${DST.sepLastNzst.label}: "Closes in 1 min" COMES TRUE — one minute of real time later it is closed`,
      dstSubject.sepLastNzst.badge === "Closes in 1 min" &&
        dstSubject.sepLastNzst.state === "closing-soon" &&
        dstSubject.sepFirstNzdt.state === "closed",
      `got ${JSON.stringify(dstSubject.sepLastNzst.badge)} then ${JSON.stringify(dstSubject.sepFirstNzdt.badge)}`,
    );

    // The April repeated hour — the harder direction, and THE ITEM.
    //
    // 🔁 FLIPPED 2026-09-08 (ADR 0098). This asserted the two badges read
    // IDENTICALLY, which was the wall clock's answer and the understatement the
    // item was filed for: at 02:30 NZDT ninety real minutes remained and the
    // badge said thirty. They must now DIFFER, and differ in the one way that is
    // correct — the first pass names the close it cannot yet count to, the
    // second counts. A change that reverted the engine would make them identical
    // again and fail here, which is the point of asserting the pair rather than
    // each badge alone (each is already in the table above).
    report.check(
      `${SUBJECT}: 02:30 NZDT and 02:30 NZST are one hour of REAL time apart and must NOT read the same`,
      dstSubject.aprFirstPass.badge !== dstSubject.aprSecondPass.badge,
      `NZDT ${JSON.stringify(dstSubject.aprFirstPass.badge)} vs NZST ${JSON.stringify(dstSubject.aprSecondPass.badge)}`,
    );
    report.check(
      `${SUBJECT} @ ${DST.aprFirstPass.label}: 90 real minutes out is OPEN, not closing soon`,
      dstSubject.aprFirstPass.state === "open",
      `dataset.state was ${JSON.stringify(dstSubject.aprFirstPass.state)}`,
    );
    report.check(
      `${SUBJECT} @ ${DST.aprSecondPass.label}: the repeated hour is still INSIDE Saturday's wrapped span`,
      dstSubject.aprSecondPass.state === "closing-soon",
      `dataset.state was ${JSON.stringify(dstSubject.aprSecondPass.state)}`,
    );

    // THE CONTROL. Two ordinary Mondays a week apart, both at 14:30 local — one
    // NZST, one NZDT. Identical badges is what "the platform handles DST" means
    // stated as a claim about the product. Without this pair, a clock frozen to
    // the winter offset passes almost everything else in this file, because
    // every other instant here is either NZST already or an hour from nothing.
    report.check(
      `CONTROL: ${CONTROL} reads the same at 14:30 NZST and 14:30 NZDT`,
      dstControl.monNzst.badge === dstControl.monNzdt.badge &&
        dstControl.monNzst.badge === "Open · until 10pm",
      `NZST ${JSON.stringify(dstControl.monNzst.badge)} vs NZDT ${JSON.stringify(dstControl.monNzdt.badge)}`,
    );
    report.check(
      `CONTROL: ${SUBJECT} reads the same at 14:30 NZST and 14:30 NZDT`,
      dstSubject.monNzst.badge === dstSubject.monNzdt.badge,
      `NZST ${JSON.stringify(dstSubject.monNzst.badge)} vs NZDT ${JSON.stringify(dstSubject.monNzdt.badge)}`,
    );
    // The absence assertion, and the one most likely to rot: the control closes
    // at 22:00 or 23:00 every night of its week and must be shut at every
    // small-hours instant here. A change that made every venue survive a
    // transition open would satisfy every positive assertion above.
    for (const key of ["sepLastNzst", "sepFirstNzdt", "aprFirstPass", "aprSecondPass"]) {
      report.check(
        `CONTROL: ${CONTROL} is CLOSED at ${DST[key].label} — the wrap has not leaked across the switch`,
        dstControl[key].state === "closed",
        `dataset.state was ${JSON.stringify(dstControl[key].state)}`,
      );
    }

    // The PRINTED week is date-free — it formats the raw strings — so it must be
    // byte-identical either side of a transition. If a wrapped close were ever
    // rendered off the wrapped arithmetic, the offset is where it would show.
    const friSatNzst = dstSubject.sepLastNzst.week.find((r) => r[0] === "Fri–Sat");
    const friSatNzdt = dstSubject.sepMiddayNzdt.week.find((r) => r[0] === "Fri–Sat");
    report.check(
      `${SUBJECT}: the printed week reads "Fri–Sat 4:30pm–3am" in NZST AND in NZDT`,
      !!friSatNzst && friSatNzst[1] === "4:30pm–3am" && JSON.stringify(friSatNzst) === JSON.stringify(friSatNzdt),
      `NZST ${JSON.stringify(friSatNzst)} vs NZDT ${JSON.stringify(friSatNzdt)}`,
    );

    // The DAY BOUNDARY on screen (surface 4 of the ruling). Which row is
    // highlighted is the only place the reader sees which day the venue is
    // "in", and it is the thing an offset error moves first.
    report.check(
      `${SUBJECT} @ ${DST.sepFirstNzdt.label}: the week table still highlights SUNDAY after the jump`,
      JSON.stringify(dstSubject.sepFirstNzdt.todayRows) === JSON.stringify(["Sun"]),
      `highlighted ${JSON.stringify(dstSubject.sepFirstNzdt.todayRows)}`,
    );
    report.check(
      `${SUBJECT} @ ${DST.monNzdt.label}: an ordinary NZDT Monday highlights "Mon–Tue"`,
      JSON.stringify(dstSubject.monNzdt.todayRows) === JSON.stringify(["Mon–Tue"]),
      `highlighted ${JSON.stringify(dstSubject.monNzdt.todayRows)}`,
    );

    // And the second render path across the switch. app.js builds the home
    // card; a fix or a fault in only one of the two call sites is a real shape
    // this repo has shipped before.
    // The April pair is on this path too, added 2026-09-08 with ADR 0098: the
    // countdown correction lives in one engine but reaches the reader through
    // two renders, and a check that only ever asserts it on menu.js's would miss
    // an app.js that had been given its own copy of the arithmetic.
    console.log(`\n  the home screen across the switch — app.js's own path`);
    for (const key of ["sepLastNzst", "sepFirstNzdt", "monNzdt", "aprFirstPass", "aprSecondPass"]) {
      await setClock(DST[key].iso);
      await driver.cdpNavigate(homeUrl);
      await untilPresent(
        async () =>
          await driver.evalPage(
            `(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`,
          ),
        { label: "home: app.js filled the result count" },
      );
      const subj = await driver.evalPage(homeSnapshotExpr(SUBJECT));
      const ctrl = await driver.evalPage(homeSnapshotExpr(CONTROL));
      const at = DST[key].label;
      report.check(
        `home @ ${at}: ${SUBJECT}'s card badge reads "${DST_SUBJECT_BADGE[key]}"`,
        subj.badge === DST_SUBJECT_BADGE[key],
        `got ${JSON.stringify(subj.badge)}`,
      );
      report.check(
        `home @ ${at}: ${CONTROL}'s card badge reads "${DST_CONTROL_BADGE[key]}"`,
        ctrl.badge === DST_CONTROL_BADGE[key],
        `got ${JSON.stringify(ctrl.badge)}`,
      );
    }

    // ——— A DAY THE VENUE NEVER PUBLISHED (roadmap 190/020, ADR 0105) ————————
    // See the block above the fixtures for why the day is STAGED and why every
    // instant is read twice. `patched` is tracked like `frozen` so the staging
    // can be lifted for the unpatched half rather than being left running.
    console.log(`\n  a day the venue never published — ${UNKNOWN_SUBJECT}, ${UNKNOWN_DAY} nulled in the page`);
    let patched = null;
    const setPatch = async (on) => {
      if (patched) {
        await cdp.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: patched }, sessionId);
        patched = null;
      }
      if (!on) return;
      const r = await cdp.send(
        "Page.addScriptToEvaluateOnNewDocument",
        { source: nullOneDay(UNKNOWN_SUBJECT, UNKNOWN_DAY) },
        sessionId,
      );
      patched = r.identifier;
    };

    for (const key of Object.keys(UNKNOWN_WHEN)) {
      const when = UNKNOWN_WHEN[key];
      await setClock(when.iso);
      driver.reload = () => driver.cdpNavigate(menuUrl(UNKNOWN_SUBJECT));

      // THE UNPATCHED HALF FIRST, so the pair cannot be read as "this venue
      // always says that". Same venue, same instant, untouched record.
      await setPatch(false);
      const known = await checkMenu(driver, report, UNKNOWN_SUBJECT, KNOWN_BADGE[key], when);

      await setPatch(true);
      const s = await checkMenu(driver, report, UNKNOWN_SUBJECT, UNKNOWN_BADGE[key], when);
      report.check(
        `${UNKNOWN_SUBJECT} @ ${when.label}: nulling ${UNKNOWN_DAY} CHANGED the badge`,
        s.badge !== known.badge,
        `both read ${JSON.stringify(s.badge)} — the staging did not reach the page`,
      );

      // The week table, on both readings. The unknown day must print WORDS, and
      // a real closed day elsewhere in the same table must be untouched — a
      // formatter that printed "Not published" for everything would satisfy the
      // first half and fail the second.
      const row = (snap, days) => (snap.week.find((r) => r[0] === days) || [])[1] ?? null;
      report.check(
        `${UNKNOWN_SUBJECT} @ ${when.label}: the week table prints "Wed  Not published"`,
        row(s, "Wed") === "Not published",
        `got ${JSON.stringify(row(s, "Wed"))} from ${JSON.stringify(s.week)}`,
      );
      report.check(
        `${UNKNOWN_SUBJECT} @ ${when.label}: the SAME table still prints "Mon  2pm–10pm"`,
        row(s, "Mon") === "2pm–10pm",
        `got ${JSON.stringify(row(s, "Mon"))} from ${JSON.stringify(s.week)}`,
      );
      report.check(
        `${UNKNOWN_SUBJECT} @ ${when.label}: unpatched, Wednesday still prints its hours`,
        row(known, "Wed–Sat") === "12pm–11pm",
        `got ${JSON.stringify(row(known, "Wed–Sat"))} from ${JSON.stringify(known.week)}`,
      );
    }

    // ON the unpublished day, the two claims that ARE the item — asserted
    // separately from the badge string because they fail independently.
    await setClock(UNKNOWN_WHEN.onTheDay.iso);
    await setPatch(true);
    driver.reload = () => driver.cdpNavigate(menuUrl(UNKNOWN_SUBJECT));
    await driver.reload();
    await untilPresent(
      async () => await driver.evalPage(`!!document.querySelector(".contact-hours")`),
      { label: `${UNKNOWN_SUBJECT}: the contact card's hours row` },
    );
    const onDay = await driver.evalPage(menuSnapshotExpr);
    report.check(
      `${UNKNOWN_SUBJECT} @ ${UNKNOWN_WHEN.onTheDay.label}: the state is "unknown-today", NOT "closed"`,
      onDay.state === "unknown-today",
      `dataset.state was ${JSON.stringify(onDay.state)}`,
    );
    // A BLANK IS THE SAME SHAPE AS THE BUG. `unknown` draws no badge at all at
    // every call site on the site, so a fourth state that collapsed into it
    // would leave a reader with nothing to read — which is indistinguishable
    // from nobody having thought the day worth mentioning. This assertion is the
    // one that refuses that, and it is the one most likely to rot.
    report.check(
      `${UNKNOWN_SUBJECT} @ ${UNKNOWN_WHEN.onTheDay.label}: a badge IS drawn — the day is not a blank`,
      typeof onDay.badge === "string" && onDay.badge.trim().length > 0,
      `badge was ${JSON.stringify(onDay.badge)}`,
    );

    // And the second render path: app.js's home card, built from the same
    // engine through different code. A fix applied to one call site and not the
    // other is a real shape this repo has shipped.
    await driver.cdpNavigate(homeUrl);
    await untilPresent(
      async () =>
        await driver.evalPage(
          `(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`,
        ),
      { label: "home: app.js filled the result count" },
    );
    const homeUnknown = await driver.evalPage(homeSnapshotExpr(UNKNOWN_SUBJECT));
    report.check(
      `home @ ${UNKNOWN_WHEN.onTheDay.label}: ${UNKNOWN_SUBJECT}'s card is still on the page`,
      homeUnknown.found === true,
      `the card was not found — a venue we cannot place must not vanish from the list`,
    );
    report.check(
      `home @ ${UNKNOWN_WHEN.onTheDay.label}: the card badge reads "${UNKNOWN_BADGE.onTheDay}"`,
      homeUnknown.badge === UNKNOWN_BADGE.onTheDay,
      `got ${JSON.stringify(homeUnknown.badge)}`,
    );
    await setPatch(false);

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
