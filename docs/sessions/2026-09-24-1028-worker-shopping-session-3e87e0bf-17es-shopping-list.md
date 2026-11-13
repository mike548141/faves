## 2026-09-24-1028 — worker `shopping` (session `3e87e0bf`): 17e's shopping list, built as the tally with a different key

Roadmap `250/040`, the shopping-list bullet only. Branch `recipe-shopping-list`,
worktree `faves-shopping`. [ADR 0124](../decisions/0124-the-shopping-list-is-the-order-tallys-twin-not-a-second-list.md).

**The bullet named the implementation and it was right.** `createOrder(storage)`
hard-coded `KEY = "faves.order.v1"`; it now takes the key as a parameter,
defaulting to the tally's, and `shopping.js` passes `faves.shopping.v1`. That is
the whole of the reuse: nothing gathers, groups, totals, persists, recovers from
a corrupt payload or notifies subscribers twice. `putRecipe` / `removeRecipe` /
`recipeState` are ~25 lines composed out of `add`, `remove`, `toggleCollected`
and `items`. The sheet reuses `.order-sheet`'s frame — the same way
`.share-sheet`, `.recv-sheet` and `.report-sheet` already do — and renders each
line with the tally's **collect-mode row**, because ticking something off in a
trolley and ticking it off at a till are the same control.

🔑 **Scaling is ADR 0076's seam applied one screen over.** Identity on the raw
line, amount on the render. So rescaling the recipe page does **not** rewrite a
list you already took shopping — it detects the disagreement by comparing the
**amounts** (never by storing a scale key, which is a new field *and* a weaker
question) and says so in words with a way out. A line the shopper deliberately
✕'d is not a disagreement, or the page would nag to re-add the thing the ✕ just
removed.

🛑 **A break-probe found a fault in the check, not the product.** Removing the
two-tap Clear latch made `recipe_check` **abort** with `FAIL UNSTABLE ELEMENT`
rather than report — the Clear button correctly hides on an empty list, so the
blind second click had no box, and the verdict that was about to describe the
bug was buried along with every assertion after it. The second tap is now
guarded and reports *NOT PROVEN*, the shape the `unscalableFixture` branch
already used. Re-probed after the fix: 37 passed, 2 failed, both honest.

**The table walk was asserted, not reasoned about** — this repo's sweep has
leaked twice (the sync code, then the geo-consent flag). `tests/shopping.test.js`
now proves the backup carries the list and a **replace** import puts it back,
that `writeSnapshot` leaves it alone, and that deleting a profile does not take
the household's list with it. Every row of the walk is in the ADR.

⚠️ **Open, and the owner's to decide, not ours:** the list **does not sync**
across devices, for the same reason the order tally does not — sync's unit is a
profile and this store is device-level (ADR 0012's *"one order for the table"*).
Making it sync means making it per-profile, which reverses the ruling in §2 of
ADR 0124. Also left quiet: the backup's confirmation counts profiles,
favourites, ratings and order items, and rides the list in on the `other` sweep
without mentioning it.

**No te reo added.** `nav.shopping` and the rest are declared English-only in
`reo.js` and queued in `docs/reo-review-queue.md`. "Shopping list" would have to
be **composed** from single-word lookups, which is the refusal this repo already
recorded for *dining*; and most of the strings swap under the reader's own tap
or carry a count, which `reo.js` cannot carry at all ("the engine swaps whole
strings only").

Gates, all from the worktree with its tree line read: `node --test` 1334 passed ·
`boot_check` 24 · `recipe_check` **39** (was 29) · `cook_check` 85 ·
`device_check` 25 · `addon_check` 64 · `validate.py` 57 files ·
`check_no_deps` · `check_precache` (99 shell files) · `check_fallback` ·
`check_decisions` 123 records · `check_stashes` · `check_versions --range`.
`SHELL_VERSION` → `2026-09-24.2`; `DATA_VERSION` untouched (no `site/data/`
change).

🎯 **The `[~]` on 17e is left exactly as the orchestrator set it.** This worker
took one bullet of three and handed back without merging; releasing the item or
re-claiming it for personal notes and substitutions is the orchestrator's call.

