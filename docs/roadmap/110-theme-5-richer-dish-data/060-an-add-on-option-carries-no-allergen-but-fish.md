- [x] 🔎 **An add-on option carries no allergen but fish — a hummus extra is
      sesame and nobody is told** `[S][tools][data]` — found 2026-09-07 (wt:
      faves-addon-allergens) while landing `040`, **measured before filing**,
      and filed rather than fixed because the obvious fix is dangerous.
      ✅ **CLOSED 2026-09-07 (session faves-hedge); the claim is released.**

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

  ---

  ✅ **DELIVERED 2026-09-07 (wt: faves-hedge), in the owner's order — hedge
  first, then one sweep.** [ADR 0097](../../decisions/0097-a-hedge-is-not-a-warning.md)
  carries the reasoning; this is what was measured.

  🔎 **The hedge forms that actually occur** — swept out of all 57 records
  (every name, desc, ingredient line, section note and option name), not
  guessed: `gluten free` ×76 · `no gluten added` ×23 · `gluten-free` ×15 ·
  `dairy free` ×10 · `no added gluten` ×9 · `dairy-free` ×8. **Nothing else of
  that shape exists** — no *wheat free*, *nut free*, *egg free*, *soy free*,
  *sesame free*, *without gluten*, *free of dairy*, *non-dairy*, *lactose free*,
  *gluten-less* or *low gluten* anywhere.

  🔑 **Two guards, because one shape does not cover both faults.**
  `hedge_before` is the narrow lookbehind the ruling asked for and handles
  `Gluten free toast` (the negation qualifies the matched noun). It cannot
  reach `Brownie` / `Spiced ginger love muffin`, where the negation is a whole
  separate sentence in the `desc` — so `declared_free` reads a clause that is
  **nothing but** the venue's own free-from claim, per-allergen. Stopping
  `contains-gluten` on those five cabinet items was explicitly in scope; the
  `gf`-vs-`no added gluten` vocabulary question was not touched and stays with
  Theme 38.

  🧪 **Break-probes, both cases.**
  - **(a)** `Gluten free toast` gains no gluten tag — *"a hedged name gains no
    allergen warning"*. Removing `hedge_before` fails it **and nothing else**
    except the coexistence case below.
  - **(b)** A hedge and a genuine wheat item in one sentence — *"Gluten free
    pasta with wheat croutons."*, both alternatives of the **same** rule so
    only `first_unhedged` can save it. Three separate breakers fail this case
    and nothing else: switching the guard off, narrowing `finditer` to one
    match (the hedge takes the whole rule down), and un-anchoring
    `declared_free` from `fullmatch` to `search` (the item-level veto).
  - **(c)** On the add-on side, an option renamed `No gluten added bun with
    hummus` must gain **sesame** and **no gluten** — the salmon case from this
    item's own text, in a form the rules can see. Three more breakers fail it.

  📊 **Re-derived candidate set — it matched the recorded 8, with the 3 fish
  removed.** Run against the current tree (200 options, 57 records): **8 rule
  hits, of which 3 are already refused by `CONTRADICTED_BY`** (options carrying
  `gf`: `little-sprig-seatoun` *GF bun*, `sprig-and-fern-tawa` *Gluten Free
  Toast* and *Gluten free toast* — never in the original 8 because it counted
  only what would be WRITTEN). The **5 that would have been written** are
  exactly rows 3–7 of the table above. **No new candidate appeared** despite
  Simmer landing 108 dishes in between — Simmer carries no `addOnGroups`.
  With the hedge guard on, the same sweep writes **2** and refuses **3**.

  📈 **Measured counts.** Dish sweep **3 proposals → 0**, corpus otherwise
  unmoved (no shipped tag changed — the three were refused by hand during the
  Simmer intake). Add-on sweep **+2 tags at `crepes-a-go-go`**; option coverage
  **103/200 → 105/200 (52%)**. The three hedged buns are still **reported** for
  a person, which is what ADR 0092 asks for.

  ✅ **No `site/js` change was needed and none was made.** Every table that has
  to recognise `contains-sesame` and `contains-nuts` already carried both —
  `ALLERGEN_LABEL` in `addons-ui.js`, the chip maps in `menu.js`/`recipe.js`,
  the avoid list in `settings.js`, `TAGS` in `validate.py`; `report.js` filters
  on the `contains-` prefix. Checked, not assumed.

  ⚠️ **One existing breaker had gone DECORATIVE and was repaired in the same
  commit.** `test_tag_allergens.py`'s availability probe injected *"…can be made
  with dairy free cheese on request"* — once a hedge cancels the match on
  **cheese**, that clause is refused twice, so deleting the availability guard
  changed nothing and its breaker passed with the bug back. `or halloumi` was
  added to the injected clause to restore it.

  🚩 **Filed, not fixed (a different owner's call).** `charley-noble`'s
  Charcuterie Board and Classic Beef Tartare carry `contains-gluten` by hand,
  and the only gluten word the rules can see in either is the **bread inside
  their hedge** (*"$41 with gluten-free bread instead of crostini"*). The real
  evidence is **crostini**, which is not in the wheat rule at all. Nothing
  changes today; if a refresh ever strips those tags the sweep will not put them
  back. Adding `crostini` to the STATED wheat rule is a rule-set widening and
  belongs to whoever owns that.

  🚩 **Also filed:** `contains-fish` is the one dish rule the option sweep does
  **not** borrow, keeping ADR 0095's decision that only the STATED species list
  crosses over. Measured before accepting it: **zero** options in the corpus
  would gain `contains-fish` from the DERIVED fish rules (Worcestershire, dashi,
  surimi, sashimi, ceviche), so the carve-out costs nothing today.

  🔎 **Duplicated rule sets between the two taggers — checked, and there is one
  left, deliberately.** After ADR 0095 shared `FINFISH` and this item shared the
  whole allergen rule set and `CONTRADICTED_BY`, the only thing written twice is
  the fish rule itself (`tag_addon_options.RULES` carries its own `has-fish` /
  `contains-fish` pair reading the shared `FINFISH`). That duplication is ADR
  0095's two-axes structure and its two breakers depend on it, so it is kept and
  named rather than tidied away. The `NOT_FISH` exclusion is this tool's own by
  design (an option is named *"Vegan fish-free sauce"*; a dish is not).
