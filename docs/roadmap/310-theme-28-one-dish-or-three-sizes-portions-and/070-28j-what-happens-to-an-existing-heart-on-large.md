- [ ] 🎯 **28j — What happens to an existing heart on "Large Butter Chicken"**
      `[S][design][js]` — small as an ask, `[M]`–`[L]` as whichever option is
      chosen (costed below). The second thing `490/050` says is **owed before
      build**:
      *"a statement of what happens to an existing heart … the day the shape
      changes. Do not migrate data until that is written down."* This is that
      statement, and the fork inside it.

  🔑 **The short answer: the mechanism to save it already exists and costs
  nothing, and the default behaviour without it is a lie on the screen.**

  **What is stored.** A heart is an entry **object** in
  `faves.p.<profileId>.favourites.v1`, keyed on read as `` `d:${venueId}
  ${dishId(e)}` `` (`site/js/favourites.js:63-64`) — per profile, synced
  across devices (`sync-merge.js`), and carried in the backup file and its
  import (`personal-data.js`). A **rating** shares that key byte for byte, but
  is stored as the key *string* in a flat map (`site/js/ratings.js:45-46`), so
  the two need opposite treatment.

  **What happens with no migration.** `findDish` returns `null`, so
  `recheckReferences` (`site/js/data.js:258`) resolves the entry to `"absent"`
  and the reader is told **"No longer on the menu"** — which is false: the
  dish is on the menu, as a size of another row.

  **What happens with `formerIds`.** `findDish`'s fourth tier already
  resolves a retired id through a live dish's `formerIds`
  (`site/js/dish-id.js:110-116`), `validate.py` gates it both ways (a former
  id may not be a live one; only one dish may claim it), and 10 rows in
  `thai-tara-express` use it today. Put the 248 surrendered ids on their base
  dishes and **every heart, rating, deep link and shared shortlist entry keeps
  resolving** — with no client change and no stored rewrite. The heart lands
  on the **dish**, which is exactly what the owner ruled it was.

  🚩 **Three things `formerIds` alone does NOT fix — all found by reading the
  call sites, and all silent.**
  1. **The menu screen's "favourites only" filter would hide the very dish the
     reader hearted.** `site/js/menu.js:1714-1720` builds its set from the raw
     `e.dishId` field and matches it against `dish.dataset.dishId`
     (`menu.js:1932`, `dish-filters.js:123`) — it never goes through
     `findDish`, so no `formerIds` tier applies. A heart on
     `large-butter-chicken` is in the set; no row carries that id; the filter
     shows nothing. (The same line already drops pre-ADR-0051 hearts that have
     no `dishId` at all — an existing defect this migration makes load-bearing.)
  2. **Ratings must be physically re-keyed**; hearts must not. A rating whose
     dish was never also hearted has **no screen at all** (`ratings.js`'s own
     header says so), so an orphaned one is permanently stored and permanently
     invisible.
  3. **A saved order line does not re-resolve.** Lines are fully denormalised
     and will keep reading "Large Butter Chicken $24" — fine — but if the same
     person later adds base + size, `lineKey` differs
     (`site/js/cart.js:68-69`) and the sheet shows **two lines for one plate**
     at two prices. That is ADR 0051's collision inverted.

  📋 **Options for the reader-facing behaviour.**

  1. **Silent absorption.** `formerIds` + the three fixes above. The heart
     becomes a heart on Butter Chicken; the word "Large" is forgotten.
     - ✅ Free mechanism, no new storage shape, nothing to sync or export.
     - ✅ It is what the ruling says a heart *was* all along.
     - ❌ A reader who deliberately hearted the large one is silently
       re-pointed and never told.
     - Cost `[M]`.
  2. **Absorption plus the remembered choice.** The surrendered size is
     written into the entry so the heart reads "Butter Chicken (Large)".
     - ✅ Nothing is lost, and it lines up with Theme 26 (saved orders).
     - ❌ Hearts change shape, and this repo has a recorded incident where a
       new field leaked into backups and order notes were dropped on import,
       both because a whitelist was not walked. Every one of
       `sync-merge.js`, `personal-data.js` export, `personal-data.js` import
       and `share-codec.js` must be walked. Cost `[L]`.
     - ❌ It re-asserts that the size is part of the identity, which is the
       reading the owner rejected.
  3. **Absorption plus telling the reader once** — a one-time line on the
     favourites screen naming what moved.
     - ✅ Honest, and cheap next to (2).
     - ❌ A migration flag and a UI surface that exist for one release, and
       something has to decide when to stop showing it. Cost `[M]`.
  4. **Do nothing.** Named only to be refused: it produces "No longer on the
     menu" on a dish that is on the menu.

  🎯 **Recommendation: (1)**, with (3) available if he wants the courtesy —
  the heart is on the dish by his own ruling, so absorbing it silently is
  consistent rather than lossy, and (2) buys back a distinction the ruling
  says is not part of identity. **This is his call, not the session's.**

  ✅ **What proves it landed** (whichever option): a `device_check`-family
  assertion that seeds a heart under a surrendered id, reloads, and finds the
  base dish hearted **and visible under the favourites filter**; a ratings
  re-key with a break-probe; and the same for one entry arriving through
  `import` and one through `sync`.

  **Depends on:** `28h`. **Blocks:** `28l` (absorption mechanics) and every
  merge item after it.
