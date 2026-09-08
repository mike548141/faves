- [~] 🔎 **Five smaller defects found while tracing fields to screens**
      `[S][js][docs]` — Theme 38 review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §4c). None is a
      modelling question; each is a fix with a test. Filed together because they
      were found together; take them one at a time.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — delivered by
  a sub-agent in its own worktree (`faves-o1-five-defects`, branch
  `five-defects`), landing by PR so CI runs before the merge.

  1. **Every order line is hard-coded `NZD`.** `cart.js:237` writes
     `meta.currency || "NZD"` and no caller passes a currency (`menu.js:1474-1486`,
     `addons-ui.js:204-217`); the line price is formatted with no currency
     (`cart-ui.js:199`). A GBP venue's order renders in `$`. The per-item currency
     override `place.js:65-67` reads is unreachable — `ITEM_KEYS` forbids the key.
     Latent: 0 non-NZD venues. Fix: pass `venueCurrency(r)` at both call sites and
     format the line in the stored currency; a unit test on a GBP fixture.
  2. **Deleting a profile leaves its cook-mode ticks behind.** `checklist.js:168`
     reads through `profileScopedStorage()` but `SCOPED_BASE_KEYS`
     (`profiles.js:38`) lists three keys, and that list is what the purge walks
     (`:193-199`). Fix: add the key; a test that a deleted profile's checklist key
     is gone. (Its export exclusion is deliberate and unaffected.)
  3. **The compact contact bar reads the primary branch.** `menu.js:2026-2036`
     reads `r.hours` — the projected `locations[0]` — while the card
     (`app.js:152`), the header caveat and the served window read the nearest
     branch once an origin is known. On a chain the pinned bar and the page above
     it can disagree; the bar's own comment says the opposite. Fix: `venueHours(r,
     origin)`; a `branch_check` assertion on a two-branch fixture with an origin.
  4. **Section `translations` are accepted and never rendered.**
     `validate.py:1723` allows them and `ARCHITECTURE.md` promises a translated
     heading; `menu.js:1791, 1833` render `section.section` raw and `preferred()`
     is only ever called with items. 0 records carry any. Fix either way — render
     it or refuse it — but not the current state, which is a field a screen is
     documented to read and does not.
  5. **A cross-record `goesWith` chip can dead-end.** `menu.js:1207-1211` links to
     `#dish-<slug(name)>` of the other record; `findDish`'s name tier compares the
     slug to `name`, so a target whose `dishId` differs from its slug (85 dishes)
     is unreachable. Reasoned from the resolver, not reproduced; 0 cross-record
     pairings in the corpus. Fix: resolve the reference through `findDish` at
     render and link to the id; validate cross-record refs by id as well as name.

  📋 **Doc drift found on the same pass**, for the docs commit rather than an
  item: DESIGN.md still specifies card services, dietary chips that dim, picks at
  the top and a header date line (all removed by owner rulings 2026-08-16/17);
  ARCHITECTURE.md's cook-mode ingredients toggle, the Refresh control's location
  (it is under Refresh & reset, ADR 0033), *"the future trend view"* (Theme 13:
  never), the private-repo row, and the per-profile store list that omits the
  checklist.
