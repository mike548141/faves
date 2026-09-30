#!/usr/bin/env node
// Generate the home screen's two read files (roadmap 510/020, ADR 0145/0146):
//
//   site/data/summary.json       card/ranking/filter fields, one dish COUNT
//   site/data/search-index.json  dish identity + search text, grouped by
//                                 venue/section so nothing repeats per dish
//
// WHY A GENERATOR, NOT A SECOND IMPLEMENTATION. Before this, the home screen
// fetched every venue's full JSON file and ran it through data.js's `load()`
// (temporal resolution, branch projection, recipe-part composition) and
// search.js's `buildIndex()` client-side. This tool moves the RESOLUTION half
// of that to build time — it imports the app's own `load()`, `priceBand()`
// and search.js's `dishHay()`/`placeEntry()` rather than re-implementing them,
// so the shipped files can never drift from what a full page render would
// show. The ASSEMBLY half (turning the compact file back into the shape
// `search()` reads) runs client-side, in `search.js`'s `rebuildIndex()` — see
// its own comment for why that split is where it is.
//
// 🚩 REVISED 2026-09-30, same day, after the coordinator measured the first
// version against this worktree and found it shipped MORE bytes than the
// 204,600 B / 59-request baseline, not fewer — ADR 0146's ~51–60 KB estimate
// assumed a lean index; the first cut shipped `buildIndex()`'s full RUNTIME
// shape verbatim, so `href` (218 KB raw), `venueName` (64 KB) and `venueId`
// (60 KB) repeated on every one of 3,506 dishes, and the summary carried a
// thinned menu that DUPLICATED dish identity already needed in the search
// index. Fixed here: dish identity (id, name, formerIds, section) ships
// EXACTLY ONCE, grouped by venue then section; `href`/`venueName`/`isRecipe`
// are rebuilt at load from `venueId` + the summary already in memory, never
// shipped; the summary drops `menu` entirely for a single `dishCount`; and
// every summary field is checked against an ALLOWLIST naming its home/search
// reader (ADR 0047) rather than passed through by exclusion, which is how
// `addOnGroups` (menu-page-only, 19.7 KB) ended up in the first cut unasked.
//
// WHAT "SUMMARY" MEANS HERE — SUMMARY_FIELDS below is the whole allowlist,
// each entry commented with the screen that reads it. `lifecycle` (raw dated
// events — only `closure` is read), `verified`/`verifiedBy`/`picks` (menu
// page only), `addOnGroups`/`website`/`ordering`/`priceChannels`/
// `detailsVerified(By)` (menu/contact-card only) and the raw menu are all
// dropped. `_priceSummary` carries `price.js`'s `priceBand()` result,
// computed against the real prices BEFORE they're gone — `price.js` reads
// this field first when present, so the card's price chip and the cheap-eats
// filter work unchanged on a summary record with no menu at all.
//
// THE SEARCH INDEX carries, per venue, its dishes grouped by section:
// `{ dishId, name, formerIds?, hay }`. `hay` is `dishHay()`'s output — the
// full ingredients/description/code/diet text a phone must have to search by
// them (ADR 0146 R5) — computed ONCE here from the real item, never shipped
// alongside the item itself. Nothing else about a dish is shipped: `href`,
// `venueName`, `venueId`, `isRecipe` and `kind` are all cheap to rebuild
// client-side from the venue's own `id` (the group key) and the ALREADY
// LOADED summary, so shipping them per dish would be pure duplication.
// Places need no entry of their own in this file at all — `placeEntry()`
// reads only venue-level fields the summary already carries unchanged.
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
import { dishHay } from "../site/js/search.js";
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

/**
 * The ONLY top-level venue fields a summary record carries, each commented
 * with the home/search-screen reader that earns it its place (ADR 0047). A
 * field added here without a call site to point at is exactly the defect
 * this allowlist replaces an exclusion-list to catch.
 */
const SUMMARY_FIELDS = {
  id: "every link, lookup key and the search index's grouping key",
  name: "card title (app.js), search result name, picker.js",
  kind: "kindOf()/labelsOf()/isRecipeKind() — every home/search capability check",
  status: "card's stub chip + hasDetails() (app.js)",
  cuisine: "card chips, search facet/haystack, filters.js's deriveFacets",
  area: "card meta line, search sub-line/facet",
  city: "search's city field/facet (place.js's placeEntry)",
  currency: "price chip currency (place.js's venueCurrency/displayPrice)",
  services: "picker.js's non-browse meta line, search haystack/facet",
  vibe: "card vibe chips, search vibe facet (vibes.js's vibesFor)",
  address: "search's address field, app.js's hasDetails (stub drill-in)",
  phone: "search's phone field, app.js's hasDetails",
  hours: "card hours badge (single-location fallback), venueHours",
  lat: "distance/ranking, app.js's hasDetails, nearestBranch coords",
  lng: "same as lat",
  image: "app.js's cardPhoto",
  alt: "app.js's cardPhoto (the image's alt text)",
};

