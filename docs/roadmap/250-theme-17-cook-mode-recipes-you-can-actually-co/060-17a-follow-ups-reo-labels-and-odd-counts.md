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

  📌 **Part 1 done 2026-11-23 (queue run f9ee6733). Parts 2 and 3 stay open.**
  The dictionary (maoridictionary.co.nz, searched 2026-11-24) attests none of
  the three recipe labels, so none was glossed and none was composed.
  - "Makes": no headword for a recipe's yield ("makes" returns "to make" in
    other senses). "Serve": `rato` is "to serve, service, provide", the sense
    of service, not of food at a table. "Written for about N people" is
    interpolated, which `reo.js` does not swap.
  - `tāngata` ("people, men, persons, human beings") IS attested, and is held
    back on purpose: beside the English "Serve" it prints "Serve 4 tāngata", two
    languages in one phrase. A taste call, easily reversed.
  - What did land: the labels now carry keys (`recipe.serve`, `recipe.people`,
    `recipe.stat.<key>` in `site/js/recipe.js`), so a speaker's gloss is a
    `reo.js` line and nothing else. The held and unglossed strings, with what
    the dictionary gave for each, are in `docs/reo-review-queue.md`. The
    activity screen's one glossed string ("Yesterday", `inanahi`) is in `reo.js`.
  - Needs a fluent speaker, or a dictionary entry for the sense, to finish.
