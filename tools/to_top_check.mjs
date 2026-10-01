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
// THE ⋯ (roadmap 300/030). The header's overflow button is hit-tested at every
// swept position where it is on screen, after an instant jump back to the top
// from mid-menu, and by a real tap; a control overlay proves the probe can say
// "covered". Measured 2026-10-02: never covered at rest. For 1-2 frames after a
// jump to the top the fixed compact contact bar (z-index 7) can still be up,
// because its IntersectionObserver reports late — a transient, bounded here in
// wall-clock time rather than asserted away.
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
  UnstableElementError,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

/**
 * Refuse to report on a sweep that did not go where it was sent.
 *
 * 🔑 A REFUSAL, NOT AN ASSERTION, AND THE DIFFERENCE IS THE WHOLE VALUE. A
 * `report.check` here would let the run carry on and print sixty-three other
 * verdicts computed from measurements taken at one scroll position pretending
 * to be three thousand — which is exactly what happened on 2026-09-07, where
 * `scrollTo(0, 5000)` left `scrollY` at 2 and the sweep still produced the
 * correct answer. Nothing invited a second look. So the instrument's own
 * failure stops the run instead of joining the results.
 */
function refuseUnlessItArrived(what, missed) {
  if (!missed || missed.length === 0) return;
  throw new UnstableElementError(
    `UNSTABLE ELEMENT — ${what} did not reach ${missed.length} of the positions it` +
      ` was sent to (${missed.map((m) => `${m.sent}→${m.reached}`).join(", ")}).` +
      ` Every measurement in that sweep describes somewhere else.`
  );
}

// 37 px, not 50 or 100: a step that is a factor of nothing in the layout cannot
// march in phase with a repeating row and step over the same offset every time.
const STEP = 37;
// site/js/to-top.js's SHOW_AT. Below it the control is deliberately not offered
// at all, so those positions are swept for occlusion but not for presence.
const SHOW_AT = 600;
// How long the ⋯ may stay under the contact bar after an instant jump to the top.
// A WALL-CLOCK bound, not a frame count: the observer's report is a task, and on
// a loaded machine it was seen to trail 24+ frames while a quiet one needs 1.
// What this guards is that it ALWAYS clears, not how fast; the frames it took
// are printed so a slowing observer is visible.
const ARRIVE_MS = 5000;

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


// Is the header's ⋯ (#overflow-btn) the thing a tap at its centre would reach?
// (roadmap 300/030.) It lives in the NON-sticky header, so mid-menu it is
// simply off-screen — "covered" is only a meaningful claim at positions where
// its centre is inside the viewport, and there `elementFromPoint` is the
// browser's own answer to what a tap would hit. Returns null when off-screen.
const OVERFLOW_PROBE_FN = `(() => {
  const b = document.getElementById("overflow-btn");
  if (!b) return { missing: true };
  const r = b.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (r.width < 1 || x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null;
  const hit = document.elementFromPoint(x, y);
  if (hit && (hit === b || b.contains(hit))) return { ok: true };
  let cover = "nothing at all";
  if (hit) {
    const cs = getComputedStyle(hit);
    const c = typeof hit.className === "string" ? hit.className.trim().split(/\\s+/).filter(Boolean).slice(0, 3).join(".") : "";
    cover = (hit.id ? "#" + hit.id : hit.tagName.toLowerCase() + (c ? "." + c : "")) +
      " (" + cs.position + ", z-index " + cs.zIndex + ")";
  }
  return { ok: false, cover };
})`;

