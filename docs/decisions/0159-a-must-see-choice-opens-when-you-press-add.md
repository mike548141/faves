# 0159 — A must-see choice opens when you press Add

**Status:** accepted
**Date:** 2026-10-16
**Follows:**
[0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) (the picker and
the line it makes) ·
[0130](0130-a-group-that-selects-a-variant-is-not-an-add-on.md) (a `selects`
group) ·
[0156](0156-a-required-choice-has-no-none-and-add-waits.md) (`required`: Add
waits) ·
[0157](0157-a-size-ladders-default-is-the-menus-else-the-cheapest.md) (what the
default is) · **Roadmap:** `200/120`, owner-ruled 2026-10-03

## Context

Pressing ＋ Add on a dish with a size ladder orders the default plate, and the
reader never learns a choice was made for them. The Garlic Tikka's Half is the
case: the menu's own default, $12, silently, with the Full beside it in a picker
that is closed. The owner ruled (2026-10-03): *"We need a way to mandate a user
at least seeing the options, so that they have not missed it… if the addon is
marked as "must-see"… when the user adds the dish to the order (i.e. presses Add
button) the addon section expands to show them."* Bounded the same day: *"Some
addons are purely optional and what we have today is perfect for those."* And
asked by `faves-de`: **every `selects` ladder is must-see by rule; other groups
opt in with a flag.**

**What the picker is today, read from the code rather than from `200/030`.**
`addons-ui.js` builds a `<details class="dish-addons">` with no `open`
attribute, so on every dish that has one it is **closed** until the reader opens
it (`app.css`: "Closed by default so a menu of 100 dishes doesn't become a menu
of 100 forms"). The row's own ＋ Add sits in the dish's action bar, outside it;
the picker has a second Add inside it. `200/030` (14g) opens its defect with
"the picker renders open on every dish". That does not describe this code, so
what "expands on Add" means here is *closed → open*, and 14g's state machine
(a read-only state 0, a folded summary, "Add another") is **not** needed for it
and was not built.

## Decision

1. **The trigger is the ＋ Add press that takes a configuration from none to
   one**, and only that. ＋ and − do not trigger it, so a repeat-tapper is never
   interrupted; removing the dish and pressing Add again is an Add press and does.
   `dishStepper` takes an `onAdded` callback for it (`cart-ui.js`); the menu row
   passes one that calls the picker's `reveal()`. The picker's own stepper does
   not: it is inside the thing that opened.
2. **The dish is still added.** That is the owner's text, and it keeps Add a
   one-tap action for the reader who is happy with the default. The reveal
   happens beside the Add, not instead of it.
3. **Which groups.** `isMustSee` (`addons.js`) is true for every `selects`
   group, and for an `adds` group carrying `"mustSee": true`. A group with
   neither is untouched: nothing opens, no sentence, no status.
4. **`required` does not imply must-see.** The item asked. A required group
   blocks Add until it is answered (0156), so the reader has seen it by the time
   Add works. Treating it as must-see as well would re-open a picker they had
   just answered and closed. `mustSee` on a required group is therefore an
   **error**: it would do nothing, and a transcriber would believe it did.
5. **`mustSee` on a `selects` group is an error**, for the same reason, and by
   the same pattern as 0156's "`required` does not apply to a `selects` group":
   the rule already covers it. `mustSee: false` is refused too (a second spelling
   of absent). Only `true` on a pick-one or pick-many `adds` group is valid.
6. **What the reveal does.** It opens the `<details>`; shows one sentence in
   words on the page, "Added as listed. Check “Size” below — change it if you
   want something different.", naming the groups so the reader knows which
   choices were made for them; speaks the same sentence through a polite
   `role="status"` region that sits *beside* the picker (a live region inside a
   closed `<details>` is not reliably spoken); and scrolls the first group into
   view with `block: "nearest"` (instant under `prefers-reduced-motion`), which
   moves the page only if it would be off-screen. It animates nothing, so there
   is nothing for reduced motion to strip. Closing the picker clears both the
   sentence and the status, so the next reveal is a change that is spoken.
7. **It never moves focus**, and a defect underneath that had to be fixed to
   make this true: pressing ＋ Add replaced the button with the − / count / ＋
   group and a removed element hands focus to `<body>`, so a keyboard or switch
   user was thrown to the top of the page by every first tap on any dish. A
   picker opening beside that would have looked like the cause. `dishStepper`
   now carries focus onto the control that took the pressed one's place (the ＋
   after Add, the same − or ＋ after those, ＋ Add after the count reaches
   none). This changes every stepper, on the menu and the sheet; the sheet
   rebuilds its body and so was never affected.
