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
`load()` and `search.js`'s `buildIndex()`. Home fetches only these two
(+ fx.json); `precache_check.mjs` asserts and break-probes zero requests
under `data/restaurants/`.

**Measured 2026-09-30 (per-file gzip, matching ADR 0146's method), home's
first load — network: 204,600 B / 59 requests → 216,751 B / 3 requests.
Storage (raw, precached): +1.87 MB on top of the unchanged corpus. Processing:
57× `load()`+`buildIndex()` per visit → 0 (2 files, pre-resolved). Server:
unchanged (static host).**

🚩 **Disagrees with ADR 0146's ~3×/51–60 KB estimate** — network bytes rose
~6% and precached storage rose ~16%, because `search-index.json` reuses
`buildIndex()`'s runtime shape (per-dish `venueName`/`href`/`section`, not
counted in that estimate) and dish `ingredients`/`attribution` text is most of
the corpus's weight. Requests (59→3) and client processing (57×resolve → 0)
are the real, large win. A leaner wire shape (dedupe `venueName`/`href` via a
`venueId` lookup) could recover the rest but changes `search.js`'s output
contract — left as an open follow-up, not picked here.
