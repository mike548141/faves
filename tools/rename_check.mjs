#!/usr/bin/env node
// Does a stored heart SURVIVE its dish being renamed? In a real browser.
//
// WHY THIS EXISTS (roadmap 28s). ADR 0051 gave every dish a stored `dishId`
// for exactly one reason: so a venue renaming "Eggs on Toast" to "Eggs on
// Sourdough Toast" does not detach the heart, the rating, the shared link and
// the order line that pointed at it. That promise is the whole justification
// for the field, and until this file nothing anywhere asserted it end to end.
// The unit tests prove `favKey` and `dishId` agree with each other; neither can
// see whether the ROW the reader looks at is still lit. And roadmap 28o is about
// to lean on the same promise 285 times, which is why 28s asks for this check
// before a single ladder is merged.
//
// WHAT IT DOES. Derive, never author (tools/lib/fixtures.mjs): the fixture is a
// real corpus record with ONE transform, served as overlay bytes for one GET —
// never written to site/data/. Two scenarios, each on its own server, Chrome and
// profile (the service worker precaches the venue file, so two transforms of one
// venue in one profile would read each other's bytes):
//
//   1. RENAMED, ID PINNED — the dish's `name` changes and its `dishId` stays.
//      A heart and a rating stored under the old name and id must light the
//      renamed row, and the menu's "favourites" query must still find it.
//      This is the ADR 0051 promise, and the assertion 28o needs.
//   2. RETIRED, CLAIMED — the dish's `dishId` MOVES and the old id goes into
//      its `formerIds` (roadmap 28j/28l: what a ladder merge does to every
//      sibling it folds in). The heart, the rating and the "favourites" query
//      must all reach the row exactly as in (1). This scenario was deliberately
//      ABSENT until 2026-10-02: the row compared the raw stored id and never
//      consulted `formerIds`, so a heart under a former id read dark, and
//      asserting that would have enforced the defect — how `to_top_check` came
//      to defend the very bug it was reported for. Roadmap 28l fixed it (the
//      menu page absorbs the record's former ids into the stores before it
//      draws a row, ADR 0153), and only then did it become an assertion.
//   3. THE CONTROL — the dish's `dishId` MOVES with no `formerIds` claim. The
//      same seeded heart must NOT light it. Without this, a page that lit every
//      heart (or matched by something looser than the id) would pass (1) and
//      (2) — and (2) is the one most at risk, because "absorb" done wrong is
//      exactly a looser match.
//   4. A REAL MERGE, UNTOUCHED — the corpus record as shipped, served with no
//      transform.
//      Roadmap 28o retired real ids (Pizza Pomodoro's "Margherita - Large" is
//      now a Large on "Margherita"), and scenarios 1-3 prove the MECHANISM on a
//      dish that was never merged. This one proves the DATA: a heart, a rating
//      and the favourites query seeded under a retired id reach the dish that
//      claims it. Its break-probe is built in, every run: the same record with
//      that dish's `formerIds` stripped must NOT light, so a file that lost the
//      claim (or an absorb that matched on something looser) cannot pass.
//
// WHAT A GREEN RUN CANNOT TELL YOU:
//   1. Anything about sync, import or a share link carrying the old name or
//      the retired id. Those land in the same stores and are absorbed on the
//      same read (tests/absorb-former-ids.test.js), but only the menu row is
//      driven here.
//   2. The home screen's Favourites view or the recipe page, which absorb the
//      same way from their own copy of the record. Only the menu row.
//   3. Safari/WebKit. Chrome only.
//
// Run after touching favourites.js, ratings.js, dish-id.js, favourites-ui.js,
// the dish row in menu.js, the absorb call before menu.js's first render, or
// the "favourites" query in applyView.

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
  sleep,
  startServer,
  stopChrome,
  untilPresent,
} from "./lib/browser.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");

