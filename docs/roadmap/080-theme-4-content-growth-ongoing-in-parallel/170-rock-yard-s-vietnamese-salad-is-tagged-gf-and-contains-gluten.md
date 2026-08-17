- [x] ✅ **RULED AND FIXED 2026-08-17 (`77726e2`): the salad keeps its `gf`
      label — the `contains-gluten` tag was OURS, and wrong.** The venue's own
      menu says gluten-free; the contradiction was an inferred tag overriding a
      stated one, which inverts ADR 0025's rule (inference fills a silence, it
      never overrules the menu-writer). The account below is the finding as
      filed. ⚑ **Rock Yard's Vietnamese Salad was tagged both `gf` and
      `contains-gluten`** `[XS][data]` — found by the three-day cold review (`docs/reviews/2026-08-17-0643-three-day-cold-review.md`). `validate.py` now
      **warns** on the contradiction (`a49fcca`), which is the right gate
      behaviour; the data itself still says both things. 🎯 **Owner rules which
      is true** — it is a menu fact, not a modelling call, and guessing at it
      is the one thing an allergen tag must never do.
