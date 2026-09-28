- [ ] 🔎 **Hell Pizza's "Half Buffalo Half Beast" carries no dairy tag**
      `[S][data]` Found 2026-09-29 by the independent review of PR #53
      (session `faves-41`).

Its text is only "Half The Buffalo and half The Beast", so no rule can read
an allergen from it. Its two halves are tagged on their own rows, and the
half-and-half inherits none of them. PR #53 hand-tagged `contains-pork` from
The Beast's pepperoni; `contains-dairy` (both are cheese pizzas) was left for
a deliberate pass, not slipped into a pork change.

**To do:** give it the union of its two halves' `contains-*` tags, each
checked against the halves' own rows, and look for other "half X half Y" rows
(`grep -i "half" site/data/restaurants/*.json`) with the same gap.
`validate.py`'s twin-row warning does not catch these, because the names
differ.
