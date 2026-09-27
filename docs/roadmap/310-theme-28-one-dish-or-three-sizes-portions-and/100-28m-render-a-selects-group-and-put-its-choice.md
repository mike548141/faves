- [x] **28m — Render a `selects` group, and put its choice on the order line**
      `[M][js][ux]` — the screen ADR 0047 asks `28k` to name. Theme 14's ruling
      of 2026-08-17 governs the look: upsizing is the same control as choosing
      a sauce, and *"the reader should not be able to tell which of the six they
      are doing"*.
  ✅ **DONE 2026-09-28 (session `40d6dea4`, PR #50, `470c748`, ADR 0133).**
  A `selects` group renders as radios, default chosen; the row shows the
  chosen variant's `dishPrice` (never a sum); a non-default size is its own
  order line, keyed on the option id; unlabelled sizes read "$24 size". No
  data uses it yet (28n). 🎯 **Open for the owner, ADR 0133 §3:** the DEFAULT
  size is left off the order line so a line saved before 28n still merges —
  at the cost of the sheet saying "Eggs on Toast", not "…with Regular".
  🎯 Search (does a size's name find its dish?) is still unasked.
  🔎 This item's claim that the row already renders channel prices (ADR
  0089) is stale: that rendering was removed on 2026-09-06.

  **What changes.** `site/js/addons-ui.js` gains the variant control;
  `site/js/menu.js`'s dish row shows the price of the **default** variant with
  the ladder legible beside it (the row already does this for the counter and
  delivery prices under ADR 0089, and that precedent should be followed rather
  than a second pattern invented); `site/js/cart.js` needs **no change** —
  `lineKey` (`:68-69`) already folds `selectionKey(i.options)` into line
  identity, so a configured dish is already its own order line.

  🚩 **But read `28q` before relying on that.** `selectionKey`
  (`site/js/addons.js:238-243`) identifies an option by its group id
  concatenated with its **display name**, so "Large" → "Lg" re-keys every
  stored order line. That is the exact rename failure ADR 0051 fixed for
  dishes, still open for options, and this item is what makes it load-bearing.

  ✅ **What proves it landed.** `tools/addon_check.mjs` at 390 px: the default
  variant is selected on open and priced on the row before anything is tapped;
  choosing a variant changes the row's price and the order line's; the same
  dish at two variants is **two** order lines; a `selects` group shows no
  "choose up to N" affordance; and — the assertion most likely to rot — a
  `selects` option adds **no** residue sentence to the warning line, asserted
  by reading the line before and after the choice on a dish that has a
  claim to lose. Add a fixture group to a test record; do not wait for `28n`.

  **Depends on:** `28k`. **Blocks:** `28n` (nothing should be migrated into a
  shape no screen draws — ADR 0047).
