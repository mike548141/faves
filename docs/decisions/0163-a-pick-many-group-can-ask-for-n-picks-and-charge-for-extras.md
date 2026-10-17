# 0163 — A pick-many group can ask for N picks and charge for extras

**Status:** accepted
**Date:** 2026-10-18
**Follows:**
[0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) (the group, `max`,
the cap) ·
[0156](0156-a-required-choice-has-no-none-and-add-waits.md) (a required choice,
and Add waits; §2 left a pick-many minimum for "a separate, additive field") ·
[0158](0158-an-unfinished-dish-is-flagged-on-the-sheet-and-finished-there.md)
(an unfinished line is flagged on the sheet and finished there) ·
[0159](0159-a-must-see-choice-opens-when-you-press-add.md) (`mustSee`) ·
[0096](0096-a-tag-with-no-reader-facing-branch-is-not-a-chip.md) (the picker's
wording is in words, never colour alone) · **Roadmap:** `200/140`, owner-ruled
2026-10-03

## Context

The owner ruled (2026-10-03): *"Some addons might have a list of things and the
user may be forced to select a certain number of them, like the sauces on a
kebab or iskender. The number range may change between dishes for example kebabs
are often "not more than 3" i.e. 0-3 are fine, after that is disallowed. Some
allow more but charge an additional fee."* And the boundary, the same day: *"Some
addons are purely optional and what we have today is perfect for those."*

`max` (0048) already says "not more than 3". Two things could not be said, both
measured by the configuration survey (`200/100`):

- **A required count.** Charley Noble's `cheese-two` is named "Choose two" but
  carries only `max: 2`, so the picker let you add a Cheese Selection (Two) with
  no cheese, or one. Other cases the survey saw, none of them structured yet:
  GroundUp's "Choice of 3 fillings", Pizza Hut's "Choose 3 … & 2 Sides", Sushi
  Bi's "11 nigiri of your choice".
- **An allowance, then a fee per extra.** Charley Noble's grill ("choice of sauce
  … additional sauce or butter $4"), Hell Pizza's wing dips ("one or two dips,
  additional dip $1.50"). Both are still prose.

## Decision

Three optional fields on a **pick-many `adds` group**. Leaving all three out is
every group written before this record, and changes nothing byte for byte.

| Field | Meaning |
|---|---|
| `min` | The fewest picks the reader must make. Integer ≥ 1. **Exactly N is `min == max`.** |
| `included` | How many picks are covered before a fee applies. Integer ≥ 1, below the group's cap. |
| `extraPrice` | The fee for each pick beyond `included`. Number > 0. |

1. **A minimum is an obligation, and it reuses the one mechanism for obligations.**
   `addons.js` gains `owed(group, selection)`: how many more picks a group still
   needs (1 for an unanswered required pick-one group; `min − chosen` for a
   pick-many group short of its minimum). `missingRequired` is now "the groups
   that owe anything", so the picker's gate (0156), the row's own Add, a recalled
   saved order (0158 §9) and the order sheet's "Needs a choice" flag all answer the
   same question from the same function, with no parallel path. `required` stays a
   pick-one word; a pick-many group says `min`.
2. **In the picker:** the legend reads "Required — choose 2" (exactly), "Required —
   choose 1 to 3" (a range) or "Required — choose at least 1" (no cap). Add waits,
   `aria-disabled`, its label ending "choose 2 under “Choose two” first"; the
   visible line says "To add this, choose 2 under “Choose two”." (or "1 more"
   once started); the "Choice needed" chip shows. Unticking back under the
   minimum puts the gate back. The cap refusal ("choose up to 2.") is unchanged.
3. **On the order sheet:** a stored line short of a minimum is flagged "Needs a
   choice: Choose two" and finished there (0158), with checkboxes instead of
   radios, the options it already holds not offered twice, "Required — choose 1
   more", and no more than the cap allows. A recalled saved order lands such a
   line unfinished, as it does a missing required choice.
4. **The fee belongs to the group, not to an option.** `configuredPrice(base,
   selection, groups)` adds `extraPrice` for each pick beyond `included`; the
   third argument is optional, so every caller that omits it prices as before. The
   fee rides in the order line's `price` (which every consumer already totals);
   the options on the line keep their own prices. The picker says it in words as it
   starts to apply: legend "Choose up to 3 · 1 included, then $4.00 each", and
   once an extra is ticked "1 extra at $4.00 each: +$4.00 on this dish." The sheet
   prices a line it is finishing by the choice plus the fee that choice starts,
   and its "short by" range includes that fee.
