- [ ] **28k — A group that SELECTS a variant: schema only, no data migrated**
      `[M][schema]` — `490/050` option (a), which the owner's ruling of
      2026-09-09 adopts in substance. Add `kind: "adds" | "selects"` to
      `record.addOnGroups` (ADR 0048 §1's shape), teach `validate.py` about it,
      and stop there. **Not one venue file changes in this item.**

  **What `selects` means, and it is three rules, not one.**
  1. **It chooses a variant instead of adding to the plate**, so it is
     **exempt from ADR 0092's residue sentence** — a `Regular`/`Large` option
     carries no ingredient and must not degrade a claim by being picked. That
     exemption is the whole reason ADR 0092 left this open.
  2. **Its price is the dish's price for that variant, not a delta** — or a
     delta, and this item must pick one and say why. The corpus argues for
     absolute: `Margherita - Small $14.50 / - Large $29.00` is not a $14.50
     surcharge, it is a different plate, and a delta would put arithmetic
     between the menu and the screen for no gain. ADR 0048's `price` on an
     option is already an absolute cost, so `selects` needs its own word.
  3. **Exactly one option is chosen, and one is the default** — unlike
     `select: "one"`, where choosing nothing is legal. A dish with a size has
     a price on the row before anything is tapped, so the default is what
     `item.price` means from then on.

  🛑 **`28b`'s three counter-examples bind this schema and must be expressible
  or explicitly refused**: 26 rows record that the venue *does not label* the
  larger size (`"the menu doesn't label the larger sizes"`), Hell's 13 drink
  rows state two volumes at **one** price, and a required price-per-size would
  force inventing prices the menu never stated. So an option's label may be
  absent and two options may share a price; neither is an error.

  ✅ **What proves it landed.** `validate.py` refuses: a `selects` group with
  no default, with two defaults, with a null price, with `max` set (meaningless
  when exactly one is chosen), and a `selects` group referenced by a dish whose
  own `price` disagrees with its default option. New cases in
  `tools/test_validate.py` — read the tool's own summary for the count, do not
  type one here. One hand-written fixture group in a test file, **not** in
  `site/data/`.

  🚩 **`site/data/` is precached, so ADR 0047's test applies to the field
  itself**: `kind` is downloaded by every phone whether a screen reads it or
  not. The screen that renders it is `28m`'s, so `28k` and `28m` may land
  separately but `28k` must not land far ahead of it.

  **Depends on:** `28i` (its answer decides whether an option may carry a
  dietary claim at all, which is a field on the option). **Blocks:** `28m`,
  `28n`, `28o`.
