- [x] 🛑 **`service` is renamed to `order-mode`, INCLUDING the shipped filter**
      `[M][js]` — owner-ruled 2026-08-16.
      ✅ **THE CODE RENAME IS SHIPPED 2026-08-17 (`7bc0ee6`)** — claim released.
      `filters.js`, `app.js`, `index.html`, `reo.js` and `tests/filters.test.js`
      carry `orderMode` throughout; zero filter-axis `service` identifiers remain
      (grepped). 1089 unit tests · `boot_check` 24/24 · `filter_row_check` 25/25
      · `device_check` 20/20. `SHELL_VERSION` → `2026-08-17.121`.
      🛑 **AND THE RULING'S PREMISE DOES NOT HOLD. `?service=` was never in a
      URL.** This ruling calls the URL compatibility path *"the part that must
      not be dropped"*, on the harm that a saved or shared link carrying
      `?service=takeaway` would silently lose its filter. That link cannot
      exist. Verified three ways: `main`'s `filtersFromQuery` read `area`,
      `cuisine` and `style` only; `git log -S'get("service")' --all` returns
      exactly one commit, the one that ADDS the read; and `app.js` carried a
      comment saying so outright — *"`?service=` was never a shareable facet
      (ADR 0050 carries area and cuisine only), and adding it here would change
      what a shared link means."*
      **The shim was built anyway, which is the right call** — the ruling is
      explicit and later-dated, and a session raises a premise, it does not
      overrule one. What it actually does is narrower than the ruling imagines,
      and is written into `filters.js`'s doc comment so the next reader is not
      misled: `filtersFromQuery` now **reads** the axis (`?order-mode=`, falling
      back to `?service=`), `syncQuery` still does **not write** it, so
      [ADR 0050]'s shareable-facet set is unchanged and no link this app mints
      carries either spelling. *"Write only the new one"* holds by writing
      neither.
      ✅ **RULED 2026-08-17: DROP THE SHIM** — done, and the ruling came with a
      correction to this item's own account of him.
      🛑 **THIS ITEM MIS-RECORDED WHAT HE SAID.** It states the URL compatibility
      path is *"the part that must not be dropped"*. Shown the evidence that no
      `?service=` link had ever existed, his answer was:
      > *"Drop it and thats not what I said. I said its fine to break URL's now
      > because there are minimal users but ONCE there are lots of users we don't
      > want to break URL's"*
      🔑 **A conditional became an absolute in the writing down** — *"not yet, and
      then yes"* was recorded as *"must not"*. That is the **third** record found
      today to overstate an owner ruling (see `340/110`'s five-state
      attribution, and the CHANGELOG entry that told readers the old key used to
      work). The pattern runs one way: **records get stronger than the thing they
      record**, never weaker, because a firm sentence is easier to write and
      easier to quote.
      **What shipped:** `LEGACY_ORDER_MODE_KEY` and its read are gone from
      `filters.js`, the delete is gone from `app.js`'s `dropOrderModeQuery`, and
      the two compatibility tests are **replaced rather than deleted** — they now
      assert `?service=` is *ignored*, because "we removed it" and "we removed it
      and something re-added it" look identical in a diff a year from now.
      📌 **His forward rule is now its own item — [`020`](020-url-stability-becomes-a-constraint-when-there-are-users.md)**
      — because the permission it grants has a condition nothing in this repo can
      currently detect.
      ⚠️ **THREE PIECES OF THE RULING'S SPIRIT ARE NOT DONE**, listed so nobody
      reads the ✅ as complete:
      - **The record field is still `services`** across all 55 venue files, plus
        `validate.py`'s `SERVICES` constant and the schema in `ARCHITECTURE.md`.
        This is the largest remaining piece, needs a `DATA_VERSION` bump, and is
        flagged in a comment at the `applyFilters` clause so it reads as
        deliberate rather than missed.
      - 🛑 **The VISIBLE LABEL still reads "Service" / "Any service", and this
        one is an owner call because of te reo.** Only identifiers and i18n keys
        moved. Re-wording the control strands the gloss **37j deliberately landed
        on 2026-08-17**, and replacing `"Ratonga"` with a te reo noun for "order
        mode" would be **inventing** one, which `reo.js`'s own SAFETY BOUNDARY
        forbids without a fluent speaker. Falling back to English is available
        and is a regression in reo coverage. ~6 lines once ruled.
      - **`search.js` calls the same axis `service`** (`matchField: "service"`,
        and the user-visible string *"Matched: service"*, plus
        `search.hint.service`). A third vocabulary for one concept; renaming it
        changes a user-visible string, so it belongs with the record field.
      🔎 **Two of this item's own claims were wrong**, recorded because the
      pattern matters more than the instance: `tools/boot_check.mjs` does **not**
      read this element id — it reads `filter-area` and `filter-cuisine` only, so
      **zero tool changes were needed**; and `.chip-service` in `app.css:1155` is
      dead code (the card chip it styled was removed 2026-08-16) and simply wants
      deleting.

[ADR 0050]: ../../decisions/0050-a-facet-link-filters-the-list-rather-than-searching.md Not a rename: a rename
      **plus a URL compatibility path**, which is the part that must not be
      skipped. Unblocked since 2026-08-17 (37k landed), and it inherited a
      fourth filter axis while it waited.