// After an instant jump to the top, how many animation frames until the ⋯ is
// reachable? The compact contact bar (fixed, z-index 7) is un-hidden by an
// IntersectionObserver, which reports a frame or so AFTER the scroll — so the
// first frame at the top can still carry a bar the page has already scrolled
// away from. That is the "covered, with a <span> on top" a screenshot script
// met mid-menu. It is a transient, not a resting state, and this measures it
// rather than ignoring it: the bound is a few frames, never "eventually".
const ARRIVE_AT_TOP = (fromY) => `(async () => {
  const probe = ${OVERFLOW_PROBE_FN};
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  window.scrollTo({ top: ${fromY}, behavior: "instant" });
  await raf(); await raf();
  const from = Math.round(window.scrollY);
  window.scrollTo({ top: 0, behavior: "instant" });
  const arrived = Math.abs(window.scrollY) <= 2;
  // "Reachable" must HOLD, not just be seen once: the observer's report can land
  // after a frame that looked clear (measured, on a loaded machine: clear at
  // frame 0, covered again by frame 3). So count the frame at which it became
  // clear and STAYED clear for three in a row.
  const t0 = performance.now();
  let n = 0, run = 0, clearFrom = null, firstCover = null, covers = 0;
  for (; performance.now() - t0 < ${ARRIVE_MS} && run < 3; n++) {
    const p = probe();
    if (p && p.ok) { if (run === 0) clearFrom = n; run++; }
    else { run = 0; clearFrom = null; if (p) { covers++; if (!firstCover) firstCover = p.cover; } }
    await raf();
  }
  return { from, arrived, frames: clearFrom, ms: Math.round(performance.now() - t0), ok: run >= 3, firstCover, covers };
})()`;

// The sweep, run entirely inside the page. Doing it here rather than one CDP
// round-trip per scroll position is what makes a whole-document sweep at four
// combinations affordable enough that anyone actually runs it.
const SWEEP = `(async () => {
  const probe = ${PROBE_FN};
  const ovProbe = ${OVERFLOW_PROBE_FN};
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
    dodged: 0,
    notOffered: [],
    tuckedAt: [],
    unfocusableAt: [],
    docW: 0,
    innerW: innerWidth,
    // The arrival count. A sweep that did not go where it was sent measures
    // one position N times and reports it as N positions — and on 2026-09-07 a
    // sweep that had done exactly that returned the RIGHT ANSWER, so nothing
    // in the output invited a second look (roadmap 210/070).
    missed: 0,
    missedAt: [],
    // The ⋯ (roadmap 300/030): positions where it is on screen, and the ones
    // where something else would take the tap.
    ovSeen: 0,
    ovCovered: [],
  };
  for (let y = 0; y <= maxY; y += ${STEP}) {
    window.scrollTo({ top: y, behavior: "instant" });
    // Two frames: one for the scroll handler's own rAF to run, one for the
    // style it writes to have been applied before anything is measured.
    await raf();
    await raf();
    if (Math.abs(window.scrollY - Math.min(y, maxY)) > 2) {
      out.missed++;
      if (out.missedAt.length < 8) out.missedAt.push({ sent: y, reached: Math.round(window.scrollY) });
    }
    const ov = ovProbe();
    if (ov && !ov.missing) {
      out.ovSeen++;
      if (!ov.ok && out.ovCovered.length < 6) out.ovCovered.push({ y, cover: ov.cover });
    }
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
      if (p.dodge > 0) out.dodged++;
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
  const missed = [];
  const at = async (y) => {
    window.scrollTo({ top: y, behavior: "instant" });
    await raf();
    await raf();
    const maxY = document.documentElement.scrollHeight - innerHeight;
    if (Math.abs(window.scrollY - Math.min(y, maxY)) > 2) {
      missed.push({ sent: y, reached: Math.round(window.scrollY) });
    }
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
  return { rows, missed };
})()`;

