#!/usr/bin/env node
// The "If it’s your first time, try…" block: where it sits, and closing it.
//
// WHY THIS EXISTS. Two owner rulings landed on this block on 2026-08-17, and
// neither is visible to a unit test:
//
//   1. The search field goes ABOVE it. That is a claim about ORDER between two
//      elements built in different halves of `render()` — a reordering that
//      looks right in a diff and is wrong on screen the moment a sticky
//      toolbar, a two-column grid or an early return gets involved. Document
//      order and painted position are asserted separately here because they can
//      disagree: `position: sticky` and CSS grid can both put a later element
//      higher up the page.
//   2. A ✕ closes it, and the close is REMEMBERED PER VENUE. "Remembered" and
//      "per venue" are the two halves that break independently — a global flag
//      passes every "it stayed closed" assertion while silently emptying the
//      block on all fifty places, and a session-only flag passes every "it
//      closed" assertion while forgetting on reload. So both are asserted, on
//      two real venues, across a real reload.
//
// The close also has to hand focus somewhere. The button it lives on is
// removed, and the browser's answer to that is <body> — i.e. the top of the
// document for anyone on a keyboard or a screen reader. That is asserted too,
// and it is the assertion most likely to rot: nothing else on the page would
// notice.
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU:
//   1. Whether closing is the right permanence. There is no undo today: this
//      check pins the behaviour as built, it does not endorse it.
//   2. Anything about Safari/WebKit, or about a real thumb on a 44 px target.
//   3. Whether the block is worth showing at all — that is the owner's call and
//      no assertion touches it.
//
//     node tools/picks_check.mjs           # default venues
//     node tools/picks_check.mjs -v        # narrate each step
//     node tools/picks_check.mjs --id kk-malaysian --other the-ramen-shop
//
// Exit 0 = every assertion held. 1 = at least one didn't. 2 = the browser
// stopped answering (a harness error, NOT a regression — see CLAUDE.md).

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
  startServer,
  stopChrome,
  until,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// One read of everything this check asks about, so every assertion below is
// measuring the same paint.
const PROBE = `(() => {
  const picks = document.querySelector(".picks");
  const search = document.querySelector(".menu-search");
  const close = document.querySelector(".picks-close");
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: +(r.top + scrollY).toFixed(1),
      bottom: +(r.bottom + scrollY).toFixed(1),
      w: +r.width.toFixed(1),
      h: +r.height.toFixed(1),
    };
  };
  return {
    hasPicks: !!picks,
    hasSearch: !!search,
    hasClose: !!close,
    // 4 = DOCUMENT_POSITION_FOLLOWING: the picks block comes after the search
    // field in document order. Read from the search field so a missing picks
    // block can't quietly satisfy it.
    searchPrecedesPicks:
      !!(search && picks) && !!(search.compareDocumentPosition(picks) & 4),
    picksRect: rect(picks),
    searchRect: rect(search),
    closeRect: rect(close),
    closeLabel: close?.getAttribute("aria-label") ?? null,
    // The heading text has to go with the block: a hidden-but-present <h2> is
    // still a heading on a screen reader's list.
    headings: [...document.querySelectorAll("h2")].map((h) => h.textContent.trim()),
    picksHeadings: document.querySelectorAll(".picks-head").length,
    active: document.activeElement?.tagName?.toLowerCase() ?? null,
    activeClass: document.activeElement?.className || "",
    // Every settings key in storage, not the bare "faves.settings.v1": the
    // store is PROFILE-SCOPED (profiles.js), so the live key carries a profile
    // suffix and a check that reads the unsuffixed name finds null — and would
    // report "not persisted" about a value that is persisted perfectly well.
    stored: (() => {
      try {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          // "faves.p.<profile>.settings.v1" is the live shape (scopeKey);
          // "faves.settings.v1" only exists on a pre-profiles device.
          if (!/^faves\.(p\.[^.]+\.)?settings\./.test(k)) continue;
          const v = JSON.parse(localStorage.getItem(k) || "{}").picksClosed;
          if (Array.isArray(v)) out.push(...v);
        }
        return out;
      } catch {
        return "unreadable";
      }
    })(),
  };
})()`;

const HEAD = "If it’s your first time, try…";

