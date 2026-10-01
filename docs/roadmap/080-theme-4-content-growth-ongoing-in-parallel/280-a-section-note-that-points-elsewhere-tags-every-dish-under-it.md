- [~] 🔎 **A section note that points elsewhere tags every dish under it**
      `[S] [content][allergens]` — found 2026-10-01 (session `faves-55`)
      reviewing Groundup Cafe (`270`).

  `tag_allergens.py`'s SECTION tier reads a section's `note` as describing
  every dish in it. Groundup's lunch board says *"see our cabinet of fresh
  filled paninis, savouries, slices and cakes"*. That is a pointer to
  another section, but "paninis" gave `contains-gluten` to Nachos, Thai
  Beef Salad, Corn Fritters, Wedges and Bowl of Fries, and each tip quotes
  the pointer as its evidence. The corpus holds **31** tips that cite a
  section note (counted 2026-10-01); how many of those are pointers, not
  descriptions, is unmeasured.

  **Left as it is, on purpose.** An extra warning is the safe direction
  under the tool's one-way rule. Removing tags by hand would also drop ones
  that are probably true (fritters are usually battered with flour, and the
  noodles are likely wheat), and nothing would put them back. Options to
  weigh: mark a note as a pointer (a field the tier skips); have the tier
  require the allergen word to be the subject of the note; or sweep the 31
  by hand and correct any tip whose quoted note is a pointer.

  ⚖️ **Owner-ruled 2026-10-01 (`faves-55`): a pointer flag, then a review.**
  The tagger skips a note marked as a pointer from now on. Existing tags
  stay until a sweep of the 31 lists each one for him to keep or drop.
  📌 **Claimed 2026-10-01 (`faves-55`).**
