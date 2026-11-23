// The activity screen, in a real browser (Theme 32b, roadmap 390/020).
//
// WHY THIS EXISTS. tests/activity-view.test.js proves the sentences, the day
// grouping and the link rule as pure logic. What it cannot see is the panel:
// that Settings really has the row, that a heart tapped on a real menu really
// lands in the log and then on the screen, that the app's own entries are really
// held back until the toggle is pressed, that an empty log really says WHY it is
// empty, and that none of it widens the sheet at 390 px. Each of those is a
// wiring claim, and the pure tests are green whether or not the wiring holds.
//
// WHAT IT ASSERTS, in the order the owner's item asks for them:
//   1. EMPTY SAYS SO. A fresh device's panel names the day Faves started keeping
//      the log. (An empty history that does not say why reads as broken.)
//   2. A REAL TAP APPEARS. Hearting a dish on a menu page puts "Added … to your
//      favourites" on the screen, newest first, with a link back to that dish —
//      and un-hearting adds a removal ABOVE it without erasing the add (the
//      owner's "honest log" ruling).
//   3. THE QUIET HALF IS QUIET. An app-update entry recorded while the panel is
//      open is counted but not shown; the toggle shows it and says it is pressed.
//   4. A DISH THAT HAS GONE KEEPS ITS SENTENCE AND LOSES ITS LINK, and an entry
//      from yesterday sits under its own heading.
//   5. 390 PX. No horizontal overflow with a long label and 60 rows; every
//      control and every linked row is at least 44 px tall.
//   6. TE REO MARKING. With the language on te reo, "Yesterday" is the looked-up
//      headword and the element carries lang="mi" (WCAG 3.1.2).
//
// WHAT A GREEN RUN CANNOT TELL YOU:
//   • That the log records the RIGHT things — that is tests/activity-wiring.test.js
//     and the stores' own tests. This check records exactly one thing through the
//     real UI (a heart) and the rest straight into the log.
//   • That `app.updated` / `data.updated` / `cache.refreshed` are ever written by
//     the real service worker (tools/fetch_check.mjs drives data.updated; the
//     other two are unit-tested only, 390/030). Here they are written by hand.
//   • Whether the screen is pleasant to read. `--shots DIR` writes 390 px
//     screenshots (empty, populated, dark) for a human to look at.
//
//     node tools/activity_check.mjs              # all scenarios
//     node tools/activity_check.mjs -v           # narrate each step
//     node tools/activity_check.mjs --shots DIR  # also write screenshots
//
// Exit 0 = every assertion held. 1 = at least one didn't.

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  Cdp,
  Report,
  answerGeoAskBeforeLoad,
  createDriver,
  launchChrome,
  startServer,
  stopChrome,
  untilPresent,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");
const VENUE = "the-ramen-shop";

// Everything the panel shows, read in one go so each assertion measures one paint.
const PROBE = `(() => {
  const panel = document.querySelector(".activity-panel");
  const shown = !!panel && !panel.hidden && panel.getClientRects().length > 0;
  const text = (n) => (n?.textContent || "").replace(/\\s+/g, " ").trim();
  const rows = [...document.querySelectorAll(".activity-item")].map((n) => ({
    text: text(n.querySelector(".activity-text")),
    time: text(n.querySelector(".activity-time")),
    href: n.tagName === "A" ? n.getAttribute("href") : null,
    h: +n.getBoundingClientRect().height.toFixed(1),
  }));
  const heads = [...document.querySelectorAll(".activity-day-head")].map((n) => ({
    text: text(n),
    lang: n.getAttribute("lang"),
  }));
  const toggle = document.querySelector(".activity-toggle");
  const sheet = document.querySelector(".settings-sheet");
  return {
    shown,
    empty: text(document.querySelector(".activity-empty")),
    rows,
    heads,
    hidden: text(document.querySelector(".activity-hidden")),
    foot: text(document.querySelector(".activity-foot")),
    pressed: toggle?.getAttribute("aria-pressed") ?? null,
    toggleH: toggle ? +toggle.getBoundingClientRect().height.toFixed(1) : null,
    sheetOpen: !!sheet?.open,
    // Overflow, three ways: the page, the sheet's own scroll width, and any one
    // row that pokes out of the panel.
    pageOverflow: document.documentElement.scrollWidth - innerWidth,
    sheetOverflow: sheet ? sheet.scrollWidth - sheet.clientWidth : null,
    rowOverflow: panel
      ? Math.max(0, ...[...panel.querySelectorAll(".activity-item")].map((n) => n.scrollWidth - n.clientWidth))
      : null,
  };
})()`;

