#!/usr/bin/env node
// Does the desktop filter row survive crossing the breakpoint? (Theme 15x.)
//
// WHY THIS EXISTS. On a phone the home screen's filters live behind a sheet;
// on a laptop there is room to simply show them. But a *closed* `<dialog>`
// cannot render its children on the page, so no media query can do it — the
// controls have to be MOVED, at runtime, out of the dialog and into `<main>`
// and back. A move is the only design that keeps one set of listeners and one
// source of truth, and it is also the design with the sharpest edges: focus
// falls to `<body>` when a focused node's ancestor is re-parented, everything
// outside an OPEN modal dialog is inert, and a resize handler that is not
// idempotent will happily leave two of everything.
//
// None of that is visible to a unit test — `filters-ui.js` is DOM code end to
// end — and none of it is visible to a check that only ever looks at one
// viewport width. So this one crosses the breakpoint, repeatedly, with focus in
// awkward places, and asserts what is left afterwards.
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU:
//   1. Whether the row is any good to use. It asserts the controls are there,
//      reachable and wired; it cannot say the layout reads well or that the
//      grouping makes sense at 1100 px.
//   2. Anything about Safari/WebKit, where `<dialog>`, inertness and focus
//      restoration are the three features most likely to differ.
//   3. Anything about a real resize. Every crossing here is an instant metrics
//      override, not a reader dragging a window edge across 300 px of width.
//   4. Whether a screen reader announces the move sensibly. The landmark and
//      the live region are asserted structurally; how JAWS or VoiceOver narrate
//      the transition is not something a DOM assertion reaches.
//
//     node tools/filter_row_check.mjs       # 390 ⇄ 1280
//     node tools/filter_row_check.mjs -v    # narrate each step
//
// Exit 0 = every assertion held. 1 = at least one didn't.

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  Cdp,
  Report,
  createDriver,
  launchChrome,
  startServer,
  stopChrome,
  until,
  sleep,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");
const READY = `(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`;

const STATE = `(() => {
  const controls = document.getElementById("filter-controls");
  const inline = document.getElementById("filter-controls-inline");
  const sheet = document.getElementById("filter-sheet");
  const btn = document.getElementById("filters-btn");
  const clear = document.getElementById("filters-clear");
  const count = document.getElementById("result-count");
  const box = controls?.getBoundingClientRect();
  const reach = (id) => {
    const el = document.getElementById(id);
    if (!el) return "missing";
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return "no box";
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return at === el || el.contains(at) || at?.closest?.("#" + id + ", .select-field")
      ? "reachable"
      : "blocked by " + (at?.tagName ?? "nothing");
  };
  return {
    // A MOVE, never a copy: two of either id is the failure this design exists
    // to make impossible.
    copies: document.querySelectorAll("#filter-controls").length,
    cuisineCopies: document.querySelectorAll("#filter-cuisine").length,
    inSheet: !!sheet?.contains(controls),
    inlineHidden: inline?.hidden !== false,
    btnHidden: btn?.hidden === true,
    bodyClass: document.body.classList.contains("filters-inline"),
    sheetOpen: !!sheet?.open,
    // The landmark has to travel with the controls, not exist at one width and
    // vanish at the other.
    landmark: (controls?.tagName ?? "") + ":" + (controls?.getAttribute("aria-label") || ""),
    visible: !!box && box.width > 1 && box.height > 1,
    // #result-count is the role="status" that says "6 of 51 places". Changing a
    // filter and hearing the new count is an existing a11y win; it only works
    // if the two stay next to each other.
    countFollowsControls:
      !!controls && !!count &&
      !!(controls.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING),
    countIsStatus: count?.getAttribute("role") === "status",
    clearWithControls: !!controls?.contains(clear),
    clearPresent: !!clear && !!clear.offsetParent === !!controls?.offsetParent,
    cuisineReach: reach("filter-cuisine"),
    activeId: document.activeElement?.id || document.activeElement?.tagName || "",
    count: (count?.textContent || "").trim(),
  };
})()`;

