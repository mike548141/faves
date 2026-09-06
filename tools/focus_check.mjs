#!/usr/bin/env node
// Do the menu's filters actually FOCUS the list — and does anything get lost
// when they do? (ADR 0088.)
//
//     node tools/focus_check.mjs        # headless, exit 0 = pass
//     node tools/focus_check.mjs -v     # narrate each step
//
// WHY THIS EXISTS. On 2026-09-06 the dietary chips changed from DIMMING a
// non-matching dish to REMOVING it, and gained a ♥ Favourites chip beside them.
// Removing rows is a much sharper tool than dulling them, and three of its ways
// of going wrong are invisible to `tests/dish-filters.test.js`, which only ever
// sees the predicate:
//
//   1. THE SAFETY ONE, and the reason this file exists at all. The owner's
//      ruling was explicit that a dish which survives a filter must show its
//      allergens exactly as it does unfiltered. A predicate test cannot see a
//      chip. So this reads the rendered tag chips off a real dish before and
//      after filtering and asserts they are byte-identical — a regression that
//      dropped or muted them would leave every unit test green and would be
//      visible only to someone with an allergy, in a shop, holding a phone.
//
//   2. THE ONE THE DESIGN WAS CHANGED TO AVOID. A dish whose add-on
//      configuration knocks it out of the active filter must DIM, not vanish:
//      the finger that just added prawns to a vegan salad is still on that row.
//      That distinction lives entirely in which dataset field applyView reads
//      (`baseTags` vs `tags`) and is a one-word edit away from being wrong in
//      either direction. Both directions are asserted.
//
//   3. THE LIVE ONE. The ♥ chip only exists when this reader has hearted a dish
//      HERE, and un-hearting one while the filter is on must move the row on the
//      spot. That is a store subscription, not a predicate; nothing but a real
//      browser can tell you the wire is connected.
//
// It also pins the count line — "Showing 4 of 70 dishes" — as VISIBLE and in the
// accessibility tree. That line is the entire answer to the objection the old
// dim-don't-hide design existed to satisfy ("groups share one screen"), so a
// version of this feature where it silently stops rendering is a version that
// should never have shipped. Asserting a filter's effect without asserting the
// line is the shape of check that passes while the product regresses.
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU:
//   1. Anything about Safari/WebKit. Chrome only.
//   2. Whether the narrowing FEELS right, or whether "Show all" is findable by
//      someone who did not just press a chip.
//   3. Whether the tags being filtered on are TRUE. No browser can check that a
//      dish the venue calls vegetarian is vegetarian.
//   4. Anything about the search suggestions — those are suggest.js's own
//      unit tests plus the combobox assertions at the end of this file, and the
//      keyboard path through a real screen reader is untested by anyone.

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  Cdp,
  Report,
  createDriver,
  launchChrome,
  need,
  startServer,
  stopChrome,
  until,
  sleep,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// 4 vegetarian dishes in 70, spread over 3 of 7 sections — so four sections must
// empty and lose their jump-nav chips. Chosen because the ratio is extreme
// enough that an off-by-one cannot hide in it.
const FILTER_VENUE = "rs-satay-noodle-house";
// "Garden Salad" is tagged `vg`; the Small Plates add-on group offers Prawns
// (contains-shellfish), which composeTags refuses to carry a vegan claim
// through. The one real pair in the corpus for assertion 2 above.
const CONFIG_VENUE = "sprig-and-fern-tawa";
const CONFIG_DISH = "Garden Salad";
const CONFIG_OPTION = "Prawns";