async function open(cdp, sessionId, driver, port, venueId) {
  await cdp.send(
    "Page.navigate",
    { url: `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(venueId)}` },
    sessionId
  );
  // Wait for the SEARCH FIELD, never `.menu-status`: "Loading menu…" ships in
  // restaurant.html's static markup and carries that class, so a wait that
  // accepts it returns before a single line of the menu has been drawn — and
  // every assertion after it then measures a blank page.
  await until(() => driver.evalPage(`!!document.querySelector(".menu-search")`), {
    label: `${venueId} rendered`,
  });
  await driver.settle();
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const index = JSON.parse(await readFile(join(SITE, "data", "index.json"), "utf8"));
  // Two venues that both carry picks: one to close, one to prove the close did
  // not reach it. If either ever loses its picks this check must fail loudly
  // rather than pass on an empty page.
  const venueId = opts.id || "cook-at-home";
  const otherId = opts.other || "the-ramen-shop";
  for (const id of [venueId, otherId]) {
    if (!index.includes(id)) throw new Error(`no such venue: ${id}`);
  }

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-picks-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log("Faves picks check — search above the suggestions, and a ✕ that remembers");
    console.log(`  venues   ${venueId} (closed here) · ${otherId} (must be untouched)`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    // Same isolation every other check takes: ADR 0083's location dialog is a
    // real showModal() that pulls focus, and this check asserts where focus
    // lands. Seeding the consent flag is the supported "don't ask again" state,
    // not a hack.
    await cdp.send(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source:
          'try { localStorage.setItem("faves.geo.consent.v1", JSON.stringify({ suppressed: true, declined: true })); } catch {}',
      },
      sessionId
    );
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));

    // 390 px is the design width, and it is where the two-column grid is OFF —
    // so the second sweep at 1200 px is not decoration: that is where document
    // order and painted order are free to disagree.
    for (const width of [390, 1200]) {
      await cdp.send(
        "Emulation.setDeviceMetricsOverride",
        { width, height: 844, deviceScaleFactor: 1, mobile: false },
        sessionId
      );
      await open(cdp, sessionId, driver, port, venueId);
      const at = `@${width}px`;
      const p = await driver.evalPage(PROBE);

      if (!report.check(`${at}: the venue still has a picks block to test`, p.hasPicks && p.hasSearch)) {
        continue;
      }
      report.check(
        `${at}: the search field comes BEFORE the picks in document order`,
        p.searchPrecedesPicks,
        `compareDocumentPosition says ${p.searchPrecedesPicks ? "following" : "NOT following"}`
      );
      // Separate assertion, deliberately: sticky positioning and grid can both
      // paint a later element higher, so document order alone is not the claim
      // the owner made.
      report.check(
        `${at}: …and is painted above them too`,
        p.searchRect.bottom <= p.picksRect.top,
        `search ends at ${p.searchRect.bottom}, picks start at ${p.picksRect.top}`
      );
      report.check(
        `${at}: the ✕ is a real 44 px target with a name`,
        p.hasClose && p.closeRect.w >= 44 && p.closeRect.h >= 44 && !!p.closeLabel,
        JSON.stringify({ rect: p.closeRect, label: p.closeLabel })
      );
    }

    // --- Closing it, at the design width. --------------------------------
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
      sessionId
    );
    await open(cdp, sessionId, driver, port, venueId);
    await driver.click(".picks-close");
    const after = await driver.evalPage(PROBE);

    report.check(
      "the ✕ removes the block — heading and all",
      !after.hasPicks && after.picksHeadings === 0 && !after.headings.includes(HEAD),
      JSON.stringify({ picks: after.hasPicks, headings: after.picksHeadings })
    );
    // The button focus was standing on has just been removed. Landing on <body>
    // means a keyboard reader is back at the top of the document.
    report.check(
      "focus is handed on, not dropped to <body>",
      after.active !== "body" && after.active !== null,
      `focus is on <${after.active}${after.activeClass ? ` class="${after.activeClass}"` : ""}>`
    );
    report.check(
      "the close is written to the settings store",
      Array.isArray(after.stored) && after.stored.includes(venueId),
      `picksClosed = ${JSON.stringify(after.stored)}`
    );

    // --- It has to survive a reload, or "remembered" is a lie. -------------
    await open(cdp, sessionId, driver, port, venueId);
    const reloaded = await driver.evalPage(PROBE);
    report.check(
      "it is still closed after a reload",
      !reloaded.hasPicks && reloaded.hasSearch,
      JSON.stringify({ picks: reloaded.hasPicks, search: reloaded.hasSearch })
    );

    // --- …and it must NOT have closed everywhere else. ---------------------
    await open(cdp, sessionId, driver, port, otherId);
    const other = await driver.evalPage(PROBE);
    report.check(
      `closing one place leaves ${otherId}'s picks alone`,
      other.hasPicks && other.headings.includes(HEAD),
      JSON.stringify({ picks: other.hasPicks, stored: other.stored })
    );
    report.check(
      `…and the second venue's search is above ITS picks too`,
      other.searchPrecedesPicks && other.searchRect.bottom <= other.picksRect.top,
      JSON.stringify({ order: other.searchPrecedesPicks, search: other.searchRect, picks: other.picksRect })
    );

    // --- The way BACK (Theme 15, owner-ruled 2026-08-22) ------------------
    // The ✕ was shipped with no undo and the owner ruled the undo lives in
    // Settings, not in the venue's ⋯ menu. Two halves fail independently and
    // both are asserted here:
    //   • it must actually reopen — the whole point;
    //   • it must reopen EVERY venue, because a control that quietly fixed
    //     only the last one you closed passes every single-venue assertion
    //     while leaving the other 54 silent. That is why a SECOND venue is
    //     closed first: with one, "clears all" and "clears the last" are the
    //     same observation.
    await driver.click(".picks-close");
    await driver.settle();
    const bothClosed = await driver.evalPage(PROBE);
    report.check(
      "a second venue can be closed too, so 'clears all' is distinguishable from 'clears the last'",
      !bothClosed.hasPicks && Array.isArray(bothClosed.stored) && bothClosed.stored.length === 2,
      `picksClosed = ${JSON.stringify(bothClosed.stored)}`
    );

    await driver.click("#overflow-btn");
    await driver.click("#settings-btn");
    await until(() => driver.evalPage(`!!document.querySelector(".settings-sheet[open], #settings-sheet[open]")`), {
      label: "the Settings sheet to open",
    });
    await driver.click(".settings-row", "Refresh & reset");
    await driver.settle();

    // The count is read from the store on every open, so it is evidence the
    // panel is describing THIS device rather than a value baked in at build.
    const beforeReset = await driver.evalPage(`(() => {
      const btn = [...document.querySelectorAll(".settings-panel button")]
        .find((b) => /Show suggestions again/.test(b.textContent || ""));
      const note = btn?.previousElementSibling;
      return { found: !!btn, disabled: btn ? btn.disabled : null, note: note ? note.textContent : "" };
    })()`);
    report.check(
      "Settings offers a way back, and says how many places it will affect",
      beforeReset.found && beforeReset.disabled === false && /\b2 places\b/.test(beforeReset.note),
      `enabled=${!beforeReset.disabled}, note “${(beforeReset.note || "").slice(0, 72)}…”`
    );

    await driver.click(".settings-panel button", "Show suggestions again");
    await driver.settle();
    const afterReset = await driver.evalPage(`(() => {
      const btn = [...document.querySelectorAll(".settings-panel button")]
        .find((b) => /Show suggestions again/.test(b.textContent || ""));
      let stored = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!/^faves\.(p\.[^.]+\.)?settings\./.test(k)) continue;
        const v = JSON.parse(localStorage.getItem(k) || "{}").picksClosed;
        if (Array.isArray(v)) stored = v;
      }
      return {
        stored,
        disabled: btn ? btn.disabled : null,
        focusTag: (document.activeElement || {}).tagName || "",
        focusInPanel: !!document.activeElement?.closest?.(".settings-panel"),
      };
    })()`);
    report.check(
      "the reset empties the whole list, not just the last venue closed",
      Array.isArray(afterReset.stored) && afterReset.stored.length === 0,
      `picksClosed = ${JSON.stringify(afterReset.stored)}`
    );
    // The button disables itself the instant it works, so focusing it would
    // drop a keyboard reader to <body> — the same fault this tool already
    // guards on the venue page's ✕.
    report.check(
      "focus stays in the panel after the button that had it disables itself",
      afterReset.focusInPanel === true && afterReset.focusTag !== "BODY",
      `focus on <${(afterReset.focusTag || "?").toLowerCase()}>, in the panel=${afterReset.focusInPanel}`
    );

    // And the claim that matters to a reader: both venues actually show it.
    for (const id of [venueId, otherId]) {
      await open(cdp, sessionId, driver, port, id);
      const back = await driver.evalPage(PROBE);
      report.check(
        `${id}'s suggestions are back after the reset`,
        back.hasPicks && back.headings.includes(HEAD),
        JSON.stringify({ picks: back.hasPicks, stored: back.stored })
      );
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
    id: { type: "string" },
    other: { type: "string" },
    port: { type: "string", default: "0" },
  },
});

const ok = await run({ ...values, port: Number(values.port) });
process.exitCode = ok ? 0 : 1;
