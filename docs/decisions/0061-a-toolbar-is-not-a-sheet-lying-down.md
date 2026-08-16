# ADR 0061 — A toolbar is not a sheet lying down

- **Status:** Accepted
- **Date:** 2026-08-16
- **Supersedes:** nothing. Extends [ADR 0014](0014-pick-along-a-route.md)
  and the desktop half of Theme 15x.

## Context

Theme 15x put the home screen's filter controls on the page at wide widths by
**moving** `#filter-controls` out of the closed `<dialog>` and into `<main>` —
one element, two homes, never a duplicate. That mechanism was right and is
untouched here.

What was wrong was everything the moved element then looked like. It arrived
inline still wearing the sheet's clothes: a group heading over each half, a
sentence of explanatory prose, a label stacked above every select, and
"Clear all" on a line of its own.

Measured in real headless Chrome, 2026-08-16, before any change:

| | Phone (390 × 844, sheet) | Desktop (960 × 800, inline) |
|---|---|---|
| Chrome above the first result card | 212 px — **25.1%** | 511 px — **63.9%** |
| Filter panel height | n/a (behind a button) | **284 px** |
| Visual bands of controls | n/a | **5** |
| Height of the "Open now" chip beside it | 44 px | 44 px |

The desktop build was **two and a half times worse** than the phone the sheet
existed to rescue, and 6.5× the height of the control sitting inside it. The
owner's verdict was *"truly horrible UI, it wastes a ton of screen space, it
makes no sense i.e. not intuitive"*, and his brief was specific: two visible
groups — filters and sorting — in **one row, roughly the height of the "Open
now" button**.

## Decision

**A sheet and a toolbar are opposite shapes, and the shared element renders as
whichever one it is currently inside.**

A sheet has vertical room and no surrounding context, so it labels everything.
A toolbar has horizontal room only, and its controls must name themselves. So
under `body.filters-inline`:

- every `<label>`, the "Narrow to" heading and the sort note go **visually
  hidden** — not removed. They still name their controls and their landmarks
  for assistive technology, which is precisely why they can go: the select
  already reads "All areas".
- the one surviving piece of text is **"Sort by"**, beside a vertical rule.
  Two groups, one word, one line — the owner's "two clear groups" for 63 px
  instead of the 153 px two headings cost.
- **Service becomes a `<select>`.** It is a pick-one-of-three exactly like Area
  and Cuisine, and as a segmented control it cost **256 px of a 928 px row** to
  say so in a different shape — the single largest reason one row was
  impossible. Three identical controls also answer the "not intuitive" half of
  the complaint directly.
- **"Near me" and "Along a route" become one "Sort by" `<select>`.** They were
  `aria-pressed` buttons, which is the markup for two independent switches.
  `app.js`'s own comment has said the opposite since they were written — *"the
  two buttons are mutually exclusive sort modes"*. A select is what a one-of-N
  choice is, it is the universal convention for a sort control, and it names
  the third state ("Our usual order") that previously existed only as *neither
  button pressed* and could only be reached by pressing the pressed one.

Result: **67 px, one band, at every width from 960 px up.** No capability was
removed and no filter was dropped.

## Consequences

- The phone sheet changes too, because there is only ever one copy of these
  controls. It gets **shorter** (two controls fewer) and no worse: iOS renders
  `<select>` as a native wheel picker, which Area and Cuisine already relied on.
- `.segmented` is now dead CSS and was deleted (1,099 characters). Nothing else
  in `site/` used it.
- The destination picker for "Along a route" does not fit a row measured for
  three controls. `app.js` sets `#filter-controls.routing` at the same moment it
  unhides the bar; the sort group then goes full width and drops below. **A
  class, not `:has()`** — this row's other layout decision (the breakpoint)
  already lives in JS, and two mechanisms deciding one box is how they come to
  disagree.
- `filters-ui.js` no longer decides whether the sort group is visible. Whether
  it can exist at all is a browser-capability question and only `wireLocation`
  tests it, so `wireLocation` unhides it, once.

## What this cost to get right, recorded because none of it was predictable

Three defects were found by measuring, and all three passed every rule they were
written against:

1. **Flex wrap breaks on flex-*basis*, not on shrunk width.** Turning on
   `flex-wrap: wrap` so the destination bar could take a second line put the
   resting row straight back to 121 px. The row only fits because the selects
   shrink *below* their basis, and a wrapping line never gets that far. Wrap is
   now scoped to `.routing` alone.
2. **A select squeezed to 107 px renders "All cuisi…".** The first cut satisfied
   every width constraint and was unreadable. The floor is now 6.5rem and the
   inline select padding is tighter than the sheet's, both derived from the
   measured 928 px budget rather than chosen.
3. **The destination bar rendered *on top of* three other controls.** All three
   remained visible, non-zero-sized and present in the DOM. Only
   `elementFromPoint` saw it.

All three are now asserted in `tools/filter_row_check.mjs`, and **each was
proved by reintroducing the defect and watching the new assertion fail** — the
routing overlap needed the *exact* original CSS to reproduce, because a
half-reverted version failed only the cheaper of its two assertions and would
have shipped one decorative check.

## Rejected

- **Two rows, one per group.** Honest to the taxonomy and the obvious reading of
  the sheet's structure. Rejected: the brief was a number, and it was one row.
- **Letting the row break out of the 60rem content column.** Would buy ~290 px
  at a 1280 px viewport and remove every width constraint above. Rejected: the
  row would no longer align with the cards it filters, and the extra width is
  only there on large screens — the 960 px case, which is the tight one, gains
  nothing.
- **Dropping the Service filter entirely.** Theme 15c measured it returning
  **38 of 47 places for "Takeaway" (81%)** and **37 of 47 for "Dine-in" (79%)** —
  it barely filters, and the same argument already won when "Dine-in, Takeaway"
  was dropped from every card. It would free 160 px and simplify the row further.
  **Not taken here: removing a filter is a product decision, not a layout one.**
  Put to the owner as an open question rather than resolved quietly.
- **Collapsing the sort controls behind a popover.** Saves the same width as the
  select and preserves the button wiring exactly. Rejected: it hides a group the
  owner explicitly asked to keep visible, and adds a click to a primary action.
- **Rewriting `input.placeholder`-style, i.e. keeping the toggles and shrinking
  the labels.** "Everywhere | Takeaway | Dine-in" is ~180 px of text before any
  chrome. There is no styling that makes three words fit where one select goes.
