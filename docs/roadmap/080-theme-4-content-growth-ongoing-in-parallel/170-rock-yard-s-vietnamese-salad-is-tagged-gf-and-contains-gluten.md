- [ ] ⚑ **Rock Yard's Vietnamese Salad is tagged both `gf` and
      `contains-gluten`** `[XS][data]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). `validate.py` now
      **warns** on the contradiction (`a49fcca`), which is the right gate
      behaviour; the data itself still says both things. 🎯 **Owner rules which
      is true** — it is a menu fact, not a modelling call, and guessing at it
      is the one thing an allergen tag must never do.
