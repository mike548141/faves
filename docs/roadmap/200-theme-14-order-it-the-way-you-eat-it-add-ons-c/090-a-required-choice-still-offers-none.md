- [ ] 🔎 **A required choice still offers "None"** `[S][js][schema]` — found
  2026-10-02 (`faves-77`) reviewing 14b batch two at 390 px.

  Every pick-one add-on group renders a **None** radio, checked by default
  (`addons-ui.js`, deliberately: a radio cannot be cleared, so an optional
  extra like "Add gravy $3" needs a way back out). But many converted rows
  are not optional: Satay Kingdom's Stir Fry Vegetables is "with choice of
  sweet & sour sauce, satay sauce or chef special sauce", and the picker
  offers None first. The order line then names no sauce, so the kitchen has
  to ask. (Not an allergen hole today: the dish's own chips still carry
  every option's allergens — PEANUTS shows on that dish whatever is picked.)

  Size groups already refuse None ("a plate always has a size", ADR 0130).
  The gap is that a group has no way to say *required* — the min/max
  (ADR 0048) express a cap, not an obligation.
  **Options, none chosen:** (a) a `required` flag on a group, set where the
  menu says "choice of"/"choose", rendering no None and blocking Add until
  chosen; (b) treat every `select: one` group with no `price` as required,
  which would wrongly force optional free extras; (c) leave it.
  Any of these is a schema change and wants an ADR; `addon_check` must
  assert both the required and the optional shape.
