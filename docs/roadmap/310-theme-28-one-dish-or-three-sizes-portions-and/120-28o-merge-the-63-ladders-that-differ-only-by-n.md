- [ ] **28o — Merge the 63 ladders that differ only by name and price**
      `[L][data]` — population B of `28h`, the mechanical half. **This is the
      first item in the whole decomposition that retires a `dishId`, and it
      must not start before `28l`'s gate exists.**

  **Measured at `e50c0ee`.** Of the 133 split-row groups, **63 have siblings
  identical in `tags`, `desc`, `addOns`, `served` and `prices`** — the only
  differences are the name and the price. For those, a merge is a mechanical
  transformation and the whole of `28a`'s "once it needs all five it *is* a
  dish" argument does not apply: they need none of the five.

  **What each merge does.** Collapse N rows into one base dish carrying a
  `selects` group of N options; keep **one** sibling's `dishId` as the base
  dish's (do not mint a new one — see below); put the other N−1 into the base
  dish's `formerIds`; re-key that venue's `data/history/prices/` rows onto the
  survivor with `tools/split_data.py`; and record the retired rows.

  🎯 **One engineering fork, decided here rather than left implicit: which id
  survives.** Keeping a sibling's id (say `chicken-kebab`, now displayed
  "Kebab") means that reader's heart never moves at all and only N−1 hearts are
  absorbed — but the surviving id then names a dish that is no longer
  specifically chicken, which is an id that lies to the next person who reads
  the file. Minting `kebab` fresh keeps the data honest and moves **all** N
  hearts through `formerIds`. **Recommend minting fresh**: `formerIds` is the
  supported path and exercising it uniformly is easier to verify than a rule
  with an exception. Stated because it is reversible only by another
  migration.

  🚩 **Do the venue with the most joins LAST, not first.** 57 of the corpus's
  227 price-history rows join to an id inside a ladder, and **all 57 are
  `takeaway-at-churton`** — nine of its groups are in this population. Prove
  the mechanism on a venue with no history first.
  `data/images/` holds 3 more (`mcdonalds` fries small/medium/large).

  ✅ **What proves it landed, per batch.** `28h`'s enumerator reports the
  merged groups gone; every retired id claimed exactly once
  (`28l`'s coverage check); `python3 tools/split_data.py --check` green **and
  its own line reporting 227 of 227 rows still joined on `dishId`, 0 on the
  name alone** — that line is the evidence, not the tick; `check_records.py`
  green; `validate.py` green; a browser assertion that a heart seeded under a
  retired id resolves to the base dish and survives the favourites filter.

  🛑 **A count of dish rows is not proof.** The rows will drop by 248 whether
  the merge was right or wrong. What proves it is the joins, above.

  **Depends on:** `28i`, `28k`, `28l`, `28m`. **Blocks:** `28p`.
