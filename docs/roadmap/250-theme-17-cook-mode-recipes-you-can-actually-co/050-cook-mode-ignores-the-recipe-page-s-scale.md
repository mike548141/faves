- [x] ✅ **SHIPPED — cook mode carries the reader's scale** (`5403552`, "cook:
      the 2× mixture reaches the bench"). Found stale 2026-08-17 by a board
      sweep and **verified in the tree rather than taken from the commit
      subject**: `site/js/cook-ui.js` takes a `scaleKey`, reads `scale` at the
      tap and renders a `.cook-scale` badge (5 references), and
      `tools/cook_check.mjs` §12b asserts *"a step's ingredients are shown at
      the scale the reader picked, not at 1×"* plus the refused-line case.
      17a (`250/010`) already described this same fix as landed; this item was
      the one nobody flipped. Original filing follows —
      `[S][js]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). The page's ½ · 1× · 2× · 3× control
      (ADR 0076) is not carried into cook mode: **"What you need" and the spoken
      step both render 1× while the page above shows 2×, with nothing saying
      so.** The reader scaled the recipe deliberately and then cooks from
      unscaled quantities — the failure is silent and lands in the middle of
      cooking, which is the worst place this app can be wrong. Adjacent to 17c
      (quantities inside the step) but not the same item: 17c is about *which*
      quantity a step shows, this is about the multiplier being dropped between
      two screens of the same recipe.