// A real venue whose first dish carries a stored id. Named, not re-derived, so a
// corpus change cannot silently move the subject (roadmap 28s' complaint about
// device_check and sync_check); if the dish is renamed in the corpus itself the
// pre-flight below says so rather than testing something else.
const VENUE = "gold-lining-cafe";
const DISH_ID = "eggs-on-toast";
const OLD_NAME = "Eggs on Toast";
const NEW_NAME = "Eggs on Sourdough Toast";
const MOVED_ID = "eggs-on-sourdough-toast";
const RATING = 4;

// 28o part 1's real merge: Pizza Pomodoro's two Margherita rows became one dish
// with a Small/Large choice and a fresh id. Named, not derived, like the subject
// above; the pre-flight in run() refuses to measure if the claim has moved.
const MERGED = {
  venueId: "pizza-pomodoro",
  liveId: "margherita",
  liveName: "Margherita",
  retiredId: "margherita-large",
  retiredName: "Margherita - Large",
};

/** The menu row for one dish id: what its heart and rating say, and whether the
 *  "favourites" query leaves it on screen. Read off the live DOM. */
const rowExpr = (id) => `(() => {
  const li = [...document.querySelectorAll("li.dish")].find((d) => d.dataset.dishId === ${JSON.stringify(id)});
  if (!li) return { missing: true, ids: document.querySelectorAll("li.dish").length };
  return {
    name: (li.querySelector(".dish-name")?.textContent || "").trim(),
    heart: li.querySelector(".dish-actions .heart")?.getAttribute("aria-pressed") ?? null,
    rating: li.querySelector(".dish-rating .rating-slider")?.getAttribute("aria-valuenow") ?? null,
    hidden: li.hidden,
    shown: [...document.querySelectorAll("li.dish")].filter((d) => !d.hidden).length,
  };
})()`;

/** What a reader stored BEFORE the rename: a heart entry carrying the old name
 *  and the id, and a rating keyed on the id — the two shapes ADR 0051 writes. */
const seedExpr = (venueName, subject) => {
  const fav = [{ type: "dish", venueId: subject.venueId, venueName, name: subject.oldName, dishId: subject.seedId, isRecipe: false }];
  const ratings = { [`d:${subject.venueId} ${subject.seedId}`]: RATING };
  return `localStorage.setItem("faves.p.default.favourites.v1", ${JSON.stringify(JSON.stringify(fav))});
    localStorage.setItem("faves.p.default.ratings.v1", ${JSON.stringify(JSON.stringify(ratings))}); true`;
};

/** Scenarios 1-3: the first dish of a named venue, transformed in an overlay. */
const RENAMED = (venue) => ({
  venueId: VENUE,
  oldName: OLD_NAME,
  seedId: DISH_ID,
  locate: (record) => record.menu[0].items[0],
  venue,
});

/** Scenario 4: the merged dish, found by its live id, in the record as shipped. */
const merged = (venue) => ({
  venueId: MERGED.venueId,
  oldName: MERGED.retiredName,
  seedId: MERGED.retiredId,
  locate: (record) => record.menu.flatMap((s) => s.items).find((i) => i.dishId === MERGED.liveId),
  venue,
});

