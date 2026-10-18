# 0168 — A swap names what it replaces, and removes nothing

**Status:** accepted
**Date:** 2026-10-18
**Follows:**
[0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) (composition:
allergens union IN, claims intersect) ·
[0126](0126-an-add-on-option-has-an-id-and-its-name-is-not-it.md) (the
line is keyed on the option id, not its name) ·
[0130](0130-a-group-that-selects-a-variant-is-not-an-add-on.md) (`selects`:
which plate, not an extra) · **Roadmap:** `200/160` part 1, Theme 14's
consequence *"A substitution is not an addition"*

## Context

A swap is built today as a `+$` add-on that never names the thing it takes the
place of: Sprig & Fern's `nga-bun` and `swap-curly-fries`, Hotel Bristol's
`no-gluten-added-bun`, GroundUp's and The Victoria's milks, Tawa's `gf-toast`.
The order line reads "Cheeseburger + No gluten added bun" and the kitchen has to
infer "instead of the milk bun". The survey (`200/100`) measured it as common.

The item also names a safety half: composition unions allergens IN, a swap takes
a component OUT, so a swap modelled as an add-on can only over-warn, and one
modelled as removal can under-warn if the removal is trusted when it should not
be. **Only the words are decided here.** Whether a swap may drop the replaced
component's allergen or claim is the owner's call and has not been made.

## Decision

1. **One optional field, `replaces`, on a pick-one `adds` group.** A noun phrase
   in the menu's own words ("milk bun"). The app supplies the frame: the picker
   says "No gluten added bun, instead of the milk bun" and the order line reads
   "No gluten added bun (instead of the milk bun)". Leaving it out changes nothing,
   byte for byte. A group's options are alternatives to the same thing, so it
   sits on the group; a group mixing swaps and extras is two groups.
2. **It is words only.** `composeTags` does not read it: a swap still unions its
   allergens into the dish and drops no `contains-*` tag and no warning.
   `tests/swap.test.js` fails if choosing a swap changes the composed tags, the
   `added`/`dropped` account or any warning sentence, and walks every shipped swap
   in the corpus. Break-probed by making `composeTags` drop `contains-gluten`
   when a swap is chosen (4 tests fail) and by letting a swap keep a claim it
   should lose (2 fail).
3. **The menu must say it.** validate.py requires every dish that offers a
   `replaces` group to state the phrase in its own `desc` or its section `note`
   (case-insensitive). The words are shown to people about a venue's food, so
   they come from the venue, never from us. It is an error, not a warning: where
   a group is shared by dishes that say different things, the field is left out.
   It is an error on a `selects` group (a variant takes the place of nothing) and
   on a pick-many group, and the phrase must not start with an article or
   "instead" (the app would print it twice).
4. **The line carries it in the option `name`** (`lineName`, in `lineOptions`).
   `{ group, id, name, price }` is the four-field shape the share codec, the
   backup whitelist, saved orders and collect mode already carry and render, so
   no table changes and none can shed a new field. The line stays keyed on the
   option id, so the wording cannot split or merge a line; a line saved before
   this keeps its plain name and is re-worded when recalled from the live menu.

## Rejected

- **A fifth field on the line option.** Correct in principle, but it must be added
  to the codec's tuple, the backup whitelist, saved orders and the sheet, and a
  missed table silently sheds it (the whitelist trap this repo has hit before).
- **Resolving the words at render from the venue's data.** A shared order is read
  by a phone that may hold neither the venue nor the same version of it.
- **A per-option `replaces`.** One thing is swapped; stating it per option invites
  options in one group that disagree.
- **Removing the replaced component's allergen** ("oat instead of milk is not
  dairy"). The under-warning direction; owner's decision, not made.

## Consequences

- Four groups ship it, each where the menu's own words say it (see `200/160`).
  GroundUp's and The Victoria's milk groups, Tawa's `nga-bun` (shared with a dish
  whose menu does not state the bun) and Thorndon's `nga-base` do not, because the
  menu does not say; the validator would refuse them.
- A stored line reads its wording as written at the time; a venue editing
  `replaces` later does not reword saved lines until they are recalled.
- Prose swaps ("GF on request +$1") are untouched: converting them to groups is a
  later change.
