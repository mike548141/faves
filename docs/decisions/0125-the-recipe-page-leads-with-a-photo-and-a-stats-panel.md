# 0125 — The recipe page leads with a photo and a stats panel, and the ingredients stand beside the method

**Status**: accepted
**Date**: 2026-09-27
**Applies** the estimates ruling of
[0064](0064-an-estimate-carries-its-working-and-never-a-timer.md) /
[0066](0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md) to
a new screen surface · **extends**
[0053](0053-a-photo-of-a-named-product-must-be-that-product.md)'s photo route
to a recipe · **keeps** 37d's two-column ingredient split between 45rem and
60rem

## Context

The owner added Whittaker's *Chocolate Lava Cakes* on 2026-09-27 and said of
its page: *"This recipe shows an ideal UI for recipes in my mind. Lets
replicate this including page layout, the photo, useful information like
prep time, cook time, the ingredients list vs method etc."*

Both pages were screenshotted at 390 px and 1280 px. The recipe *content* was
already at parity or ahead (ticks, scaler, cook mode, shopping list). What the
reference had and Faves lacked was structural:

| Whittaker's | Faves before |
|---|---|
| A photo, beside the title on a wide screen | No recipe had a photo |
| Prep · Cook · Difficulty in a panel | One line: `Serves 8 · ~82 min` |
| On a wide screen, a narrow ingredients column **beside** the method | Ingredients in two columns, method **below** |

Four questions were put to the owner with their costs. His rulings:

1. **Photo:** use the publisher's own image, credited. It is copyright
   material in a public repo, and history keeps it even if it is removed. The
   owner was told this before ruling.
2. **Stats:** Prep · Cook · Serves **and Difficulty**. Only one recipe states a
   difficulty, so for the other 24 it is our estimate, labelled as one.
3. **Layout:** yes, in Faves' own style, not a copy of Whittaker's typefaces
   and palette.
4. **Nut label:** tag it. This decision does not own that ruling; it is
   recorded in the session log and the data commit.

## Decision

**1. Hero, then body, and the DOM is the phone's reading order.** The hero is
photo → title → stats → description → credit → tags → Start cooking / shopping
list. The body is ingredients → method → goes-with. From 60rem, CSS grids lay
the photo beside the rest of the hero (2 : 3) and the ingredients beside the
method (1 : 2). Nothing is reordered, so a keyboard or screen-reader reader
meets things in the same order at every width. 60rem is the app's existing
wide breakpoint and the width where `.wrap` stops growing.

**2. Fractions, not a fixed sidebar width.** With a rem-width sidebar, a
large-text reader would get a crushed method column. A third of the column
scales with the text. In that third, 37d's `column-width: 16rem` split turns
itself off, because two 16rem columns do not fit. An explicit override was
written, break-probed, shown to change nothing, and deleted. `recipe_check`
asserts the outcome instead.

**3. Four payload fields, each named by the screen that renders it (ADR
0047).**
- `prepMinutes` and `cookMinutes` are integers, formatted by the page
  (`9 hr 30 min`). Nothing parses prose.
- `difficulty` is one of `very-easy · easy · medium · challenging`.
- `estimated` lists which of `serves`, `prepMinutes`, `cookMinutes` and
  `difficulty` are ours.

The panel prints **`est.` in words** beside each such value, with a key line
under the panel. This follows WCAG 1.4.1 and the 2026-08-16 estimates ruling:
estimate, but label it.

**4. Prep and cook follow Whittaker's semantics, and the working stays in the
record.**
- **Prep** is everything that is not the main heat stage, including chilling,
  rising and resting. This is how Whittaker's counts its 1-hour prep, which
  includes 30 minutes in the freezer.
- **Cook** is the main heat stage.
- Preheating an oven that warms while the mix is made is not added.

Each value and its reasoning live in `data/estimates/recipes.json` beside the
per-step estimates. `recipe_estimates.py --check` now fails when the payload
and the record disagree on a value or on whether it is estimated. It also
fails when a recipe the record can size ships with no `serves`. Round figures
(to 5 min) are used where the number is ours, so they do not claim more
precision than they have.

**5. Serves widens from 4 recipes to 23.** The record already sized them. On
the list screen an estimated serving count reads **"Serves about 4"**, so our
number is never shown bare on either screen.

**6. The photo leads and is not lazy-loaded.** It is above the fold, so
lazy-loading would only delay the paint it exists for. `width`/`height` are
set so the box holds its shape before the bytes arrive. Provenance and
removal steps are in `data/images/cook-at-home.json`, checked by
`check_records.py` like McDonald's.

## Consequences

- **`recipe_check` measures three widths, not two.** 37d's claims moved from
  1100 px to **900 px**, the band where 37d still governs. At 1100 px the
  ingredients now stand in a side column, so the old "ingredient and method
  ticks share a left edge" claim is asserted at 390 and 900 px only. Section 9
  adds nine assertions at 1280 and 390 px (39 → 48). Two were break-probed:
  flattening `.recipe-columns` fails only "the ingredients stand BESIDE the
  method", and dropping the `est.` span fails only the labelling assertion.
- **`time` no longer renders on the recipe page.** Prep and cook say it
  better. It still renders on the list, where the reader chooses what to
  cook. It is shown on the recipe page only as a fallback, when a recipe
  has no stats at all.
- 🚩 **Difficulty is the weakest number on the page.** It is one assistant's
  reading of the method: 24 estimates with a one-line working each. The owner
  chose it knowing that. If a rating reads wrong, correct it in the record;
  the gate carries the change to the payload check.
- **Te reo is owed.** The panel's labels are English only, with no `data-i18n`
  keys. The repo's rule is to check `maoridictionary.co.nz` rather than coin
  terms, and that has not been done for *prep*, *cook*, *serves* or
  *difficulty*.
- **Only one recipe has a photo.** The other 24 get the same layout without
  an image box. The owner's own photographs of his cooking are the obvious
  next source, and they go through the same `data/images/` record.
