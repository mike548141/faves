# 0142 — The footer is on every page and carries About and Suggestions

**Status:** accepted
**Date:** 2026-09-29
**Amends:** [0028](0028-report-compose-and-share.md)
entry point 3 — the app-wide report door moves from the ⋯ menu to the footer
and is titled "Suggestions". Entry points 1 and 2 (the dish ⚑ and the venue
card's "Something wrong here?") are untouched.

## Decision (the owner's ruling)

1. **About leaves the ⋯ menu.** The home screen's footer, with its "About &
   privacy" link, is now on every restaurant page and recipe page too. It is not
   shown in cook mode.
2. **"Suggest or report" leaves the ⋯ menu**, is re-titled **"Suggestions"**,
   and sits in the footer beside "About & privacy". The dialog it opens carries
   the same title.
3. **In the ⋯ menu, "Share this app" sits above "Settings".**

## How

- The menu and recipe shells carry the footer **outside `<main>`**, because
  `menu.js` and `recipe.js` replace main's children on every render. They carry
  only the link row; the no-JS privacy paragraph stays home's, since those pages
  cannot render without JS.
- The floating-control runway moves from `main` to that footer on those pages.
- **Cook mode needs no code.** It exists only as a full-viewport modal
  `<dialog>` with an opaque backdrop (`cook-ui.js` returns no Start button where
  `showModal` is missing). Measured at 390 px: both footer links are under the
  sheet, and the page behind it is inert.
- **Home, with an order, covered the About link — before this change as well.**
  The Order pill is a child of `<body>`, floating a row above the bar, and
  `main`'s runway reserved only the bar. At the foot of the page it sat over
  2 of 3 probe points of "About & privacy" on the old footer, and all 3 once
  Suggestions pushed the link left. `main` now reserves the pill's row too
  whenever the pill is shown. (The CSS above `.filter-bar .order-fab` describes
  the pill as living IN the bar; on the page as measured it does not. That
  mismatch is not resolved here.)
- `nav.about` and `nav.report` are gone from `reo.js`; `footer.suggest` reuses
  the dialog's own draft title (`report.titleApp`, "Tukua mai he kōrero").

## Verification

`boot_check` asserts, on home, a menu and a recipe: the ⋯ menu has Share above
Settings and no About or Suggest item, and the footer shows exactly "About &
privacy" and "Suggestions", each unhidden and at least 44 px tall. It opens
About from the footer link. Break-probe: the previous `restaurant.html` fails
the menu screen's check and nothing else.
