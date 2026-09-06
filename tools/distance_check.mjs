// The distance limit, in a real browser (ADR 0091).
//
// WHY THIS EXISTS. The owner ruled on 2026-08-22 that Settings' "Hide places
// further than…" must actually HIDE them — until then the ranking merely sank
// a distant venue and the reader, still looking at it, concluded the setting
// was broken. The three claims that ruling produced are all of a shape no unit
// test can reach:
//
//   1. A venue past the limit is GONE from the home list. `ranking.test.js`
//      proves `splitByDistanceLimit` returns it in the `beyond` array; only a
//      browser can say whether the card left the page — the array could be
//      computed perfectly and rendered anyway.
//   2. The screen the cut can now empty says WHY and offers the way out, and
//      the generic "no places match those filters" line stands down so there
//      is one explanation rather than two. That is a relationship between two
//      elements in two different files (index.html and app.js), which is
//      exactly the class that reads as correct in a diff.
//   3. A direct link to a venue beyond the limit OPENS NORMALLY and carries
//      the note. Blocking it was explicitly rejected — the sender never knew
//      what limit the recipient set. "The page still works AND has grown one
//      line" cannot be asserted anywhere but on the page.
//
// The absence assertion is the one most likely to rot silently: a venue INSIDE
// the limit must carry no note at all. Without it, a note that fired on every
// venue would pass every other assertion here.
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU — read this before trusting it:
//   • Whether the copy is the right copy. It checks that the limit's own figure
//     appears in the sentence, never that the sentence reads well, and never
//     that the te reo is right (there is none — see docs/reo-review-queue.md).
//   • Whether the cut is the right product call. It is the owner's, made with
//     the alternative costed and declined; this only holds the build to it.
//   • Anything about a reader with no location. That path is asserted in
//     `ranking.test.js` (nothing is cut without an origin) because it is a pure
//     decision, and `geo_check.mjs` owns the ask itself.
//   • Whether the distances are TRUE. They are haversine over the coordinates
//     in `site/data/`; a wrong coordinate produces a wrong cut and every
//     assertion here still passes.
//
//     node tools/distance_check.mjs        # all scenarios
//     node tools/distance_check.mjs -v     # narrate each step
//
// Exit 0 = every assertion held. 1 = at least one didn't. 2 = the CDP transport
// died and NOTHING here says anything about the site.

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
  untilPresent,
  untilStable,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// Wellington CBD, and two venues measured from it against the shipped data:
//   daily-bakery    14.4 km — the farthest place with a MENU to render
//   charley-noble    0.2 km — the nearest
// Both are named rather than discovered so a failure says which venue moved.
// `groundup-cafe` is farther (23.4 km) and was the obvious pick; it is a `stub`
// with no menu, so "the page opened whole" could not be asserted on it — which
// is precisely the assertion scenario 4 exists for.
const CBD = { lat: -41.2865, lng: 174.7762 };
const FAR_VENUE = "daily-bakery";
const NEAR_VENUE = "charley-noble";
// "Fish and chips" has exactly one venue in the corpus and it is 9.7 km out, so
// this facet plus a 5 km limit is the only way to empty the home screen on
// today's data: `cook-at-home` carries no coordinates, and a venue we cannot
// place is never cut (only a KNOWN too-far distance cuts). Said plainly because
// it means the empty state is reachable through a COMBINATION today, and would
// become reachable on distance alone the moment every record has coordinates.
const LONE_FAR_CUISINE = "Fish and chips";

// One read of everything the cut can put on screen.
const PROBE = `(() => {
  const vis = (el) => {
    if (!el || el.hidden) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const note = document.getElementById("distance-note");
  const empty = document.getElementById("distance-empty");
  const generic = document.getElementById("empty-state");
  const ids = [...document.querySelectorAll("#restaurant-list .card-link")]
    .map((a) => new URL(a.href, location.href).searchParams.get("id"));
  const text = (el) => (el ? el.textContent.replace(/\\s+/g, " ").trim() : "");
  return {
    cards: document.querySelectorAll("#restaurant-list .card").length,
    ids,
    withDistance: document.querySelectorAll("#restaurant-list .card-distance").length,
    count: text(document.getElementById("result-count")),
    noteShown: vis(note),
    noteText: text(note),
    noteButton: text(note?.querySelector(".distance-widen")),
    emptyShown: vis(empty),
    emptyText: text(empty),
    emptyButton: text(empty?.querySelector(".distance-widen")),
    genericShown: vis(generic),
    doneLabel: text(document.getElementById("filters-done-label")),
  };
})()`;

