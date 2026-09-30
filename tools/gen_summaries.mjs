#!/usr/bin/env node
// Generate the home screen's two read files (roadmap 510/020, ADR 0145/0146):
//
//   site/data/summary.json       card fields for every venue, thinned menus
//   site/data/search-index.json  the precomputed dish/place search index
//
// WHY A GENERATOR, NOT A SECOND IMPLEMENTATION. Before this, the home screen
// fetched every venue's full JSON file and ran it through data.js's `load()`
// (temporal resolution, branch projection, recipe-part composition) and
// search.js's `buildIndex()` client-side. Measured 2026-09-30: the 57 files
// come to about 204-208 KB gzip as fetched, of which the card and search
// screens together need about 51-60 KB (ADR 0146; the earlier "13x"/164,716 B
// figure in ADR 0145 was a reserialised-stream artefact, not what a phone
// actually transfers). This tool moves that resolve-and-extract step to build
// time, so it runs ONCE per data change rather than on every phone's every
// visit — and it imports the app's own `load()` and `buildIndex()` rather than
// re-implementing them, so the summary and the index can never drift from what
// a full page render would show (the class of bug "A parse that rebuilds its
// input" and "A duplicated rule reads correct in every diff" both name).
//
// WHAT "SUMMARY" MEANS HERE (ADR 0047 — ship only what a screen renders):
//   - Every venue-level field `load()` resolves survives untouched: hours,
//     area, cuisine, vibe, locations/branches, closure state, currency,
//     status, image… everything ranking.js, filters.js, locations.js and the
//     card itself read (app.js's card(), price.js's priceBand(), picker.js).
//   - `lifecycle` (raw dated closure events), `verified`/`verifiedBy` (menu
//     page's freshness caveat only) and `picks` (menu page only) are dropped —
//     nothing on the home screen renders them.
//   - `menu` is THINNED to `{ items: [{ dishId, name, formerIds? }] }` per
//     section: enough for the card's dish count (labelsOf().browseLabel kinds
//     count items, unchanged) and for a stored heart/rating to resolve
//     (favourites.js's `unresolvedReason` → dish-id.js's `findDish`/`eachDish`,
//     which only ever needs a dish's id, name and formerIds to answer "is this
//     still here?" — never its price, description or tags).
//   - `_priceSummary` carries the PRECOMPUTED result of price.js's
//     `priceBand()`, run against the real menu prices before they're thinned
//     away. price.js reads this field first when present (a record loaded
//     from `data/restaurants/*.json` never carries it), so the card's price
//     chip and the cheap-eats filter work unchanged on a summary record.
//
// THE SEARCH INDEX is `buildIndex()`'s own `{ places, dishes }` output, run
// against the FULL (unthinned) resolved records — so it keeps ingredients,
// attribution and order numbers, exactly as today's in-browser search does
// (ADR 0146 correction R5). It is plain, already-lowercased data with no
// functions in it, so `search.js`'s `search()` consumes it completely
// unchanged whether it was built here or in the browser.
//
// A STATED TRADE-OFF, not silently absorbed: `load()`'s date resolution
// depends on "today", and this tool runs at commit/CI time, not at the
// reader's read time. Weekly hours are unaffected (openStatus resolves those
// live, in the browser, from the plain schedule this ships). What CAN lag
// until the next regeneration is a genuinely DATED field that flips with no
// accompanying data edit — a seasonal dish's `until` date, a curated price
// change scheduled for a future day. The individual venue page
// (`loadRestaurant`) always resolves against the reader's actual today; only
// the home CARD can be stale, bounded by how often this tool is re-run. ADR
// 0146's cold review named this same gap (m6, "freshness changes unnamed")
// as still open — this comment is that naming, not a fix for it.
//
//     node tools/gen_summaries.mjs            # write both files
//     node tools/gen_summaries.mjs --check    # CI: fail if either is stale
//
// No build step (ADR 0001): `site/` still ships exactly what's committed;
// this just writes two more committed files, the same way gen_sbom.py and
// split_data.py do. Node is dev tooling only (CLAUDE.md) — nothing under
// site/ imports this file or anything only Node can run.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { load } from "../site/js/data.js";
import { buildIndex } from "../site/js/search.js";
import { dishId } from "../site/js/dish-id.js";
import { priceBand } from "../site/js/price.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "site", "data");
const INDEX_PATH = path.join(DATA_DIR, "index.json");
const RESTAURANTS_DIR = path.join(DATA_DIR, "restaurants");
const SUMMARY_PATH = path.join(DATA_DIR, "summary.json");
const SEARCH_INDEX_PATH = path.join(DATA_DIR, "search-index.json");

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

/** A branch stripped of its own raw `lifecycle` — only the resolved `closure`
 *  (set by resolveRecord when the branch carries one) is read downstream. */
export function thinBranch(branch) {
  if (!branch || typeof branch !== "object") return branch;
  const { lifecycle, ...rest } = branch;
  return rest;
}

