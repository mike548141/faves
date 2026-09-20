# 0121 — Heat is ONE vocabulary, and the picker is a screen that renders it

**Status**: accepted
**Date**: 2026-09-21
**Answers** roadmap
[`200/080`](../roadmap/200-theme-14-order-it-the-way-you-eat-it-add-ons-c/080-a-spicy-tag-on-an-add-on-option-renders-nothing.md)
(owner ruled option 1, 2026-09-21) · **applies**
[0047](0047-the-app-ships-only-what-it-renders.md) in the direction its Context
always allowed and its summary did not · **narrows nothing in**
[0096](0096-a-tag-with-no-reader-facing-branch-is-not-a-chip.md), which is why
the option row carries heat and nothing else

## Context

`validate.py`'s `TAGS` admits `spicy-1`, `spicy-2` and `spicy-3` on an add-on
option, and two options in the corpus carry one: Wellington Kebab Grill's
**Mild chilli** (`spicy-1`) and **Hot chilli** (`spicy-2`), side by side in one
sauce group. Measured 2026-09-21 over all 57 records — 200 add-on options, of
which exactly those 2 are tagged for heat.

🛑 **The item's own statement of the defect is broader than the defect, and
aiming at it would have aimed at nothing.** It says a heat tag on an option
"validates, ships, and is never shown". Driven in headless Chrome, that is not
true: since roadmap `200/060` wired the dish's chip row to the composed tags,
ticking Hot chilli paints "🌶🌶 Spicy" on the dish row like any other composed
tag. What rendered nothing was **the picker**, in the only moment heat is any
use — *while you are choosing*. The two sauces were drawn identically, so the
way to find out which was which was to tick one, and ticking is how you order it.

The words already existed twice: `const isSpicy = (t) => /^spicy-[123]$/` and
`${"🌶".repeat(level)} Spicy`, typed out in **menu.js** and again in
**recipe.js**. One rule, two implementations, both locally correct — the shape
this repo has been bitten by before, where the update lands in one copy and
reads correct in every diff. A third copy in `addons-ui.js` was the cheapest
change available and the wrong one.

`tests/tag-labels.test.js` carried the gap as an **exemption**, with its reason
written down: *"heat is not part of the picker — no add-on contradiction and no
allergy/diet preference names a spicy level, so nothing here has words for
one."* Every clause of that was true and the conclusion was wrong. Once the
owner ruled, the exemption would have become [0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)'s
decorative guard: output identical whether or not the thing it guards is broken.

## Decision

1. **One vocabulary — `site/js/heat.js`** — exporting `isSpicy`, `heatLevel`
   and `heatLabel`. `menu.js`, `recipe.js` and `addons-ui.js` import it and none
   of them owns the scale. A fourth level means editing `TAGS` and this regex,
   and nothing else.
2. **The picker paints the dish row's own chip on the option row**, from that
   module, *before* anything is ticked — `.tag.tag-spicy`, inside the `<label>`,
   so it is part of the control's accessible name the way the price already is.
3. **Heat only.** An option's other tags stay in the warning line.
4. **The exemption is deleted and replaced by an assertion.** The label test now
   *refuses* a surface that does not reach `heat.js`: the import must round-trip
   byte for byte (ADR 0076), name `heatLabel`, actually call it, and the file
   must **not** define a second `isSpicy`.

## Rejected

- **Forbid `spicy-*` on an option in `validate.py`** (the item's option 2, and a
  literal reading of ADR 0047's *name the screen that renders it*). The owner
  ruled against it, and his reasoning is the general form: **a chilli sauce that
  renders as neutral is a silence about heat, and the answer to "no screen shows
  this" is to name the screen, not to delete the data.** ADR 0047's Context
  always allowed this reading; only its summary sounded like a one-way door.
- **Leave the silence and keep the exemption** (option 3). The item's own
  recommendation against it stands: the exemption would then guard a hole rather
  than record one.
- **A third local copy of the regex and the template in `addons-ui.js`.** The
  smallest diff, and it would have made the scale a three-way mirror. Rejected
  on the repo's own evidence about duplicated rules.
- **Render ALL of an option's tags as chips on the option row.** Tempting, and
  it is the change a future session will propose. It loses to ADR 0096: the
  warning line already names every allergen and every dead claim an option
  causes, live and in sentences, so a chip row beside it is the second surface
  saying one fact — precisely what 0096 ruled against for `has-meat`/`has-fish`.
  **Heat is the exception because heat has no other voice**: it contradicts no
  claim, kills no label, and nobody avoids it in Settings, so `composeTags`
  unions it in and the warning line never mentions it. A chip is the only place
  it can be said at all.
- **A chip of chillies with no word** ("🌶🌶"). Fails WCAG 2.2 AA — the level
  would be carried by a picture, and by a *count* of pictures at that. The
  rendered string is asserted to contain "Spicy" at both levels.
- **A te reo entry for "Spicy".** reo.js's SAFETY BOUNDARY keeps every tag chip
  in English on purpose; heat is a tag chip, and it falls through to English
  exactly as `Veg` and `⚠ Contains nuts` do. Nothing is owed and nothing was
  invented.

🚩 **One thing to put in front of the owner rather than bury.** On 2026-09-07 he
ruled, on roadmap `340/230`, that *"one shared source of truth is the right end
state and is declined for today"* — about the five tag-label surfaces. This
centralises **heat and only heat** (3 tags; a regex and a one-line template),
because his 200/080 ruling requires a **third** screen to say the same words and
the alternative was a three-way mirror. The `DIETARY` and `ALLERGEN` tables in
menu.js and recipe.js are untouched and still mirrors, still held in step by the
label test. If he reads that as crossing the declined line, the fix is a local
copy in `addons-ui.js` and a reverted test — cheap, and offered rather than
assumed.

## Consequences

- Three screens now render whatever `heat.js` returns, so a change there is a
  change on all three at once. `tests/heat.test.js` pins the literal strings for
  that reason rather than deriving them.
- `addon_check.mjs` goes from **52** assertions to **64** — 12 on the kebab
  card. Two heat levels, so a hard-coded chip cannot pass; **"Sweet
  chilli"** as the absence fixture, because it is *named* for a chilli and
  carries no heat tag — a build reading
  heat off the option's name, or painting the chip on every row, fails there and
  nowhere else. The 44px target and the 390px right edge are measured, not
  reasoned about.
- The **computed accessible name** is asserted through the AX tree
  (`"Hot chilli 🌶🌶 Spicy"`), because the label's `textContent` has no space in
  it: Chrome inserts one only because `.tag` is `display: inline-flex` rather
  than `inline`. Change that one CSS word and a screen reader runs the two words
  together while every pixel and every other assertion stays as it is.
- **Break-probed**: deleting the chip from the label fails **7** assertions, all
  of them in this block, and **57 others still pass**. The absence assertions
  and the geometry assertion correctly keep passing — which is what says they
  are controls rather than restatements.
- Nothing ships that no screen renders: the two tagged options are now read by a
  screen, which is ADR 0047 satisfied rather than waived.
