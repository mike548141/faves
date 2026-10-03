- [ ] **A swap is not an extra: name what it replaces** `[M][schema][safety]` —
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