/** A branch, thinned to what locations.js's nearestBranch/venueHours/
 *  branchesOf and app.js's cardArea actually read: `label` (the per-branch
 *  name on the card's meta line), `lat`/`lng` (distance, coordinates),
 *  `hours` (the open/closed badge) and the resolved `closure` (per-branch
 *  shut state, ADR 0132). `address`/`phone` are dropped — read only by the
 *  menu page's own contact card (menu.js's branchAsPlace), never by home. */
export function thinBranch(branch) {
  if (!branch || typeof branch !== "object") return branch;
  const out = {};
  if ("label" in branch) out.label = branch.label;
  if ("lat" in branch) out.lat = branch.lat;
  if ("lng" in branch) out.lng = branch.lng;
  if ("hours" in branch) out.hours = branch.hours;
  if ("closure" in branch) out.closure = branch.closure;
  return out;
}

/** The dish count a browse-kind card shows (labelsOf().browseLabel kinds,
 *  e.g. Cook at Home) — ALL items across ALL sections, `addOnsOnly` included,
 *  matching exactly what the pre-510/020 `(r.menu||[]).reduce(...)` in app.js
 *  and picker.js counted, so this is a byte-identical replacement for it, not
 *  a behaviour change. */
function countDishes(menu) {
  return (menu || []).reduce((sum, s) => sum + (s.items?.length || 0), 0);
}

/** One resolved (full) record → its home-card summary: the ALLOWLISTed
 *  fields, a thinned `locations`, the precomputed price band, and a dish
 *  COUNT — never the dishes themselves (roadmap 510/020; their identity now
 *  lives once, in the search index). Exported so tools/lib/fixtures.mjs can
 *  build a fixture's home-screen overlay through this SAME function rather
 *  than a second copy of the rules. */
export function summarise(record) {
  const out = {};
  for (const field of Object.keys(SUMMARY_FIELDS)) {
    if (record[field] !== undefined) out[field] = record[field];
  }
  if (Array.isArray(record.locations)) out.locations = record.locations.map(thinBranch);
  if (record.closure !== undefined) out.closure = record.closure;
  const price = priceBand(record); // BEFORE the menu is dropped — needs real prices
  if (price) out._priceSummary = price;
  out.dishCount = countDishes(record.menu);
  return out;
}

/**
 * One resolved (full) record's dishes, grouped by section, for the compact
 * search index: `{ section, items: [{ dishId, name, formerIds?, hay }] }`.
 * `hay` is `search.js`'s own `dishHay()` — the one place that text is
 * assembled, called here and never re-derived. Nothing else about a dish is
 * shipped: `href`/`venueName`/`isRecipe`/`kind` are all rebuilt client-side
 * from the venue's `id` (search.js's `rebuildIndex()`).
 */
function dishGroups(record) {
  return (record.menu || []).map((section) => ({
    section: section.section || "",
    items: (section.items || []).map((item) => {
      const out = { dishId: dishId(item), name: item.name };
      if (Array.isArray(item.formerIds) && item.formerIds.length) {
        out.formerIds = item.formerIds;
      }
      out.hay = dishHay(item, record);
      return out;
    }),
  }));
}

/**
 * The summary array and compact search index for a list of ALREADY-LOADED
 * (resolved, via `load()`) records, in the order given. Exported so a browser
 * check can build the exact same two structures for a corpus with one venue
 * swapped for a fixture (tools/lib/fixtures.mjs's `buildHomeOverlay`) — the
 * one path, never a second implementation that could silently disagree with
 * this one.
 */
export function renderFrom(loaded) {
  return {
    summary: loaded.map(summarise),
    searchIndex: { venues: loaded.map((r) => ({ id: r.id, sections: dishGroups(r) })) },
  };
}

function render() {
  const ids = readJson(INDEX_PATH);
  const loaded = ids.map((id) => load(readJson(path.join(RESTAURANTS_DIR, `${id}.json`))));
  const { summary, searchIndex } = renderFrom(loaded);
  return {
    // Minified, deliberately unlike gen_sbom.py's output: these two files are
    // never hand-read (a --check byte comparison and the source restaurant
    // diff are what a review actually looks at), 3,506 dish entries make
    // pretty-printing's indentation and newlines pure overhead, and the
    // coordinator's own instruction on this item is "as small as possible" —
    // measured 2026-09-30, indent:2 → none cut search-index.json's shipped
    // gzip bytes by ~6.5% and summary.json's by ~17%.
    summaryText: JSON.stringify(summary) + "\n",
    indexText: JSON.stringify(searchIndex) + "\n",
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
// `summarise`, `thinBranch`, `renderFrom`) can `import` this module without
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