The word means **three** different things and three sessions collided with it
independently in one day:

| # | What it is | Status |
|---|---|---|
| 1 | `filters.js` `service` — the values `all` · `takeaway` · `dine-in`, a home-screen `<select>` on 55/55 venues | **shipped** |
| 2 | Theme 30's `channel` — `dine_in`/`takeaway`/`delivery`, a **price-and-tax** axis (delivery menus run 15–30% above dine-in) | proposed |
| 3 | Theme 30's proposed `service` **axis label** on `cuisine` values ("`Cafe` is a format word") | proposed |

He was offered the cheap option — keep the shipped one, rename only the two
proposals — and **ruled the other way: rename all three, the live filter
becomes `order-mode`.** ⇒ `service` stops being overloaded entirely rather than
being left as the one survivor that future readers still have to disambiguate.

🚩 **THE COST HE IS ACCEPTING, AND IT IS THE WHOLE OF THE WORK.** The filter is
**shipped and in URLs** — `filtersFromQuery` reads it, and a saved or shared
link carries `?service=takeaway`. Renaming the key without a shim makes every
existing shared link **silently lose its filter**: no error, no notice, just a
different set of venues than the sender saw. So this is not a rename, it is a
rename **plus a compatibility path**, and the compatibility path is the part
that must not be skipped:
- read the old key, write only the new one;
- `tests/filters.test.js` must assert an old-style URL still resolves;
- and per ADR 0072, that test must be **proven to fail** without the shim,
  or it is decorative.
Also in scope: `site/index.html`'s filter markup, `app.js`'s URL sync,
`reo.js`'s gloss, and `tools/boot_check.mjs` (it reads filter element ids).
✅ **The sequencing gate is DISCHARGED 2026-08-17.** This item was held behind
37k's style filter because that work was live in `filters.js`, `app.js` and
`index.html`. **37k has landed** (`9aa6071`…`62546b4`, wt removed, claim
released) — so `order-mode` is now unblocked and takeable. ⚠️ Note what it
inherited while it waited: `filters.js` gained a **fourth** axis (`style`), so
the rename touches one more select, one more `DEFAULT_FILTERS` key and one more
URL parameter than the description above assumed.

  📌 **`[~]` → `[ ]` 2026-09-27 (session `40d6dea4`):** no claim stamp, no
  branch, no live session behind it. The bracket was standing in for
  "part-done", which the house board does not define — `[~]` means
  *claimed*, and a released claim reverts (atelier `CONCURRENCY.md`
  § Claiming work). What is done is carried in the body above.

  ✅ **Owner ruled 2026-10-02: do the remaining rename** (the `services`
  record field across the venues, `validate.py`, the schema, and the
  `search.js` "service" vocabulary), with a read-both-names bridge for one
  release so an installed phone on the old shell keeps its filter. The
  visible label stays a separate te reo question. Ready to take.

  📌 **Claimed 2026-10-02 04:12 UTC (`faves-77`): the record-field rename, the
  `search.js` vocabulary and the one-release bridge (worker in a worktree).**

  ✅ **Shipped 2026-10-02 (`faves-77`, branch `faves-77/010-ordermode-field`):**
  the record field is `orderMode` in all venue files, `validate.py`
  (`ORDER_MODES`, `VENUE_KEYS`, messages), the `ARCHITECTURE.md` schema,
  `search.js` (`orderMode`, `matchField: "orderMode"`), `picker.js`, and
  `search.hint.orderMode`. The dead `.chip-service` rule is deleted. One
  user-visible string moved: *"Matched: service"* is now *"Matched: dining"*
  (the orchestrator changed the worker's "order mode" at review: nothing on
  screen uses that term, and "Dining" is the filter's own owner-worded label,
  which is untouched). Still open: the
  te reo for the label, as ruled.
  🔎 **Skew, established from `sw.js`:** the home filter reads
  `data/summary.json` only (`loadRestaurants`); no shell reader takes
  `services` from a venue file, and `search-index.json` never carried it.
  Both skews are reachable. OLD shell + NEW data: a new worker's install
  syncs data into the shared `faves-data` store (pointer is per schema, not
  per shell) while the old shell is still the one running, and the old
  worker's own background sync does the same. NEW shell + OLD data: install
  tolerates a failed data sync when a set is already held. Bridge, one half
  each: `gen_summaries.mjs` mirrors `orderMode` into `services` in
  `summary.json` only (one duplicated array per venue, one file; ADR 0047);
  `data.js` `readOrderMode` maps a `services`-only summary record to
  `orderMode` at load. Both `#!#`-marked: remove after 2026-10-16.
  Break-probe: with both halves removed, `tests/data-loader.test.js` failed
  two tests (`orderMode` undefined where `['takeaway','dine-in']` expected;
  legacy mirror undefined); restored, 22 pass.

  ✅ **Closed 2026-10-02 (`faves-77`, PR #93, merged with CI 8 of 8;
  `SHELL_VERSION` re-bumped to `.7` after rebasing past #94).** Re-verified
  after the rebase: `validate.py`, `node --test` 1844/0, `boot_check` 38/0,
  `device_check` 69/0. The label's te reo is `340/140`'s; the bridge's
  removal is [`040`](040-remove-the-ordermode-bridge-after-2026-10-16.md).
