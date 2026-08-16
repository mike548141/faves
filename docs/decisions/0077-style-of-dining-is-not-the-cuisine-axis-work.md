# 0077 — "Style of dining" is not Theme 30's cuisine-axis work

**Status:** Accepted, and **narrow**. This settles one blocking question and
records two it exposed. It does **not** authorise a field, a vocabulary, or any
data entry — see *What this does not decide*.

**Date:** 2026-08-16

## Context

ROADMAP 37k records an owner idea: *"Another useful filter might be style of
dining/food e.g. silver service vs quick eats."* The item was written with a 🚩
that had to be cleared before anything else happened:

> it overlaps Theme 30's cuisine-axis work (giving each `cuisine` value an
> `origin`/`dish_form`/`service` axis), which is already designed. Check whether
> "style" is simply that proposal's `service` axis under another name before
> opening a second front.

Owner ruling, 2026-08-17 (relayed): *check Theme 30's `service` axis FIRST; do
not open a second front, and enter no data, until it is established whether
style is that axis under another name.*

**"Already designed" was overstated.** Theme 30's proposal is **one sentence**
(`ROADMAP.md`, Theme 30): give each `cuisine` value an axis
(`origin` / `dish_form` / `service`). There is no vocabulary, no field name, and
no example of a `service` value anywhere in the repo — `dish_form` returns three
grep hits in total, two of which are the proposal and 37k itself.

## Decision

**1. Style of dining is NOT Theme 30's `service` axis.** They are at different
levels of the model, and the difference is not cosmetic:

- Theme 30's `service` is **metadata about a vocabulary term** — it says
  "`Cafe` is a format word, not an origin word". Style is **data about a
  venue** — "this place is quick eats". Labelling `Gastropub` as
  `axis: service` tells you nothing about any particular gastropub.
- **It cannot reach 33 of 55 venues**, which carry no service-axis cuisine value
  at all. Regal Chinese (`cuisine: [Chinese, Yum cha, Cantonese]`) is the sharp
  case: its `vibe` already says `banquet · sit-down`, and no axis label on a
  cuisine term could ever express that.
- On the owner's own two poles: *"silver service"* is **formality**, *"quick
  eats"* is **speed and commitment**. The actual service-axis values capture
  **format**, which correlates with both and equals neither. `Fast food` implies
  quick; `Steakhouse` implies formal; **`Gastropub` — the corpus's single most
  used cuisine value, 10 venues — implies neither**, spanning counter-ordered
  pint-and-a-pie to a two-hour sit-down.

⇒ Not the same axis, not a subset. **The 🚩 is cleared and Theme 30 proceeds
unblocked**; 37k does not wait on it.

**2. Format words stay in `cuisine[]`.** Theme 30's axis work should *label*
them, never relocate them. `Gastropub` and `Cafe` are the two most-used facet
values in the corpus (16 taggings between them); stripping them out would gut
the cuisine filter to fix a taxonomy complaint. Cost of labelling ≈ 0; cost of
relocation ≈ the filter's most-used values.

**3. 🛑 The word `service` must not be reused for the axis.** It is already a
live filter key with a *different* meaning: `filters.js`'s
`service: 'all' | 'takeaway' | 'dine-in'`, backed by `r.services`, present on
55/55 venues and rendered as a `<select>` on the home screen today. Theme 30's
`channel` work (`dine_in`/`takeaway`/`delivery`, a **price-and-tax resolution**
axis — delivery menus run 15–30% above dine-in) is a *third* meaning of the same
neighbourhood of words. **Three sessions converged on this collision from three
directions on one day.** Whatever Theme 30's axis is called, it is not
`service`.

## What this does not decide

**No field. No vocabulary. No data entry.** Two things must be answered by the
owner first, and both are recorded in 37k rather than resolved here:

**(a) His own relayed ruling conflicts with the item as written.**
`SESSIONS.md` (commit `041a6ff`) carries a one-line relay — *"dining style folds
into `vibe`"* — with no primary quote and no record of what he was asked. But
37k is titled *"a style of dining **filter**"* and says in its own body that
*"`vibe`'s free text is neither [filterable nor comparable]"*. **Folding style
into a free-text field yields no filter.** Both cannot be true; a session
picking one quietly would be resolving his ruling on his behalf.

**(b) The measurement that predicts this feature fails.** Every other filter in
this app derives from checkable evidence — `services` from what the venue
states, `openNow` from hours, cheapness from actual menu medians. *"Fine
dining"* is a judgement no menu photo can verify. And the app's one existing
curated venue-level judgement field is `priceBand`: **present on 10 of 55
venues, non-null on 8**. Curated judgement fields do not get filled in this
repo, and a filter over 8 of 55 venues is a control that mostly hides places for
no stated reason.

**(c) The prerequisite nobody had noticed.** `vibe` is precached to every phone
and **no screen renders it** — `grep -rn "vibe" site/js site/*.html site/css`
returns zero hits, while `ARCHITECTURE.md` describes it as *"free-form chips
shown on cards"*. The design shipped; the render never did. So 37k proposes to
build a filter on a field that fails ADR 0047's *"name the screen that renders
it"* gate **today**. (Inherited, not introduced — `vibe` predates ADR 0047 — and
the cost is 1,050 bytes of 1,087,040, so this is a principle problem, not a
performance one.)

## Consequences

**What the corpus already says, and it is the argument for a controlled
vocabulary made by the data rather than by an opinion.** Of 38 `vibe` taggings
across the 20 venues that carry any: **9 distinct values are style-of-dining**
(14 taggings), **11 are orthogonal amenities** that a style vocabulary must
never swallow (21 taggings — `dog friendly`, `byo`, `licensed`, `quiz night`,
`craft beer`), and 3 duplicate a `cuisine` value.

🔎 **Five separate strings already say one thing** — `quick` · `quick-eats` ·
`quick-lunch` · `grab-and-go` · `counter-order` — across six venues. No filter
can aggregate them, and `vibe` has no vocabulary check in `validate.py` at all
(`priceBand` has one). That is the empirical case, and it holds whichever way
(a) is answered.

**If the owner unparks it, the shape that satisfies both his ruling and the
item** is one field with two populations: a **validated style subset** the
filter reads, and open text it ignores. `cheap-and-cheerful` is money and
belongs with `priceBand`, not here. Recorded so the analysis is not re-run;
**not adopted**.

**A fourth filter re-opens a constraint that was expensively closed.** Three
selects plus two toggles currently fit one inline row at ≥60rem. ROADMAP 15z
records that the old segmented service control *"was costing 256 px of a 928 px
row … the single largest reason the inline row could not be one row"*.
`filter_row_check.mjs` is the guard that would fail. Any style filter pays that
cost before it renders a single venue.
