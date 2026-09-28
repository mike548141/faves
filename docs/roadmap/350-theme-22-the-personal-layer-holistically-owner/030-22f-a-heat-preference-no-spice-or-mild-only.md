- [ ] 🤔 **22f — a heat preference: "no spice" and "mild only"** `[M][design]`
      ⚑ Owner-raised on 2026-09-28, verbatim: *"In dietary preferences we
      should have a preference for no spicyness and very little spicyness
      alongside vegan, vegetarian etc"*. Filed by `faves-b8` during 22e.

## What exists today

- The heat scale is `spicy-1`…`spicy-3`, one closed vocabulary in
  `site/js/heat.js`. 181 dish tags across `site/data/` carry one (as at
  2026-09-28).
- Settings' food preferences are `DIETARY_PREFS` (v, vg, gf, df) and
  `ALLERGEN_PREFS` in `site/js/settings.js`. Heat has no setting. So on the
  tag row (22e, `tags.js`) a heat chip always sorts with the preferences the
  reader has not selected. The owner confirmed that ordering on 2026-09-28,
  *for today*.

## 🔎 The design question to answer first: it is an ABSENCE claim

Vegetarian is something a dish is **tagged as**. "No spice" means "not
tagged spicy", and **no tag means not stated, never "not spicy"** (ADR 0025's
rule for allergens; the heat tags were written the same way). Most dishes
with no `spicy-*` tag were simply never graded. So:

- A heat preference can reliably do one thing: make a dish that **is**
  tagged hotter than the reader's limit stand out, the way a flagged allergen
  does (loud chip, never folded, maybe the row accent).
- It **cannot** promise the rest are mild. A filter that shows only "no
  spice" dishes would show every ungraded curry as safe to order. That is the
  dietary-intersect trap ([ADR 0092]) in a new place.

## Options to put to the owner (not ruled)

1. **An avoid-style heat limit.** Settings offers "Heat: any · mild only
   (🌶) · none". A dish tagged above the limit gets a loud heat chip, never
   folded, sorted with the reader's own tags. Nothing is hidden and nothing is
   promised about ungraded dishes. Smallest, and honest about the data.
2. **As 1, plus a menu filter** that hides dishes tagged above the limit.
   Ungraded dishes stay visible, and the filter says so ("N dishes have no
   heat recorded").
3. **Grade the corpus first.** Sweep the menus for heat words (curry, chilli,
   vindaloo, laksa…) with a tagger rule, so "no tag" means less often
   "unknown". Large, and it runs into the owner's no-harvesting-on-a-hunch
   rule unless it reads only what the menus already say.

Recommendation when asked: **1**, then 2 once a sweep shows how much of the
corpus is ungraded.

## Touches

`settings.js` (a new preference, and its export, backup and sync whitelists:
see the "whitelist sheds the field added after it" lesson), `settings-ui.js`,
`tags.js` (`isDeclared` for heat, and the sort rank), `menu.js` if it filters,
`device_check.mjs`, the Settings copy, and te reo for any new chrome words
(maoridictionary.co.nz).

[ADR 0092]: ../../decisions/0092-an-add-on-option-states-what-it-is.md
