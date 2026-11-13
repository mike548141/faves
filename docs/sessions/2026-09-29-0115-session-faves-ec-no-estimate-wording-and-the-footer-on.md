## 2026-09-29-0115 — session `faves-ec`: no estimate wording, and the footer on every page

- **Asked:** find every place Faves tells a reader a figure is inferred or
  estimated. Eight places found. The owner then ruled on four of them and on
  the app chrome.
- **`9197e49` (ADR 0141):** the menu header spend line, the home price chip
  (text, tip and label) and the order sheet ("Estimated total" → "Total", its
  "confirm at the till" caption kept by name) carry no estimate wording. The
  Cook at Home row reads "Serves ~4 · ~45 min". The "~" is `aria-hidden`
  beside a visually hidden "about ", so a screen reader still says "about".
  About now says Faves is independent of every restaurant listed. Not ruled
  on and left alone: currency conversion, travel time and all allergen wording.
- **ADR 0142:** About and "Suggest or report" leave the ⋯ menu. The footer,
  with "About & privacy" and "Suggestions", is now on the menu and recipe
  pages too. Share this app sits above Settings. Cook mode's full-screen modal
  already covers the footer; checked at 390 px, not coded.
- 🔎 **Found while probing:** on home, with an order, the Order pill covered
  "About & privacy" at the foot of the page. It did on `main` before this
  change too (2 of 3 probe points). The pill is a child of `<body>`, but the
  CSS comment says it lives in the filter bar. Fixed the covering by reserving
  the pill's row; the comment-versus-DOM mismatch is recorded in ADR 0142 and
  not chased.
- **Verified:** `node --test` 1478/0. Browser checks, all green: boot 29,
  recipe 72, cook 84, to_top 80, device 30, picks 20, geo 22, filter_row 25,
  note 19, addon 87, sync 22, distance 19. The new checks in `boot_check` and
  `recipe_check` §10 were each break-probed against the previous file.
- **Addendum, same session:** board item `120/010` (`50aeef0`) captures the
  owner's nutrition brief. Faves is to provide full nutrition for dishes,
  recipes and servings, ideally pushed to Apple Health, else kept in the
  user's own data. The open questions are recorded there, not answered. The
  Apple Health route is marked unverified.
- **Addendum:** the Food preferences note in Settings now shows only for a
  selected preference: the Halal/Kosher half when either is on, and the
  Meatarian sentence when Meatarian is. The wording is unchanged. A new
  `device_check` assertion covers none, Meatarian, +Halal, Kosher alone and
  cleared; making the note always show fails it and nothing else.
- **Addendum:** `TAG_LIMIT` 3 → 2 (`c823c56`). At 2, the owner's "3 or more,
  fold the additional ones" folds a single chip, which 22e's "no '+1' control"
  had forbidden. That floor is now its own constant, `TAG_MIN_FOLD = 1`; set it
  to 2 to restore the old rule. Declared tags still never fold.
- **Addendum:** `fixture_check --selftest` was failing 9 of 22 on a clean
  main. validate.py now reads `site/js/dietary.js`, and the sandbox did not
  copy it. Fixed in `0f95b22`.
- **Addendum:** the ↑ and "Pick for us" sit outside the content column where
  the screen allows (`8c8d922`). At 1200 px with 16 px text the ↑ dodged 0 of
  80 positions on home. ⚠️ Its commit message says it was "dodging on most
  positions" before: that figure was not measured this session.
- **Addendum, board:** `110/070` (venue dishes record ingredients, never
  shown), `240/030` (one venue's update should not re-download all 57), and
  `120/010` widened to ingredients and micronutrients.

