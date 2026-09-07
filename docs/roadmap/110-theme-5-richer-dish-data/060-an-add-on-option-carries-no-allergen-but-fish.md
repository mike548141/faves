- [~] 🔎 **An add-on option carries no allergen but fish — a hummus extra is
      sesame and nobody is told** `[S][tools][data]` — found 2026-09-07 (wt:
      faves-addon-allergens) while landing `040`, **measured before filing**,
      and filed rather than fixed because the obvious fix is dangerous.
      🔒 CLAIMED 2026-09-07 (session faves-hedge)

  **`tools/tag_addon_options.py` wrote no `contains-*` tag at all** until `040`
  added fish. It was scoped by [ADR 0092](../../decisions/0092-an-add-on-option-states-what-it-is.md)
  to two *dietary* markers, `has-meat` and `has-fish`, and that scope was
  correct for what it was asked to do. What it means today is that every other
  allergen an add-on can carry — a sesame sauce, a nut spread, a dairy topping —
  reaches an option's tags only if a person typed it there by hand.

  🎯 **The owner's ruling on `040` reads straight onto this**, verbatim: *"an
  add-on like salmon should have its **own** allergen and dietary tags the same
  way a dish does."* Fish was the instance in front of him. This is the class.

  🔎 **Measured, and the measurement is why this is not a one-line change.**
  `tag_allergens.py`'s whole rule set — the one that tags *dishes* — run over
  every add-on option name in `site/data/restaurants/`, 2026-09-07:

  | | option | would gain | verdict |
  |---|---|---|---|
  | 1 | `crepes-a-go-go` · Salmon | `contains-fish` | ✅ landed by `040` |
  | 2 | `sprig-and-fern-tawa` · Salmon ×2 | `contains-fish` | ✅ landed by `040` |
  | 3 | `crepes-a-go-go` · **Hummus** | `contains-sesame` | ✅ **a real live miss** |
  | 4 | `crepes-a-go-go` · **Chocolate or Nutella** | `contains-nuts` | ✅ **a real live miss** |
  | 5 | `hotel-bristol` · "No gluten added bun" | `contains-gluten` | 🛑 **backwards** |
  | 6 | `sprig-and-fern-tawa` · "No gluten added bun" | `contains-gluten` | 🛑 **backwards** |
  | 7 | `sprig-and-fern-thorndon` · "No added gluten bun" | `contains-gluten` | 🛑 **backwards** |

  **8 candidates, and 3 of them tag the venue's gluten-free ALTERNATIVE as
  containing gluten** — the one direction a safety sweep may never move. The
  tool already knows about those three: its `REVIEW` list reports them for a
  person precisely because *"no added gluten"* is deliberately weaker than
  *"gluten free"* and promoting a venue's hedge is the owner's call, not a
  sweep's (ADR 0092 says so and explicitly leaves the corpus's inconsistency
  here unresolved).

  🛑 **And the obvious narrowing is a trap this repo has already paid for.**
  Vetoing a whole option because its name matches a `REVIEW` pattern is an
  **item-level exclude**, which trades an over-warning for a miss: an option
  named *"No gluten added bun with smoked salmon"* would lose the **salmon**.
  The house fix for that shape is a **lookbehind that neutralises one
  alternative** — the same reasoning `tag_allergens.py` already carries for
  `(?<!water )chestnuts?` and `(?<!seed )caviar`.

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — FIX THE HEDGE FIRST, THEN
  SWEEP ONCE.** 🚩 **He OVERRULED the recommendation**, which was to land the two
  real misses immediately and treat the hedge separately. He took the thorough
  sequencing: get the rules right, then run everything through them in one pass.
  🛑 **What that costs, stated because he accepted it knowingly:** `Hummus`
  (sesame) and `Chocolate or Nutella` (**nuts**) carry **no warning anywhere in
  the app** and will keep carrying none until the hedge work lands. That is a
  real gap with a real allergen, and the sequencing makes it wait. It is not an
  oversight — **it is the trade he chose**, and whoever picks this up should
  treat the hedge fix as urgent for that reason rather than tidy.
  🔑 **The hedge, explained once so nobody re-derives it.** A hedge is a venue
  writing an allergen word in order to say the allergen is **absent**:
  `Gluten free toast` · `No gluten added bun`. A rule that matches the word and
  not its context tags them as *containing* the allergen — and this was measured,
  not hypothesised: `tag_allergens.py` proposed `contains-gluten` on a dish
  literally named **`Gluten free toast`** during the Simmer intake (`080/200`).
  🛑 **Why it is worse than an ordinary false positive.** An over-warning is
  usually annoying and safe — the water-chestnut case warned a vegan side about
  nuts and nobody was harmed. This one puts a **false gluten warning on the one
  item a coeliac is hunting for**, and the way a reader "fixes" that experience
  is by learning to distrust the gluten chips. The over-warning trains away the
  warning.
  🚩 **And the obvious fix is the trap this repo already knows.** "Skip any dish
  mentioning *gluten free*" would also skip a genuine gluten item in the same
  phrase — *"sourdough toast, gluten free option available"* would lose its
  warning entirely. That is an **over-warning traded for a miss**. The shape
  wanted is a narrow **lookbehind** that cancels the match only where the
  negation directly precedes it, **break-probed on `Gluten free toast`** and on a
  sentence where the hedge and a real gluten item coexist.

  📋 **Options, costed, none recommended — this is the owner's to scope:**
  1. **Share the whole dish rule set, guarded per-allergen by a "free-from"
     negation.** An option name making a free-from claim about allergen X
     vetoes only the `contains-X` rule and nothing else, so the salmon in the
     example above survives. `[S]` Closes 5 of the 8 correctly and refuses 3.
     Costs a new guard table nobody has needed before, and it has to be
     break-probed against the mixed name, not the easy one.
  2. **Share the dish rule set unguarded and let `validate.py` warn instead of
     the tagger writing.** `[XS]` No wrong tag can land, because nothing is
     written; a person reads 8 warnings and applies 5. Cheapest and it does not
     scale — the gap this whole family of tools exists to close was made by
     hand-tagging record by record.
  3. **Add the two missing allergens by hand and stop.** `[XS]` Closes the two
     in the corpus as at 2026-09-07 and rebuilds the same gap on the next venue
     with a hummus extra. The mechanism-versus-count trap `040` itself names;
     recorded to be refused rather than left tempting.
  4. **Leave it and say so in the picker.** `[XS]` An add-on's allergens are
     whatever a transcriber typed. Honest, and it leaves a stated allergen
     preference unhonoured on a real surface.

  🚩 **Two live misses are sitting in the corpus while this is open**
  (`Hummus` → sesame, `Chocolate or Nutella` → nuts, both at
  `crepes-a-go-go`). Neither is currently warned about on any screen.