async function openMenu(cdp, sessionId, driver, port) {
  await cdp.send(
    "Page.navigate",
    { url: `http://127.0.0.1:${port}/restaurant.html?id=${VENUE}` },
    sessionId
  );
  // The search field, never ".menu-status" ("Loading menu…" ships in the static
  // markup and carries that class).
  await untilPresent(() => driver.evalPage(`!!document.querySelector(".menu-search")`), {
    label: `${VENUE} rendered`,
  });
  await driver.settle();
}

async function openActivity(driver) {
  // The ⋯ button lives in the page's top bar, not a sticky one, so after a tap
  // that scrolled the menu a person scrolls back up before reaching it. Do the
  // same, with the harness's own instant scroll: letting `click` scroll it into
  // view mid-way leaves a sticky strip painted over it for a frame.
  await driver.scrollTo(0);
  await driver.click("#overflow-btn");
  await driver.click("#settings-btn");
  await untilPresent(() => driver.evalPage(`!!document.querySelector(".settings-sheet[open]")`), {
    label: "the Settings sheet to open",
  });
  await driver.click(".settings-row", "Activity history");
  await untilPresent(() => driver.evalPage(`!!document.querySelector(".activity-panel") && !document.querySelector(".activity-panel").hidden`), {
    label: "the activity panel",
  });
  await driver.settle();
}

async function closeSettings(driver) {
  await driver.evalPage(`document.querySelector(".settings-sheet")?.close(); true`);
  await driver.settle();
}

/** Put entries straight into the active person's log (through the page's own
 *  module instance, so the panel's subscription hears it) — or, with `raw`, into
 *  storage under the scoped key, the way a log from an earlier day would be. */
const record = (driver, kind, subject, from = null, to = null) =>
  driver.evalPage(`(async () => {
    const { activity } = await import("/js/activity.js");
    return activity.record(${JSON.stringify(kind)}, ${JSON.stringify(subject)}, ${JSON.stringify(from)}, ${JSON.stringify(to)});
  })()`);

const seed = (driver, entries) =>
  driver.evalPage(`(async () => {
    const { activity } = await import("/js/activity.js");
    const { profiles } = await import("/js/profiles.js");
    const key = profiles.scopedKey("faves.activity.v1");
    const mine = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([...(${JSON.stringify(entries)}), ...mine]));
    activity.reload();
    return true;
  })()`);

