- [ ] 🔎 **Sync still silently discards two OTHER kinds of thing it cannot
      name — a settings field, and a whole store** `[S][js]` — found
      2026-09-20 by the worker delivering
      [`150/030`](030-sync-tells-the-reader-nothing-when-it-disagrees.md),
      while walking every export/import/codec/sync/precache table looking for
      siblings of the allergen bug. **Filed, not fixed** — both are outside
      that item's scope and neither is a safety loss.

  🔑 **Both are the same shape as [ADR 0118](../../decisions/0118-an-allergen-key-a-build-cannot-name-is-carried-not-dropped.md),
  which is exactly why they are worth an item.** That ADR's rule — *a value
  this build cannot name is carried, not dropped* — was applied to precisely
  one field, `diet.avoid`, because that is where the consequence was an
  allergen warning. The walk found the same **mechanism** standing in two more
  places with a smaller consequence, and a rule that holds in one of three
  places is the kind of thing that reads as fixed.

  **(a) `sanitise()`'s field list drops an unknown SETTINGS field.** Same
  chain, one level up from `sanitiseDiet`: a newer build adds a preference, the
  older device strips it on `read()`, the next `set()` commits the stripped
  object, and the newer device's merge reads the absence as a deletion. The
  cost is a **lost preference**, not a lost warning — a reader's choice
  silently reverting after they sync. Worth fixing, worth fixing *second*.

  **(b) `collectPersonalData` gathers unknown stores into an `other` bag, and
  `mergePersonal` drops it.** So a store a newer build introduces is collected,
  serialised, and then discarded at the far end. 🔑 **This one loses nothing
  today** — the local copy is untouched, so the effect is that unknown stores
  simply never sync rather than that anything is destroyed. It is recorded
  because **it is currently written down nowhere**: a reader of `sync.js` would
  reasonably conclude from the `other` bag that forward-compatibility was
  handled, and it is collected but not delivered.

  🚩 **Read (b) carefully before "fixing" it.** Merging a store this build
  cannot name means writing bytes it cannot validate into a reader's device.
  `sync.js` already carries the governing sentence one level up — *"overwriting
  data we do not understand is worse than not syncing it"* — so the current
  behaviour may well be **correct and merely undocumented**. The honest first
  step is a comment saying so, not a merge.

  ⚠️ **And one behaviour change already shipped from the same walk, recorded
  here so it is not mistaken for a regression.** `planImport` compares two
  diets through `sanitiseDiet`. While *both* sides were being stripped, a key
  present in an import file but unknown to the device was invisible and **no
  safety question was asked**. Now it is asked. That is the correct direction,
  and it means an import that used to pass quietly may now prompt.

  📋 **Suggested order, offered not recommended:** (a) is a real if minor loss
  and is a near-copy of a fix already reviewed and merged; (b) is probably a
  documentation job. Neither should be taken without re-reading ADR 0118's
  *Rejected* section, which records the fix that was **declined** as
  disproportionate — the blob declaring each client's vocabulary — because that
  is the option that would close (a), (b) and ADR 0118's own residual hole in
  one move, and it was judged too big for the value. If all three are on the
  table at once that judgement may come out differently, and that is the only
  reason to consider them together.
