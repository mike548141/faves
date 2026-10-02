# 0156 — A required choice has no None, and Add waits for it

**Status:** accepted
**Date:** 2026-10-03
**Follows:**
[0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) (add-on groups
and the cap) ·
[0126](0126-an-add-on-option-has-an-id-and-its-name-is-not-it.md) (the order
line keys on option ids) ·
[0130](0130-a-group-that-selects-a-variant-is-not-an-add-on.md) (a `selects`
group is always chosen) ·
[0133](0133-a-chosen-variant-prices-the-row-and-the-default-is-the-dish.md)
(the radio with no None)

## Context

Every pick-one add-on group rendered a **None** radio, checked, first
(`addons-ui.js`). That is right for an optional extra ("Add gravy $3"): a
radio cannot be cleared, so None is the way back out. It is wrong where the
menu makes the choice compulsory. Satay Kingdom's Stir Fry Vegetables comes
"with choice of sweet & sour sauce, satay sauce or chef special sauce"; the
picker offered None first and Add worked, so the order line named no sauce
and the kitchen had to ask. Found 2026-10-02 reviewing 14b batch two at
390 px.

It was not an allergen hole: the dish's own chips already carry every
option's allergens (peanuts shows on that dish whatever is picked). The gap is
that a group had no way to say *required*. `max` (0048) expresses a cap, not
an obligation, and ADR 0130's size groups avoid None only by pre-selecting a
default, which is a different thing: a size always exists, a sauce does not.

The owner ruled 2026-10-03, option (a) of three: a `required` flag on a group,
set only where the menu says "choice of" / "choose".

## Decision

1. **`"required": true` on an add-on group.** Absent means optional, as every
   existing group is. `false` is refused, not tolerated: it is a second
   spelling of absent, and a field a transcriber believes is doing something.
2. **Only on a pick-one `adds` group.** `validate.py` refuses it on a
   `selects` group (already always chosen, 0130) and on a pick-many group. A
   pick-many group would need a *minimum* ("choose at least 2"); nobody has
   asked for one, and reading `required` there as "at least one" would be a
   guess that a later, real minimum would have to contradict.
3. **In the picker:** a required group renders **no None** and **nothing
   pre-selected** (a default would be a choice the reader never made, on a
   dish whose allergens depend on it). Its legend reads "Required - choose
   one". Until every required group is answered, Add waits.
4. **How Add waits:** the button is drawn `aria-disabled="true"`, not
   `disabled`. It stays in the tab order, its accessible name ends
   "choose Sauce first", and a tap (or Enter) opens the picker and moves
   focus to the first unanswered group's first radio. The reason is also
   visible text beside the picker ("To add this, choose one under
   "Sauce".") and a "Choice needed" chip on the closed summary, so it is
   never colour alone and never hidden in a collapsed disclosure. The same
   `aria-disabled` pattern is already used by sync-ui. It replaces the -/+
   pair while gated, so a stored line from before the flag cannot grow.
5. **The row's own Add is gated too**, and once the choice is made it
   records the chosen option with the plate. Otherwise the picker would
   insist and the one-tap button beside the dish name would order it bare.
6. **A saved order** recalled against a venue that has since made a choice
   compulsory skips that line and says so (`saved-recall.js`), as it already
   does for a dish or option that has gone.

### What it does NOT do

- **It never changes an allergen warning or a tag.** Composition (0048) is
  untouched: a required option's allergens union and its claims intersect
  exactly as an optional one's do. Dish chips are unchanged.
- **It does not make anything a default.** Nothing is pre-selected.
- **It does not touch size groups** or any group whose menu wording does not
  make the choice compulsory. Where the wording was unclear the group was
  left optional.

## Consequences

- 33 groups across 19 venues carry `required: true` (the per-group list is in
  the roadmap item `200/090`). Each was set from the dish's own wording, read
  from the description or the pre-conversion text in git history.
- `tools/addon_check.mjs` asserts both shapes on real records: Satay
  Kingdom's required sauce (no None, nothing checked, both Adds
  aria-disabled with a reason, a blocked tap orders nothing and moves
  focus, choosing lifts the gate and the line carries the sauce, the row's
  Add carries it too) and Sprig + Fern Berhampore's optional swirl (None
  first, Add not blocked).
- `addon_check`'s older blocks run on Wellington Kebab Grill, whose
  kebab-style group is now required. They serve that record with the flag
  lifted so they keep testing sauces, caps, currency and saved orders; the
  flag itself is asserted on the two records above.
- A required group with a single option is legal but pointless; the data
  does not contain one.
- A future minimum on a pick-many group is a separate, additive field.
