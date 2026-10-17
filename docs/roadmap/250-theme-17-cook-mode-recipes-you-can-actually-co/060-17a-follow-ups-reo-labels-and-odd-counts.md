- [ ] **17a's follow-ups: te reo for the new labels, and odd people counts**
      `[S][ux]` — filed 2026-10-18 by `faves-b4` from 17a's hand-back.
  1. **Te reo.** "Makes", "Serve … people" and "Written for about N people"
     (ADR 0162) are English only. `site/js/reo.js` glosses the rest of the
     chrome from maoridictionary.co.nz, the owner-nominated source; these
     want the same treatment, with macrons checked.
  2. **Odd counts scale few lines.** Measured on the 390 px screenshot of the
     Liège waffles at 14 people (written for 12): 7 lines show "as written",
     because 7/6 of a tablespoon has no kitchen spelling. The lines are marked,
     so nothing is misstated, but a reader who picks 14 gets a recipe that is
     part-scaled. Worth a look at whether the stepper should say so beside the
     count, or prefer counts that scale cleanly. A design choice, reversible.
  3. **Lava cakes' "8 cakes"** is `stated` in `data/estimates/` from the
     publisher's own data rather than the recipe's prose, so 17a did not ship
     it. If a publisher's stated yield counts as stated, it is a one-line
     data change plus `recipe_estimates.py --check`.
