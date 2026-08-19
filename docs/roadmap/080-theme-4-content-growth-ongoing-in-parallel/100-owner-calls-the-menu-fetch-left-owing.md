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

      2. ⚠️ **Pizza Hut's prices may not be Johnsonville's.** Its order pages
         quote prices without ever asking for an address, and the store page's
         "View menu" is a Vue handler with no `href`, so the branch flow could
         not be driven. What we hold is **Pizza Hut NZ's default online
         pricing**; whether this branch matches is unestablished. One phone
         call or one in-store look clears it.
      3. ⚑ **Little Sprig Seatoun's menu date is contested**, left at
         **2026-06-29**. The PDF's Canva `/Title` says *"Bar Snacks Menu (Oct
         2025)"* but it was exported 2026-06-29 and the venue's own filename
         calls it the 2026 menu. The export date is the only full-precision
         date the document supports; the conservative read is older. It only
         matters through the staleness caveat — the owner's call whether that
         is worth aging.

      🔎 **Where these two were until 2026-08-19, and why it matters.** They
      sat inside `110-restore-the-victoria-tavern-s-dropped-spirits.md`,
      still numbered `2.` and `3.` from the pre-split single list — an item
      whose title is a data task about a different venue. So this item, the
      one carrying the 🎯 that says the ask sits with the owner, announced
      *"three questions … two remain"* while holding exactly one, and the two
      that remained were unfindable from it. **The board split scattered a
      three-part decision and no gate can see that**: every file was
      well-formed, every link resolved, and the index rebuilt clean. Worth
      knowing as a class — when a single numbered list is split across
      files, the numbering survives and the *belonging* does not.
