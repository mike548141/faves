- **2026-07-23 (close-out: owner Q&A answers actioned + two forward inputs)**:
  Worked the three open questions from the close review. (1) Interim ratings —
  **keep the slider live** (no change). (2) Deep-link scroll — **smooth** (with
  reduced-motion fallback); shipped in `menu.js` `scrollToHash`. (3) McDonald's —
  owner escalated to "**flesh out fully**", then gave a menu source
  (mcdonalds.com/nz) and two calls: **include self-hosted photos, accepting the
  copyright/IP risk on the public site** (informed owner decision, on record),
  and **items now with prices "varies"** (per-store, so null — no fabrication).
  Shipped the **enduring NZ menu** (Burgers / Chicken & Fish / Sides / Breakfast /
  McCafé / Desserts; LTO promos omitted; allergen tags omitted = "not stated"
  safety floor); status stub → **menu-complete** (card links, "coming soon" chip
  gone, no-JS fallback `<li>` relinked, lockstep). Remaining McDonald's work
  (geocode 5 branches for Near-me; self-host the photos per the accepted IP call;
  allergen tags; price source) recorded as a Theme 2 content task. **Forward
  input — ratings as a 4th shareable scope** (with favourites/dietary/allergens):
  belongs to **Theme 10 (cross-person sharing)**, which the **parallel session is
  actively editing** — so *not* edited here to avoid clobbering; flagged for that
  workstream. Note: **ADR 0020 already treats ratings** as first-class for
  reference integrity, and ADR 0013's "no sharing" line will need revisiting when
  Theme 10 adds rating-sharing. SW SHELL → .84, DATA → .77. Parallel-session
  discipline held throughout (rebase-before-push, collision-guarded). Verify:
  `node --test` 278 pass, `validate.py` 28 files valid; tree clean, all pushed.

