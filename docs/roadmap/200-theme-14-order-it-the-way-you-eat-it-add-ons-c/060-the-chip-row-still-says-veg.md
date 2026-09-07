- [x] 🔎 **The chip row still says `Veg` on a dish the warning has just said is
      no longer vegetarian** `[S][ux][js]` — ✅ **CLOSED 2026-09-07 (session
      faves-picker); the claim is released.** Found 2026-09-07 (wt:
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

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — UPDATE THE CHIPS LIVE.**
  Re-render the chip row from the composed tags, so `Veg` disappears when a
  configuration breaks it. That matches what the warning and the `dish-flagged`
  dimming already do, and ends the state where three surfaces carry two meanings.
  ❌ Greying the broken claims and ❌ leaving it are **declined**.
  🛑 **This is the code change `110/040` wrongly claimed already existed.** That
  item asserted composed tags reach `tagChip` and render a raw identifier; they
  do **not** — `menu.js` builds the row once in `renderDish` from `item.tags`,
  and `onCompose` rewrites `dataset.tags` without appending chips. **So this
  ruling is what makes composed tags reach the chip row for the first time**, and
  the raw-identifier risk that was falsely reported becomes REAL the moment it
  lands. `has-fish` is not `contains-`-prefixed, not spicy and not in `DIETARY`,
  so it would fall through `tagChip`'s bare fallback and render as the literal
  string. **Whoever builds this must decide what a non-reader-facing tag does
  before wiring the re-render** — the false alarm has become a genuine
  precondition.
  🚩 Watch for flicker: the row must not visibly rebuild on every tap.

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

  ---

  ✅ **BUILT 2026-09-07 (session faves-picker) — option 1, as ruled.**
  `renderDish` now holds a `paintChips()` closure over the row's chip
  container; the initial paint and `onCompose` both go through it. Measured in
  headless Chrome at 390 px, same dish, same option as the report above:

  ```
  BEFORE tick  chips ["⚠ nuts", "Veg", "GF option"]
  AFTER  tick  chips ["⚠ nuts", "⚠ Contains fish"]
  UNTICK       chips ["⚠ nuts", "Veg", "GF option"]   ← byte-identical to before
  ```

  Both dead claims leave, the allergen the configuration **added** arrives, and
  the three surfaces agree: `dataset.tags` has no `v`, the row is
  `dish-flagged`, the warning says *"no longer vegetarian"*, and no chip says
  `Veg`.

  🔑 **THE NON-READER-FACING TAG DECISION — [ADR 0096](../../decisions/0096-a-tag-with-no-reader-facing-branch-is-not-a-chip.md).**
  This item was right that the raw-identifier risk becomes real here.
  `has-meat`/`has-fish` are **filtered out of the chip row**, not labelled: one
  predicate `isChipTag` inside `tagOrder`, so the first paint and every
  recomposition share it and cannot diverge. Three reasons, any one sufficient
  — `validate.py` already makes them an **error on a dish** naming this exact
  rendering as the reason; `has-fish` always ships beside `contains-fish` (ADR
  0095), so a chip for it is literally the duplicate pair the owner ruled
  against; and the fact is already said twice on the row, both louder as of
  today — the killed claim chip **vanishes** and the warning names it in words.
  ❌ Labelling them `Meat`/`Fish` was rejected on all three. The bounded cost is
  stated in the ADR: a *future* vocabulary word is dropped rather than painted
  raw, which is the safe direction and is still a silence.

  🚩 **Flicker: handled, and measured rather than reasoned about.**
  `paintChips` compares the composed list with the painted one and returns
  before touching the DOM when nothing moved — which is the common tap, a free
  sauce carrying no tags. When it *has* moved, `replaceChildren` swaps the row
  in one paint. `tagOrder`'s allergens-first order is preserved (it is the same
  function).
  🔎 **One structural change the ruling implies and the item did not name:** the
  container is now built **unconditionally**, because a dish with *no* tags can
  GAIN one by configuration — satay on a plain kebab — and there was otherwise
  nowhere to put it. `.dish-tags:empty { display: none }` keeps an untagged,
  unconfigured row laid out exactly as before.

  🧪 **Break-probed, twice, and the two halves fail independently.** Unwiring
  `paintChips(composed)` fails **exactly four** assertions (the two claims
  leaving, the allergen arriving, the surfaces agreeing) and leaves the baseline
  and untick assertions passing — correctly, since a row that never changes
  passes both. Removing the `isChipTag` filter fails **exactly two** — both
  raw-identifier absences, on two different dishes — and moves nothing else:
  proof that the defect this item warned about is real and that the filter is
  what prevents it.
