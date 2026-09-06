#!/usr/bin/env node
// Does the back-to-top button stay out of the way of the menu — while staying
// on screen the whole way down it? (Theme 29, both halves.)
//
// WHY THIS EXISTS. The owner photographed his own phone: the floating ↑ sat
// over the "French fries" row and hid the right-hand end of its price. Nothing
// in the repo could have caught it — `device_check`, `cook_check`,
// `addon_check` and `branch_check` all assert that controls *work*, and this
// control worked perfectly while making a number unreadable. The first answer
// was to tuck the button away for the whole of a downward scroll. On 2026-09-07
// the owner reported the cost of that answer: *"the arrow should appear the
// moment I start to scroll down the page"*. He was offered the straight revert
// — show it on the way down, accept the occlusion — and declined it. So the
// control now DODGES: it is offered at every scroll position past the
// threshold, and it steps up the column when a price, a name or a ♥ is under
// it. See the header of `site/js/to-top.js` for the measurements.
//
// That makes two questions here, and they fail independently:
//   · is anything of the reader's underneath it? (the first report)
//   · is it THERE at all, on the way down? (the second)
// A control that is never shown passes the first trivially, which is exactly
// what the old assertion did — it asserted the button was NOT shown while
// descending. Both are asserted below, at every swept position.
//
// HOW IT MEASURES. It sweeps the WHOLE document in 37 px steps, at two widths
// and two text sizes, on both screens the control floats over — because a fixed
// control's victim depends entirely on where you stop scrolling, and a single
// sample is what every eyeball report of this bug had been.
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU:
//   1. Anything about Safari/WebKit — this is Chrome only, and iOS Safari's
//      rubber-band scrolling is exactly where a scroll-driven control is most
//      likely to misbehave.
//   2. Whether the dodge *feels* right. "It moved and I didn't expect it" is a
//      judgement no assertion makes.
//   3. Anything about momentum scrolling. Every scroll here is an instant jump.
//   4. Anything about the button MID-MOVE. The sweep disables the transform
//      transition so every sample is a resting position — otherwise it would be
//      measuring how far through a 0.16 s glide the button happened to be. A
//      real fast flick can therefore put the button briefly over a price while
//      it catches up; that is inherent to animating it at all, and it is not
//      measured here.
//   5. Whether the button is discoverable, or whether the dodge's travel is
//      distracting. The largest dodge each sweep needed is printed, not judged.
//
//     node tools/to_top_check.mjs           # default venue
//     node tools/to_top_check.mjs -v        # narrate each step
//     node tools/to_top_check.mjs --id kk-malaysian
//
// Exit 0 = every assertion held. 1 = at least one didn't.

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
  untilPresent,
  sleep,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// 37 px, not 50 or 100: a step that is a factor of nothing in the layout cannot
// march in phase with a repeating row and step over the same offset every time.
const STEP = 37;
// site/js/to-top.js's SHOW_AT. Below it the control is deliberately not offered
// at all, so those positions are swept for occlusion but not for presence.
const SHOW_AT = 600;

// What the button is doing right now, and what — if anything — of the reader's
// is underneath it. `worst` is the largest fraction of any single price, heart
// or dish name the button covers at this scroll position.
const PROBE_FN = `(() => {
  const btn = document.querySelector(".to-top");
  if (!btn) return { missing: true };
  const cs = getComputedStyle(btn);
  const shown = !btn.hidden && cs.display !== "none" && Number(cs.opacity) > 0.05;
  const b = btn.getBoundingClientRect();
  let worst = null;
  if (shown) {
    for (const sel of [".dish-price", ".heart", ".card-name", ".dish-name"]) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue;
        const w = Math.min(b.right, r.right) - Math.max(b.left, r.left);
        const h = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
        if (w <= 0 || h <= 0) continue;
        const pct = (w * h) / (r.width * r.height) * 100;
        if (!worst || pct > worst.pct) {
          worst = { sel, pct: +pct.toFixed(1), text: (el.textContent || "").trim().slice(0, 30) };
        }
      }
    }
  }
  return {
    shown,
    hidden: btn.hidden,
    tucked: btn.classList.contains("is-tucked"),
    opacity: +cs.opacity,
    top: +b.top.toFixed(1),
    // How far up the column the control has stepped to get clear. 0 = it is in
    // its corner. Read from the property to-top.js writes, so it is the site's
    // own number and not this tool's re-derivation of it.
    dodge: -(parseFloat(btn.style.getPropertyValue("--to-top-dodge")) || 0),
    focusable: btn.tabIndex >= 0 && cs.visibility !== "hidden",
    // A fixed element parked off the bottom must not extend the scrollable
    // area; a horizontal scrollbar on a phone would be a worse bug than the one
    // being fixed.
    docW: document.documentElement.scrollWidth,
    innerW: innerWidth,
    worst,
  };
})`;

