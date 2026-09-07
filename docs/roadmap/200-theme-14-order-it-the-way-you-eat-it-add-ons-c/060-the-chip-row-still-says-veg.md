- [ ] 🔎 **The chip row still says `Veg` on a dish the warning has just said is
      no longer vegetarian** `[S][ux][js]` — found 2026-09-07 (wt:
      faves-addon-allergens) while verifying `110/040`, **measured in a real
      browser**, and **pre-dates that work** — the same disagreement is
      reachable with bacon, halloumi or prawns.

  **Measured, headless Chrome, 390 px.** Sprig & Fern Tawa's *Potato, Rosemary +
  Basil Pesto* — `["v", "gf-option", "contains-nuts"]` — after ticking its
  **Salmon** add-on:

  ```
  chips        ["⚠ nuts", "Veg", "GF option"]      ← unchanged
  dataset.tags "contains-nuts has-fish contains-fish"  ← `v` and `gf-option` GONE
  dish-flagged true                                ← follows the configuration
  warning      "Salmon contains fish — you asked to avoid it. Salmon is fish,
                so this is no longer vegetarian. Salmon isn't tagged gluten
                free, so that label describes the dish as listed."
  ```

  So on one row, at one moment: a **Veg** chip, and a sentence saying it is no
  longer vegetarian.

  **Why.** `menu.js` `renderDish` builds the chip row **once**, from
  `item.tags`. The `onCompose` callback rewrites `li.dataset.tags` (what the
  live diet filter re-reads) and toggles `dish-flagged` — and appends no chips.
  The row therefore has **three** surfaces that disagree about what "this dish"
  means: the chips describe the dish *as listed*, `dataset.tags` and the warning
  describe it *as configured*, and `dish-flagged` follows the configuration.

  🔑 **There is a real defence for the current behaviour, which is why this is
  filed as a question and not as a bug.** ADR 0092's own residue sentence says
  *"that label describes the dish as listed"* — so a chip row that means "as
  listed" is coherent, and it is arguably the honest reading of a printed menu.
  What is not defensible is that **nothing on the screen says which reading is
  in force**, and that `dish-flagged` picks the other one on the same element.

  🚩 **The fail-safe direction matters and cuts both ways.** A stale `Veg` chip
  over-claims (a dietary claim that has died still shows), which is the
  direction the whole composition model exists to prevent. A stale *allergen*
  chip cannot over-claim, because composition only ever adds allergens and
  `dish-flagged` already fires. So if only one half moves, it is the claim
  chips.

  📋 **Options, costed:**
  1. **Recompose the chip row on every change.** `[S]` One surface, one truth.
     🛑 The chips would then carry `has-fish`/`has-meat`, which have **no entry
     in `tagChip`** and would paint as raw internal identifiers — so this option
     is not deliverable without also deciding what those two render as, or
     filtering them out of the row. That is the design pass `110/040`'s filing
     believed was already needed and which turned out to be moot only because
     nothing recomposes.
  2. **Dim the claim chips that died, leave them in place.** `[S]` The same
     move the app already makes for an allergen a reader has not declared —
     dulled, never hidden — so nothing is removed from the page or the
     accessibility tree. Reuses an established pattern and needs no vocabulary
     decision.
  3. **Say what the chip row means.** `[XS]` Leave the chips alone and let the
     warning carry the configured truth, which is close to today, with the
     picker's own wording made explicit. Cheapest; does nothing about
     `dish-flagged` disagreeing with the chips beside it.
  4. **Leave it.** `[XS]` Nobody has reported it. Recorded so it is a choice.

  🎯 **Owner's call — it changes what a reader sees while deciding what is safe
  to eat.** ⚠️ No check asserts anything about this today: `addon_check.mjs`
  reads `dataset.tags` and the warning and never looks at the chips (it now
  reads them for one absence assertion only), and `focus_check.mjs` compares
  chips before and after **filtering**, never before and after **configuring**.