/** A resolved menu, thinned to what dish-id.js's findDish/eachDish need to
 *  answer "is this dish still here?" — never enough to render one. Sections
 *  that carry a name keep it (none render it today, but it costs nothing and
 *  keeps the shape recognisable); `addOnsOnly` sections are INCLUDED, exactly
 *  as the unthinned menu was, so the card's item-count reduce() (app.js,
 *  picker.js) counts the same total it always did. */
export function thinMenu(menu) {
  if (!Array.isArray(menu)) return undefined;
  return menu.map((section) => ({
    ...(section?.section ? { section: section.section } : {}),
    items: (section?.items || []).map((item) => {
      const out = { dishId: dishId(item), name: item.name };
      if (Array.isArray(item.formerIds) && item.formerIds.length) {
        out.formerIds = item.formerIds;
      }
      return out;
    }),
  }));
}

/** One resolved (full) record → its home-card summary. Exported so
 *  tools/lib/fixtures.mjs can build a fixture's home-screen overlay
 *  (site/data/summary.json + search-index.json) through this SAME function
 *  rather than a second copy of the thinning rules. */
export function summarise(record) {
  const { menu, lifecycle, verified, verifiedBy, picks, ...rest } = record;
  const out = { ...rest };
  if (Array.isArray(record.locations)) out.locations = record.locations.map(thinBranch);
  const price = priceBand(record); // BEFORE thinning — needs the real prices
  if (price) out._priceSummary = price;
  const thin = thinMenu(menu);
  if (thin) out.menu = thin;
  return out;
}

/**
 * The summary array and search index for a list of ALREADY-LOADED (resolved,
 * via `load()`) records, in the order given. Exported so a browser check can
 * build the exact same two structures for a corpus with one venue swapped for
 * a fixture (tools/lib/fixtures.mjs's `buildHomeOverlay`) — the one path,
 * never a second implementation that could silently disagree with this one.
 */
export function renderFrom(loaded) {
  return { summary: loaded.map(summarise), searchIndex: buildIndex(loaded) };
}

function render() {
  const ids = readJson(INDEX_PATH);
  const loaded = ids.map((id) => load(readJson(path.join(RESTAURANTS_DIR, `${id}.json`))));
  const { summary, searchIndex } = renderFrom(loaded);
  return {
    summaryText: JSON.stringify(summary, null, 2) + "\n",
    indexText: JSON.stringify(searchIndex, null, 2) + "\n",
    count: loaded.length,
  };
}

function main(argv) {
  const check = argv.includes("--check");
  const { summaryText, indexText, count } = render();

  if (check) {
    const problems = [];
    if (!existsSync(SUMMARY_PATH) || readFileSync(SUMMARY_PATH, "utf8") !== summaryText) {
      problems.push(path.relative(ROOT, SUMMARY_PATH));
    }
    if (!existsSync(SEARCH_INDEX_PATH) || readFileSync(SEARCH_INDEX_PATH, "utf8") !== indexText) {
      problems.push(path.relative(ROOT, SEARCH_INDEX_PATH));
    }
    if (problems.length) {
      console.error(
        `ERROR: out of date — run \`node tools/gen_summaries.mjs\` and commit: ${problems.join(", ")}`
      );
      return 1;
    }
    console.log(`Summaries and search index up to date (${count} venues).`);
    return 0;
  }

  writeFileSync(SUMMARY_PATH, summaryText);
  writeFileSync(SEARCH_INDEX_PATH, indexText);
  console.log(
    `Wrote ${path.relative(ROOT, SUMMARY_PATH)} and ` +
      `${path.relative(ROOT, SEARCH_INDEX_PATH)} (${count} venues).`
  );
  return 0;
}

// Which tree did this actually read? ROOT — resolved from this file — never
// the working directory (ADR 0113, roadmap 340/260). Byte-compatible with
// tools/lib/tree.py's line, which the Python gates print; this is the Node
// half of the same convention (tools/lib/browser.mjs prints it for the
// browser checks).
function announceTree() {
  if (process.env.FAVES_NO_TREE_LINE) return;
  try {
    const git = (...args) => execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
    let branch = "";
    try {
      branch = git("branch", "--show-current");
    } catch {
      /* not a git checkout, or git unavailable — say so below */
    }
    let sha = "";
    try {
      sha = git("rev-parse", "--short", "HEAD");
    } catch {
      /* nothing to report */
    }
    const worktree = (() => {
      try {
        return git("rev-parse", "--git-common-dir") !== git("rev-parse", "--git-dir");
      } catch {
        return false;
      }
    })();
    const label = branch ? `${branch}@${sha}` : sha ? `detached@${sha}` : "not a git checkout";
    console.log(`   tree ${ROOT}${worktree ? " · worktree" : ""} · ${label}`);
  } catch {
    /* never let the tree line take the verdict down with it */
  }
}

// Guarded so `tools/lib/fixtures.mjs` (and anything else after pure exports —
// `summarise`, `thinMenu`, `renderFrom`) can `import` this module without
// running the CLI and exiting the whole process out from under the importer.
const isMain = (() => {
  try {
    return path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  announceTree();
  process.exit(main(process.argv.slice(2)));
}