// The sweep, run entirely inside the page. Doing it here rather than one CDP
// round-trip per scroll position is what makes a whole-document sweep at four
// combinations affordable enough that anyone actually runs it.
const SWEEP = `(async () => {
  const probe = ${PROBE_FN};
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const btn = document.querySelector(".to-top");
  if (!btn) return { missing: true };
  // Every sample must be a RESTING position. With the transition live we would
  // be measuring how far through a 0.16 s glide the button got, which is a
  // claim about the animation, not about where the control comes to rest.
  btn.style.transition = "none";
  const maxY = document.documentElement.scrollHeight - innerHeight;
  const out = {
    maxY,
    positions: 0,
    past: 0,
    occluded: 0,
    worst: null,
    maxDodge: 0,
    notOffered: [],
    tuckedAt: [],
    unfocusableAt: [],
    docW: 0,
    innerW: innerWidth,
  };
  for (let y = 0; y <= maxY; y += ${STEP}) {
    window.scrollTo({ top: y, behavior: "instant" });
    // Two frames: one for the scroll handler's own rAF to run, one for the
    // style it writes to have been applied before anything is measured.
    await raf();
    await raf();
    const p = probe();
    out.positions++;
    out.docW = Math.max(out.docW, p.docW);
    if (!p.focusable && out.unfocusableAt.length < 8) out.unfocusableAt.push(y);
    if (p.worst) {
      out.occluded++;
      if (!out.worst || p.worst.pct > out.worst.pct) out.worst = { y, ...p.worst };
    }
    if (y >= ${SHOW_AT}) {
      out.past++;
      if (!p.shown && out.notOffered.length < 8) out.notOffered.push(y);
      if (p.tucked && out.tuckedAt.length < 8) out.tuckedAt.push(y);
      if (p.dodge > out.maxDodge) out.maxDodge = p.dodge;
    }
  }
  out.notOfferedCount = out.notOffered.length;
  btn.style.transition = "";
  return out;
})()`;

// Same scroll position, reached from above and from below. The whole of the
// 2026-09-07 report was that WHICH WAY YOU CAME decided whether the control
// existed; this is the assertion that stops that coming back.
const BOTH_WAYS = (depths) => `(async () => {
  const probe = ${PROBE_FN};
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const btn = document.querySelector(".to-top");
  btn.style.transition = "none";
  const at = async (y) => {
    window.scrollTo({ top: y, behavior: "instant" });
    await raf();
    await raf();
    return probe();
  };
  const rows = [];
  for (const y of ${JSON.stringify(depths)}) {
    await at(0);
    const down = await at(y);            // arrived scrolling DOWN
    await at(y + 500);
    const up = await at(y);              // arrived scrolling UP
    rows.push({ y, down: { shown: down.shown, dodge: down.dodge }, up: { shown: up.shown, dodge: up.dodge } });
  }
  btn.style.transition = "";
  return rows;
})()`;