8. **Reveal is per Add, not per dish and not remembered.** If the reader closes
   the picker and later adds again from none, it opens again. Remembering "seen"
   would need storage keyed on a group and a venue's menu version, to save a
   closed disclosure being re-opened; the reader who closed it can close it.

## Not decided here: what a choice made after the reveal does 🎯

The Add has already ordered the default (Half). If the reader now picks Full in
the revealed picker, the row's stepper and the picker's stepper move to the Full
configuration, at none; **the Half line is still in the order.** They must tap
Add again for the Full and remove the Half from the sheet. This is the same
behaviour a manually opened picker has always had, and the reveal makes it
reachable on every ladder dish, so it is the wart most likely to be met. It is
14g's state 2/3 question (edit the line or add another), which `200/030` holds
as designed but not approved, so it was left alone. Options for the owner:

| | Add press | A change in the revealed picker | Cost |
|---|---|---|---|
| **A** (shipped) | orders the default and opens the picker | makes a second line | none; the wart above |
| **B** | as A | while nothing else has touched the order, **moves the line just added** (the re-key `order-finish` already does) | medium: a "fresh line" notion in the picker and one `cart.js` move |
| **C** | **does not order**: it opens the picker, and the picker's Add orders | n/a | small, but it makes every ladder dish two taps, contradicting "when the user adds the dish" |

Recommendation: **B.** It keeps the owner's one-tap Add and his "expands to show
them", and removes the wart; C reverses half of his sentence.

## Rejected

- **Open every picker on Add** (`200/030`'s state 1). Ruling 4: optional pickers
  are right as they are. The check asserts a real unflagged picker stays closed.
- **`required` implies must-see** (see 4).
- **A flag on `selects` groups, tolerated.** A tolerated no-op field is a lie
  waiting for the day the rule and the flag disagree.
- **Move focus to the first radio**, as the blocked Add of 0156 rightly does.
  That is a refusal, and it puts the reader where they must act. This is a
  successful Add, and a repeat-tapper is mid-tap on the button they pressed.
- **A remembered "seen" flag** (see 8).
- **Which `adds` groups carry `mustSee`.** Not decided and not set: it is a
  per-group content call. No record in `site/data/` carries the flag. The
  candidates are listed in `200/120`.

## Consequences

- **130 dish rows in 8 venues open on Add by rule** (measured 2026-10-16 from
  `site/data/restaurants/`): Southern Cross 36, The Victoria Tavern 31, The
  Borough Tawa 27, Hotel Bristol 19, Khandallah 9, BurgerFuel 3, Spices Indian
  3, Baylands 2. The pubs' unnamed `size-1` pours are the bulk, so a drink added
  at a bar opens a pour-size picker every time. That is the ruling; it is the
  volume to watch.
- `validate.py` gains `mustSee` in the group key set and three refusals
  (`false`/non-`true`, on `selects`, on `required`); `test_validate.py` has six
  cases, two of them legal shapes so a gate that refuses everything cannot pass.
- `tools/addon_check.mjs` block (ab): the optional picker on the real record
  stays closed on Add (the control); a flagged group on a fixture opens it, with
  the sentence on the page and in the status region, the default untouched,
  nothing ticked but None; focus stays on the row's stepper, not in the picker
  and not on `<body>`; ＋ does not re-open it and Add-from-none does; a size
  ladder opens with no flag; an answered required group is not re-opened.
- A flag that is never set in `site/data/` is a field no shipped record uses
  (0047/0137): it is admitted because the owner ruled the behaviour, the code
  reads it, and the fixture shows it working; the payload does not change.
