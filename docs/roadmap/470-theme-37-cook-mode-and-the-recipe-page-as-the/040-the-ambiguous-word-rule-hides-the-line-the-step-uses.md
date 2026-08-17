- [x] 🚩 **The "ambiguous single word" rule hides the ingredient line the
      step actually uses** `[S][js]`
      ✅ **SHIPPED 2026-08-17 (`5468179`) — the RULE was fixed, not the claim.**
      The fork was an engineering call and it was made on this reasoning: the
      show-rather-than-hide bias **is** the design — a missing ingredient
      mid-cook is a ruined dish, a redundant one is a blemish — so a rule that
      hides what a step *names* is not a documentation error, it is the failure
      the bias exists to prevent.
      The fix is a second pass: an ambiguous word the step uses falls back to
      showing **every** line carrying it, *unless* something more specific has
      already answered for that word. So *"Beat together the white sugar…"* still
      matches on the phrase and the sauce's brown sugar stays out. **The step's
      specificity decides, never a count.**
      🔑 **THE ALLERGEN QUESTION, VERIFIED INDEPENDENTLY BY THE MERGING SESSION**
      rather than taken on the builder's report — a sweep of all 24 recipes
      through the real `ingredientKeys`, diffing `main`'s `ingredientsForStep`
      against the new one: **221 lines before, 239 after, 18 added, ZERO
      REMOVED.** Easy Pad Thai step 5 says *"Add the peanuts and sprouts"* and
      used to hide **both** the roasted peanuts **and** the peanut oil; both now
      show. All three named recipes are in the 18. **The change can only widen
      what a cook is shown**, which is the only answer that is safe here.
      The fixture carries the sauce's cocoa line, as this item required.
      `site/data/` and `tools/tag_allergens.py` were not touched.
      Original filing follows — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`), on three real recipes:
      **Plum Cake ("butter"), Self-Saucing Pudding ("cocoa"), Pad Thai
      ("peanuts")**. `cook.js`'s header claims the rule "only ever fails to
      hide"; that sentence is **false** — it also hides a line the step needs.
      🔑 **And the unit fixture omits the cocoa line that demonstrates it**, so
      the test agrees with the header rather than with the corpus. Fix the rule
      or fix the claim, and fix the fixture either way: a guard whose fixture
      excludes the failing case is agreeing with its author, not with the
      data.
