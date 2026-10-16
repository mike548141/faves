# 0158 — An unfinished dish is flagged on the order sheet and finished there

**Status:** accepted
**Date:** 2026-10-16
**Follows:**
[0156](0156-a-required-choice-has-no-none-and-add-waits.md) (a required choice,
and Add waits) ·
[0154](0154-saved-orders-store-ids-not-names-and-stay-off-sync.md) (recall
resolves ids against today's menu) ·
[0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) (composition)

## Context

ADR 0156 stops the menu making an order line that lacks a compulsory choice. It
cannot stop one existing: a line made before a group became `required`
(33 groups did on 2026-10-03), a saved order recalled after the flag, a shared
order, or a group made required after the line was added. 0156 §6 dropped such
a line from a recall. The owner ruled (2026-10-03): *"If a dish has a mandatory
addon and the user has not made a selection then the dish should show in the
order screen with a warning and the ability to complete in the necessary addon
selections in the order screen to clear the warning."* Asked whether this
supersedes 0156's "Add waits", he ruled **no**: Add waits stays on the menu, and
the sheet handles every line that arrives unfinished by another route.

## Decision

1. **The verdict is made against the live record, on the sheet.** A stored line
   keeps the options chosen, never the group definitions, so "unfinished" can
   only be answered against the venue's current menu (`order-finish.js`
   `unfinishedOf`, built on `groupsFor` and `missingRequired`, the same
   functions the picker and recall use). A menu page hands over the record it
   already loaded; any other page fetches the venues in the order when the sheet
   opens (the service worker answers from its store). A dish the record no
   longer holds is not judged. A failed load is said ("Couldn't load every menu
   to check…"), not read as "complete".
2. **The warning is words first:** "Needs a choice: Sauce", with a dashed
   outline and ⚠️ as further cues, never colour alone. In collect mode (read
   aloud) the line says "choice not made: Sauce".
3. **Finish in place, with the picker's own question.** A "Choose Sauce" button
   opens the required group as radios (no None, nothing pre-selected, "Required
   — choose one"). "Finish this dish" is `aria-disabled` until every missing
   group is answered, and a tap on it focuses the first unanswered radio (0156's
   pattern). "Not now" closes it and returns focus to the opener. Half-made
   choices live in a module map keyed on the line, because the sheet rebuilds
   its whole body on every store change.
4. **Safety reuses the one composer.** The sentence about what the choice does
   to the dish's allergens and dietary claims is produced by
   `configurationWarning` (`addon-warning.js`), the function the picker now calls
   too, over the line's existing options (tags read from the live record) plus
   the choice. It is shown before the reader commits. The sentences moved from
   `addons-ui.js` to `addon-warning.js` unchanged, because `addons-ui.js` imports
   `cart-ui.js` and the finish control could not import the picker without a
   cycle; `addons-ui.js` re-exports `warningLines`.
5. **Finishing is a move, and may merge.** `lineKey` includes the selection, so
   `cart.js` `finishItems` (and `order.finish`) re-keys the line exactly as
   `setNote` does. If a line with the new key exists the two become one of the
   summed quantity, keeping the existing line's price; ticked-off survives only if
   both halves were. Focus lands on the finished (or merged) line's note button.
6. **The price moves by exactly the choice.** New unit price = the line's price
   plus the chosen options' prices (an unpriced line stays unpriced). It is not a
   re-price from the live menu, so finishing changes nothing else on the line.
7. **The total says what it is missing.** While a line is unfinished and the
   choice can cost money (`extra.max > 0`), the line price, the venue subtotal and
   the total carry a "+" and a sentence under the total: "1 dish still needs a
   choice, so this total is short by what the choice costs." When every option is
   free the total is exact and the sentence only says a choice is owed. The
   unfinished line is never totalled as if complete.
8. **An unfinished line cannot grow.** It shows − and the count but no ＋ (0156
   §4). A finish covers the whole quantity; for different choices the reader
   lowers the count and adds the others from the menu, where the choice is asked.
   The control says so when the quantity is above one.
9. **Recall lands the line.** `planRecall` no longer skips a line that lacks a
   now-compulsory choice; it returns it in `lines` and in a new `unfinished`
   list, and the recall status says "Needs a choice — finish it in your order".
   Nothing is altered or guessed. This supersedes 0156 §6 for that case only.
10. **A shared order is consistent without new code.** The receiving sheet
    judges every line against the live record, so an unfinished line in a link
    lands flagged. Sending is not blocked: the sheet's warning sits directly above
    the Send button, and blocking would stop a reader sharing a list they know is
    unfinished.

## Rejected

- **Let Add always work** (the ruling's option ii). Rejected by the owner.
- **Store the missing groups on the line.** Would go stale the day a venue
  changes its menu, and needs a migration for every line already stored. The live
  record is the only source that is right when asked.
- **Re-price from the live menu on finish.** Moves unrelated prices silently.
- **A second warning composer for the sheet.** The class of defect this repo
  keeps paying for: two implementations, both locally right, one updated.

## Consequences

- `tools/addon_check.mjs` block (aa) drives the whole flow at 390 px from a
  non-menu page; `tests/order-finish.test.js` holds the verdict, price, merge
  and composition cases. Three assertions were break-probed (no merge; a total
  silent about the missing choice; the finish control composing without the
  choice) and each fails the check.
- `tests/tag-labels.test.js` now reads the picker's label tables from
  `addon-warning.js`.
- Not done: the order button does not signal an unfinished line before the sheet
  is opened (that would fetch every order venue on every page load).