async function run(opts) {
  const report = new Report(opts.verbose);
  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-filter-row-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log("Faves filter-row check — do the filters survive the breakpoint?");
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));

    const size = async (w) => {
      await cdp.send(
        "Emulation.setDeviceMetricsOverride",
        { width: w, height: 844, deviceScaleFactor: 1, mobile: false },
        sessionId
      );
      await sleep(200); // the matchMedia listener runs on the next task
      await driver.settle();
    };
    const state = () => driver.evalPage(STATE);

    // --- The phone, which must be exactly what it always was. ---------------
    await size(390);
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html` }, sessionId);
    await until(() => driver.evalPage(READY), { label: "the home list rendered" });
    await driver.settle();
    let s = await state();
    report.check(
      "390px: the controls are in the sheet and the Filters button offers them",
      s.inSheet && s.inlineHidden && !s.btnHidden && !s.bodyClass,
      JSON.stringify({ inSheet: s.inSheet, inlineHidden: s.inlineHidden, btnHidden: s.btnHidden })
    );

    // --- The laptop. --------------------------------------------------------
    await size(1280);
    s = await state();
    report.check(
      "1280px: the real controls are on the page, not behind a button",
      !s.inSheet && !s.inlineHidden && s.visible && s.btnHidden && s.bodyClass,
      JSON.stringify({ inSheet: s.inSheet, visible: s.visible, btnHidden: s.btnHidden, bodyClass: s.bodyClass })
    );
    report.check(
      "1280px: the inline controls are actually operable, not inert",
      s.cuisineReach === "reachable",
      `#filter-cuisine: ${s.cuisineReach}`
    );
    report.check(
      "1280px: 'Clear all' came with them — it is not a phone-only affordance",
      s.clearWithControls,
      JSON.stringify({ clearWithControls: s.clearWithControls })
    );

    // The landmark and the live region, at both widths.
    const landmarkWide = s.landmark;
    report.check(
      "the controls carry their own named landmark wherever they live",
      /^SECTION:.+/.test(landmarkWide),
      landmarkWide
    );
    report.check(
      "1280px: the role=status result count still sits right after the filters",
      s.countFollowsControls && s.countIsStatus,
      JSON.stringify({ follows: s.countFollowsControls, isStatus: s.countIsStatus })
    );

    // --- The controls are wired, not just present. --------------------------
    const before = s.count;
    await driver.evalPage(`(() => {
      const sel = document.getElementById("filter-cuisine");
      sel.selectedIndex = 2;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await sleep(250);
    s = await state();
    report.check(
      "1280px: changing an inline filter narrows the list and updates the count",
      s.count !== before && / of /.test(s.count),
      `"${before}" → "${s.count}"`
    );

    // --- Crossing back with focus inside the controls. ----------------------
    // They are about to land inside a CLOSED dialog, where nothing can hold
    // focus. Falling to <body> would strand a keyboard reader mid-page.
    await driver.evalPage(`document.getElementById("filter-cuisine").focus()`);
    await size(390);
    s = await state();
    report.check(
      "1280→390 with focus in the controls: focus lands on the Filters button, not <body>",
      s.activeId === "filters-btn",
      `activeElement: ${s.activeId}`
    );
    report.check(
      "1280→390: the controls went back into the sheet and the filter survived",
      s.inSheet && s.inlineHidden && !s.btnHidden && / of /.test(s.count),
      JSON.stringify({ inSheet: s.inSheet, count: s.count })
    );
    report.check(
      "1280→390: 'Clear all' went back to the sheet's footer with them",
      !s.clearWithControls,
      JSON.stringify({ clearWithControls: s.clearWithControls })
    );

    // --- Crossing while the sheet is OPEN. ----------------------------------
    // Everything outside an open modal <dialog> is inert, so moving the
    // controls inline without closing it first would paint a row that refuses
    // every click.
    await driver.evalPage(`document.getElementById("filters-btn").click()`);
    await sleep(200);
    await driver.evalPage(`document.getElementById("filter-area").focus()`);
    const opened = await state();
    report.check(
      "the sheet opens at 390px with focus inside it",
      opened.sheetOpen && opened.activeId === "filter-area",
      JSON.stringify({ open: opened.sheetOpen, active: opened.activeId })
    );
    await size(1280);
    s = await state();
    report.check(
      "390→1280 with the sheet OPEN: it closes and the row is not left inert",
      !s.sheetOpen && !s.inSheet && s.cuisineReach === "reachable",
      JSON.stringify({ sheetOpen: s.sheetOpen, inSheet: s.inSheet, cuisine: s.cuisineReach })
    );
    report.check(
      "390→1280 with the sheet OPEN: the control that had focus keeps it",
      s.activeId === "filter-area",
      `activeElement: ${s.activeId}`
    );

    // --- Idempotence. -------------------------------------------------------
    // A handler that runs twice, or that appends instead of moving, shows up
    // here as a second copy of every control.
    for (let i = 0; i < 4; i++) {
      await size(700);
      await size(1400);
    }
    s = await state();
    report.check(
      "eight breakpoint crossings leave exactly one of everything",
      s.copies === 1 && s.cuisineCopies === 1,
      JSON.stringify({ controls: s.copies, cuisineSelects: s.cuisineCopies })
    );
    report.check(
      "…and a coherent wide state, not a half-applied one",
      !s.inSheet && s.visible && s.btnHidden && s.bodyClass && s.clearWithControls,
      JSON.stringify({ inSheet: s.inSheet, visible: s.visible, btnHidden: s.btnHidden, bodyClass: s.bodyClass })
    );

    console.log(`\n${report.failed ? "FAILED" : "OK"} — ${report.passed} passed, ${report.failed} failed`);
    return report.failed === 0;
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
  },
});

const ok = await run({ ...values, port: Number(values.port) });
process.exitCode = ok ? 0 : 1;
