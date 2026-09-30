- [ ] **Phase 1 — the home screen reads summaries, not menus** `[M]
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
