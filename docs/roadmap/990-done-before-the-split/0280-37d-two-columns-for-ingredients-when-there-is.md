- [x] **37d — two columns for ingredients when there is room** `[S][css]`.
      **CLAIMED 2026-08-16 13:55 UTC (wt: faves-recipe)** — the recipe-page pass.
      Owner: *"consider if the ingredients should go into two columns if there
      is screen space"*. The screenshot that prompted it shows a laptop-width
      window with the recipe held to a reading measure and most of the viewport
      empty. CSS multi-column above a breakpoint, `break-inside: avoid` so a
      tick and its line never split across the fold. **Note it is a
      *consider*, not an instruction** — if the measure test says a two-column
      ingredient list reads worse at that width, say so and don't ship it.
