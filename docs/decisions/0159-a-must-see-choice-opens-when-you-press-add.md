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

## 9. A change made in the picker updates the unit just added (B)

**Owner-ruled 2026-10-16**, on the fork this record first left open. Add has
ordered the default; the picker opens; choosing Half must leave **one Half**, not
a Full and a Half. The unit the Add put in the order is "fresh" until the reader
confirms it, and while it is fresh a change made in the picker **moves that one
unit** to the picker's new configuration (`cart.js` `moveOneItem`, `order.moveOne`).
The design, because each point is a way to get it wrong:

- **One unit, never the line.** The line just added can share its key with copies
  ordered before (a Large already at 2). Moving "the one I just added" must not
  rewrite them, so the source keeps `qty - 1` and goes only when that is 0.
  Choosing Large and back to Regular on a Large line of two leaves Large 1 and
  Regular 1 (asserted in the browser, and in `tests/order-move.test.js`).
- **The destination may exist.** The unit joins it and the line keeps its own
  price; ticked-off survives only if both halves had it (as `setNote` and
  `finishItems` already do).
- **What is fresh.** Only a reveal that actually opened the picker starts it. A
  picker the reader already had open is one they were already choosing in, and
  keeps the one-Add-one-line behaviour it always had. It records the selection key
  the Add landed on and the dish's **total quantity across every configuration**
  at that moment.
- **When it ends** (`freshAction`, pure, unit-tested): the dish's total quantity
  is no longer what the Add left, which catches a ＋ or − on any line of the
  dish, the row's, the picker's or the sheet's (the reader has confirmed a count,
  so "a second Add press after a change" is the old rule again, not a second
  move); the line is gone or its key moved (a **note** added on the sheet changes
  the key, so a noted line is never moved from under the reader, and the note
  rides with a unit that does move); the picker is closed (that accepts what is
  in the order); or a required choice is unanswered. A move conserves the total,
  which is why a move does not end itself and a run of changes keeps following
  the unit.
- **ADR 0158's unfinished line.** A moved unit can never be unfinished: Add is
  gated until a required group is answered, a radio cannot be un-set, and
  `freshAction` ends the move while one is open as a backstop. The destination of a
  move has the picker's full selection, so it cannot be an unfinished line either.
- **Said, not silent.** The order changes under a tap that only touched a radio,
  so the page sentence and the status region both become "Updated in your order:
  Eggs on Toast, Large." (`movedNote`).
- **It follows the picker's whole selection**, extras included: ticking an optional
  extra after the reveal updates the unit to carry it. The row's own stepper counts
  only the plate and any required choice, as before.

This amends 0159 as first drafted, which shipped A (a change made a second line)
and offered A/B/C; it is in this file rather than a new record because 0159 had not
merged.

## Rejected

- **A (a change makes a second line)** and **C (Add only opens the picker, so every
  ladder dish takes two taps)**: the owner chose B. A leaves the default ordered
  beside the choice; C contradicts "when the user adds the dish".
- **Open every picker on Add** (`200/030`'s state 1). Ruling 4: optional pickers
  are right as they are. The check asserts a real unflagged picker stays closed.
- **`required` implies must-see** (see 4).
- **A flag on `selects` groups, tolerated.** A tolerated no-op field is a lie
  waiting for the day the rule and the flag disagree.
- **Move focus to the first radio**, as the blocked Add of 0156 rightly does.
  That is a refusal, and it puts the reader where they must act. This is a
  successful Add, and a repeat-tapper is mid-tap on the button they pressed.
- **A remembered "seen" flag** (see 8).
- **Converting Gong Cha's size to a `selects` ladder** (0130 suggests it; it would
  make it must-see by rule). Not mechanical and not safe: the group is shared by
  77 dishes at 19 different prices, a ladder's `dishPrice` is absolute so it would
  need a group per price (and per tag set, since a variant must restate its dish's
  claims exactly), and every order line and saved order already holding `size/large`
  would be stranded by the new group ids. It is flagged `mustSee` instead, which
  ends in the same behaviour with no data migration.

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
- **`mustSee: true` is set on four groups** (owner-ruled 2026-10-16): Gong Cha's
  size (77 dishes), Groundup's milks (10), the Victoria's milk-options (5) and
  Abrakebabra's combo (61). Every other optional group is untouched. `gen_summaries`
  was re-run; the flag is in the venue files the screen reads (ADR 0047: the
  picker is the screen that renders it).