async function run(opts) {
  const report = new Report(opts.verbose);
  const index = JSON.parse(await readFile(join(SITE, "data", "index.json"), "utf8"));
  const venueId = opts.id || "thai-tara-express";
  if (!index.includes(venueId)) throw new Error(`no such venue: ${venueId}`);

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-to-top-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log("Faves back-to-top check — is the ↑ there on the way down, and off the reader's menu?");
    console.log(`  venue    ${venueId}`);
    console.log(`  sweep    every ${STEP}px of the whole document, 390px and 1200px, 16px and 24px text`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    // ISOLATION, not a workaround: ADR 0083 gives the home screen a location
    // dialog that opens ~900 ms after the list renders and, being a real
    // `showModal()`, makes every control outside it inert and pulls focus. This
    // check is about the back-to-top button, so an unrelated modal landing mid-run
    // is a variable to remove, exactly as a stale service worker is. Seeding the
    // consent flag BEFORE any page script runs is the same answer the reader
    // gets from the dialog's own "don't ask again" tickbox — a supported state,
    // not a hack. Without it this check failed with "blocked by DIALOG".
    await cdp.send(
      "Page.addScriptToEvaluateOnNewDocument",
      {
        source:
          'try { localStorage.setItem("faves.geo.consent.v1", JSON.stringify({ suppressed: true, declined: true })); } catch {}',
      },
      sessionId
    );
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));

    // Two screens, because the same button floats over both and the damage
    // differs: a price on a menu, a venue's ♥ on the home list.
    const screens = [
      {
        name: "menu",
        url: `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(venueId)}`,
        ready: `!!document.querySelector(".dish-price")`,
      },
      {
        name: "home",
        url: `http://127.0.0.1:${port}/index.html`,
        ready: `(document.querySelector("#result-count")?.textContent ?? "").trim().length > 0`,
      },
    ];

    // 390 px is the design width; 1200 px is the laptop layout, where the menu
    // column stops well short of the button and the home grid does not. 24 px
    // root emulates the largest built-in browser text size, where every
    // rem-valued box grows and the px-valued button does not.
    for (const width of [390, 1200]) {
      for (const rootPx of [16, 24]) {
        for (const screen of screens) {
          const at = `${screen.name} @${width}px/${rootPx}px text`;
          await cdp.send(
            "Emulation.setDeviceMetricsOverride",
            { width, height: 844, deviceScaleFactor: 1, mobile: false },
            sessionId
          );
          await cdp.send("Page.navigate", { url: screen.url }, sessionId);
          await untilPresent(() => driver.evalPage(screen.ready), { label: `${screen.name} rendered` });
          if (rootPx !== 16) {
            await driver.evalPage(`(() => { const s = document.createElement("style");
              s.textContent = "html{font-size:${rootPx}px}"; document.head.append(s); })()`);
          }
          await driver.settle();

          const s = await driver.evalPage(SWEEP);
          if (s.missing) {
            report.check(`${at}: the back-to-top control exists`, false, "no .to-top in the DOM");
            continue;
          }
          const scale = `${s.positions} positions over ${s.maxY + 844}px of document`;

          // --- 1. The 2026-09-07 report. It must BE there on the way down. ---
          report.check(
            `${at}: the ↑ is offered at every scroll position past ${SHOW_AT}px`,
            s.notOffered.length === 0,
            s.notOffered.length
              ? `absent at y=${s.notOffered.join(", ")}${s.notOfferedCount >= 8 ? " …" : ""} of ${s.past}`
              : `${s.past} positions past the threshold, shown at every one (${scale})`
          );

          // --- 2. The 2026-08 report. Nothing of the reader's under it. ------
          report.check(
            `${at}: nothing of the reader's is under the ↑ at any scroll position`,
            s.occluded === 0,
            s.occluded
              ? `${s.occluded} of ${s.positions} positions occluded; worst ${s.worst.pct}% of ${s.worst.sel} "${s.worst.text}" at y=${s.worst.y}`
              : `${scale}, largest dodge needed ${s.maxDodge}px`
          );

          // --- 3. The tuck is the safety valve, and it must stay unused. -----
          // If this fires, the page is denser than anything measured and the
          // control is vanishing again — the exact regression this item exists
          // to undo, arriving by the back door.
          report.check(
            `${at}: it never falls back to tucking itself away`,
            s.tuckedAt.length === 0,
            s.tuckedAt.length ? `tucked at y=${s.tuckedAt.join(", ")}` : `dodge stayed within its travel`
          );

          // It must be REACHABLE at every position, or a keyboard reader has
          // simply lost the control.
          report.check(
            `${at}: the ↑ is focusable at every swept position`,
            s.unfocusableAt.length === 0,
            s.unfocusableAt.length ? `not focusable at y=${s.unfocusableAt.join(", ")}` : `${scale}`
          );
          report.check(
            `${at}: it adds no horizontal scroll anywhere in the sweep`,
            s.docW <= s.innerW,
            `document ${s.docW}px wide in a ${s.innerW}px viewport`
          );

          // --- 4. Direction must no longer decide anything. ------------------
          const depths = [1200, 2400, 4000].filter((d) => d + 500 <= s.maxY);
          if (depths.length) {
            const rows = await driver.evalPage(BOTH_WAYS(depths));
            const disagree = rows.filter(
              (r) => r.down.shown !== r.up.shown || Math.abs(r.down.dodge - r.up.dodge) > 1
            );
            report.check(
              `${at}: the same position looks the same whether you came down to it or up`,
              disagree.length === 0 && rows.every((r) => r.down.shown),
              JSON.stringify(rows)
            );
          }

          // --- 5. Keyboard. Focus must bring it fully on screen. -------------
          await driver.evalPage(`window.scrollTo({ top: ${Math.min(6000, s.maxY)}, behavior: "instant" })`);
          await sleep(250);
          await driver.evalPage(`${need(".to-top")}.focus()`);
          await sleep(250);
          const focused = await driver.evalPage(`(${PROBE_FN})()`);
          report.check(
            `${at}: focusing the ↑ leaves it on screen and unobstructed`,
            focused.shown && focused.top < 844 && !focused.worst,
            JSON.stringify({ shown: focused.shown, top: focused.top, worst: focused.worst })
          );
          await driver.evalPage(`${need(".to-top")}.blur()`);

          // --- 6. Below the threshold it is gone entirely, as it always was. -
          await driver.evalPage(`window.scrollTo({ top: 0, behavior: "instant" })`);
          await sleep(250);
          const top = await driver.evalPage(`(${PROBE_FN})()`);
          report.check(
            `${at}: at the top of the page it is not offered at all`,
            top.hidden === true,
            JSON.stringify({ hidden: top.hidden })
          );
        }
      }
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
    port: { type: "string", default: "0" },
  },
});

const ok = await run({ ...values, port: Number(values.port) });
process.exitCode = ok ? 0 : 1;