// Roadmap 300/030 — the header's ⋯ — shared by the full sweep and the lighter
// one the two long named menus get. `s` carries ovSeen / ovCovered / positions /
// maxY from whichever sweep ran.
async function overflowChecks(report, driver, at, s) {
  // --- 7. The header's ⋯ is never under something else (300/030). -----
  // Mid-menu the ⋯ is scrolled away with its non-sticky header, so the
  // only positions where it can be covered are the ones where it is on
  // screen — and the sweep above hit-tested every one of those.
  report.check(
    `${at}: the ⋯ is on screen somewhere in the sweep, so its hit-test tests something`,
    s.ovSeen > 0,
    `${s.ovSeen} of ${s.positions} positions have its centre in the viewport`
  );
  report.check(
    `${at}: at every position where the ⋯ is on screen, a tap at its centre reaches it`,
    s.ovCovered.length === 0,
    s.ovCovered.length
      ? `covered at y=${s.ovCovered.map((c) => `${c.y} by ${c.cover}`).join("; ")}`
      : `${s.ovSeen} of ${s.positions} positions on screen, none covered`
  );
  await sleep(50);
  const depth = Math.min(1500, s.maxY);
  const arr = await driver.evalPage(ARRIVE_AT_TOP(depth));
  refuseUnlessItArrived(`${at}: the jump back to the top`, arr.arrived ? [] : [{ sent: 0, reached: "?" }]);
  report.check(
    `${at}: jumping from y=${arr.from} to the top, the ⋯ becomes reachable (and stays so) within ${ARRIVE_MS}ms`,
    arr.ok,
    arr.ok
      ? `clear and staying clear from frame ${arr.frames} (${arr.ms}ms)${arr.covers ? `; ${arr.covers} covered frame(s), first under ${arr.firstCover}` : ""}`
      : `never settled clear in ${ARRIVE_MS}ms; first covered by ${arr.firstCover}`
  );
  // The real tap, through the harness's own hit-test (which FAILS on a
  // covered target and never scrolls away from it).
  await driver.settle();
  await driver.click("#overflow-btn");
  await driver.settle();
  const opened = await driver.evalPage(
    `document.getElementById("overflow-btn").getAttribute("aria-expanded") === "true" && !document.getElementById("overflow-menu").hidden`
  );
  report.check(`${at}: tapping the ⋯ after the jump opens the menu`, opened === true, JSON.stringify({ opened }));
  await driver.click("#overflow-btn");
  await driver.settle();

  // The control. A hit-test that can never fail proves nothing, so lay a
  // fixed overlay over the ⋯ exactly as a pinned bar would and require
  // the same probe to name it. Removed straight after.
  const ctl = await driver.evalPage(`(() => {
    const r = document.getElementById("overflow-btn").getBoundingClientRect();
    const o = document.createElement("div");
    o.id = "probe-overlay";
    o.style.cssText = "position:fixed;z-index:9;left:" + (r.left - 4) + "px;top:" + (r.top - 4) +
      "px;width:" + (r.width + 8) + "px;height:" + (r.height + 8) + "px";
    document.body.append(o);
    const v = (${OVERFLOW_PROBE_FN})();
    o.remove();
    return v;
  })()`);
  report.check(
    `${at}: control — an overlay laid over the ⋯ IS reported as covering it`,
    ctl && ctl.ok === false && /probe-overlay/.test(ctl.cover),
    JSON.stringify(ctl)
  );
}

