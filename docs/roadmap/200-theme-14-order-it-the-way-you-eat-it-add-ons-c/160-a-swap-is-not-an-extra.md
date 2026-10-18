- [ ] 🎯 **A swap is not an extra: name what it replaces** `[M][schema][safety]` —
  the Theme 14 README's consequence *"A substitution is not an addition"*
  (2026-08-17) never became an item. `200/100`'s survey measured how much it
  matters ([the review](../../reviews/2026-10-03-0759-dish-configuration-survey.md)).

  **How swaps are built today:** as `+$` add-ons that never name the thing
  they replace. Examples are Sprig & Fern's `nga-bun`, `nga-base` and
  `swap-curly-fries`, Hotel Bristol's `no-gluten-added-bun`, GroundUp's and
  The Victoria's `milks`, and Sprig & Fern Tawa's `gf-toast`. The order line
  reads "Cheeseburger + No gluten added bun", and the kitchen has to infer
  "instead of the milk bun".

  **Still in prose, at many venues:** "GF on request +$1", "$40 with a
  gluten-free bun", "+$0.50 for coconut or oat milk", "Swap roti for veggie
  soup", BurgerFuel's "Bun swaps" section, and Thai Tara's "Meat choices"
  section.

  🛑 **The safety half is why this is more than wording.** Composition unions
  allergens *in*. A swap also takes a component *out*: oat for dairy milk
  removes the milk. So a swap modelled as an add-on can only ever over-warn.
  That is safe, but it is wrong. A swap modelled as removal plus addition can
  under-warn if the removal is trusted when it shouldn't be. Whoever builds
  this needs an ADR and break-probes for both directions.

  **Done (part 1, worker w/200-160, 2026-10-18; [ADR 0168](../../decisions/0168-a-swap-names-what-it-replaces-and-removes-nothing.md)).**
  A swap now NAMES what it replaces, on the picker ("No gluten added bun, instead
  of the milk bun") and on the order line ("No gluten added bun (instead of the
  milk bun)"). **Allergens are still unioned in, exactly as before: a swap removes
  no `contains-*` tag and weakens no warning. Trusting a removal is part 2 and is
  the owner's decision; nothing here decides it.**
  - **Shape.** One optional `replaces` on a pick-one `adds` group: a noun phrase in
    the menu's own words, with the app supplying "instead of the". Absent changes
    nothing byte for byte. validate.py refuses it on a `selects` or pick-many group,
    with a leading article or "instead", empty, or over 60 characters, and refuses
    any group whose dishes do not state the phrase in their own `desc` or section
    `note` (13 mutations in `test_validate.py`).
  - **Order line and tally.** The words ride in the line's option `name`
    (`lineName` in `lineOptions`). The share codec, backup whitelist, saved orders
    and collect mode already carry and render `name`, so none changed; the line is
    keyed on the option id, so the wording cannot split or merge a line. A line
    saved before this keeps its plain name and is re-worded when recalled.
  - **Data, with the menu's words.** Hotel Bristol `no-gluten-added-bun` replaces
    "milk bun" (all three burgers' own descriptions say "milk bun"); Sprig & Fern
    Thorndon `nga-bun` replaces "sesame bun" (the Burgers section note: "on a
    sesame bun with hot chips") and `swap-curly-fries` replaces "hot chips" (same
    note); Sprig & Fern Tawa `gf-toast` replaces "toasted sourdough" (Eggs on
    Toast: "Eggs your way on toasted sourdough").
  - **Left alone because the menu does not say what is replaced** (the validator
    would refuse each): GroundUp `milks` and The Victoria's `milk-options` (their
    drinks never state the milk; Victoria states "with milk" for one espresso
    only, on a group shared by the whole section); Sprig & Fern Tawa `nga-bun`
    (the Mains Cheeseburger says "seeded bun" but the Gold Card Cheeseburger, which
    shares the group, says nothing about its bun; splitting the group would strand
    saved lines, so it waits for an owner call or a per-dish form); Thorndon
    `nga-base` (the Pizza section never says what its base is). The survey's
    "The Victoria's `milks`" is `milk-options` in the data.
  - **Tests.** `tests/swap.test.js` (13): words, byte-identical when absent, line
    identity, share-codec round trip, recall; and the safety half. It fails if a
    swap changes the composed tags, `added`/`dropped`, any warning sentence or the
    `flagged` state, and walks every shipped swap against every dish that offers
    it. Break-probed: `composeTags` dropping `contains-gluten` when a swap is
    chosen failed 4; letting a swap keep a claim it should lose failed 2; the line
    ignoring `replaces` failed 2. `addon_check` block (ae) (6 assertions, 216
    total) drives the picker words, the stored line, the sheet line, a no-removal
    check on the dish's composed tags, and a control (Tawa's silent group); one
    combined break-probe (words removed, line unworded, gluten dropped) failed
    exactly the four non-control assertions.
  - **Left for part 2 / later.** Trusting a swap's removal to drop an allergen or
    claim; prose swaps ("GF on request +$1", BurgerFuel's "Bun swaps") are not
    converted to groups; a per-dish `replaces` for a group shared by dishes that
    say different things.

  📌 **Part 1 merged 2026-10-18 (faves-b4), PR #129** (ADR 0168,
  SHELL_VERSION 2026-10-18.7): four swaps name what they replace; allergens
  still union in, guarded by `tests/swap.test.js`. 🎯 **Open for the owner:**
  may a swap ever take an allergen *out* (oat milk removing dairy), which
  trades today's safe over-warning for an under-warning if the removal is
  trusted wrongly? Also left: GroundUp's and The Victoria's milks and
  Thorndon's pizza base (the menus do not name what is replaced), Tawa's
  `nga-bun` (one of its two dishes is silent), and the prose swaps.

