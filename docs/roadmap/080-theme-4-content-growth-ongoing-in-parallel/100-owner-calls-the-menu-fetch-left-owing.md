- [ ] 🎯 **Owner calls the menu fetch left owing** `[XS][decision]` — three
      questions the batch raised and refused to settle alone, kept together
      because each one changes what a *future* intake does, not just a record.
      ~~**One of the three is now ruled; two remain.**~~ → **TWO of the three
      are ruled (q1 on 2026-08-17, q3 on 2026-08-22); ONE remains — q2, and it
      is a phone call, not a decision.** Corrected 2026-09-09; see the note at
      the foot.
      🔑 **The fetch recorded its own gaps rather than losing them** — as of
      2026-08-17 `python3 tools/needs.py --count` reported **188 open dish-level
      gaps across 6 venues** (Subway 162, Regal Chinese 14, Charley Noble 7,
      Gold Lining 3, Gong Cha 1, Southern Cross 1). Derive that list, never
      re-type it. Question 1 below was most of it.
      📏 **RE-MEASURED 2026-09-09: `python3 tools/needs.py --count` now reports
      279 open gaps across 10 venues.** The original figure is kept above
      because the way it changed is the interesting part — see the foot of this
      item.
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

      ✅ **RULED 2026-08-22 on question 3 — TAKE THE CONSERVATIVE DATE, October
      2025.** The owner chose the older read over the export date, so the
      staleness caveat starts warning sooner. The recommendation put to him was
      the opposite (keep `2026-06-29`, on the grounds that the export date is
      the only full-precision date the document supports); it was **not** taken.
      ⚠️ **AND THE ITEM WAS STALE — this was ALREADY DONE on 2026-08-17**, in
      `60d9bb8` *"data: three owner calls — a conservative date…"*, which
      changed `verified` from `2026-06-29` to `2025-10-01`. The record still
      says *"left at 2026-06-29"*, and that stopped being true five days before
      anyone read it back to him. **So the ruling ratifies shipped behaviour and
      owes no work.**
      🔑 **How the staleness survived, said against ourselves.** This paragraph
      was MOVED into this item earlier on 2026-08-22 to fix a findability
      defect — and the session that moved it verified the *location* problem
      and never checked the *content*. Moving a claim is not reading it. A
      relocation pass should re-verify every factual claim it carries, because
      relocation is exactly when a reader assumes someone just looked.

  📏 **THE GAP COUNT, RE-MEASURED 2026-09-09 — and the six original figures did
  not move by a single row.**

  | Venue | 2026-08-17 | 2026-09-09 |
  |---|---|---|
  | Subway | 162 | **162** |
  | Regal Chinese | 14 | **14** |
  | Charley Noble | 7 | **7** |
  | Gold Lining | 3 | **3** |
  | Gong Cha | 1 | **1** |
  | Southern Cross | 1 | **1** |
  | McDonald's | — | 82 |
  | Bambina Pizzeria | — | 5 |
  | Simmer | — | 3 |
  | Daily Bakery | — | 1 |
  | **Total** | **188 / 6 venues** | **279 / 10 venues** |

  🔑 **All 91 of the growth is NEW venues; none of it is regression, and none of
  it is progress either.** 188 + 91 = 279 exactly, and every one of the six
  original venues carries the identical number it carried 23 days ago. So the
  worklist has not been worked at all — it has only been added to. That is a
  different fact from *"the number went up"*, and it is the one worth having.
  🔎 **McDonald's at 82 is now the second-largest gap in the corpus** and did not
  exist on this list when the item was written. It is the same chain as
  `080/130`'s hours blocker, from the same cause: no readable first-party
  source.
  🛑 **The bracket stays `- [ ]`.** Question 2 (Pizza Hut's prices may be the
  national default rather than Johnsonville's) is unresolved — but read it
  carefully before putting it to him: the item itself says *"one phone call or
  one in-store look clears it"*, which is `[XS]` verification work, not a
  decision. Questions 1 and 3 are both ruled and both owe nothing.
