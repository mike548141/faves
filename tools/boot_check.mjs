#!/usr/bin/env node
// Does every screen actually BOOT? Load each page in a real browser, watch the
// console, and assert the JavaScript rendered the page rather than the no-JS
// fallback standing in for it.
//
// This exists because of a specific escape. On 2026-08-16, `app.js` gained
// calls to `venueTimezone`/`zoneLabel` without gaining the import. `init()`
// threw, the home screen fell back to its static `<ul>`, and the site shipped
// that way — while `node --test` passed 570, `device_check` passed 19 and
// `cook_check` passed 36. None of them could have caught it:
//
//   • the unit tests import modules one at a time, so a module that never
//     imports what it calls still loads fine on its own;
//   • device_check and cook_check both drive a MENU page, and menu.js had its
//     import — nothing anywhere exercised the home screen's boot.
//
// The fallback is what made it invisible: the page looked like a working list
// of places, because that is exactly what the fail-soft `<ul>` is designed to
// look like. A blank page would have been caught in a second.
//
// What a headless run here CANNOT show:
//   1. That the page looks right — this asserts structure, never layout.
//   2. Anything about Safari/WebKit; it is Chrome only.
//   3. Anything about a stale service worker, since it always runs on a fresh
//      profile — which is the point (see lib/browser.mjs), not an oversight.
//
//     node tools/boot_check.mjs           # all screens
//     node tools/boot_check.mjs -v        # narrate each step
//
// Exit 0 = every screen booted clean. 1 = at least one didn't.

import { readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { Cdp, Report, createDriver, launchChrome, startServer, stopChrome, until } from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// Each screen names the marker that proves JS, not the fallback, drew it.
// `ready` is evaluated in the page and must become true; `fallback` is the
// element the no-JS path leaves visible and JS is expected to hide.
const SCREENS = [
  {
    name: "home",
    url: () => "/index.html",
    // Readiness must be something ONLY app.js can produce. The fail-soft <ul>
    // uses the same `.card-link` class as the rendered cards — waiting on that
    // is satisfied by the fallback itself, which is precisely the failure this
    // check exists to catch, wearing the check's own clothes. `#result-count`
    // is empty in the HTML and only app.js ever fills it.
    ready: `(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`,
    checks: [
      {
        what: "the list was rendered by JS, not the no-JS fallback",
        expr: `(() => {
          const note = document.querySelector(".fallback-note");
          const visible = note && !note.hidden && getComputedStyle(note).display !== "none";
          return { fallbackShowing: !!visible, cards: document.querySelectorAll("#restaurant-list > *").length };
        })()`,
        assert: (v) => (v.fallbackShowing ? "the no-JS fallback note is still showing" : v.cards > 5 ? null : `only ${v.cards} cards`),
      },
      {
        what: "the filter bar is live (counts rendered)",
        expr: `document.querySelector("#result-count")?.textContent?.trim() ?? ""`,
        assert: (v) => (/\d/.test(v) ? null : `no place count rendered (got ${JSON.stringify(v)})`),
      },
    ],
  },
  {
    name: "menu",
    url: (venueId) => `/restaurant.html?id=${encodeURIComponent(venueId)}`,
    ready: `!!document.querySelector(".menu-title")`,
    checks: [
      {
        what: "the venue's menu rendered with priced dishes",
        expr: `(() => ({
          title: document.querySelector(".menu-title")?.textContent ?? "",
          prices: [...document.querySelectorAll(".dish-price, .item-price, [class*='price']")]
            .map((e) => e.textContent.trim()).filter((s) => /\\d/.test(s)).length,
        }))()`,
        assert: (v) => (v.title && v.prices > 0 ? null : `title=${JSON.stringify(v.title)} priced=${v.prices}`),
      },
    ],
  },
  {
    // A link shared before a venue was renamed must still land on the venue,
    // not on a 404 (renames.js). This is the only check that exercises the
    // resolve-before-fetch path end to end.
    name: "menu via a retired id",
    url: () => `/restaurant.html?id=burgerfuel-johnsonville`,
    ready: `!!document.querySelector(".menu-title")`,
    checks: [
      {
        what: "an old shared link still opens the venue, under its current name",
        expr: `document.querySelector(".menu-title")?.textContent?.trim() ?? ""`,
        assert: (v) => (v === "BurgerFuel" ? null : `menu title reads ${JSON.stringify(v)}`),
      },
    ],
  },
];

// Settings is a dialog, not a screen, and it is where a merged or renamed panel
// would silently vanish — so its index is asserted by name.
const SETTINGS_ROWS = [
  "Who’s using Faves?",
  "Food preferences",
  "Distance & directions",
  "Language & units",
  // Sync (Theme 9 v2) had a row of its own here until 2026-08-16; the owner
  // moved it INSIDE this one. Losing the row from this list would quietly lose
  // the coverage that sync's UI is reachable at all, so the section it became
  // is asserted separately below (SETTINGS_DATA_SECTIONS) rather than dropped.
  "Your data",
  "Refresh & reset",
];

// Drilling into "Your data" must still reach all three things it now covers.
// A sub-label here, not a row: sync is a section of that panel now.
const SETTINGS_DATA_SECTIONS = ["Bring data back in", "Sync across your devices"];

// About's own groups, asserted by name for the same reason Settings' index is:
// About is a dialog nothing else opens, and it has twice now accumulated a
// block because some item needed somewhere to put one (ROADMAP Theme 23). A
// block added here without a decision fails this list.
const ABOUT_GROUPS = ["Private by design", "Prices", "Opening hours", "Works offline"];

async function bootScreen(cdp, sessionId, driver, report, base, screen, venueId) {
  const errors = [];
  const onError = (p) => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text);
  const onConsole = (p) => {
    if (p.type !== "error") return;
    errors.push((p.args || []).map((a) => a.value ?? a.description ?? "").join(" "));
  };
  cdp.on("Runtime.exceptionThrown", onError);
  cdp.on("Runtime.consoleAPICalled", onConsole);

  const url = base + screen.url(venueId);
  await cdp.send("Page.navigate", { url }, sessionId);

  // A screen that never becomes ready is a FAILURE, not a crash. Reporting it
  // as a row (and carrying on to the next screen) matters more than it sounds:
  // the console errors collected below are what actually name the cause, and a
  // thrown timeout would abort the run before they were ever printed.
  let ready = true;
  try {
    await until(() => driver.evalPage(screen.ready), {
      label: `${screen.name}: page rendered by JS`,
      timeout: 15_000,
    });
  } catch {
    ready = false;
  }
  report.check(
    `${screen.name}: rendered by its own JavaScript`,
    ready,
    ready ? url : `never became ready — ${screen.ready}`
  );

  // The console is the whole point: a module that throws on import takes the
  // page down quietly, and the fallback makes the wreck look like a feature.
  report.check(
    `${screen.name}: booted with no console errors`,
    errors.length === 0,
    errors.length ? errors.join(" | ") : url
  );

  for (const check of screen.checks) {
    const value = await driver.evalPage(check.expr).catch((e) => ({ error: String(e) }));
    const problem = value?.error ?? check.assert(value);
    report.check(`${screen.name}: ${check.what}`, !problem, problem || JSON.stringify(value));
  }

  cdp.off?.("Runtime.exceptionThrown", onError);
  cdp.off?.("Runtime.consoleAPICalled", onConsole);
  return errors;
}

