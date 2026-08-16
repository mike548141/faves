#!/usr/bin/env node
// Does the back-to-top button stay out of the way of the menu? (Theme 29.)
//
// WHY THIS EXISTS. The owner photographed his own phone: the floating ↑ sat
// over the "French fries" row and hid the right-hand end of its price. Nothing
// in the repo could have caught it — `device_check`, `cook_check`,
// `addon_check` and `branch_check` all assert that controls *work*, and this
// control worked perfectly while making a number unreadable. A fixed control
// over a scrolling list will always overlap something, so the fix was not to
// move it (there is nowhere at 390 px that is not over the list) but to tuck it
// away while the reader is scrolling DOWN and bring it back on a flick UP. See
// the header of `site/js/to-top.js` for the measurements that forced that.
//
// So this check asks the question the others never did: while you read down a
// real menu, is anything of yours underneath it?
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU:
//   1. Anything about Safari/WebKit — this is Chrome only, and iOS Safari's
//      rubber-band scrolling is exactly where a direction-sensing control is
//      most likely to misbehave. The JITTER threshold in to-top.js is a guess
//      until someone holds a real iPhone.
//   2. Whether the tuck *feels* right. "It vanished and I wanted it" is a
//      judgement no assertion makes.
//   3. Anything about momentum scrolling. Every scroll here is an instant jump,
//      so the direction is unambiguous in a way a real thumb-flick is not.
//   4. Whether the button is discoverable. It is now summoned by a gesture; a
//      reader who never scrolls up never sees it, and no check can say whether
//      that matters.
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
  startServer,
  stopChrome,
  until,
  sleep,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// What the button is doing right now, and what — if anything — of the reader's
// is underneath it. `worst` is the largest fraction of any single price, heart
// or dish name the button covers at this scroll position.
const PROBE = `(() => {
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
    focusable: btn.tabIndex >= 0 && cs.visibility !== "hidden",
    // A fixed element parked off the bottom must not extend the scrollable
    // area; a horizontal scrollbar on a phone would be a worse bug than the one
    // being fixed.
    docW: document.documentElement.scrollWidth,
    innerW: innerWidth,
    worst,
  };
})()`;

async function scrollTo(driver, y) {
  await driver.evalPage(`window.scrollTo({ top: ${y}, behavior: "instant" })`);
  await sleep(150); // the handler is rAF-throttled; give it a frame and slack
  await driver.settle();
}

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
    console.log("Faves back-to-top check — does the ↑ stay off the reader's menu?");
    console.log(`  venue    ${venueId}`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    // ISOLATION, not a workaround: ADR 0082 gives the home screen a location
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

    // 390 px is the design width; 24 px root emulates the largest built-in
    // browser text size, where every rem-valued box grows and the px-valued
    // button does not.
    for (const rootPx of [16, 24]) {
      for (const screen of screens) {
        const at = `${screen.name} @390px/${rootPx}px text`;
        await cdp.send(
          "Emulation.setDeviceMetricsOverride",
          { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
          sessionId
        );
        await cdp.send("Page.navigate", { url: screen.url }, sessionId);
        await until(() => driver.evalPage(screen.ready), { label: `${screen.name} rendered` });
        if (rootPx !== 16) {
          await driver.evalPage(`(() => { const s = document.createElement("style");
            s.textContent = "html{font-size:${rootPx}px}"; document.head.append(s); })()`);
        }
        await driver.settle();

        const first = await driver.evalPage(PROBE);
        if (first.missing) {
          report.check(`${at}: the back-to-top control exists`, false, "no .to-top in the DOM");
          continue;
        }

        // --- Reading DOWN the list. This is the owner's screenshot. ---------
        const depths = [700, 1400, 2500, 4000, 6000];
        const seen = [];
        for (const y of depths) {
          await scrollTo(driver, y);
          seen.push({ y, ...(await driver.evalPage(PROBE)) });
        }
        const showedWhileDescending = seen.filter((s) => s.shown);
        report.check(
          `${at}: nothing of the reader's is under the ↑ while scrolling down`,
          showedWhileDescending.length === 0,
          showedWhileDescending
            .map((s) => `y=${s.y} shown, worst ${s.worst ? `${s.worst.pct}% ${s.worst.sel} "${s.worst.text}"` : "nothing"}`)
            .join(" | ") || `${depths.length} depths, button tucked at every one`
        );

        // It must still be REACHABLE while tucked, or a keyboard reader has
        // simply lost the control. Off-screen and transparent, never removed.
        const tucked = seen[seen.length - 1];
        report.check(
          `${at}: the tucked ↑ is still focusable, not deleted`,
          tucked.focusable && tucked.tucked && !tucked.hidden,
          JSON.stringify({ focusable: tucked.focusable, tucked: tucked.tucked, hidden: tucked.hidden })
        );
        report.check(
          `${at}: parking it off-screen adds no horizontal scroll`,
          tucked.docW <= tucked.innerW,
          `document ${tucked.docW}px wide in a ${tucked.innerW}px viewport`
        );

        // --- The gesture that summons it. -----------------------------------
        await scrollTo(driver, 6000 - 400);
        const up = await driver.evalPage(PROBE);
        report.check(
          `${at}: a scroll UP brings it back`,
          up.shown && !up.tucked && up.opacity === 1,
          JSON.stringify({ shown: up.shown, tucked: up.tucked, opacity: up.opacity, top: up.top })
        );

        // …and a resumed downward scroll puts it away again, so one flick up
        // does not leave it parked over the list for the rest of the read.
        await scrollTo(driver, 6000 + 400);
        const down = await driver.evalPage(PROBE);
        report.check(
          `${at}: resuming downward tucks it again`,
          !down.shown,
          JSON.stringify({ shown: down.shown, tucked: down.tucked, opacity: down.opacity })
        );

        // --- Keyboard. Focus must un-tuck it, or Tab lands on nothing. ------
        await driver.evalPage(`document.querySelector(".to-top").focus()`);
        await sleep(120);
        const focused = await driver.evalPage(PROBE);
        report.check(
          `${at}: focusing the tucked ↑ brings it on screen`,
          focused.shown && focused.top < 844,
          JSON.stringify({ shown: focused.shown, opacity: focused.opacity, top: focused.top })
        );
        await driver.evalPage(`document.querySelector(".to-top").blur()`);

        // --- Below the threshold it is gone entirely, as it always was. -----
        await scrollTo(driver, 0);
        const top = await driver.evalPage(PROBE);
        report.check(
          `${at}: at the top of the page it is not offered at all`,
          top.hidden === true,
          JSON.stringify({ hidden: top.hidden })
        );
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