// What a venue page shows about the limit.
const MENU_PROBE = `(() => {
  const note = document.querySelector(".menu-far-note");
  const text = (el) => (el ? el.textContent.replace(/\\s+/g, " ").trim() : "");
  return {
    title: text(document.querySelector(".menu-title")),
    // Proof the page RENDERED rather than merely loaded: a blocked or broken
    // venue page has a title too.
    dishes: document.querySelectorAll(".dish").length,
    sections: document.querySelectorAll(".menu-section").length,
    noteExists: !!note,
    noteText: text(note),
    noteButton: text(document.querySelector(".menu-far-widen")),
  };
})()`;

const SETTINGS_KEY = "faves.p.default.settings.v1";

async function run(opts) {
  const report = new Report(opts.verbose);
  const { server, port } = await startServer(opts.port, SITE);
  const origin = `http://127.0.0.1:${port}`;
  const profileDir = await mkdtemp(join(tmpdir(), "faves-distance-check-"));
  let chrome = null;
  let cdp = null;

  try {
    console.log("Faves distance-limit check — does the dial that says HIDE actually hide?");
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    const driver = createDriver(cdp, sessionId, (m) => report.step(m));
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
      sessionId
    );
    // A granted permission plus a fixed position: the app takes the grant
    // silently (no dialog), so every scenario below starts from a page that
    // knows where the reader is. Without that the limit is inert by design.
    await cdp.send("Browser.setPermission", {
      origin,
      permission: { name: "geolocation" },
      setting: "granted",
    });
    await cdp.send(
      "Emulation.setGeolocationOverride",
      { latitude: CBD.lat, longitude: CBD.lng, accuracy: 30 },
      sessionId
    );

    const setFarKm = (km) =>
      driver.evalPage(`(() => {
        const k = ${JSON.stringify(SETTINGS_KEY)};
        const s = JSON.parse(localStorage.getItem(k) || "{}");
        s.farKm = ${km};
        localStorage.setItem(k, JSON.stringify(s));
        return s.farKm;
      })()`);

    /** Load the home screen and wait until the ORIGIN has landed — the cards
     *  carry a distance only once the silent grant has answered, and reading
     *  before that measures the no-location list. */
    async function openHome(query = "") {
      await cdp.send("Page.navigate", { url: `${origin}/index.html${query}` }, sessionId);
      await untilPresent(
        () => driver.evalPage(`!!document.body && document.body.classList.contains("app-ready")`),
        { label: "home rendered" }
      );
      await untilPresent(
        () =>
          driver.evalPage(
            `!!document.querySelector("#restaurant-list .card-distance") ||
             !!document.querySelector("#distance-empty:not([hidden])")`
          ),
        { label: "the location has landed" }
      );
      await driver.settle();
      return driver.evalPage(PROBE);
    }

    async function openVenue(id) {
      await cdp.send("Page.navigate", { url: `${origin}/restaurant.html?id=${id}` }, sessionId);
      await untilPresent(() => driver.evalPage(`!!document.querySelector(".menu-title")`), {
        label: `${id} rendered`,
      });
      await driver.settle();
      return driver.evalPage(MENU_PROBE);
    }

    // ── 1. The wide-open baseline ──────────────────────────────────────────
    // Navigate once so there is an origin to write localStorage against.
    await cdp.send("Page.navigate", { url: `${origin}/index.html` }, sessionId);
    // untilStable: this waits for the NAVIGATION to give us a real origin to
    // write against. `localStorage` is the browser's, not the site's.
    await untilStable(() => driver.evalPage(`typeof localStorage !== "undefined"`), {
      label: "storage reachable",
    });
    await setFarKm(100); // the dial's own maximum: nothing in the corpus is cut
    const wide = await openHome();
    report.check(
      "(setup) the list is ranked with a known location",
      wide.withDistance > 3,
      `${wide.cards} cards, ${wide.withDistance} carrying a distance`
    );
    report.check(
      `(setup) ${FAR_VENUE} is in the collection and on the list at the widest limit`,
      wide.ids.includes(FAR_VENUE),
      `${wide.ids.length} linked cards; count reads "${wide.count}"`
    );

    // ── 2. THE CUT ─────────────────────────────────────────────────────────
    await setFarKm(5);
    const cut = await openHome();
    report.check(
      "a place beyond the limit is GONE from the home list, not sunk to the bottom",
      cut.ids.includes(FAR_VENUE) === false,
      `${FAR_VENUE} present: ${cut.ids.includes(FAR_VENUE)} — ${cut.cards} cards left`
    );
    report.check(
      "…while a place inside the limit is untouched",
      cut.ids.includes(NEAR_VENUE),
      `${NEAR_VENUE} present: ${cut.ids.includes(NEAR_VENUE)}`
    );
    report.check(
      "the list got shorter, and the count says so rather than looking like a shrunken collection",
      cut.cards < wide.cards && /^\d+ of \d+ places$/.test(cut.count),
      `"${wide.count}" → "${cut.count}"`
    );
    report.check(
      "the list names the SETTING that shortened it — a setting has no chip to wear a ✕",
      cut.noteShown && cut.noteText.includes("5 km") && /hiding \d+ places/.test(cut.noteText),
      `"${cut.noteText}"`
    );
    // The one place a stale string could now lie: the filter sheet's own
    // button says "Show all N places" when nothing is held back, and the cut
    // makes that false without touching the sheet (ADR 0091, Rejected).
    report.check(
      "the filter sheet stops promising to show ALL of them, because it cannot",
      cut.doneLabel === `Show ${cut.cards} places`,
      `sheet button reads "${cut.doneLabel}" against ${cut.cards} of 57`
    );
    const widenTarget = Number(/Widen to (\d+) km/.exec(cut.noteButton)?.[1]);
    report.check(
      "…and offers a limit that is genuinely WIDER than the one hiding them",
      Number.isFinite(widenTarget) && widenTarget > 5,
      `button reads "${cut.noteButton}"`
    );
    await driver.click(".distance-widen");
    await driver.settle();
    const widened = await driver.evalPage(PROBE);
    report.check(
      "tapping it actually brings places back — the offer is not decorative",
      widened.cards > cut.cards,
      `${cut.cards} → ${widened.cards} cards; count now "${widened.count}"`
    );

    // ── 3. THE SCREEN THE CUT CAN EMPTY ────────────────────────────────────
    await setFarKm(5);
    const emptied = await openHome(`?cuisine=${encodeURIComponent(LONE_FAR_CUISINE)}`);
    report.check(
      "(setup) the limit can empty the list",
      emptied.cards === 0,
      `${emptied.cards} cards for "${LONE_FAR_CUISINE}" within 5 km`
    );
    report.check(
      "a blank screen is not left blank — it names the limit that emptied it",
      emptied.emptyShown && emptied.emptyText.includes("5 km"),
      `"${emptied.emptyText}"`
    );
    report.check(
      "one explanation, not two — the generic filters line stands down",
      emptied.genericShown === false,
      `#empty-state visible: ${emptied.genericShown}`
    );
    report.check(
      "…and the short-list note stands down too, rather than saying it twice on one screen",
      emptied.noteShown === false,
      `#distance-note visible: ${emptied.noteShown} — "${emptied.noteText}"`
    );
    report.check(
      "the empty screen carries the way out, on the screen that has nothing else",
      /Widen to \d+ km/.test(emptied.emptyButton),
      `button reads "${emptied.emptyButton}"`
    );
    await driver.click("#distance-empty .distance-widen");
    await driver.settle();
    const refilled = await driver.evalPage(PROBE);
    report.check(
      "…and taking it fills the screen",
      refilled.cards > 0 && refilled.emptyShown === false,
      `${refilled.cards} cards; empty state shown: ${refilled.emptyShown}`
    );

    // ── 4. THE DIRECT LINK — it opens, and it says why ─────────────────────
    // Owner-ruled 2026-08-22: blocking was rejected, because the sender never
    // knew what limit the recipient had set. So the assertion is that the page
    // is WHOLE, not merely that a note appeared.
    await setFarKm(5);
    const far = await openVenue(FAR_VENUE);
    report.check(
      "a link to a place beyond the limit OPENS NORMALLY — the menu is all there",
      far.dishes > 0 && far.sections > 0 && far.title.length > 0,
      `"${far.title}" — ${far.sections} section(s), ${far.dishes} dish row(s)`
    );
    report.check(
      "…carrying one quiet line naming the limit and this place's distance",
      far.noteExists && far.noteText.includes("5 km") && /\d+ km away/.test(far.noteText),
      `"${far.noteText}"`
    );
    report.check(
      "…and offering to widen it, on a limit the dial can actually reach",
      /Widen to \d+ km/.test(far.noteButton),
      `button reads "${far.noteButton}"`
    );

    // The absence. Without this, a note that appeared on every venue in the
    // corpus would pass every assertion above.
    const near = await openVenue(NEAR_VENUE);
    report.check(
      "a place INSIDE the limit carries no such note — it follows the distance, not the page",
      near.noteExists === false,
      `"${near.title}" — note present: ${near.noteExists}`
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
  },
});

const ok = await run({ ...values, port: Number(values.port) });
process.exitCode = ok ? 0 : 1;