async function run(opts) {
  const report = new Report(opts.verbose);
  // index.json is a bare array of ids. Cook-at-Home is a recipe collection, not
  // a venue, so it exercises a different render path — pick a real venue.
  const index = JSON.parse(await readFile(join(SITE, "data", "index.json"), "utf8"));
  const venueId = opts.id || index.find((id) => id !== "cook-at-home") || index[0];

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-boot-check-"));
  let chrome = null;
  let cdp = null;

  try {
    const base = `http://127.0.0.1:${port}`;
    console.log("Faves boot check — does every screen actually run its JavaScript?");
    console.log(`  venue    ${venueId}`);
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
      sessionId
    );
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));

    for (const screen of SCREENS) {
      await bootScreen(cdp, sessionId, driver, report, base, screen, venueId);
    }

    // The subheading facets are a route, not a label: tapping "Malaysian" on a
    // menu page has to land on a home list genuinely filtered to Malaysian,
    // with the dropdown above it saying the same. The unit tests cover each
    // end's URL helper in isolation; only a browser can show the two screens
    // agreeing across a real navigation — which is exactly where this would
    // break (a renamed class, a param one side stopped reading).
    try {
      await cdp.send(
        "Page.navigate",
        { url: `${base}/restaurant.html?id=${encodeURIComponent(venueId)}` },
        sessionId
      );
      await until(() => driver.evalPage(`!!document.querySelector(".menu-sub-link")`), {
        label: "menu: the subheading facets rendered",
      });
      const facet = await driver.evalPage(`(() => {
        const a = document.querySelector(".menu-sub-link");
        return {
          href: a.getAttribute("href") || "",
          text: a.textContent.trim(),
          label: a.getAttribute("aria-label") || "",
        };
      })()`);
      report.check(
        "menu: a subheading facet is a link into the filtered list",
        /^index\.html\?(cuisine|area)=/.test(facet.href) && facet.label.length > facet.text.length,
        JSON.stringify(facet)
      );

      await cdp.send("Page.navigate", { url: `${base}/${facet.href}` }, sessionId);
      await until(
        () => driver.evalPage(`(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`),
        { label: "home: arrived with a facet filter" }
      );
      const landed = await driver.evalPage(`(() => {
        const key = new URLSearchParams(location.search).has("area") ? "filter-area" : "filter-cuisine";
        return {
          count: (document.querySelector("#result-count")?.textContent ?? "").trim(),
          control: document.getElementById(key)?.value ?? "",
          cards: document.querySelectorAll("#restaurant-list > *").length,
        };
      })()`);
      // "n of N places" (not the bare "N places") is what proves the filter
      // actually bit — a control set to Malaysian over the untouched full list
      // is the exact half-wired failure worth catching.
      report.check(
        "home: arriving with a facet filters the list and the control agrees",
        landed.control === facet.text && landed.cards > 0 && / of /.test(landed.count),
        JSON.stringify(landed)
      );

      // The way back out. A reader arriving from a venue link never pressed
      // anything on this screen, so the undo has to be visible next to the
      // count — and it has to actually restore the full list, not just look
      // like it does.
      const chip = await driver.evalPage(`(() => {
        const box = document.getElementById("active-filters");
        const b = box && !box.hidden ? box.querySelector(".active-filter") : null;
        return b ? { text: b.textContent.trim(), label: b.getAttribute("aria-label") || "" } : null;
      })()`);
      report.check(
        "home: an arriving filter shows a dismissible chip beside the count",
        !!chip && chip.text.includes(facet.text) && /clear/i.test(chip.label),
        JSON.stringify(chip)
      );

      await driver.evalPage(`document.querySelector("#active-filters .active-filter").click()`);
      await until(
        () => driver.evalPage(`document.getElementById("active-filters")?.hidden === true`),
        { label: "home: filter cleared" }
      );
      const cleared = await driver.evalPage(`(() => ({
        count: (document.querySelector("#result-count")?.textContent ?? "").trim(),
        control: document.getElementById("filter-cuisine")?.value ?? "",
        search: location.search,
        focused: document.activeElement?.id ?? "",
      }))()`);
      report.check(
        "home: clearing the chip restores the full list, the control and the URL",
        !/ of /.test(cleared.count) &&
          cleared.control === "all" &&
          !/cuisine=|area=/.test(cleared.search) &&
          cleared.focused === "result-count",
        JSON.stringify(cleared)
      );
    } catch (e) {
      report.check("menu → home: the subheading facet links work", false, String(e.message || e));
    }

    // Back to the home screen for the Settings index. Wrapped because a home
    // screen that never booted cannot open a dialog either — one failure, not
    // an unhandled rejection that buries the diagnosis printed above it.
    try {
      await cdp.send("Page.navigate", { url: `${base}/index.html` }, sessionId);
      await until(
        () => driver.evalPage(`(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`),
        { label: "home: back for the Settings check" }
      );
      // Two clicks with a wait between them: the dialog is built on first open
      // (About and Settings both defer their DOM), so reading the rows in the
      // same turn as the click reads an empty dialog.
      await driver.evalPage(`(() => {
        const more = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "More");
        if (more) more.click();
      })()`);
      await until(() => driver.evalPage(`[...document.querySelectorAll("button")].some((b) => /Settings/.test(b.textContent))`), {
        label: "settings: the ⋯ menu opened",
      });
      await driver.evalPage(`(() => {
        const b = [...document.querySelectorAll("button")].find((x) => /Settings/.test(x.textContent));
        if (b) b.click();
      })()`);
      await until(() => driver.evalPage(`document.querySelectorAll(".settings-row").length > 0`), {
        label: "settings: the index rendered",
      });
      const rows = await driver.evalPage(`({
        rows: [...document.querySelectorAll(".settings-row .settings-row-title")].map((e) => e.textContent.trim()),
      })`);
      if (rows.error) {
        report.check("settings: the index opened", false, rows.error);
      } else {
        const missing = SETTINGS_ROWS.filter((r) => !rows.rows.includes(r));
        const extra = rows.rows.filter((r) => !SETTINGS_ROWS.includes(r));
        report.check(
          "settings: the index shows exactly the expected groups",
          missing.length === 0 && extra.length === 0,
          missing.length || extra.length
            ? `missing ${JSON.stringify(missing)} · unexpected ${JSON.stringify(extra)}`
            : rows.rows.join(" · ")
        );
      }

      // Drill into "Your data" — the panel that swallowed sync's row. Asserted
      // by the sub-labels *and* by a real sync control, so a heading left
      // behind after the panel underneath it broke would still fail.
      await driver.evalPage(`(() => {
        const t = [...document.querySelectorAll(".settings-row .settings-row-title")]
          .find((e) => e.textContent.trim() === "Your data");
        if (t) t.closest(".settings-row").click();
      })()`);
      await until(
        () => driver.evalPage(`!!document.querySelector(".settings-panel:not([hidden]) .import-block")`),
        { label: "settings: the Your data panel opened" }
      );
      const dataPanel = await driver.evalPage(`(() => {
        const panel = document.querySelector(".import-block")?.closest(".settings-panel");
        return {
          subs: [...panel.querySelectorAll(".settings-sub")].map((e) => e.textContent.trim()),
          syncBody: !!panel.querySelector(".sync-block .sync-body"),
          syncButton: !!(panel.querySelector(".sync-block")?.textContent ?? "").match(/sync/i),
        };
      })()`);
      if (dataPanel.error) {
        report.check("settings: the Your data panel read", false, dataPanel.error);
      } else {
        const missing = SETTINGS_DATA_SECTIONS.filter((r) => !dataPanel.subs.includes(r));
        report.check(
          "settings: Your data covers backup, restore and sync in one panel",
          missing.length === 0 && dataPanel.syncBody && dataPanel.syncButton,
          missing.length
            ? `missing sub-sections ${JSON.stringify(missing)}`
            : !dataPanel.syncBody
              ? "the sync section has no sync-ui body under it"
              : dataPanel.subs.join(" · ")
        );
      }

      // Back to the index, then into "Refresh & reset" — where the version
      // stamps moved on 2026-08-17 (ROADMAP 23c). The assertion that matters
      // is that they carry a real answer rather than the "…" placeholder they
      // are built with: the panel is built at boot and only asks the worker
      // when it opens, so a missing onOpen hook shows up here as two ellipses.
      await driver.evalPage(`(() => {
        const b = document.querySelector(".settings-sheet .settings-back");
        if (b) b.click();
      })()`);
      await until(() => driver.evalPage(`!document.querySelector(".settings-rows")?.closest("[hidden]")`), {
        label: "settings: back at the index",
      });
      await driver.evalPage(`(() => {
        const t = [...document.querySelectorAll(".settings-row .settings-row-title")]
          .find((e) => e.textContent.trim() === "Refresh & reset");
        if (t) t.closest(".settings-row").click();
      })()`);
      await until(
        () => driver.evalPage(`!!document.querySelector(".settings-panel:not([hidden]) .settings-versions")`),
        { label: "settings: the Refresh & reset panel opened" }
      );
      // The stamps are filled asynchronously (a MessageChannel round-trip to
      // the worker, or the cache-name fallback), so wait for the placeholder to
      // clear rather than reading in the same turn as the click.
      // `length === 2` is load-bearing: `every` over an empty list is true, so
      // a selector that matched nothing would satisfy this wait vacuously and
      // report the placeholder as an answer.
      await until(
        () => driver.evalPage(`(() => {
          const v = [...document.querySelectorAll(".settings-version-value")];
          return v.length === 2 && v.every((e) => e.textContent.trim() !== "…");
        })()`),
        { label: "settings: the version stamps answered" }
      );
      const storagePanel = await driver.evalPage(`(() => {
        // Scoped from the stamps outward, not from ".settings-panel:not([hidden])":
        // panels nest, so the first unhidden one in the document is not
        // necessarily the one that was just opened.
        const panel = document.querySelector(".settings-versions").closest(".settings-panel");
        return {
          keys: [...panel.querySelectorAll(".settings-version-key")].map((e) => e.textContent.trim()),
          values: [...panel.querySelectorAll(".settings-version-value")].map((e) => e.textContent.trim()),
          note: panel.querySelector(".settings-version-note")?.textContent.trim() ?? "",
          refreshBtn: [...panel.querySelectorAll("button")].some((b) => /Refresh now/.test(b.textContent)),
        };
      })()`);
      if (storagePanel.error) {
        report.check("settings: the Refresh & reset panel read", false, storagePanel.error);
      } else {
        const answered = storagePanel.values.length === 2 && storagePanel.values.every((v) => v && v !== "…");
        report.check(
          "settings: the version evidence sits beside the Refresh action",
          answered && storagePanel.refreshBtn && storagePanel.keys.join("|") === "App|Menus & prices",
          !answered
            ? `version values unanswered: ${JSON.stringify(storagePanel.values)}`
            : !storagePanel.refreshBtn
              ? "no Refresh now button in the same panel"
              : `${storagePanel.keys.join(" · ")} → ${storagePanel.values.join(" · ")} — ${storagePanel.note}`
        );
      }
    } catch (e) {
      report.check("settings: the index opened", false, String(e.message || e));
    }

    // About is the other half of ROADMAP Theme 23: it opens from the same ⋯
    // menu, and the version stamps must be GONE from it — moving means moving.
    try {
      await cdp.send("Page.navigate", { url: `${base}/index.html` }, sessionId);
      await until(
        () => driver.evalPage(`(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`),
        { label: "home: back for the About check" }
      );
      await driver.evalPage(`(() => {
        const more = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "More");
        if (more) more.click();
      })()`);
      await until(() => driver.evalPage(`!!document.getElementById("about-btn") && !document.getElementById("about-btn").hidden`), {
        label: "about: the ⋯ menu offered About",
      });
      await driver.evalPage(`document.getElementById("about-btn").click()`);
      await until(() => driver.evalPage(`!!document.querySelector(".about-sheet[open]")`), {
        label: "about: the dialog opened",
      });
      const about = await driver.evalPage(`(() => {
        const d = document.querySelector(".about-sheet");
        return {
          groups: [...d.querySelectorAll(".about-group-title")].map((e) => e.textContent.trim()),
          lede: (d.querySelector(".about-lede")?.textContent ?? "").trim().length,
          // Any version stamp at all — the class, or a bare "YYYY-MM-DD.N" in
          // the prose. Either would mean the block came back by another route.
          stamps: !!d.querySelector(".settings-versions, .about-versions") ||
            /\\b\\d{4}-\\d{2}-\\d{2}\\.\\d+\\b/.test(d.textContent),
          // Native <dialog> focus containment: focus must be inside the sheet.
          focusInside: d.contains(document.activeElement),
        };
      })()`);
      if (about.error) {
        report.check("about: the dialog opened", false, about.error);
      } else {
        const missing = ABOUT_GROUPS.filter((g) => !about.groups.includes(g));
        const extra = about.groups.filter((g) => !ABOUT_GROUPS.includes(g));
        report.check(
          "about: the dialog shows exactly the expected groups",
          missing.length === 0 && extra.length === 0 && about.lede > 0,
          missing.length || extra.length
            ? `missing ${JSON.stringify(missing)} · unexpected ${JSON.stringify(extra)}`
            : about.groups.join(" · ")
        );
        report.check(
          "about: no version stamp — the evidence lives in Settings now",
          !about.stamps,
          about.stamps ? "About is carrying a version stamp again (ROADMAP 23c moved it)" : "none"
        );
        report.check("about: focus is inside the dialog", about.focusInside, String(about.focusInside));
      }
    } catch (e) {
      report.check("about: the dialog opened", false, String(e.message || e));
    }

    console.log(`\n${report.failed ? "FAILED" : "OK"} — ${report.passed} passed, ${report.failed} failed`);
    return report.failed === 0;
  } finally {
    if (chrome) await stopChrome(chrome.proc ?? chrome);
    if (cdp) cdp.close?.();
    server.close?.();
  }
}

const { values } = parseArgs({
  options: {
    id: { type: "string" },
    port: { type: "string", default: "0" },
    headed: { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

process.exit((await run({ ...values, port: Number(values.port) })) ? 0 : 1);
