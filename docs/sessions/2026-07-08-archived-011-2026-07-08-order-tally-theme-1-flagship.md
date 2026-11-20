**From the retired session log**, word for word; only its link paths were re-pointed for this folder:

<!-- archivecut:log-entry docs/SESSIONS.md 61+1 -->
- [2026-07-08 · 2026-07-08 (order tally — Theme 1 flagship)](2026-07-08-archived-011-2026-07-08-order-tally-theme-1-flagship.md) — archived entry, verbatim in its file

- **2026-07-08 (order tally — Theme 1 flagship)**: Built Job 3, "right,
  let's order" — the owner greenlit it (chose to continue this session
  rather than start fresh; continuing was cheaper since the data shapes,
  slug/deep-link and localStorage-layer context were already warm). New
  pure model `site/js/cart.js` (`createOrder` store + `groupByVenue` /
  `orderTotal` / `orderCount`, injectable storage, memory fallback for
  private mode, tolerant of corrupt payloads) with 11 unit tests. UI in
  `site/js/cart-ui.js`: a shared `dishStepper` (+/−/count bound to the
  singleton `order`, self-updating via subscribe) on restaurant dish rows,
  and an injected floating order FAB + dialog (grouped by venue, per-venue
  Call link + subtotal, estimated grand total captioned "confirm at the
  till", collect mode to tick off at pickup, two-tap Clear). `initOrderUI()`
  called from app.js/menu.js/recipe.js so the order is reachable from every
  screen; cross-tab synced via the `storage` event. **Scope calls:** v1 is
  a single shared order (multi-person local profiles deferred); recipes get
  no stepper (Cook at Home is for cooking, not an order — that's the health
  app's eating-diary hook). STRATEGY non-goal clarified so the notepad-vs-
  ordering distinction is on record (the ⚑). Browser-verified in headless
  Chrome at 390px: steppers add/increment, FAB count + aria-label, dialog
  groups/subtotal/total ($72 for 2× Chicken Satay + 1× Beef Satay), collect
  mode ticks lines, order persists across a navigation to the home screen,
  two-tap clear empties and hides the FAB. node --test 68→ (11 new) all
  pass; validate.py + check_no_deps.py clean. VERSION → 2026-07-08.15;
  cart.js + cart-ui.js precached. CHANGELOG + ROADMAP + STRATEGY +
  ARCHITECTURE updated.