5. **An allowance needs free options.** `included` over options that carry their
   own prices would not say *which* picks are the included ones, so `validate.py`
   refuses it unless every option resolves to a price of 0. Not a loss: the survey's
   real cases (sauces, dips, cheeses) are free.
6. **`selectionAllowed` is unchanged.** It is the upper bound ("may this be held?");
   a selection under its minimum is legal to hold while the reader is still
   choosing. The minimum is the *finished* question, `owed`.

### What `validate.py` refuses, each because a field that does nothing is a field a transcriber believes is doing something (0156, 0159)

`min: 0` (a second spelling of absent) · `min` above `max`, or above the option
count when uncapped · any of the three on a pick-one or a `selects` group ·
`mustSee` beside a `min` (Add already waits) · `included` without `extraPrice` or
the reverse · `included` below 1 or not below the cap (no pick could be charged) ·
`extraPrice` of 0 or less (a free extra is no rule) · an allowance over priced
options.

### What the shape does and does not cover

- ✅ **Charley Noble `cheese-two` ("Choose two"):** `min: 2, max: 2`.
- ✅ **Wellington Kebab Grill sauces ("choose up to 3"):** already `max: 3`; unchanged.
- ✅ **Kids' pizza at $2 per topping (Sprig & Fern Tawa):** already expressible as
  `price: 2` on the options; no allowance, so no new field.
- ✅ **Gong Cha's per-drink caps:** already one group per cap
  (`toppings-classic-1/2/3`), each with its own `max`. The shape covers a cap that
  differs per drink without a new field, and nothing is changed.
- ✅ **Gong Cha's two price tiers ($1.00 / $1.30):** option prices inside one group,
  already expressible.
- ⚠️ **Charley Noble's grill sauce or butter ("additional $4") and Hell Pizza's
  dips ("1 or 2 included, extra $1.50"):** the *shape* covers them
  (`min: 1, included: 1, extraPrice: 4`; `included: 1, extraPrice: 1.5`), but
  neither is a structured group today. The grill's sauces live in a section note;
  Hell's wing dips are not listed as options anywhere, and "Additional Dip" is
  already its own $1.50 dish. Building those groups is the content sweep's work
  (`200/010`) and needs the option lists, their allergens and the owner's call on
  the duplicate dish. **No data was invented for them.**
- 🛑 **Not covered, and left out on purpose:** Hell Pizza's build-your-own counts
  ("up to 8 toppings … plus 1 meat, 1 vegetable and 1 sauce") are *counts per
  category inside one build*, which needs sub-groups with a shared total. That is a
  different structure (a group of groups), the survey saw it once, and building it
  for one venue would be building ahead of the evidence. It stays in prose.
- 🛑 **Not covered:** a different cap *per option* inside one list (Gong Cha is
  already solved with one group per cap), and a fee that depends on *which* option
  is the extra one (priced options already do that; they just cannot also have an
  allowance, §5).

## Data applied

One group: Charley Noble `cheese-two` gains `min: 2`. Its name is the venue's
own "Choose two", the dish is "Cheese Selection (Two)", and its sibling "Cheese
Selection (One)" is a required pick-one. Nothing else in the corpus states a count
in a structured group.

## Rejected

- **Overload `required` on a pick-many group to mean "at least one".** ADR 0156 §2
  refused exactly this, so a later real minimum would not have to contradict it.
- **`exactly: N`** as a fourth field. `min == max` already says it, and a fourth
  spelling is one more thing for `validate.py` to cross-check.
- **A fee on an option (`extraPrice` per option).** The survey's cases charge by
  *count*, not by which sauce.
- **Attributing the fee to the Nth option's `price` on the order line.** Unticking
  an earlier option would move which pick "is" the extra one and re-key stored
  lines; the fee is the group's, so it lives in the line's total.
- **A second gate for a minimum.** The point of §1.

## Consequences

- `tests/pick-counts.test.js` (20 cases) holds the pure rules, each positive case
  paired with the unchanged-group control; `tools/test_validate.py` has 20 cases for
  the validator, five of them legal shapes so a gate that refused everything cannot
  pass.
- `tools/addon_check.mjs` block (ac) drives, at 390 px, the real Charley Noble
  minimum (blocked, 1 more, lifted, refused third, gate returns on untick, line
  priced), a stored line short of a minimum finished on the sheet, the fee on a
  fixture (nothing within the allowance, the note and the price beyond it) and the
  unchanged kebab group as the control.
- The share codec and the saved-order store are not touched: a line stores its
  total price and its options, as ever.
