**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 89+1 -->
- [2026-07-08 · 2026-07-08 (P1 batch + P2 price override + two-column panel + overflow](2026-07-08-archived-025-2026-07-08-p1-batch-p2-price-override-two-colu.md) — archived entry, verbatim in its file

- **2026-07-08 (P1 batch + P2 price override + two-column panel + overflow
  menu)**: Cleared the queued work in four commits, each verified in a real
  browser via CDP (Chrome headless, SW bypassed for fresh code).
  1. **P1 mobile fixes** (`.29`, css-only): menu screen no longer scrolls
     sideways (was 423px — grid children in `.menu-toolbar` needed
     `min-width:0` so the jump-nav strip scrolls itself); home filter bar
     **wraps to two rows** on a phone (service toggle full-width row, Area/
     Cuisine selects share the row below — they were collapsing to ~39px),
     with `--bar-h` bumped to 7.6rem on `body:not(.menu-page)` so body padding
     + both FABs clear it in lockstep, resetting to 4.6rem at ≥34rem;
     reduced-motion now truly kills smooth scroll (gated the smooth rule
     behind `no-preference` rather than being outranked by source order);
     touch targets to 44px (`.section-link`, `.diet-chip`, steppers,
     `.pair-chip`).
  2. **P2 curated price override** (`.30`): the median misbands where menus mix
     mains with cheap sides (KTC gastropub → "$") or a few pricey combos
     (R & S → "$$$"). `price.js` now honours a curated `priceBand`
     ("$"|"$$"|"$$$") and optional `pricePerPerson` that win over the median;
     `perPerson` is null when no figure agrees with the band (band shown
     alone, no contradictory "~$Npp"); result carries `curated` so the UI
     captions it "our estimate"/"typical price band" not "estimated from the
     menu". Set `priceBand:"$$"` on KTC + R & S (band only — no invented
     figure; mechanism supports one later). Both now read "$$"; KTC drops out
     of Cheap eats. `validate.py` + ARCHITECTURE schema updated; 9 new tests
     (112→119).
  3. **Two-column info panel** (`.31`, ROADMAP Theme 3): `.menu-twocol` grid at
     `min-width:48rem` — header spans the top, menu left, a **sticky info
     column** (contact card + stacked order buttons) right. New `renderAside`
     in `menu.js`; opt-in per page (venue + real menu only — stubs/recipes
     stay single-column); mobile unchanged (grid just doesn't apply).
     *Deferred:* per-platform order logos (self-hosted SVGs).
  4. **Overflow "⋯" menu** (`.32`, Theme 3): Favourites + Settings consolidated
     under one header button (new `overflow-ui.js` owns open/close + keyboard
     model; the two items keep their IDs so app.js/settings-ui wire them
     unchanged), freeing the search field to span the row. Per the owner's
     steer the Open-now/Cheap-eats/Near-me list toggles and the per-restaurant
     dish filters stayed put. Added to the SW SHELL.

  node --test 119 pass throughout; validate + check_no_deps clean. Everything
  is committed to `main`, not pushed (no deploy yet — Phase 7).

  *(The earlier note above mentions Fable's "P3 nits" as a follow-up — dropped:
  that list was never recorded and only lived in the prior review's scratch
  output, now gone. Not worth chasing; a fresh review would reflect today's UI
  anyway. Do not re-open it as a task.)*
