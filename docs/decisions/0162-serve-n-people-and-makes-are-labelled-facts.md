# 0162 — "Serve N people" and "Makes" are labelled facts, not new machinery

**Status:** accepted
**Date:** 2026-10-18
**Applies** the owner's 2026-08-16 ruling *"`serves` vs yield → SHOW BOTH,
LABELLED"* (roadmap `460/010`) and finishes `250/010` (17a). **Builds on**
[0076](0076-a-quantity-is-scaled-only-if-it-can-be-written-back-unchanged.md)
(the scaler) and **leaves untouched**
[0135](0135-an-estimated-recipe-stat-is-shown-unmarked.md) (the stats panel
shows an estimated figure unmarked).

## Context

17a had two halves left, neither needing an owner answer: show what a recipe
*makes* beside how many it *serves*, and let a reader say "serve N people".
Measured 2026-10-18 at `origin/main`: `cook-at-home.json` already carries `serves`
on 18 of its 20 recipes (the panel and the list row render it, ADRs 0125/0135/
0141), and `data/estimates/recipes.json` records `yield` for eight: **four stated
in the recipe's own words** (hotcakes, Liège waffles, queen cakes, Turkish flatbread),
one stated by the publisher's structured data (the lava cakes, left for the owner
to say whether it ships), and three estimated. Yield and serves are different
facts: 12 waffles serve 12 only because the working says one a person; 21 queen
cakes serve about 10.

## Decision

**1. `yield` ships on the four stated ones only, as a string, and renders as a
"Makes" cell.** Free text in the recipe's words ("12 waffles") because a yield
is a count and a thing, and nothing parses it. Only a *stated* yield may ship:
`estimated` in the payload can name just the four estimable stats, so the page
has no way to label an estimated yield, and unlabelled estimates are what
[0064](0064-an-estimate-carries-its-working-and-never-a-timer.md) forbids.
`recipe_estimates.py --check` now fails a shipped yield that differs from the
record or whose record source is not `stated` (it caught `1 flatbread` against
the record's `1 large flatbread` on its first run). The three estimated yields
("about 24 pieces") stay in the record. The working (`servesWorking`) does not
ship: 0047 asks for a screen that renders it, and 0135 advice 3 (a tap tip) is
the owner's to pick up, not a session's to build.

**2. "Makes" is the last cell of the stats panel and spans its width.** A fifth
short cell would orphan in both the 2×2 and the four-across grid. A sentence-sized
cell on its own row keeps both shapes and still sits in the panel, labelled.

**3. The people picker moves the same scale the multiplier buttons move.** A
stepper, `Serve [−] N [+] people`, shown above the ½×/1×/2×/3× row only when
the recipe states a whole `serves` and has a line that can scale. N people from a
recipe for S is the scale N/S. Presets keep their own keys (4 → 8 is `double`, so
the 2× button lights); any other fraction is the key `x3/2`, which `scaleFor`
resolves for the page, **cook mode and the shopping list alike** — they already
pass the key around, so none of them needed a new path (the 2026-08-17 lesson:
a value chosen on one screen and read on another). Range is a quarter to four
times the recipe; beyond it the scaler would refuse most lines.

**4. Because the page rebuilds itself on every change**, two things are explicit:
focus returns to the control that was pressed (a keyboard reader pressing + five
times must not land on `<body>`; the end stops use `aria-disabled`, not
`disabled`, for the same reason), and the change is announced from a status
region on `<body>` that outlives the rebuild.

Whether the controls are offered at all is decided at a fixed reference scale
(2x), never at the scale on screen: at 13 people from a recipe for 12 no line can
scale, and a picker offered only while something moved vanished on the very press
that took the reader there (found by the first screenshot; `recipe_check` now
walks to such a count and back).

**5. The picker says "about" where its base is our estimate.** The line under it
reads *Written for about 4 people* when `serves` is in `estimated`, and *Written
for 6 people* when the recipe states it. This is a new surface, so 0135's
unmarked panel does not reach it, and the scaling is only as good as the number it
starts from. The panel itself stays unmarked, exactly as ruled.

**6. Between two whole people the readout is "4–5", and a yield is "as written".**
A recipe for 9 at ½× is 4½ people: the panel used to fall back to the unscaled 9,
which is wrong. A yield is prose the scaler cannot restate ("10–15 hotcakes"), so
at any scale but 1× it is kept and marked *as written*, the word an unscalable
ingredient line already carries.

## Rejected

- **Replace the multiplier buttons with the stepper.** Fewer controls, but "double
  it" is a complete thought on the recipes with no count (BBQ Prawns and Caramel
  Banana carry no `serves`, deliberately) and the buttons are what `recipe_check` and
  cook mode were built on.
- **Scale the yield too.** `scaleLine` would give "42 cakes" and "2 large
  flatbread", and refuses "10–15 hotcakes": three behaviours on one cell, one of
  them ungrammatical. Showing it as written, marked, is the honest minimum.
- **Ship `servesWorking` as a tap tip.** It is ~100–200 characters on 19 recipes
  with no ruled screen (0047), and it is the option 0135 reserved for the owner.
- **Any N from 1 to 99.** Most lines would be marked *as written*, which is
  truthful and useless.

## Consequences

- `site/data/` gains `yield` on four recipes; `validate.py` checks it is a short
  non-empty string (three mutation cases). `ARCHITECTURE.md` carries the field.
- Te reo labels for *Makes*, *Serve*, *people* are owed with the rest of the
  panel (0125).
- A personal recipe with a `yield` shows it like a published one (it passes the
  sanitiser untouched); the recipe editor does not offer the field.
