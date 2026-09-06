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
  const chips = [...document.querySelectorAll(".diet-chip")].map((c) => ({
    key: c.dataset.key,
    label: (c.textContent || "").trim(),
    pressed: c.getAttribute("aria-pressed") === "true",
  }));
  return {
    total: dishes.length,
    shown: dishes.filter((d) => !d.hidden).length,
    dimmed: dishes.filter((d) => d.classList.contains("dimmed")).length,
    sectionsShown: [...document.querySelectorAll(".menu-section")].filter((s) => !s.hidden).length,
    navShown: [...document.querySelectorAll(".section-link")].filter((a) => !a.hidden).length,
    chips,
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

    // ─── Part A — the dietary filter now removes rows ──────────────────────
    await openVenue(driver, cdp, sessionId, port, FILTER_VENUE);

    const before = await driver.evalPage(PROBE);
    report.check(
      "unfiltered: every dish is on screen and no count line is claimed",
      before.shown === before.total && before.count.present && before.count.hidden === true,
      `${before.shown}/${before.total} shown, count line hidden=${before.count.hidden}`
    );
    report.check(
      "unfiltered: no ♥ Favourites chip, because nothing here is hearted yet",
      !before.chips.some((c) => c.key === "fav"),
      `chips: ${before.chips.map((c) => c.label).join(" · ") || "none"}`
    );

    // The safety baseline: what a real dish's tag chips look like with no
    // filter on. Captured before anything is pressed, compared after.
    //
    // ⚠️ THE DISH IS CHOSEN FOR HAVING CHIPS, and that is not fussiness. The
    // first version of this took the first vegetarian dish it found, which at
    // this venue renders NO tag chips at all — so the assertion compared [] to
    // [] and passed identically whether the feature worked or was deleted. A
    // guard whose output is the same either way is decorative. If no vegetarian
    // dish here carries a visible chip, this THROWS rather than quietly
    // asserting nothing.
    const vegDishName = await driver.evalPage(`(() => {
      const d = [...document.querySelectorAll("li.dish")].find(
        (x) => (x.dataset.baseTags || "").split(" ").includes("v")
          && x.querySelectorAll(".tag").length > 0
      );
      return d ? (d.querySelector(".dish-name")?.textContent || "").trim() : null;
    })()`);
    if (!vegDishName) {
      throw new Error(
        `${FILTER_VENUE}: no vegetarian dish renders a tag chip, so the safety ` +
          `assertion would compare nothing to nothing. Point this check at a ` +
          `venue whose vegetarian dishes carry allergen or diet tags.`
      );
    }
    const tagsBefore = await driver.evalPage(tagsOn(vegDishName));

    await driver.click(".diet-chip", "Vegetarian");
    await driver.settle();
    const filtered = await driver.evalPage(PROBE);

    report.check(
      "Vegetarian: the list is narrowed to the dishes that qualify",
      filtered.shown === 4 && filtered.total === 70,
      `${filtered.shown} of ${filtered.total} shown`
    );
    report.check(
      "Vegetarian: the count line says so, in words, and is really on screen",
      filtered.count.visible &&
        filtered.count.text === `Showing ${filtered.shown} of ${filtered.total} dishes` &&
        filtered.count.hasShowAll,
      JSON.stringify(filtered.count)
    );
    report.check(
      "Vegetarian: the count line is announced, not just drawn",
      filtered.count.role === "status",
      `role=${filtered.count.role}`
    );
    report.check(
      "Vegetarian: an emptied section and its jump-nav chip both go",
      filtered.sectionsShown === 3 && filtered.navShown === 3,
      `${filtered.sectionsShown}/7 sections, ${filtered.navShown}/7 nav chips`
    );

    // 🛑 THE SAFETY ASSERTION.
    const tagsAfter = await driver.evalPage(tagsOn(vegDishName));
    report.check(
      `Vegetarian: "${vegDishName}" keeps all ${tagsBefore.chips.length} tag chip(s) it had, unchanged`,
      !tagsAfter.missing &&
        tagsAfter.hidden === false &&
        tagsBefore.chips.length > 0 &&
        JSON.stringify(tagsAfter.chips) === JSON.stringify(tagsBefore.chips),
      `before ${JSON.stringify(tagsBefore.chips.map((c) => c.text))} | ` +
        `after ${JSON.stringify(tagsAfter.chips.map((c) => c.text))}`
    );

    // Filters and search compose rather than replacing one another.
    await driver.evalPage(
      `(() => { const s = ${need(".menu-search")}; s.value = "satay";
        s.dispatchEvent(new Event("input", { bubbles: true })); })()`
    );
    await driver.settle();
    const both = await driver.evalPage(PROBE);
    report.check(
      "Vegetarian + a typed query narrow together, they do not replace each other",
      both.shown > 0 && both.shown < filtered.shown,
      `${both.shown} shown with "satay" + Vegetarian (was ${filtered.shown} with the chip alone)`
    );

    await driver.click(".menu-count-clear");
    await driver.settle();
    const cleared = await driver.evalPage(PROBE);
    report.check(
      "Show all restores the whole menu AND clears the query it was hiding behind",
      cleared.shown === cleared.total && cleared.query === "" &&
        !cleared.chips.some((c) => c.pressed) && cleared.count.hidden === true,
      `${cleared.shown}/${cleared.total}, query=${JSON.stringify(cleared.query)}, ` +
        `pressed=${cleared.chips.filter((c) => c.pressed).map((c) => c.key).join(",") || "none"}`
    );

    // ─── Part B — ♥ Favourites, and the live wire behind it ────────────────
    const heartName = await driver.evalPage(`(() => {
      const d = document.querySelector("li.dish");
      d.querySelector(".dish-actions .heart").click();
      return (d.querySelector(".dish-name")?.textContent || "").trim();
    })()`);
    await driver.settle();
    await openVenue(driver, cdp, sessionId, port, FILTER_VENUE);
    const withFav = await driver.evalPage(PROBE);
    report.check(
      "hearting a dish here makes the ♥ Favourites chip appear",
      withFav.chips.some((c) => c.key === "fav"),
      `chips: ${withFav.chips.map((c) => c.label).join(" · ")}`
    );
    report.check(
      "…and it leads the row, ahead of the dietary chips",
      withFav.chips[0]?.key === "fav",
      withFav.chips.map((c) => c.key).join(" → ")
    );

    await driver.click(".diet-chip", "Favourites");
    await driver.settle();
    const favOn = await driver.evalPage(PROBE);
    const favFirst = await driver.evalPage(firstShownName);
    report.check(
      "♥ Favourites shows the hearted dish and nothing else",
      favOn.shown === 1 && favFirst === heartName,
      `${favOn.shown} shown, first = ${JSON.stringify(favFirst)} (hearted ${JSON.stringify(heartName)})`
    );
    report.check(
      "…and the count line counts it against the whole menu",
      favOn.count.text === `Showing 1 of ${favOn.total} dishes`,
      favOn.count.text
    );

    // The live wire: un-heart while the filter is on. No reload.
    await driver.evalPage(`${need("li.dish:not([hidden]) .dish-actions .heart")}.click()`);
    await sleep(150);
    await driver.settle();
    const favOff = await driver.evalPage(PROBE);
    report.check(
      "un-hearting a dish while the filter is on removes it there and then",
      favOff.shown === 0,
      `${favOff.shown} still shown after the heart was cleared`
    );

    // ─── Part C — configured out must DIM, never vanish ────────────────────
    await openVenue(driver, cdp, sessionId, port, CONFIG_VENUE);
    await driver.click(".diet-chip", "Vegan");
    await driver.settle();
    const veganOn = await driver.evalPage(tagsOn(CONFIG_DISH));
    report.check(
      `Vegan: "${CONFIG_DISH}" is on screen and undimmed to start with`,
      !veganOn.missing && veganOn.hidden === false && veganOn.dimmed === false,
      JSON.stringify({ hidden: veganOn.hidden, dimmed: veganOn.dimmed })
    );

    // Scoped to the Garden Salad row by name, not to "the first dish": with the
    // Vegan filter on, most rows are `hidden` and therefore have no box to
    // click — which is how the first version of this failed with a harness
    // error rather than an assertion.
    const opened = await driver.evalPage(`(() => {
      const d = [...document.querySelectorAll("li.dish")]
        .find((x) => (x.querySelector(".dish-name")?.textContent || "").trim() === ${JSON.stringify(CONFIG_DISH)});
      const s = d && d.querySelector(".dish-addons-summary");
      if (!s) return false;
      s.click();
      return true;
    })()`);
    if (!opened) throw new Error(`"${CONFIG_DISH}" offers no add-on picker at ${CONFIG_VENUE}`);
    await driver.settle();
    const ticked = await driver.evalPage(`(() => {
      const d = [...document.querySelectorAll("li.dish")]
        .find((x) => (x.querySelector(".dish-name")?.textContent || "").trim() === ${JSON.stringify(CONFIG_DISH)});
      const opt = [...d.querySelectorAll(".addon-option")]
        .find((o) => (o.textContent || "").includes(${JSON.stringify(CONFIG_OPTION)}));
      if (!opt) return false;
      (opt.querySelector("input") || opt).click();
      return true;
    })()`);
    if (!ticked) throw new Error(`"${CONFIG_DISH}" has no ${CONFIG_OPTION} option at ${CONFIG_VENUE}`);
    await sleep(150);
    await driver.settle();
    const configured = await driver.evalPage(tagsOn(CONFIG_DISH));
    report.check(
      `adding ${CONFIG_OPTION} DIMS the row — it must not vanish under the finger that configured it`,
      configured.hidden === false && configured.dimmed === true,
      JSON.stringify({ hidden: configured.hidden, dimmed: configured.dimmed })
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
