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

  Item `210` removed its false `contains-gluten` and widened ADR 0097's
  hedge to cover *"gluten friendly"*. The hedge cancels the match in the
  **name**. It does not cancel the one in the **description**:

  > *"Switch the **wholemeal bun** for a gluten friendly bun. Not a
  > dedicated gluten free kitchen."*

  Those words are really there and a wholemeal bun really is wheat. What is
  false is that **this row contains it** — the row IS the swap, and the
  wholemeal bun is the thing being swapped *away*. That is a fact about
  **substitution**, and no word rule reaches it.

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
