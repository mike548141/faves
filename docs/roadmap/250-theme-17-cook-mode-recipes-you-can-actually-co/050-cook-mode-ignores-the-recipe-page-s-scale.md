- [ ] 🚩 **Cook mode ignores the scale the reader chose on the recipe page**
      `[S][js]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). The page's ½ · 1× · 2× · 3× control
      (ADR 0076) is not carried into cook mode: **"What you need" and the spoken
      step both render 1× while the page above shows 2×, with nothing saying
      so.** The reader scaled the recipe deliberately and then cooks from
      unscaled quantities — the failure is silent and lands in the middle of
      cooking, which is the worst place this app can be wrong. Adjacent to 17c
      (quantities inside the step) but not the same item: 17c is about *which*
      quantity a step shows, this is about the multiplier being dropped between
      two screens of the same recipe.
