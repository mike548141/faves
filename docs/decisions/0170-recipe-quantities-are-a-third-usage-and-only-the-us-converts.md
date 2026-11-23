# 0170 — Recipe quantities are a third usage, and only the US converts

**Status:** accepted — extends
[0087](0087-units-resolve-as-region-x-usage-not-one-word.md) (a third field on
its usage table); supersedes nothing
**Date:** 2026-11-23
**Follows:**
[0076](0076-a-quantity-is-scaled-only-if-it-can-be-written-back-unchanged.md)
(the scaler's exact-rational round trip, which this runs after) ·
[0029](0029-unit-display-preference.md) (convert at render, never in storage) ·
**Roadmap:** `260/010` (18b)

## Context

18b has waited since Theme 18 opened on two things: a parser for quantities
(17a, ADR 0076, shipped 2026-08-16, so the item's "still blocked on 17a" was
stale) and the shape ADR 0087 gave the units setting, which names recipe
quantities as the next usage. The warning the item carried is the real content:
a US cup is not a New Zealand cup, so "imperial" has to mean a specific system
and say which.

The corpus is written in a New Zealand kitchen: a cup is 250 ml, a tablespoon
15 ml, a teaspoon 5 ml, and weights are grams. Of its 165 ingredient lines,
measured today: 54 name no measure ("3 free-range eggs", "Garlic"), 109 name
one, and 2 name one the converter cannot read.

## Decision

**1 · `cooking` is the third field of the usage table.** `{distance, oven,
cooking}`, each `"metric"` or `"imperial"`, answered per region exactly as the
other two are. No new setting (the owner's 2026-08-17 ruling stands): the US
customary option's label gains the third thing it changes, *"US customary
(miles, °F, cups)"*, and the Settings row for a mixed table says so.

| Region | `distance` | `oven` | `cooking` |
| --- | --- | --- | --- |
| GB | imperial | metric | **metric** |
| US | imperial | imperial | **imperial** |
| everywhere else, and no signal | metric | metric | metric |

**2 · The US definitions.** US customary volume is defined from the gallon,
231 cubic inches, exactly 3.785411784 litres. So:

| | ml | a NZ one is |
| --- | ---: | ---: |
| US cup (1/16 gal) | 236.5882365 | 250 ml = 1.0567 US cups |
| US tablespoon (1/16 cup) | 14.7868 | 15 ml = 1.0144 |
| US teaspoon (1/3 tbsp) | 4.9289 | 5 ml = 1.0144 |
| US quart (4 cups) | 946.353 | |
| ounce | 28.349523125 g | |
| pound | 16 oz | |

The cup is 8 US fluid ounces, **not** the 240 ml "legal cup"
printed on US nutrition labels. That figure is a labelling round-off, and the
cup a US cook owns is marked in ounces of the gallon. The two differ by 1.4% and
nothing turns on it; the choice is recorded so nobody re-derives it as a bug.
🔑 Spoons are near enough the same measure; the cup is 5.7% larger in New
Zealand, which is why `2¼ cups` of flour reads `2⅜` to a US reader, and why the
trap in the item was worth a record.

**3 · GB stays metric in the kitchen, and this is a judgement, not a finding.**
ADR 0087 reasoned from CLDR's `unitPreferenceData`, and CLDR (release 46,
`common/supplemental/units.xml`, read 2026-11-23) has **no cooking usage at all**.
Its nearest entries point two ways:

- `mass` / `default`: **US GB** → ton, pound, ounce. Read alone, that is GB
  ounces.
- `volume` / `fluid`: **US** → gallon, quart, pint, **cup, fluid ounce,
  tablespoon, teaspoon**; **GB** → gallon-imperial, fluid-ounce-imperial. There is
  no cup, tablespoon or teaspoon for GB, and those are the three measures the
  corpus is written in.

So CLDR names a ladder for the US that is exactly the one built here, and for
GB names generic mass and fluid ladders that are not cooking ones and share
nothing with the corpus's vessels. Converting GB would need a ladder of the
house's own invention for the volumes, and an ounce for the weights that CLDR
gives only as a generic default (the same file gives GB `stone-and-pound` for a
person, so "generic" is doing real work). ADR 0087's own rule applies: *the short
list is the exception list; anywhere absent is metric*, and an entry needs
evidence. GB is therefore not listed for cooking, and a British reader sees the
recipe as written. **What this rests on beyond CLDR is an assumption I did not
verify: that British recipes are written in grams and millilitres.** It is a
one-line change (`locale.js`, `REGION_USAGE.GB.cooking`) if the owner reads it
otherwise, and the question goes to him with this record.

Other regions that cook in cups (Canada, with its own 227 ml legacy cup) are
absent from CLDR's cup list and so are metric here; Australia's cup is 250 ml,
the NZ one, which is the right answer for it.

**4 · The conversion runs AFTER the scaler, in a new module.**
`cooking-units.js` (`convertLine`) takes the line the scaler produced. The
scaler works in the author's own units, where its exact-rational round trip is
proven (ADR 0076); the conversion is then taken once from the scaled figure and
rounded once. `½×`, `2×` and "serve 6" therefore compose with ounces and cups
with no rounding in the middle (half of a rounded `2⅜` would be `1³⁄₁₆`, which
no cup has). The tick key is the raw line (`checklist.js`), so a change of units
moves no tick, exactly as a change of scale moves none.

**5 · Spelling.** The result is snapped to the nearest figure a kitchen can
measure, and written with `quantity.js`'s own `formatRational`, so it can only
ever be a spelling the scaler already writes:

- **cups, tablespoons, teaspoons:** halves, thirds, quarters, eighths.
- **quarts** (from ≥ 946 ml): quarters. **ml and litres** are poured into the
  vessel their size suits: quart, cup (≥ ¼ cup), tablespoon (≥ 1), teaspoon.
- **weight:** eighths of an ounce under 1, quarters to 8, halves above, rolled up
  to `N lb M oz` from 16 and snapped as one weight.
- **a measure the author wrote in a vessel keeps the vessel.** A line in cups
  stays in cups; **volume is never turned into weight, or weight into volume**
  (no density table: "a cup of flour is 120 g" is 125 in another book).
- **`SAME_ENOUGH` (3%).** Where the author's own figure is within 3% of the true
  conversion it *is* the answer: `5 tsp` stays `5 tsp` rather than becoming `5⅛`,
  which no one can pour. Spoons (1.4% apart) keep their words; the cup (5.7%)
  does not.
- **`MAX_ERR` (8%).** A figure that cannot be spelled within 8% of the truth is
  refused, not rounded: 5 g is 0.18 oz and `⅛ oz` would be 29% light.

Bracketed second measures follow the same rules: a bracket of the *other* kind
is converted (`⅔ cup (150g)` → `⅔ cup (5¼ oz)`), and one of the *same* kind is
dropped, because the head now says what it said (`1 cup (250 ml)` → `1 cup`).

**6 · Never a half-converted line (the scaler's doctrine, applied to units).**
`convertLine` returns `none`, `converted`, or **`unconverted`**: a line that
names a measure the converter did not convert (a range, `1 can (400g)`, a second
amount, 5 g of salt) is returned exactly as written, and the page marks it
**"as written"**, the same words and element the scaler uses, with its own count
("N lines below are marked — they have no tidy US measure"). A line still
carrying `250ml` in a US reader's list would read as converted; that is worse
than saying it was not. Today it is two lines of 165: `1–1½ cups chocolate` and
`Lukewarm water (approx. 300–400ml, see method)`.

**7 · Surfaces.** The recipe page, cook mode, the shopping list and the
collection list's expanded preview read the same function, in that order of
risk: the page and cook mode must never disagree about a quantity (the 2026-08-17
lesson), and a shopper reads the list in a shop.

## Rejected

- **Converting at 1:1 and calling it done.** A NZ cup and a US cup would then
  read the same and the bake would be 5.7% short of flour. The item's whole
  warning.
- **Grams for flour and sugar to a US baker.** Probably a bigger win than cups
  for baking, and it needs a density per ingredient. Recorded on the roadmap
  item as follow-up, deliberately unbuilt.
- **The 240 ml legal cup.** Section 2.
- **Fluid ounces as a ladder rung.** A US cook measures cream in cups; `2⅛ cups`
  reads more naturally than `17 fl oz`, and a rung nothing chooses is a claim
  nothing checks.
- **Converting ranges (`1–1½ cups`).** Both ends could be converted. It is the one
  corpus line, and ADR 0076 refuses ranges for the same reason: the head parse
  cannot see the far end. Marked, not guessed.
- **A GB entry copied from CLDR's generic mass row.** Section 3.
- **A per-usage override for a reader whose region is wrong.** Owner-ruled out
  for ADR 0087, and unchanged.

## Consequences

- ⚠️ ADR 0087's cost grows by one usage: a reader whose region is inferred wrongly
  (a New Zealander on a US VPN) gets cups they did not ask for, and can only
  fix it by choosing Metric outright, which also moves their miles.
- **Method text is not converted.** Of the corpus's 100 steps, 6 name a measure in
  prose ("1 cup of flour", "20cm cake tin", "4–5mm"). A step that says `1 cup`
  beside an ingredient list that says `2⅜ cups` is a small disagreement
  nobody can see from a gate. Follow-up, on the roadmap item.
- **The shopping list stores the text it was given.** A device whose region or
  units changes after adding a recipe sees it flagged as stale and offers
  "Update the amounts", by the mechanism ADR 0124 built for a change of scale.
- Existing stores, backup, import and sync are untouched: `raw().units` is still
  one word, and the table is derived.
- `recipe_check` and `cook_check` now **pin the browser's timezone to New
  Zealand**: with the default `local` units, a runner in a US timezone would have
  shown every quantity in cups and failed expectations that are about the
  scaler.
- What a green test cannot show: **that a US cook is better served by `2⅛ cups`
  than by `2 cups`.** The precision is deliberate (baking, and the 5.7% above)
  and is one constant (`MAX_ERR`, plus the ladders) if the owner prefers
  familiar to exact; no gate here can tell which a kitchen wants.
