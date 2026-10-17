# 0166 — A dish states its minimum order and what its price is for

**Status:** accepted
**Date:** 2026-10-18
**Applies** roadmap `200/170`, found by `200/100`'s dish-configuration survey.
**Builds on**
[0158](0158-an-unfinished-dish-is-flagged-on-the-sheet-and-finished-there.md)
(the sheet judges a line against the venue's live record),
[0154](0154-saved-orders-store-ids-not-names-and-stay-off-sync.md) (recall
resolves against today's menu) and
[0047](0047-the-app-ships-only-what-it-renders.md) (a field ships only if a
screen renders it).

## Context

A dish's `price` assumed one dish = one price, and the sheet's stepper started at
1. Charley Noble prints "minimum order 3" on its oysters and "Minimum order of 2"
on arancini and croquettes; its two steaks are "Per 100g … size subject to
availability"; Regal's dim sum platter is "Minimum two people, price per person"
and its set menus "Per person, minimum table of 6"; Takeaway at Churton names
five rows "(each)". The sheet would take one oyster and total it as though the
venue would, and would multiply "$26 per 100 g" by a count, which is not what two
steaks cost.

## Decision

1. **Two optional dish fields, only where the menu prints them.** `minQty`: an
   integer of 2 or more (a stored 1 is refused as noise). `unit`: one of a closed
   set, `"each"`, `"per person"`, `"per 100 g"`. A unit the menu never prints is
   not ours to supply (Sushi Bi's per-piece rows stay unmarked). Neither field is
   on a `selects` option or a recipe: no menu needs it, and ADR 0047 asks a field
   to name its screen first.
2. **`minQty` means the price is per counted unit and the quantity counts those
   units.** "Minimum order of 2" at $8.50 is read as $8.50 a piece; the venue has
   to be asked if it is not, and a transcriber who finds a price that covers the
   minimum together (Rock Yard's "$32" for a two-person platter) does not set
   `minQty`.
3. **Add puts the minimum on the sheet, and nothing steps below it.** A new line
   starts at `minQty`. ＋ on a line already short of it jumps to it. − at the
   minimum becomes ✕ and takes the line off, its label saying "Remove … the
   minimum is 3". A silent 3-to-0 under a "−" that reads as "one fewer" was the
   alternative and was refused. Above the minimum − is an ordinary −.
4. **The rule is read, never stored on the line.** The order line keeps no
   `minQty` or `unit` (ADR 0158's shape). The sheet joins each line to the venue's
   live record when it draws (`dish-rules.js` `joinRules`), which is what judges a
   line made before the rule existed, one that arrived in a shared link, and one
   whose venue changed its rule. A line with no record to judge it, or whose dish
   has left, is not judged. A failed menu load is said, as it is for unfinished
   lines.
5. **A line below its minimum is flagged in words, and the total says so.**
   "⚠️ Minimum 3 — 2 short. Press ＋ to raise it." on the line, and under the
   total "1 dish is below the minimum order. Raise it above." The quantity is not
   changed by looking at it.
6. **A weighed unit is never totalled.** `"per 100 g"` marks a unit whose
   quantity is not a count of what the price is for. Its line shows the unit price
   ("$26 per 100 g — priced by weight, so not in the total"), takes `price: null`
   in the sheet's join, and so falls out of the subtotal and total by the
   machinery that already treats a null price that way; both gain their "+", and
   a sentence under the total says a dish priced by weight is not in it. No
   arithmetic changed. It cannot carry a `minQty`.
7. **The unit is worded beside the price on the menu row** ("$7 each"), after a
   number only. On the sheet it is a line under the dish's name, because the
   right-hand figure is the line total. The menu row also says "Minimum 3", or
   "Minimum 2 people" for a per-person unit, under the description.
8. **Recall raises, says so, and does not drop.** A saved line under today's
   minimum lands at the minimum and the recall status lists it ("Raised to the
   minimum order: … the minimum order is 3, so 1 is now 3").
9. **Left in prose.** How a party size changes the dish (Regal's "select 4 mains
   for a table of 6-7", "one set menu per table"), Rock Yard's $16-a-head tasting
   platters (stored as four dishes priced as totals for 2 to 5 people), and the
   multi-buy "Two for $10.00" with `price: null`. The set menus carry `minQty: 6`
   with `"per person"` because "minimum table of 6" is a minimum head-count at a
   per-person price, which is the shape; their scaling rules are not.

## Consequences

- Twenty-one dishes carry a field today (listed in the roadmap item). The repeated
  menu words stay in each `desc`: they are the evidence a later reader can check,
  and a transcriber should not have to delete them to make the data tidy.
- `validate.py` enforces the closed set, the integer, "a unit needs a price", "a
  weighed unit has no minimum" and "a recipe has neither"; `test_validate.py` has
  a case for each.
- A mid-order picker change on a dish with a minimum (ADR 0159 moves ONE unit)
  would leave the line under its minimum. No dish with a minimum has a picker
  today; the sheet would flag it. Revisit if one does.
- `moveOne`, `finish`, the codec and the saved-order store are unchanged: none of
  them stores the rule.
