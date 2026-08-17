# 0029 — Metric or imperial is a render-time display choice, never a stored one

**Status:** accepted
**Superseded in part (added 2026-08-17):** the **one-word preference** — that a
reader's units are `metric` or `imperial` and every surface reads that one word
— is superseded by
[0087](0087-units-resolve-as-region-x-usage-not-one-word.md), which resolves
units as region × usage (`{distance, oven}`) because Britain drives in miles
and bakes at °C. That record also reverses this one's **"guessing from the
browser locale"** rejection, which
[0045](0045-prices-convert-and-localisation-can-follow-you.md) had already
overtaken. Everything else here stands whole, and 0087 rests on it:
render-time-only conversion, the yard ladder, the mile dial grid storing
kilometres, and the swap-not-append oven rewrite at nearest 5°F.
**Date:** 2026-08-09

## Context

The owner asked for a Settings choice between imperial and metric "for wherever
they are used in the app" (ROADMAP Theme 18). Three surfaces carry units today:
distances (the Near-me card, the branch chips on a menu, the route detour
figure, and the two Distance dials), recipe quantities, and oven temperatures.
Quantities are 18b and blocked on structured recipe data (17a) — strings cannot
be converted, only numbers can. This record covers the two that shipped, 18a
(distance) and 18c (temperatures), and the three calls inside them a later
session might otherwise reopen.

## Decision

**Convert at render, never in storage.** `favBoostKm` / `farKm` stay
kilometres, the recipe JSON stays °C, and every calculation — haversine,
walking pace, the 2 km walk/drive crossover, the 100 m "not worth a figure"
detour threshold — stays metric. `site/js/units.js` is the one place a stored
metric value becomes words, and nothing round-trips through an imperial value,
so the source of truth cannot drift. The preference is per-profile like every
other setting: a second person picking up the phone gets metric.

Three sub-decisions carry the detail.

**1 · Imperial short distances are yards, not decimal miles.** Metric shows
metres to the nearest 50 under a kilometre, then one decimal, then whole
kilometres. Imperial mirrors that ladder rather than inventing a precision:
yards to the nearest 50, then `0.6 mi`, then `19 mi`. The yard band ends when
rounding would print 900 (over half a mile), so the ladder reads
850 yd → 0.5 mi → 0.6 mi and never doubles back. Measured on the real data at
Wellington CBD, the Near-me list reads `300 yd · 400 yd · 650 yd · 800 yd ·
0.5 mi` where metric read `300 m · 400 m · 650 m · 800 m`.

**2 · The dials run on a mile grid but still store kilometres.** In imperial,
"Show branches within" is 0–20 mi in ½-mile steps and "Hide places further
than" is 5–60 mi in 5-mile steps. A dial that offered "15.5 mi" because 25 km
converts there would be worse than the km dial it replaced. The stored km is
the mile value converted and rounded to **one decimal** — whole kilometres
would round-trip 1.5 mi back to 1.0 mi and the thumb would creep on every
switch. Because a value chosen on one grid is being shown on the other, the
thumb position, the readout beside it, and the Settings index row summary all
derive from the same `dialValue()` snap, so the three can never disagree; the
stored kilometres remain exact for ranking. (This is a small change to what
shipped: the readout used to print the raw stored figure, which the thumb could
already contradict for an out-of-range saved value.)

**3 · Oven temperatures are rewritten in the step text, and the figure is
swapped rather than appended.** There is no structured temperature field, so
the transform runs over the rendered method text with the tightest pattern that
can do the job: two or three digits, optional space, a **literal ° sign**, then
`C` on a word boundary. The degree sign is what makes it safe — no ordinary
sentence contains one, so no quantity, time, price or dish name can be caught.
An optional `(425°F)` immediately after is swallowed so the reader never sees
`430°F (425°F)`.

- **Swap, not append.** A step read one-handed at the bench should carry one
  number. `Bake at 355°F for 2 hours`, not `Bake at 180°C (355°F)`.
- **Nearest 5°F, computed every time** — including where the recipe already
  spells the Fahrenheit out by hand. Adopting the author's figure sounds more
  respectful but breaks a recipe against itself: Pumpkin Pie brackets its
  preheat (`220°C (425°F)`) and not the bake two steps later (`220°C`), so
  honouring the bracket would read "preheat to 425°F … bake at 430°F" for one
  oven setting. Computing every occurrence identically is the only way a recipe
  stays internally consistent.

## Rejected

- **Storing converted values.** The obvious shortcut, and the one that ends in
  a corrupted dataset: every switch is a lossy round trip, and a bug in either
  direction is permanent. Render-time conversion cannot damage anything.
- **Rounding oven temperatures to the nearest 25°F.** Tempting, and it has real
  evidence behind it: both hand-written brackets in `cook-at-home.json`
  (175°C→350°F, 220°C→425°F) are exactly nearest-25, and it lands on the
  classic US dial stops. But it can drift 12°F from the recipe as written —
  170°C would be served as 350°F — and in baking an overshoot burns while an
  undershoot only takes longer. Nearest 5 is never more than 2.5°F out, still
  never prints "356.0", and every oven made this century takes a 5°F step. One
  constant (`OVEN_STEP_F`) if the owner disagrees.
- **Converting recipe quantities too.** That is 18b, and it needs 17a first.
  Worth recording the trap while it is in view: a US cup (240 ml) is not a NZ
  metric cup (250 ml), and US tablespoons differ as well, so "imperial" would
  have to name a specific system. For baking, offering grams is probably the
  bigger win than offering cups.
- **A whole-of-app "locale" setting.** Prices stay NZD and the clock stays NZ
  time whatever this says — the site is New Zealand-first, and those are facts
  about the venues, not about the reader. Bundling them into one switch would
  imply we can convert a price, which we cannot.
- **Guessing from the browser locale.** A US visitor reading a Wellington menu
  is often a New Zealander abroad, and a silent unit switch on a recipe is
  exactly the sort of surprise that ruins a bake. Metric is the default; the
  reader says otherwise if they want otherwise.

## Consequences

- `formatDistance` moved from `distance.js` to `units.js` (its tests moved with
  it). `distance.js` keeps the maths and stays metric throughout.
- No new re-render wiring: every screen already re-renders on a settings change
  for the safety-critical allergen re-apply, so the flip repaints live —
  verified headless without a reload on the home list, the menu screen and the
  recipe page.
- The Settings index is seven rows now, 473 px at 390 px against an 844 px
  viewport, still no scroll (ADR 0025's shape holds).
- The two hand-written `(NNN°F)` brackets in `cook-at-home.json` are now
  redundant duplication — a metric reader sees `220°C (425°F)` while an
  imperial reader sees `430°F`, 5°F apart. Removing them from the data would
  tidy that up; it is a data change, not a code one, and is left for the owner.
- A new recipe whose method text trips the pattern in an unintended way would
  fail `tests/units.test.js`, which asserts every string in the collection
  against it.
