- [ ] **An unfinished dish on the order sheet: warn, and finish it there**
  `[M][js]` — **owner-ruled 2026-10-03:**

  > *"If a dish has a mandatory addon and the user has not made a selection
  > then the dish should show in the order screen with a warning and the
  > ability to complete in the necessary addon selections in the order screen
  > to clear the warning."*

  **What exists, read from the code 2026-10-03:**
  - On the menu, an unfinished line **cannot be made**: ADR 0156 blocks Add
    until a `required` group is answered (`cart-ui.js`, the `gate` branch).
  - It **can already exist**, though. The same code notes that a line for an
    incomplete configuration may date from before the flag. 33 groups became
    `required` on 2026-10-03, so any phone that had one of those dishes on its
    sheet that morning still holds the line with no choice and no warning.
  - Recalling a saved order **drops** such a line instead of flagging it
    (`saved-recall.js`, `missingRequired`, which reports
    `REASONS.required`). The ruling asks the opposite: land the line, with a
    warning.
  - Not checked: what a shared order (`share-*.js`) does with one.

  🎯 **Open: does this supersede ADR 0156's "Add waits"?**
  - **(i) Keep Add-waits on the menu.** The sheet's warning and
    finish-in-place then handle every line that arrives unfinished by another
    route: lines from before a flag, recall, a share, or a group made required
    later. Recall would land the line flagged instead of dropping it. 0156
    stands, and the warning has real work to do.
  - **(ii) Let Add always work.** The line lands unfinished, with the warning,
    and ruling 2's must-see expansion is what asks the question. This
    supersedes 0156's gate and makes the warning the main path, not the
    fallback.

  ✅ **Owner ruled 2026-10-03 (asked by `faves-de`): (i). ADR 0156's
  Add-waits stays on the menu.** The sheet's warning and finish-in-place
  cover every line that arrives unfinished by another route. Saved-order
  recall therefore **lands such a line flagged instead of dropping it**,
  and that is a change to `saved-recall.js`.

  Build notes: finishing a line changes its identity (`cart.js` `lineKey`
  includes the selection), so a finished line may need to **merge** with an
  identical line already on the sheet. The sheet total must say what it is
  missing; it must not silently price the dish at its base. `addon_check` or a
  sheet check should stage a pre-flag line and assert the warning appears and
  clears.