// Everything the screen is claiming right now, in one read.
const PROBE = `(() => {
  const dishes = [...document.querySelectorAll("li.dish")];
  const vis = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return !el.hidden && cs.display !== "none" && cs.visibility !== "hidden"
      && r.width > 0 && r.height > 0 && el.getAttribute("aria-hidden") !== "true";
  };
  const line = document.querySelector(".menu-count");
  const shown = dishes.filter((d) => !d.hidden);
  return {
    total: dishes.length,
    shown: shown.length,
    names: shown.slice(0, 6).map((d) => (d.querySelector(".dish-name")?.textContent || "").trim()),
    sectionsShown: [...document.querySelectorAll(".menu-section")].filter((s) => !s.hidden).length,
    navShown: [...document.querySelectorAll(".section-link")].filter((a) => !a.hidden).length,
    // Both must stay at zero: the chip row and the per-dish channel price were
    // removed by the owner on 2026-09-06 and are not to reappear.
    chipEls: document.querySelectorAll(".diet-chip, .diet-chips").length,
    channelEls: document.querySelectorAll(".dish-channels").length,
    count: line ? {
      present: true,
      hidden: line.hidden,
      visible: vis(line),
      text: (line.querySelector(".menu-count-text")?.textContent || "").trim(),
      role: line.getAttribute("role"),
      hasShowAll: !!line.querySelector(".menu-count-clear"),
    } : { present: false },
    query: document.querySelector(".menu-search")?.value ?? null,
  };
})()`;

/** The rendered tag chips on one named dish — text and classes, in order. This
 *  is the safety probe: it reads what a person would actually SEE. */
const tagsOn = (name) => `(() => {
  const d = [...document.querySelectorAll("li.dish")]
    .find((x) => (x.querySelector(".dish-name")?.textContent || "").trim() === ${JSON.stringify(name)});
  if (!d) return { missing: true };
  return {
    hidden: d.hidden,
    dimmed: d.classList.contains("dimmed"),
    chips: [...d.querySelectorAll(".tag")].map((c) => ({
      text: (c.textContent || "").trim(),
      cls: c.className,
      ariaHidden: c.getAttribute("aria-hidden"),
    })),
  };
})()`;

const firstShownName = `(() => {
  const d = [...document.querySelectorAll("li.dish")].find((x) => !x.hidden);
  return d ? (d.querySelector(".dish-name")?.textContent || "").trim() : null;
})()`;

/** Type into the menu search the way a person does, and let the view settle. */
async function typeQuery(driver, q) {
  await driver.evalPage(
    `(() => { const s = ${need(".menu-search")}; s.focus(); s.value = ${JSON.stringify(q)};
      s.dispatchEvent(new Event("input", { bubbles: true })); })()`
  );
  await sleep(140);
  await driver.settle();
}