async function shot(cdp, sessionId, dir, name) {
  if (!dir) return;
  await mkdir(dir, { recursive: true });
  const r = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  await writeFile(join(dir, name), Buffer.from(r.data, "base64"));
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-activity-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log("Faves activity-screen check — does the log reach the screen, and say what it should?");
    console.log(`  venue    ${VENUE}`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await answerGeoAskBeforeLoad(cdp, sessionId);
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 844, deviceScaleFactor: 2, mobile: false },
      sessionId
    );

    // Light on purpose: the headless browser's own default follows the machine,
    // which was dark when this was written, so "the light picture" was not.
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] }, sessionId);

    // ── 1. A fresh device: empty, and it says why ──────────────────────────
    await openMenu(cdp, sessionId, driver, port);
    await openActivity(driver);
    const empty = await driver.evalPage(PROBE);
    report.check("Settings has an 'Activity history' row that opens the panel", empty.shown && empty.sheetOpen, `shown=${empty.shown}`);
    report.check(
      "an empty log says it is empty AND when Faves started keeping it",
      /Nothing here yet/.test(empty.empty) && /18 October 2026/.test(empty.empty),
      empty.empty || "(no empty-state line)"
    );
    report.check("an empty log lists no rows and no day headings", empty.rows.length === 0 && empty.heads.length === 0, `${empty.rows.length} rows, ${empty.heads.length} headings`);
    report.check("the cap is stated (no silent cap)", /last 500 changes/.test(empty.foot), empty.foot);
    report.check(
      "the honest-log rule is stated on the screen in words",
      await driver.evalPage(`/nothing is ever erased/i.test(document.querySelector(".activity-panel .settings-note")?.textContent || "")`),
      "the intro sentence"
    );
    report.check(
      "empty state: no horizontal overflow at 390 px",
      empty.pageOverflow <= 0 && empty.sheetOverflow <= 0,
      `page ${empty.pageOverflow}, sheet ${empty.sheetOverflow}`
    );
    await shot(cdp, sessionId, opts.shots, "activity-empty-light.png");
    await closeSettings(driver);

    // ── 2. A real heart reaches the screen, with a link back ───────────────
    // A DISH's heart, not the venue's (the first `.heart` on the page is the
    // venue's, in the title row): the link under test is the dish's anchor.
    const pick = await driver.evalPage(`(() => {
      const h = [...document.querySelectorAll(".heart")].find((n) => !n.closest(".menu-title-row"));
      if (!h) return false;
      h.setAttribute("data-pick", "1");
      return true;
    })()`);
    report.check("(setup) the menu has a dish heart to press", pick === true);
    await driver.click("[data-pick]");
    await driver.settle();
    const added = await driver.evalPage(`(async () => {
      const { activity } = await import("/js/activity.js");
      const last = activity.entries().at(-1);
      return last ? { kind: last.kind, label: last.subject.label, dish: last.subject.dish } : null;
    })()`);
    report.check("(setup) tapping a heart wrote favourite.add to the log", added?.kind === "favourite.add" && !!added.label, JSON.stringify(added));
    await openActivity(driver);
    const one = await driver.evalPage(PROBE);
    const addRow = one.rows[0];
    report.check(
      "the heart shows as 'Added … to your favourites' under Today",
      !!addRow && addRow.text === `Added ${added?.label} to your favourites` && one.heads[0]?.text === "Today",
      JSON.stringify({ row: addRow?.text, head: one.heads[0]?.text })
    );
    report.check(
      "…with a time, and a link to the dish that still exists",
      !!addRow && /\d:\d\d/.test(addRow.time) && addRow.href === `restaurant.html?id=${VENUE}#dish-${added?.dish}`,
      JSON.stringify({ time: addRow?.time, href: addRow?.href })
    );
    report.check("the empty line is gone once there is something to show", one.empty === "", one.empty);
    report.check("…and the footer now gives the start date too", /18 October 2026/.test(one.foot), one.foot);
    await closeSettings(driver);

    // Un-heart: a removal appears above the add, and the add stays.
    await driver.click("[data-pick]");
    await driver.settle();
    await openActivity(driver);
    const two = await driver.evalPage(PROBE);
    report.check(
      "un-hearting adds a removal ABOVE the add — nothing is erased",
      two.rows.length === 2 &&
        two.rows[0].text === `Removed ${added?.label} from your favourites` &&
        two.rows[1].text === `Added ${added?.label} to your favourites`,
      JSON.stringify(two.rows.map((r) => r.text))
    );

    // ── 3. The quiet half ──────────────────────────────────────────────────
    await record(driver, "data.updated", {}, "aaaa", "bbbb");
    await record(driver, "app.updated", {}, "2026-11-18.1", "2026-11-24.2");
    await driver.settle();
    const quiet = await driver.evalPage(PROBE);
    report.check(
      "app entries recorded while the panel is open are NOT shown by default",
      quiet.rows.length === 2 && !quiet.rows.some((r) => /updated/i.test(r.text)),
      JSON.stringify(quiet.rows.map((r) => r.text))
    );
    report.check(
      "…but they are counted, so the hiding is not silent",
      /2 app and menu updates are hidden/.test(quiet.hidden) && quiet.pressed === "false",
      `"${quiet.hidden}", pressed=${quiet.pressed}`
    );
    await driver.click(".activity-toggle");
    await driver.settle();
    const loud = await driver.evalPage(PROBE);
    report.check(
      "the toggle shows them, says it is pressed, and drops the hidden count",
      loud.pressed === "true" &&
        loud.rows.some((r) => r.text === "Menus and prices updated") &&
        loud.rows.some((r) => r.text === "Faves updated to version 2026-11-24.2") &&
        loud.hidden === "",
      JSON.stringify({ pressed: loud.pressed, rows: loud.rows.map((r) => r.text), hidden: loud.hidden })
    );
    report.check(
      "an app entry has no link (it points at nothing)",
      loud.rows.filter((r) => /updated/i.test(r.text)).every((r) => r.href === null),
      JSON.stringify(loud.rows.filter((r) => /updated/i.test(r.text)))
    );
    await driver.click(".activity-toggle");
    await closeSettings(driver);

    // ── 4. A gone dish keeps its sentence, loses its link; yesterday heads ──
    const yesterday = new Date(Date.now() - 26 * 3600e3).toISOString().slice(0, 19) + "Z";
    const lastWeek = new Date(Date.now() - 9 * 86400e3).toISOString().slice(0, 19) + "Z";
    await seed(driver, [
      { at: lastWeek, kind: "favourite.add", subject: { venue: VENUE, dish: "no-such-dish-anywhere", label: "The Vanished Noodle Of A Remarkably Long And Unbreakable Name" }, from: null, to: null },
      { at: yesterday, kind: "rating.set", subject: { venue: "no-such-venue", dish: "x", label: "Ghost Dish" }, from: null, to: 4 },
    ]);
    await openMenu(cdp, sessionId, driver, port); // a reload: the log is read back from storage
    await openActivity(driver);
    await untilPresent(() => driver.evalPage(`document.querySelectorAll(".activity-item").length >= 4`), { label: "seeded rows" });
    await driver.settle();
    const gone = await driver.evalPage(PROBE);
    const vanished = gone.rows.find((r) => /Vanished/.test(r.text));
    const ghost = gone.rows.find((r) => /Ghost/.test(r.text));
    report.check(
      "the log survives a reload (it is read back from storage)",
      gone.rows.some((r) => /Added .* to your favourites/.test(r.text)) && gone.rows.length >= 4,
      `${gone.rows.length} rows`
    );
    report.check(
      "a dish that left its menu keeps its sentence and has NO link",
      !!vanished && vanished.href === null && /^Added The Vanished Noodle/.test(vanished.text),
      JSON.stringify(vanished)
    );
    report.check(
      "an entry for a venue that is gone has no link either",
      !!ghost && ghost.href === null && ghost.text === "Rated Ghost Dish 4 out of 5",
      JSON.stringify(ghost)
    );
    report.check(
      "days are headed Today, Yesterday, then a date — newest first",
      gone.heads[0]?.text === "Today" && gone.heads[1]?.text === "Yesterday" && !/^(Today|Yesterday)$/.test(gone.heads[2]?.text || "x"),
      JSON.stringify(gone.heads.map((h) => h.text))
    );

    // ── 5. 390 px, many rows, a long label ─────────────────────────────────
    const many = [];
    for (let i = 0; i < 60; i++) {
      many.push({
        at: new Date(Date.now() - (30 + i) * 3600e3).toISOString().slice(0, 19) + "Z",
        kind: i % 2 ? "favourite.remove" : "favourite.add",
        subject: { venue: VENUE, dish: `gone-${i}`, label: `Dish number ${i} with an unusually long name to test wrapping` },
        from: null,
        to: null,
      });
    }
    await seed(driver, many);
    await closeSettings(driver);
    await openMenu(cdp, sessionId, driver, port);
    await openActivity(driver);
    await untilPresent(() => driver.evalPage(`document.querySelectorAll(".activity-item").length >= 60`), { label: "60 rows" });
    await driver.settle();
    const dense = await driver.evalPage(PROBE);
    report.check(
      "60 rows with a long label: no horizontal overflow at 390 px",
      dense.pageOverflow <= 0 && dense.sheetOverflow <= 0 && dense.rowOverflow <= 0,
      `page ${dense.pageOverflow}, sheet ${dense.sheetOverflow}, widest row ${dense.rowOverflow}`
    );
    const shortest = Math.min(...dense.rows.map((r) => r.h));
    report.check(
      "every row is at least 44 px tall, and so is the toggle",
      shortest >= 44 && dense.toggleH >= 44,
      `shortest row ${shortest}px, toggle ${dense.toggleH}px`
    );
    const linkH = await driver.evalPage(`Math.min(...[...document.querySelectorAll("a.activity-item")].map((a) => a.getBoundingClientRect().height))`);
    report.check("a linked row is a full-width 44 px+ target", Number.isFinite(linkH) && linkH >= 44, `${linkH}px`);
    await shot(cdp, sessionId, opts.shots, "activity-populated-light.png");

    // ── 6. Te reo marking ──────────────────────────────────────────────────
    await closeSettings(driver);
    await driver.evalPage(`(async () => {
      const { settings } = await import("/js/settings.js");
      settings.set({ lang: "mi" });
      return true;
    })()`);
    await driver.settle();
    await openActivity(driver);
    const mi = await driver.evalPage(PROBE);
    const yHead = mi.heads.find((h) => h.text === "Inanahi");
    report.check(
      "in te reo the Yesterday heading is the looked-up word and is marked lang=\"mi\"",
      !!yHead && yHead.lang === "mi",
      JSON.stringify(mi.heads.slice(0, 3))
    );
    report.check(
      "…while the interpolated sentences stay English (the engine swaps whole strings only)",
      mi.rows.some((r) => /^Added .* to your favourites$/.test(r.text)),
      mi.rows[0]?.text
    );
    await driver.evalPage(`(async () => { const { settings } = await import("/js/settings.js"); settings.set({ lang: "en" }); return true; })()`);

    // ── 7. Following a link lands on the dish ──────────────────────────────
    await closeSettings(driver);
    await seed(driver, [
      { at: new Date().toISOString().slice(0, 19) + "Z", kind: "favourite.add", subject: { venue: VENUE, dish: added.dish, label: added.label }, from: null, to: null },
    ]);
    await openActivity(driver);
    await driver.settle();
    const target = await driver.evalPage(`document.querySelector('a.activity-item[href*="#dish-${added.dish}"]')?.getAttribute("href") || null`);
    report.check("(setup) the dish row is linked", !!target, String(target));
    await driver.click(`a.activity-item[href*="#dish-${added.dish}"]`);
    await untilPresent(() => driver.evalPage(`location.hash === "#dish-${added.dish}"`), { label: "the dish anchor" });
    const landed = await driver.evalPage(`({ hash: location.hash, found: !!document.getElementById("dish-${added.dish}") })`);
    report.check("tapping the link lands on that dish's row", landed.found, JSON.stringify(landed));

    // ── Dark mode picture, for a human ─────────────────────────────────────
    if (opts.shots) {
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] }, sessionId);
      await openMenu(cdp, sessionId, driver, port);
      await openActivity(driver);
      await shot(cdp, sessionId, opts.shots, "activity-populated-dark.png");
    }

    return report.summary(SITE);
  } finally {
    cdp?.close();
    await stopChrome(chrome?.proc);
    server.close();
  }
}

const { values } = parseArgs({
  options: {
    verbose: { type: "boolean", short: "v", default: false },
    headed: { type: "boolean", default: false },
    shots: { type: "string" },
    port: { type: "string", default: "0" },
  },
});

const ok = await run({ ...values, port: Number(values.port) });
process.exitCode = ok ? 0 : 1;
