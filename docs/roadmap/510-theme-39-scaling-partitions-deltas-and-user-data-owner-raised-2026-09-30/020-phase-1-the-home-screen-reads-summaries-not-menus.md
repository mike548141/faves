- [x] **Phase 1 — the home screen reads summaries, not menus** `[M]
      [data][pwa][home]` — owner-raised 2026-09-30,
      [ADR 0145](../../decisions/0145-faves-scales-by-partition-and-fingerprint-and-user-data-by-versioned-store.md)
      layers 2 and 3.

  **Measured 2026-09-30:** the card fields for all 57 venues come to 12,274
  bytes compressed; the full files come to 164,716. The home screen fetches all
  of them (`site/js/data.js:90`) because home search reads menus
  (`site/js/search.js:196`) and the card counts dishes (`site/js/app.js:201`).

  **Build:** a tool generates a summary file (card fields, branches, hours,
  dish count) and a search index (dish names and tags) from the venue files.
  Both are committed and checked by `--check`, with no build step (ADR 0001).
  The home screen and search read these two files only, and a venue file is
  fetched when its page opens. Keep one partition ("all") for now.

  **Check:** `boot_check`, `focus_check` and `distance_check` still pass, and a
  new assertion shows the home screen fetches **no** file under
  `data/restaurants/`.

  **Revised 2026-09-30 by ADR 0146 (cold review):** as fetched, the 57 files come
  to about 204–208 KB gzip, and home also needs the price band and dish ids
  (price chip, heart resolution). The search index keeps ingredients,
  attribution and order number, so home fetches about 51–60 KB: a saving of
  about 3×, not 13×. Build summaries through `load()` so dated fields resolve.
  Keep `index.json` until `recheckReferences` and `check_fallback.py` move off
  it.

  📌 **Claimed 2026-09-30 (`faves-0b`)** — built in a worktree.

✅ **Shipped 2026-09-30.** `tools/gen_summaries.mjs` generates
`site/data/summary.json` + `search-index.json` through `data.js`'s own
`load()`, `price.js`'s `priceBand()` and `search.js`'s `dishHay()`/
`placeEntry()`. Home fetches only these two (+ fx.json); `precache_check.mjs`
asserts and break-probes zero requests under `data/restaurants/`.

🚩 **Revised 2026-09-30, same day, after the coordinator measured the first
cut in this worktree and found it shipped MORE bytes than the 204,600 B
baseline** — it shipped `buildIndex()`'s full runtime shape verbatim (`href`/
`venueName`/`venueId`/`section` repeating on every one of 3,506 dishes) and a
summary carrying a thinned MENU that duplicated dish identity the search
index already needed. Fixed: dish identity (`dishId`, `name`, `formerIds`,
`hay`) ships **once**, grouped by venue then section; `href`/`venueName`/
`isRecipe` are rebuilt client-side from a dish's `venueId` plus the loaded
summary (`search.js`'s `rebuildIndex()`, proven byte-identical to
`buildIndex()`'s own output by `tests/rebuild-index.test.js`); the summary
carries a dish **count**, not the dishes; every summary field now names its
reader against an allowlist (ADR 0047) rather than passing through by
exclusion, which is how `addOnGroups` (menu-page-only, 19.7 KB) rode along in
the first cut; both files are minified (machine-only, never hand-read).

**Measured 2026-09-30 (per-file gzip, matching ADR 0146's method), home's
first load — network: 204,600 B / 59 requests → 122,636 B / 3 requests
(−40%, −95% requests). Storage (raw, precached): +573 KB (36% of the
restaurant corpus) on top of the unchanged, still-fully-precached corpus —
down from the first cut's +1.87 MB (116%). Processing: 57×`load()` +
index-build per visit → 0 (2 files, pre-resolved; `rebuildIndex()` is cheap
lookups over already-normalised strings). Server: unchanged (static host).**

Still above ADR 0146's ~51–60 KB aspiration, because dish `hay` text
(ingredients/description/code/diet labels across 3,506 dishes, ~245,000
characters) is what full-text search must keep and is most of the corpus's
own weight — not a further duplication, and not picked apart here.