async function openVenue(driver, cdp, sessionId, port, id) {
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/restaurant.html?id=${id}` }, sessionId);
  await until(() => driver.evalPage(`document.querySelectorAll("li.dish").length > 0`), {
    label: `${id} menu rendered`,
  });
  await driver.settle();
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const index = JSON.parse(await readFile(join(SITE, "data", "index.json"), "utf8"));
  for (const id of [FILTER_VENUE, CONFIG_VENUE]) {
    if (!index.includes(id)) throw new Error(`no such venue: ${id}`);
  }

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-focus-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log("Faves focus check — do the menu filters narrow the list honestly?");
    console.log(`  filters  ${FILTER_VENUE}`);
    console.log(`  add-ons  ${CONFIG_VENUE} — "${CONFIG_DISH}" + ${CONFIG_OPTION}`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    // Same isolation every menu-page check uses: ADR 0083's location dialog is a
    // real showModal() and would make every control here inert mid-run.
    await cdp.send(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source:
          'try { localStorage.setItem("faves.geo.consent.v1", JSON.stringify({ suppressed: true, declined: true })); } catch {}',
      },
      sessionId
    );
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
      sessionId
    );
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));

    // ─── Search IS the filter ──────────────────────────────────────────────
    //
    // Owner-ruled 2026-09-06: "search will filter the dishes e.g. if i search
    // vegan then it should hide all the non vegan dishes". No chips, no modes.
    await openVenue(driver, cdp, sessionId, port, CONFIG_VENUE);

    const before = await driver.evalPage(PROBE);
    report.check(
      "unfiltered: every dish is on screen and no count line is claimed",
      before.shown === before.total && before.count.present && before.count.hidden === true,
      `${before.shown}/${before.total} shown, count line hidden=${before.count.hidden}`
    );
    report.check(
      "there is NO chip row — the owner removed it, and it must not come back",
      before.chipEls === 0,
      `${before.chipEls} .diet-chip/.diet-chips element(s) in the DOM`
    );
    report.check(
      "no dish renders a second channel price",
      before.channelEls === 0,
      `${before.channelEls} .dish-channels element(s)`
    );

    // The safety baseline: a real dish's tag chips with nothing typed.
    const vegDishName = await driver.evalPage(`(() => {
      const d = [...document.querySelectorAll("li.dish")].find(
        (x) => (x.dataset.terms || "").includes("vegetarian")
          && x.querySelectorAll(".tag").length > 0
      );
      return d ? (d.querySelector(".dish-name")?.textContent || "").trim() : null;
    })()`);
    if (!vegDishName) {
      throw new Error(
        `${CONFIG_VENUE}: no vegetarian dish renders a tag chip, so the safety ` +
          `assertion would compare nothing to nothing.`
      );
    }
    const tagsBefore = await driver.evalPage(tagsOn(vegDishName));

    await typeQuery(driver, "vegan");
    const vegan = await driver.evalPage(PROBE);
    report.check(
      'typing "vegan" hides the non-vegan dishes',
      vegan.shown > 0 && vegan.shown < before.total,
      `${vegan.shown} of ${vegan.total} — ${vegan.names.join(", ")}`
    );
    report.check(
      "…and says so, in words, in the accessibility tree",
      vegan.count.visible && vegan.count.role === "status" &&
        vegan.count.text === `Showing ${vegan.shown} of ${vegan.total} dishes`,
      JSON.stringify(vegan.count)
    );

    await typeQuery(driver, "gluten free");
    const gf = await driver.evalPage(PROBE);
    report.check(
      'a two-word diet — "gluten free" — filters too',
      gf.shown > 0 && gf.shown < before.total && gf.shown !== vegan.shown,
      `${gf.shown} of ${gf.total}`
    );

    // 🛑 THE SAFETY ASSERTION. Filtering must not touch what a surviving row
    // says about allergens — the owner's own line: "if one of those dishes that
    // still show when filtered has an allergen then that allergen should still
    // show against the dish the same as it does now without the filter."
    await typeQuery(driver, "vegetarian");
    const tagsAfter = await driver.evalPage(tagsOn(vegDishName));
    report.check(
      `"${vegDishName}" keeps all ${tagsBefore.chips.length} tag chip(s) it had, unchanged`,
      !tagsAfter.missing && tagsAfter.hidden === false &&
        tagsBefore.chips.length > 0 &&
        JSON.stringify(tagsAfter.chips) === JSON.stringify(tagsBefore.chips),
      `before ${JSON.stringify(tagsBefore.chips.map((c) => c.text))} | ` +
        `after ${JSON.stringify(tagsAfter.chips.map((c) => c.text))}`
    );

    await driver.click(".menu-count-clear");
    await driver.settle();
    const cleared = await driver.evalPage(PROBE);
    report.check(
      "Show all empties the query and restores the whole menu",
      cleared.shown === cleared.total && cleared.query === "" && cleared.count.hidden === true,
      `${cleared.shown}/${cleared.total}, query=${JSON.stringify(cleared.query)}`
    );

    // ─── "favourites" is a query about the reader, not the dish ────────────
    await openVenue(driver, cdp, sessionId, port, FILTER_VENUE);
    const heartName = await driver.evalPage(`(() => {
      const d = document.querySelector("li.dish");
      d.querySelector(".dish-actions .heart").click();
      return (d.querySelector(".dish-name")?.textContent || "").trim();
    })()`);
    await driver.settle();
    await typeQuery(driver, "favourites");
    const favOn = await driver.evalPage(PROBE);
    report.check(
      'typing "favourites" shows the hearted dish and nothing else',
      favOn.shown === 1 && favOn.names[0] === heartName,
      `${favOn.shown} shown, first = ${JSON.stringify(favOn.names[0])}`
    );
    await driver.evalPage(`${need("li.dish:not([hidden]) .dish-actions .heart")}.click()`);
    await sleep(150);
    await driver.settle();
    const favOff = await driver.evalPage(PROBE);
    report.check(
      "un-hearting it while that query is live removes it there and then",
      favOff.shown === 0,
      `${favOff.shown} still shown`
    );

    // A dish literally NAMED "Vegetarian…" must still be findable by name —
    // this venue has four, and a keyword that hijacked the query would lose
    // every one of them.
    await typeQuery(driver, "vegetarian");
    const named = await driver.evalPage(PROBE);
    report.check(
      "a diet word still finds the dishes NAMED with it, not only the tagged ones",
      named.names.some((n) => n.toLowerCase().includes("vegetarian")),
      named.names.join(" | ")
    );

    // ─── The dropdown, which the owner saw before any check did ────────────
    await typeQuery(driver, "nasi");
    const sug = await driver.evalPage(`(() => {
      const list = document.querySelector(".suggest-list");
      const input = document.querySelector(".menu-search");
      const rows = [...(list?.querySelectorAll(".suggest-row") || [])];
      const r0 = rows[0];
      if (r0) r0.classList.add("is-active");
      const cs = list && getComputedStyle(list);
      const rs = r0 && getComputedStyle(r0);
      const lb = list && list.getBoundingClientRect();
      const rb = r0 && r0.getBoundingClientRect();
      return {
        open: !!list && !list.hidden,
        expanded: input.getAttribute("aria-expanded"),
        role: list?.getAttribute("role"),
        radius: cs ? parseFloat(cs.borderRadius) : null,
        activeBg: rs ? rs.backgroundColor : null,
        rows: rows.map((x) => (x.querySelector(".suggest-label")?.textContent || "").trim()),
        // Is the first row's box actually inside the list's, horizontally? An
        // oval clips its ends behind the curve.
        insetLeft: lb && rb ? +(rb.left - lb.left).toFixed(1) : null,
        heights: rows.map((x) => Math.round(x.getBoundingClientRect().height)),
      };
    })()`);
    report.check(
      "the popup is a listbox the field points at",
      sug.open && sug.expanded === "true" && sug.role === "listbox",
      JSON.stringify({ open: sug.open, expanded: sug.expanded, role: sug.role })
    );
    // The two defects the owner reported by eye. --radius-chip is 999px, which
    // turns a tall box into an oval and clips the end rows behind the curve.
    report.check(
      "it is a panel, not a pill — a 999px radius ovals the list and clips its rows",
      sug.radius !== null && sug.radius <= 20,
      `border-radius ${sug.radius}px`
    );
    report.check(
      "the highlighted row is a neutral surface, not the dietary green",
      sug.activeBg !== null && !/rgb\(\s*1?\d?\d,\s*1[2-9]\d,/.test(sug.activeBg) &&
        sug.activeBg !== "rgb(76, 141, 90)",
      `active row background ${sug.activeBg}`
    );
    report.check(
      "every suggestion row is a 44px target",
      sug.heights.length > 0 && sug.heights.every((h) => h >= 44),
      sug.heights.join(",")
    );

    // Choosing a row types the word — it can do nothing the box cannot.
    await driver.evalPage(`(() => {
      const s = document.querySelector(".menu-search");
      s.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      s.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    })()`);
    await sleep(150);
    await driver.settle();
    const chosen = await driver.evalPage(PROBE);
    report.check(
      "choosing a suggestion just types it — no mode, no hidden state",
      chosen.query.length > 0 && chosen.shown > 0 && chosen.shown < chosen.total,
      `query=${JSON.stringify(chosen.query)}, ${chosen.shown} of ${chosen.total}`
    );

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
    port: { type: "string", default: "0" },
    help: { type: "boolean", short: "h", default: false },
  },
});
if (values.help) {
  console.log(`Faves focus check — the menu filters (ADR 0088).

  node tools/focus_check.mjs [-v] [--headed] [--port N]

Exit 0 = every assertion held. 1 = at least one didn't. 2 = the browser
transport died (a HARNESS ERROR, not a regression — see lib/browser.mjs).`);
  process.exit(0);
}
process.exit((await run({ ...values, port: Number(values.port) })) ? 0 : 1);
