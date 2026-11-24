- [ ] 🎯 **One family-attributed recipe was never moved and is still
      published** `[S][data]` — found 2026-11-24 by queue run f9ee6733's
      worker on `400`.

  `data/estimates/README.md` listed five family-attributed recipes "due to
  leave `site/data/`". The move of 2026-10-01 (`5cdf29e9`, `510/050`) took
  five recipes, but a different five: it took a chocolate pudding and left a
  brownie whose title starts with an initial ("B's …"). That brownie is still
  on the public Cook at Home page, with its recipe, serving count and time.
  **Open, the owner's:** move it to the private cookbook like the others
  (then out of `site/data/` by ADR 0047's route and out of the research store
  as `400` did), or keep it public, as an initial is not a name. Not asked
  yet; put to him one question at a time with the move's runbook
  (`tools/move_recipes.mjs`) as the cost.