// The lighter sweep for the long named menus. The ⋯ is only ever on screen in
// the first ~100px of scroll (its header is not sticky), so 1px steps there and
// a coarse stride for the rest covers the same ground as the full sweep at a
// twentieth of the cost — and on a 60,000px menu under load that is the
// difference between a check that finishes and one that times out.
const OV_SWEEP = `(async () => {
  const probe = ${OVERFLOW_PROBE_FN};
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const maxY = document.documentElement.scrollHeight - innerHeight;
  const ys = [];
  for (let y = 0; y <= Math.min(maxY, 200); y += 4) ys.push(y);
  for (let y = 200; y <= maxY; y += 997) ys.push(y);
  const out = { maxY, positions: 0, ovSeen: 0, ovCovered: [], missedAt: [] };
  for (const y of ys) {
    window.scrollTo({ top: y, behavior: "instant" });
    await raf();
    await raf();
    if (Math.abs(window.scrollY - Math.min(y, maxY)) > 2 && out.missedAt.length < 8) {
      out.missedAt.push({ sent: y, reached: Math.round(window.scrollY) });
    }
    out.positions++;
    const ov = probe();
    if (ov && !ov.missing) {
      out.ovSeen++;
      if (!ov.ok && out.ovCovered.length < 6) out.ovCovered.push({ y, cover: ov.cover });
    }
  }
  return out;
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
    // The two long menus roadmap 300/030 names, at the phone width only: it was
    // a screenshot script on a phone-width long menu that met the covered ⋯.
    const NAMED = ["rs-satay-noodle-house", "regal-chinese-restaurant"].filter(
      (id) => id !== venueId && index.includes(id)
    );
    const extra = NAMED.map((id) => ({
      name: `menu ${id}`,
      url: `http://127.0.0.1:${port}/restaurant.html?id=${encodeURIComponent(id)}`,
      ready: `!!document.querySelector(".dish-price")`,
      light: true,
    }));
    for (const width of [390, 1200]) {
      for (const rootPx of [16, 24]) {
        for (const screen of width === 390 ? [...screens, ...extra] : screens) {
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

          if (screen.light) {
            const l = await driver.evalPage(OV_SWEEP);
            refuseUnlessItArrived(`${at}: the ⋯ sweep`, l.missedAt);
            await overflowChecks(report, driver, at, l);
            continue;
          }
          const s = await driver.evalPage(SWEEP);
          if (s.missing) {
            report.check(`${at}: the back-to-top control exists`, false, "no .to-top in the DOM");
            continue;
          }
          refuseUnlessItArrived(`${at}: the ${s.positions}-position sweep`, s.missedAt);
          const scale = `${s.positions} positions over ${s.maxY + 844}px of document`;

          // --- 0. The sweep has something to say (roadmap 28s). -------------
          // Every presence assertion below is gated on `y >= SHOW_AT`, and the
          // first one's verdict is `notOffered.length === 0` — so a document
          // too short to reach the threshold scores `past === 0` and printed
          // "0 positions past the threshold, shown at every one". A menu that
          // got SHORTER (a ladder merge folds rows into one) would pass that
          // vacuously. Assert the sweep actually crossed the threshold.
          report.check(
            `${at}: the document reaches past the ${SHOW_AT}px threshold, so the sweep tests something`,
            s.past > 0,
            `${s.past} position(s) past the threshold (${scale})`
          );

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
              : `${scale}; it had to step aside at ${s.dodged} of ${s.past}, by at most ${Math.round(s.maxDodge)}px`
          );

          // --- 2b. Out past the column where there is room (owner, 2026-09-29).
          // On a laptop it used to hug the column from the INSIDE and jumped
          // about dodging cards. At 1200 px the gutter (120 px) holds the 60 px
          // button, so it must sit wholly outside <main> and never dodge; on
          // home, "Pick for us" shares its right edge. At 390 px there is no
          // gutter and the dodge above is what keeps content clear — as at
          // 1200 px with 24 px text, where the 60rem column is 1440 px wide.
          if (width === 1200 && rootPx === 16) {
            const g = await driver.evalPage(`(() => {
              const b = ${need(".to-top")}.getBoundingClientRect();
              const m = ${need("main")}.getBoundingClientRect();
              const p = document.querySelector(".bar-pick");
              const pr = p && getComputedStyle(p).display !== "none" ? p.getBoundingClientRect() : null;
              return { btnLeft: Math.round(b.left), btnRight: Math.round(b.right), mainRight: Math.round(m.right),
                pickRight: pr ? Math.round(pr.right) : null };
            })()`);
            report.check(
              `${at}: the ↑ sits outside the content column, so it never has to dodge`,
              g.btnLeft >= g.mainRight && s.dodged === 0 &&
                (screen.name !== "home" || g.pickRight === g.btnRight),
              `↑ ${g.btnLeft}–${g.btnRight}px, column ends ${g.mainRight}px, dodged ${s.dodged} of ${s.past}` +
                (screen.name === "home" ? `, Pick for us ends ${g.pickRight}px` : "")
            );
          }

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
          // The same vacuity one level down: the depths are filtered by the
          // document's length, and an empty list used to skip the comparison
          // silently. A skip is now a failure that says why (roadmap 28s).
          report.check(
            `${at}: the document is deep enough for the up/down comparison to run`,
            depths.length > 0,
            depths.length ? `compared at y=${depths.join(", ")}` : `maxY ${s.maxY}px < 1700px — nothing to compare`
          );
          if (depths.length) {
            const both = await driver.evalPage(BOTH_WAYS(depths));
            refuseUnlessItArrived(`${at}: the up/down comparison`, both.missed);
            const rows = both.rows;
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
          await driver.scrollTo(Math.min(6000, s.maxY));
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
          await driver.scrollTo(0);
          await sleep(250);
          const top = await driver.evalPage(`(${PROBE_FN})()`);
          report.check(
            `${at}: at the top of the page it is not offered at all`,
            top.hidden === true,
            JSON.stringify({ hidden: top.hidden })
          );

          await overflowChecks(report, driver, at, s);
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
