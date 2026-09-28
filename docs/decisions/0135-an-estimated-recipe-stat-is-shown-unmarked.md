# 0135 — An estimated recipe stat is shown unmarked

**Status:** accepted
**Date:** 2026-09-28
**Amends:** [0125](0125-the-recipe-page-leads-with-a-photo-and-a-stats-panel.md)
— its "`est.` in words beside each such value, with a key line under the
panel" is withdrawn from the stats panel. **Does not touch**
[0064](0064-an-estimate-carries-its-working-and-never-a-timer.md) /
[0066](0066-an-estimated-duration-drives-a-timer-marked-as-an-estimate.md)
beyond that panel: the recorded working and cook mode's timer marking stand.

## Decision (the owner's ruling)

On 2026-09-28 the owner first ruled the key line under the panel off (*"est. —
our estimate; the recipe doesn't say"* — "unnecessary"; shipped `63f43d2`).
Told that the `est.` marker beside each value had been kept under 0125, he
ruled on it too:

> *"Remove it is my ruling. You can wrap an ADR around it to advise me but my
> ruling remains."*

So the recipe page's Prep · Cook · Serves · Difficulty panel shows a value we
estimated **exactly as it shows a value the recipe stated**. This record exists
to advise; it does not reopen the ruling.

## What stays, and why that is not a contradiction

- **The data still knows.** `estimated` on each recipe and the per-value
  working in `data/estimates/recipes.json` are unchanged, and
  `recipe_estimates.py --check` still gates them. Only the marker on screen
  went — so restoring it is one line in `recipe.js`, not a re-derivation.
- **The Cook at Home list row still says "Serves about 8"** for an estimated
  serving count (menu.js, 0125 §consequences). The ruling named the panel's
  marker; the list's "about" is a different surface and was not raised.
- **0066's rule for timers is untouched.** An estimated step duration that
  drives a countdown must still be marked as an estimate. (Measured
  2026-09-28: no screen yet reads the per-step estimates — `site/js/` reads
  `estimated` only for the panel and the list row — so today nothing renders
  under that rule; it binds whoever wires them in.) A timer is something a
  reader *acts on* at the stove, which is why the ruling is not read across.

## Advice (for the owner, on the record)

The cost of the ruling, stated so it is a choice and not a drift:

1. **A reader can no longer tell our guess from the recipe's word** on the
   panel. For *Difficulty* and *Serves* that costs little. For *Prep* it is our
   arithmetic over steps the recipe did not time. Measured 2026-09-28: 24 of
   the 25 Cook at Home recipes carry at least one estimated value, and 23 of
   them an estimated prep time.
2. **The 2026-08-16 estimates ruling was "estimate, but label it."** This
   narrows it for one surface. If a later session reads 0064's *"never bare"*
   and "restores" the marker, it would be reversing an owner ruling — this
   record is what tells it not to.
3. **A middle path, NOT offered before the ruling and recorded here for him:**
   the value's expansion (*"our estimate — the recipe doesn't say"*) as a tap
   tip with nothing visible, the way the tag tips work. The ruling's wording
   ("remove it") stands until he asks for this; it is written down so it is
   his to pick up, not a session's to build.

## Verification

`recipe_check.mjs` now requires the panel to show **no** `est.` on an
estimated recipe (and no key line), while the fixture is still chosen as one
that *has* estimated values — so the assertion cannot pass on a recipe with
nothing to hide. Break-probe: the previous `recipe.js` fails it and nothing else.
