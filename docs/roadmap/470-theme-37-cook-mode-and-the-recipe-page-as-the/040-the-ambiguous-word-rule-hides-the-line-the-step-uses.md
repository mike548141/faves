- [~] 🚩 **The "ambiguous single word" rule hides the ingredient line the
      step actually uses** `[S][js]`
      **CLAIMED 2026-08-17 12:35 UTC (wt: cook-fixes-0817-1235)** — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`), on three real recipes:
      **Plum Cake ("butter"), Self-Saucing Pudding ("cocoa"), Pad Thai
      ("peanuts")**. `cook.js`'s header claims the rule "only ever fails to
      hide"; that sentence is **false** — it also hides a line the step needs.
      🔑 **And the unit fixture omits the cocoa line that demonstrates it**, so
      the test agrees with the header rather than with the corpus. Fix the rule
      or fix the claim, and fix the fixture either way: a guard whose fixture
      excludes the failing case is agreeing with its author, not with the
      data.
