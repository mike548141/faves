# 0133 — A chosen variant prices the row, and the default IS the dish

**Status:** accepted
**Date:** 2026-09-28
**Amends:** [0130](0130-a-group-that-selects-a-variant-is-not-an-add-on.md) §5
— the picker no longer withholds `selects` groups · **Builds on:**
[0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) (composition,
§4 line identity), [0126](0126-an-add-on-option-has-an-id-and-its-name-is-not-it.md)
(the line keys on option ids) · **Roadmap:** `310` 28m

## Context

ADR 0130 gave a dish a size ladder — a `selects` group whose options carry the
dish's WHOLE price as `dishPrice` — and withheld it from the picker until a
screen could draw it. This is that screen, and it has to answer four questions
0130 left to it: what the row's price says, what goes on the order line, what
an unlabelled variant is called, and how the choice travels through every table
that carries an order line.

## Decision

### 1. The control

A `selects` group renders in the same disclosure, as the same fieldset of radios
a pick-one sauce uses (Theme 14's ruling of 2026-08-17: the reader should not be
able to tell an upsize from a sauce by how it is chosen), with three
differences, each forced by 0130's shape:

- **The default is checked on open**, and there is **no "None"** — a plate
  always has a size.
- The legend says **"Choose one"**; there is never a "Choose up to N".
- Each option shows its **whole** price ("Large $19.50"), never a "+" surcharge.

It is offered **first** in the picker, whatever order the section and dish name
their groups in — which plate before what is on it — and the summary says so
("Size and extras") when there are extras too.

### 2. The row's price is the chosen variant's `dishPrice`

Never the dish's price plus it. `configuredPrice(base, selection)` in
`addons.js` puts the variant's `dishPrice` in place of the dish's price and adds
the add-ons' surcharges on top; a variant's selection entry carries `price: 0`
so `selectionPrice` still sums only the add-ons. The row's own ＋ Add follows the
choice, so it orders the plate whose price is printed beside it.

### 3. The DEFAULT variant is not written on the order line

`lineOptions(selection)` writes a non-default variant as an ordinary option —
`{ group, id, name, price: 0 }` — so Small and Large are two lines, keyed on the
variant's id (ADR 0126). The **default** is left off, because it IS the dish as
listed: validate.py holds the dish's `price` equal to the default's `dishPrice`,
and the row prints it before anything is tapped. So "Eggs on Toast" ordered from
the row, "Eggs on Toast, Regular" ordered from the picker, and an "Eggs on Toast"
saved on a phone before the dish had a ladder are one line.

🚩 **This is a fork, and the other branch was real.** Recording the default on
the line (every variant keyed explicitly) would let the order sheet read
"Eggs on Toast with Regular". It was rejected because the day 28n gives a dish a
ladder, every line already saved for that dish would stop merging with the next
tap on it — two lines for one plate, the defect 28j names — and because the
roadmap asks that a line stored before this change still merge. The cost,
stated: the order sheet names a non-default size and says nothing for the
default, which it reads as the plain dish at the plain price.

A hazard that is NOT new, stated so nobody thinks it is: if a venue later moves
its default (Regular → Large), a saved plain line merges with the new default at
the price it was saved at. That is the same staleness every saved line already
has when a venue changes a price; the line is denormalised by design.

### 4. An unlabelled variant is named by its price and its group

ADR 0130 lets a variant be unlabelled (26 rows print two prices and never name
the second). A radio with no words cannot be chosen and a line with no name
cannot be read out at a counter — and the share codec and the backup whitelist
both drop an option with no name. So `variantLabel` names it by the one thing
the menu DID state, its price, followed by the group's own name in lower case:
**"$24 size"**. Nothing is invented — no "Large", no "Size 2". Two unlabelled
variants sharing a price (0130 permits it) are suffixed with their position,
"(2)", so they stay two things to a screen reader. The label is display text:
the line keys on the hand-written `id`, so a price change renames the label and
never re-keys the line.

### 5. Every table that carries a line: no new field

Because a variant on the line is shape-identical to an add-on option, every
table that already carries `{ group, id, name, price }` carries it unchanged:

| table | what it does with a variant | changed? |
|---|---|---|
| `cart.js` `lineKey` / `add` / `mergeItems` | keys on `selectionKey(options)` → group + option id | no |
| `share-codec.js` option tuple | `[group, name, 0, id]`; `CODEC_VERSION` untouched; an old decoder reads the right name and the configured unit price | no |
| `personal-data.js` backup whitelist | keeps `group`, `name`, `price`, `id` | no |
| `sync-merge.js` | the order is not synced (ADR 0012); carried through as-is | no |
| `cart-ui.js` order sheet / collect mode | "Eggs on Toast with Large"; the line price is the whole plate | no |

`tests/variants.test.js` walks each of them with a variant on the line.

### 6. Composition is untouched

A chosen variant's tags compose like any option's: allergens union, dietary
claims intersect (ADR 0048 §3, not amended). Because validate.py makes a variant
restate its dish's claims exactly (0130 §3), choosing one never produces a
residue sentence; choosing one that carries an allergen says so, and choosing
another takes it back off.

## Out of scope

- **Search.** Whether a variant's name should find its dish is an open owner
  question (ADR 0130's 28s table); `search.js` is unchanged.
- **Data.** No record in `site/data/` gains a `selects` group — that is 28n.
  Every fixture is synthetic: `tests/variants.test.js`, and an overlay record
  served by `tools/addon_check.mjs` (blocks n–r).

## Alternatives rejected

- **Record the default on the line** — §3's other branch.
- **Name an unlabelled variant "Size 2"** — an ordinal the menu never printed,
  and one that changes meaning if a rung is added.
- **A `variant` flag on the line option** so the order sheet could say "Large
  Eggs on Toast" — a fourth field that the backup whitelist and the share tuple
  would shed unless both were extended, for wording only.