async function scenario(report, opts, subject, label, transform) {
  const venue = subject.venue;
  const record = structuredClone(venue);
  const dish = subject.locate(record);
  if (!dish) throw new Error(`${label}: the dish to measure is not in ${subject.venueId}`);
  transform(dish);
  const overlay = new Map([[`/data/restaurants/${subject.venueId}.json`, JSON.stringify(record)]]);
  const { server, port } = await startServer(0, SITE, overlay);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-rename-check-"));
  let chrome = null;
  let cdp = null;
  try {
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
    const d = createDriver(cdp, sessionId, (m) => report.step(m));
    const url = `http://127.0.0.1:${port}/restaurant.html?id=${subject.venueId}`;
    const menuReady = async () => (await d.evalPage(`document.querySelectorAll("li.dish").length`)) > 0;

    // Seed on the real origin, then load the page fresh so every module boots
    // reading the stored state — the way a returning reader arrives.
    await cdp.send("Page.navigate", { url }, sessionId);
    await untilPresent(menuReady, { label: `${label}: first load` });
    await d.evalPage(seedExpr(venue.name, subject));
    await cdp.send("Page.navigate", { url }, sessionId);
    await untilPresent(menuReady, { label: `${label}: reload with the seeded heart` });
    await d.settle();

    const row = await d.evalPage(rowExpr(dish.dishId));
    // Refuse to measure the wrong row: the overlay must actually have been
    // served, or every assertion below is about the unrenamed corpus dish.
    if (row.missing || row.name !== dish.name) {
      throw new Error(`${label}: the served row is ${JSON.stringify(row)} — expected "${dish.name}" (${dish.dishId}); the overlay did not arrive`);
    }

    // The menu's "favourites" query — the other reader of the stored id, and
    // the one 28j names as reading the RAW id rather than going through findDish.
    await d.evalPage(`(() => { const s = ${need(".menu-search")}; s.focus(); s.value = "favourites";
      s.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await sleep(140);
    await d.settle();
    const filtered = await d.evalPage(rowExpr(dish.dishId));
    return { row, filtered };
  } finally {
    cdp?.close();
    await stopChrome(chrome?.proc);
    server.close();
  }
}

async function run(opts) {
  const report = new Report(opts.verbose);
  const venue = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${VENUE}.json`), "utf8"));
  const first = venue.menu?.[0]?.items?.[0];
  if (!first || first.dishId !== DISH_ID || first.name !== OLD_NAME) {
    throw new Error(
      `${VENUE}'s first dish is ${JSON.stringify(first && { name: first.name, dishId: first.dishId })}, ` +
        `not "${OLD_NAME}" (${DISH_ID}) — update the constants rather than let the subject move silently`
    );
  }

  console.log("Faves rename check — does a stored heart survive its dish being renamed?");
  console.log(`  venue    ${venue.name} (${VENUE}), served as an overlay — site/data is untouched`);
  console.log(`  dish     "${OLD_NAME}" → "${NEW_NAME}", id ${DISH_ID}\n`);

  // 1. Renamed, id pinned — the ADR 0051 promise.
  const kept = await scenario(report, opts, RENAMED(venue), "renamed", (dish) => {
    dish.name = NEW_NAME;
  });
  report.check(
    `a heart stored on "${OLD_NAME}" lights "${NEW_NAME}" after the rename`,
    kept.row.heart === "true",
    `heart aria-pressed=${kept.row.heart}`
  );
  report.check(
    "…and so does its rating, keyed on the same id",
    kept.row.rating === String(RATING),
    `rating aria-valuenow=${kept.row.rating}`
  );
  report.check(
    'the menu\'s "favourites" query still finds the renamed dish, and only it',
    kept.filtered.hidden === false && kept.filtered.shown === 1,
    `row hidden=${kept.filtered.hidden}, ${kept.filtered.shown} row(s) shown`
  );

  // 2. Retired and claimed — the id MOVED and the dish's formerIds holds the
  //    old one (roadmap 28l). Everything (1) asserts must hold here too.
  const claimed = await scenario(report, opts, RENAMED(venue), "id retired into formerIds", (dish) => {
    dish.name = NEW_NAME;
    dish.dishId = MOVED_ID;
    dish.formerIds = [DISH_ID];
  });
  report.check(
    `a heart stored under the RETIRED id "${DISH_ID}" lights the dish whose formerIds claims it`,
    claimed.row.heart === "true",
    `heart aria-pressed=${claimed.row.heart}`
  );
  report.check(
    "…and so does its rating, re-keyed onto the live id",
    claimed.row.rating === String(RATING),
    `rating aria-valuenow=${claimed.row.rating}`
  );
  report.check(
    'the menu\'s "favourites" query finds the claiming dish, and only it',
    claimed.filtered.hidden === false && claimed.filtered.shown === 1,
    `row hidden=${claimed.filtered.hidden}, ${claimed.filtered.shown} row(s) shown`
  );

  // 3. The control — the id MOVED and nothing claims the old one.
  const moved = await scenario(report, opts, RENAMED(venue), "id moved", (dish) => {
    dish.name = NEW_NAME;
    dish.dishId = MOVED_ID;
  });
  report.check(
    "CONTROL: when the id itself moves (no formerIds), the same heart does NOT light the row",
    moved.row.heart === "false" && moved.row.rating !== String(RATING),
    `heart aria-pressed=${moved.row.heart}, rating=${moved.row.rating} — if this lit, the check above proves nothing`
  );
  report.check(
    'CONTROL: …and the "favourites" query does not find it either',
    moved.filtered.hidden === true,
    `row hidden=${moved.filtered.hidden}`
  );

  // 4. A real merge, untouched (roadmap 28o part 1). Pre-flight: the shipped
  //    record must still claim the retired id, or this is measuring nothing.
  const pizza = JSON.parse(await readFile(join(SITE, "data", "restaurants", `${MERGED.venueId}.json`), "utf8"));
  const liveDish = pizza.menu.flatMap((s) => s.items).find((i) => i.dishId === MERGED.liveId);
  if (!liveDish || liveDish.name !== MERGED.liveName || !(liveDish.formerIds || []).includes(MERGED.retiredId)) {
    throw new Error(
      `${MERGED.venueId}: "${MERGED.liveId}" no longer claims "${MERGED.retiredId}" in formerIds ` +
        `(${JSON.stringify(liveDish && { name: liveDish.name, formerIds: liveDish.formerIds })}) — ` +
        "update MERGED rather than let the subject move silently"
    );
  }
  console.log(`\n  real merge   ${MERGED.venueId}: "${MERGED.retiredName}" (${MERGED.retiredId}) → "${MERGED.liveName}" (${MERGED.liveId}), shipped data\n`);
  const real = await scenario(report, opts, merged(pizza), "real merge", () => {});
  report.check(
    `REAL DATA: a heart stored under the retired id "${MERGED.retiredId}" lights "${MERGED.liveName}" as shipped`,
    real.row.heart === "true",
    `heart aria-pressed=${real.row.heart}`
  );
  report.check(
    "REAL DATA: …and so does its rating, re-keyed onto the live id",
    real.row.rating === String(RATING),
    `rating aria-valuenow=${real.row.rating}`
  );
  report.check(
    'REAL DATA: the menu\'s "favourites" query finds the merged dish, and only it',
    real.filtered.hidden === false && real.filtered.shown === 1,
    `row hidden=${real.filtered.hidden}, ${real.filtered.shown} row(s) shown`
  );
  // Built-in break-probe: the same shipped record with the claim removed.
  const unclaimed = await scenario(report, opts, merged(pizza), "real merge, claim stripped", (dish) => {
    dish.formerIds = (dish.formerIds || []).filter((x) => x !== MERGED.retiredId);
  });
  report.check(
    "BREAK-PROBE: with the retired id struck from formerIds, the same heart does NOT light the dish",
    unclaimed.row.heart === "false" && unclaimed.row.rating !== String(RATING),
    `heart aria-pressed=${unclaimed.row.heart}, rating=${unclaimed.row.rating} — if this lit, the REAL DATA assertions above prove nothing`
  );
  report.check(
    'BREAK-PROBE: …and the "favourites" query does not find it either',
    unclaimed.filtered.hidden === true,
    `row hidden=${unclaimed.filtered.hidden}`
  );

  return report.summary(SITE);
}

const { values } = parseArgs({
  options: {
    verbose: { type: "boolean", short: "v", default: false },
    headed: { type: "boolean", default: false },
  },
});

// No local catch: tools/lib/browser.mjs classifies an uncaught error (harness
// error ⇒ exit 2, a missing element ⇒ the whole-check retry). A `catch` here
// would disarm that for this file alone.
const ok = await run(values);
process.exitCode = ok ? 0 : 1;
