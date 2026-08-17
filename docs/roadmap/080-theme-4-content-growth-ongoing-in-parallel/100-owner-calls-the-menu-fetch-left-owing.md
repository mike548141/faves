- [ ] 🎯 **Owner calls the menu fetch left owing** `[XS][decision]` — three
      questions the batch raised and refused to settle alone, kept together
      because each one changes what a *future* intake does, not just a record.
      **One of the three is now ruled; two remain.**
      🔑 **The fetch recorded its own gaps rather than losing them** — as of
      2026-08-17 `python3 tools/needs.py --count` reports **188 open dish-level
      gaps across 6 venues** (Subway 162, Regal Chinese 14, Charley Noble 7,
      Gold Lining 3, Gong Cha 1, Southern Cross 1). Derive that list, never
      re-type it. Question 1 below was most of it.
      1. ✅ **RULED 2026-08-17 — an unpriced row is a RECORD. Always keep it,
         flagged as a gap.** Never drop a menu row for lacking a price: keep it
         and mark `needs: price`, so the row is simultaneously the record of
         what the venue sells and an entry on the derived worklist
         (`tools/needs.py`). 🔑 **The reasoning that decided it: dropping is
         lossy and keeping is not.** A dropped row destroys the fact that the
         venue sells the thing, permanently and invisibly; a kept row costs one
         field and *reports itself* until someone prices it. The two halves of
         the split were never really a disagreement about value — Subway
         publishes no price anywhere by franchise design (so dropping would
         have deleted its entire 141-row menu), while The Victoria Tavern's
         ~40 spirits were dropped on a corpus convention read from
         `southern-cross` and `the-borough-tawa`. **That convention is now
         overruled**; those two venues are not evidence of a rule, they are
         venues that happened to have no unpriced lines.
         **This binds every future intake** — spirits lists, specials boards,
         market-price seafood, anything a venue lists without a number.
         ✅ **Nothing has to be built to obey it, and two sessions nearly
         re-derived that.** `needs` is not a new field: **166 dishes already
         carry it**, `price` is already in its vocabulary, `validate.py`
         already errors if a row claims `needs.what='price'` while holding a
         price, and the screen that renders it already exists —
         `site/js/needs.js` `priceUnknown()` drives `menu.js`, which prints
         **`?`** in class `dish-price is-unknown` where a bare missing price
         prints `—`. So [ADR 0047]'s *name the screen that renders it* is
         satisfied by a screen that has been shipping for some time, and the
         ruling is a **convention change, not a schema change**.
