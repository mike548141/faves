- [ ] 🚩 **Three allergen findings the caption sweep turned up, none of them
      this item's to fix** `[S][data]` — raised 2026-09-09 by the session
      delivering `210` (ADR 0114). All three were measured on the real corpus,
      and each is left alone deliberately: two are rule-set decisions with
      their own cost, and the third is an owner ask.

  ## 1. `slices?` in the wheat-bakery rule fires on "slices OF something"

  Found by sweeping the 41 image captions for what a naive read would tag
  WRONGLY: McDonald's `Cheeseburger` caption reads *"a beef patty with **a
  slice of** melted cheese"*, and `slices?` is an alternative of the
  `a wheat bakery item` rule. It matched. No tag changed — both rows already
  carry `contains-gluten` from `\w*burgers?` — but the **printed basis would
  have been false**, which is ADR 0110's `katsu` lesson exactly.

  🔎 **It is not confined to captions.** Sweeping every string in all 57
  records for `slices?`, the rule reaches *"Slices of chicken"* ×3 (Pizza
  Hut), *"Duck Slices with Pancake"* ×2, *"Fungus Slices"* ×2, *"Leg
  Slices"*, *"sirloin slices"* — and `charley-noble`'s
  **`Dave Dobbyn • Slice of Heaven`, a COCKTAIL carrying `contains-gluten`
  whose only evidence is the word *slice***.

  🛑 **Why it was not narrowed here.** Seventeen shipped rows would stop
  being re-proposed, and most of them are right: a *Caramel Slice*, a
  *Citrus Slice*, a *Custard Slice* are NZ cabinet traybakes and they are
  wheat. So this is a rule-set narrowing with its own measurement, and this
  session's brief was explicit that no tag but the two named may be removed.

  📋 **Options.** (1) A negative lookahead — `slices?(?!\s+of\b)` — which
  refuses *"a slice of melted cheese"*, *"Slices of chicken"* and *"Slice of
  Heaven"* while keeping every traybake. Measured: it does **not** reach
  *"Leg Slices"*, *"Fungus Slices"* or *"sirloin slices"*, which have no
  *of*. (2) Nothing, and accept a false basis on a tag that is usually right
  for another reason. (3) Move `slice` out of the bakery rule into a
  narrower one that requires a bakery word beside it.
  🎯 Recommendation: **(1)**, with the shipped `Slice of Heaven` tag checked
  by a person separately — removing it is a data decision, not a rule one.

  ## 2. `Soft Serve Cone` gains dairy from the caption and nothing from the
  wafer

  Its caption is *"A soft serve ice cream in a wafer cone"*. `cream` is a
  dairy rule word, so the row now warns about dairy — correctly. **`wafer`
  and `cone` are not rule words at all**, so the row says nothing about the
  wheat it is served in. A pre-existing vocabulary gap, visible for the first
  time because the caption is the first prose that row has ever carried.
  Adding `wafer` to the wheat rule is `110/050`'s class of work, not this
  one's.

  ## 3. 🎯 `Gluten friendly bun` is still PROPOSED on every dry run

  ⚠️ **CORRECTED 2026-09-09 (session faves-3b): this section was written as
  if the removal had happened, and it had not.** `210`'s commit `e0ee36e`
  changed **one** row — `low-carborator-lettuce-bun`. The
  `gluten-friendly-bun` row kept `["gf-option", "contains-gluten"]` on
  `main`, so for the length of that merge the corpus still carried the false
  warning the owner had ruled removed, *and* every record said it was gone.
  The dry run reported **0 proposals**, not the 1 described below — because a
  tag that is present is not "missing", so the sentence that reads like a
  warning was actually the sound of the fault being invisible. Removed at
  `main` immediately after, `DATA_VERSION` → `2026-09-09.3`, and re-measured:
  the dry run now reports exactly the **1 proposal** described below. So
  everything from here down is true **as of that removal** and was not true
  when written.
  🔑 **The lesson is the repo's own and it landed on a safety row: a delivery
  report is a claim like any other.** Three records asserted the removal —
  the agent's report, `210`'s delivery note and this section — and the data
  said otherwise. What caught it was re-reading the shipped JSON, not
  re-reading the prose.

  Item `210` widened ADR 0097's hedge to cover *"gluten friendly"*. The hedge
  cancels the match in the **name**. It does not cancel the one in the
  **description**:

  > *"Switch the **wholemeal bun** for a gluten friendly bun. Not a
  > dedicated gluten free kitchen."*

  Those words are really there and a wholemeal bun really is wheat. What is
  false is that **this row contains it** — the row IS the swap, and the
  wholemeal bun is the thing being swapped *away*. That is a fact about
  **substitution**, and no word rule reaches it.

  🚩 **AND IT IS WORSE THAN ONE DRY-RUN LINE — measured 2026-09-09 after the
  real removal.** `validate.py` also warns, and `validate.py` is the first
  entry on CLAUDE.md's mandatory verify list:

  > `warning: [burgerfuel] Gluten friendly bun: missing contains-gluten`
  > `(DERIVED — a wheat bakery item (bun)) — run tools/tag_allergens.py`

  So the corpus's warning count moved **74 → 75**, and the new warning is an
  instruction to run the tool that would re-land a false allergen warning the
  owner ruled removed. A session that treats a clean warning list as the goal
  will do exactly that, in good faith, and the diff will look like tidying up.
  🔑 That changes the weight of the options below: option (1) *"leave it, a
  person refuses it each time"* now means leaving a **standing instruction to
  reintroduce it** on the one gate nobody skips — which is a different and
  worse proposition than the visible-dry-run-line this section first described.

  🛑 **So the dry run now reports 1 proposal that must never be applied**,
  and a careless `--apply` would re-land a false gluten warning on the row a
  coeliac is hunting for. That is the live risk; it is visible rather than
  silent, which is why it was left rather than papered over.

  🛑 **Every mechanism that would silence it is the shape ADR 0097
  rejected.** Measured, not argued: a NAME-level veto — "the dish's name
  declares this allergen absent and nothing in the name contradicts it" —
  costs **zero tags across the whole corpus today**. But the corpus holds 14
  dishes with a hedged name and **12 of them carry `gf`**, so
  `CONTRADICTED_BY` is already doing the work and the veto only *looks* free.
  On its own merits it is an item-level veto, and on a future row reading
  *"Gluten free base — served with garlic bread"* it loses the garlic bread.
  An over-warning traded for a miss is the one direction the tool may not
  move.

  📋 **Options.** (1) Leave it: the tag is off the row, the proposal is
  visible, and a person refuses it each time — the state ADR 0097 itself
  shipped for three months. (2) The name-level veto above, accepting that it
  weakens ADR 0097's anchor and that its zero cost today is borrowed from
  `gf`. (3) Give the tagger a `noTags` / `tagsFinal` marker on a dish so a
  human ruling can be recorded once — a new data field, so ADR 0047's *name
  the screen that renders it* applies and the answer is that none does.
  (4) Treat "Bun swaps" as a class the tagger should not read at all —
  modifier rows are not dishes — which is a much bigger question about what
  `menu[].items[]` means.
  🎯 Recommendation: none offered. This is the owner's, and it is a decision
  about how much mechanism a single row is worth.

  ### ✅ §3 RESOLVED 2026-09-09 (session faves-p1) — ADR 0116, none of the four

  Owner ruled *"we should fix that"*. The delivered fix is **none of the four
  options above**: it is a fifth, and it is the shape ADR 0097 already
  established — **narrow the match, never veto the row.** A rule word standing
  in the swap-**AWAY** half of a `switch/swap X for/with Y` construction is not
  evidence the dish contains it. `swapped_away()` cancels that ONE match and
  `first_unhedged` walks on, exactly as `hedge_before` does.

  🛑 **The grammatical half alone would have been WORSE than leaving it, and
  that is the finding worth carrying forward.** *"Grass fed beef, cheddar,
  pickles. Swap the bun for lettuce"* is the identical sentence shape on a dish
  that really does arrive in a bun — one row IS the swap, the other OFFERS it,
  and no grammar tells them apart. So a **mirror condition** is required before
  anything is cancelled: the same food must be named on the far side of the
  pivot. The destination then decides, which means *"…for a **milk bun**"* keeps
  both its wheat and its dairy, *"Switch **to** a brioche bun"* is never touched
  at all, and *"…for **lettuce**"* cancels nothing. 🔑 The invariant: a tag can
  only be lost here where the venue printed a free-from claim about the
  **destination** — so this reaches no further than ADR 0097's hedge does.

  📊 **Measured, not reasoned.** Corpus swept for 14 substitution forms across
  57 records / 5,844 strings: 37 strings carry one, and **exactly one** is a
  substitution reaching an allergen word. With every tag in the corpus
  **cleared**, the old rules make 3,213 findings and the new rules make 3,212 —
  one lost (this row), **none gained, none else lost**. Dry run 1 → 0
  proposals; `validate.py` **75 → 74 warnings**; **no file under `site/`
  changed**, so no version bump. `test_tag_allergens.py` 81 → **90** cases,
  including six breakers — the guard off, the mirror removed, the span run on,
  `substitute` admitted, the word cap lifted, `switch` dropped. Reverting the
  narrowing fails the three new cases **and nothing else** (verified by running
  the whole suite with it reverted). `--swaps` prints every substitution phrase
  in the corpus and which the guard refuses, so the verb list cannot go silent.
  🚩 One probe was wrong on first write — it kept its gluten from the word
  *Buns* in its own first clause, so the word-cap breaker passed with the bug
  back. Caught by the breaker, reworded, recorded in ADR 0116.

  §1 (`slices?` reaching *Slice of Heaven*) and §2 (the Soft Serve Cone's
  wafer) are **untouched and still owed** — the item stays open on those two.
