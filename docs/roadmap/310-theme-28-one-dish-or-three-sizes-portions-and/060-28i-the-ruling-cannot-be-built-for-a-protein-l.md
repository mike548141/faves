- [ ] 🎯 **28i — The ruling cannot be built for a protein ladder without one
      more decision: a `selects` option has to be able to ADD a dietary claim,
      and ADR 0048 forbids it** `[S][design][schema]` — the item is small
      because it is one ask; what it unblocks is not. Owner's call, blocking
      `28k`, `28o` and `28p`.

  🛑 **This is the honest gap in `490/050`, found while decomposing it, and it
  is not a detail.** The owner ruled on 2026-09-09 that a protein is a
  **choice on one dish**. ADR 0048 §3 says how a choice composes with its
  dish, in two rules chosen to be fail-safe:

  > *"**Allergens union.** Present on any part ⇒ present on the whole.
  > **Dietary claims intersect.** The whole is vegan only if every part is."*

  The union half works perfectly here: Halloumi carries `contains-dairy`, so a
  merged Kebab warns the moment halloumi is picked. **The intersect half runs
  the wrong way.** Today `Falafel Kebab` carries `v`. After the merge the base
  `Kebab` carries no `v` — because chicken is one of its options — and the
  intersect rule can only ever *remove* a claim, never restore one. So
  **choosing Falafel can never make the dish vegetarian again.**

  🔎 **Measured at `e50c0ee`, not reasoned about.** Across the 133 split-row
  groups, **36 groups have siblings whose dietary claims diverge**, costing
  **43 distinct (group, claim) pairs** and taking a claim off **58 rows that
  carry one today** — `v` overwhelmingly, plus `gf`, `df`, `vg`. Every
  Abrakebabra kebab family, both Baylands groups, the Takeaway at Churton
  chow-mein/chop-suey/fried-rice families, kk-malaysian's curry and laksa.
  A vegetarian reader who filters today finds those 58 rows; after a merge
  built to the rule as written, they find none of them.

  🚩 **ADR 0092 already saw this coming and deliberately did not settle it.**
  Its rejected-alternatives section: Gong Cha's `Regular`/`Large` *"carry no
  ingredient and can never make a drink unsafe, yet they degrade every
  claim … it needs a notion of a group that selects a variant rather than
  adds to the plate, that is a schema question, and inventing one here to
  make a sentence shorter would be the wrong order."* That is this item. What
  is new is the measurement: it is not only noisy prose, it is 58 real
  dietary claims.

  📋 **Options, with costs — offered, not recommended into place.**

  1. **A `selects` option REPLACES the varying dimension rather than adding to
     it.** The base dish carries the tags true of every variant; each option
     carries its own full claim set for the dimension it names; composed tags
     are `base ∪ option` for allergens and **the option's own** claims for the
     dimension. `Kebab` + `Falafel` ⇒ `v`. `Kebab` + `Chicken` ⇒ no `v`.
     - ✅ It is the only option that keeps all 58 claims and matches what a
       reader means by "the vegetarian one".
     - ❌ It amends ADR 0048 §3, the repo's central food-safety rule, and
       introduces the first composition direction that can *strengthen* a
       claim. Every consumer of `composeTags` has to be re-verified, and
       `addon_check.mjs`'s warning-line assertions rewritten.
     - ❌ It puts a new state on the home and menu lists: a dish that *can be*
       vegetarian is neither `v` nor not-`v`. `dietary.js`'s filter has no
       word for that today, and inventing one is its own design job.
     - Cost: `[L]`, its own ADR, and it touches the allergen path.

  2. **Keep the intersect rule and accept the loss.** Merge as ruled; the 58
     claims go.
     - ✅ No rule changes; smallest engineering job.
     - ❌ A vegetarian reader loses 58 findable dishes. `CLAUDE.md` calls
       accessibility and allergen handling non-negotiable, and this is the
       adjacent surface. **Not recommended, stated for completeness.**

  3. **Merge only where the claims agree.** Take the 97 groups whose siblings
     carry the same dietary claims; leave the 36 divergent ones as separate
     dishes with a note.
     - ✅ Nothing is lost, nothing is invented, and it is deliverable now.
     - ✅ It keeps the corpus honest while option 1 is decided on its own
       evidence rather than under migration pressure.
     - ❌ The corpus stays modelled two ways, which is what Theme 14's ruling
       of 2026-08-17 forbade — *"the reader should not be able to tell which
       of the six they are doing"*. That objection is about the **picker's
       controls**, and under (3) both shapes still render as ordinary dish
       rows, so a reader sees no seam; said plainly because it is arguable
       either way and the owner should weigh it himself.
     - ❌ 36 groups stay owed, and an owed exception is how a two-shape corpus
       becomes permanent.

  🎯 **Recommendation: (3) now, (1) as its own ADR next**, and the reasoning
  is sequencing rather than preference. (1) is very likely the right end
  state — it is what the ruling *means* — but it changes a safety rule, and
  changing a safety rule inside a 248-id data migration means a failure in
  either half looks like a failure in the other. (3) delivers 97 of 133 groups
  with no rule change and leaves the safety question its own evidence, its own
  ADR and its own check.

  🚩 **Do not read this item as an argument against the ruling.** The ruling
  is about what a reader thinks they hearted and it stands. This is about the
  one mechanism that cannot express it yet.

  **Depends on:** `28h` (for the enumerator to name the 36 divergent groups).
  **Blocks:** `28k` (the schema), `28o` and `28p` (the two merge items).
