- [ ] **28n — Convert the prose size ladders: additive, and no id moves**
      `[L][data]` — population A of `28h`'s measurement, and this is `28b`'s
      long-standing work finally given a shape to land in.

  🔑 **This is the safe half of the migration and it should be done first.** A
  prose ladder is **one row with one `dishId`** whose second price sits in the
  `desc` string. Converting it attaches a `selects` group and trims the
  sentence: **no id is retired, no heart moves, no history row is orphaned,
  nothing enters `28l`'s gate.** Everything alarming in `490/050` belongs to
  population B (`28o`/`28p`), not here.

  **Measured at `e50c0ee`** (`python3 tools/find_addons.py --quiet`):
  **336 `size-ladder` offers on 187 distinct dish rows across 11 venues.**
  Five venues carry most of it — Abrakebabra 98, Southern Cross 75, The
  Victoria Tavern 56, The Borough Tawa 42, Hotel Bristol 38 = **309 of 336**.

  **Deliver it per venue, not per corpus.** Each venue is one session, one
  commit, one `DATA_VERSION` bump. Suggested order: the four largest
  single-shape venues first (Southern Cross, Victoria, Borough, Bristol),
  then the long tail (Khandallah 9, Simmer 5, Spices Indian 5, Baylands 4,
  BurgerFuel 3, Sprig & Fern Petone 1). **Abrakebabra last** — its 98 rows are
  a size ladder *on top of* a protein ladder (8 groups / 42 rows, the corpus's
  only size × protein venue), so it is really `28o` work wearing `28n`'s
  clothes and should wait until both shapes exist.

  🛑 **`28b`'s three refusals apply row by row and must not be smoothed over:**
  26 rows say the venue does not label the larger size; Hell's 13 drink rows
  state two volumes at one price; and no price may be invented to fill a slot
  the menu left empty. If a row cannot be expressed without inventing a fact,
  it **stays prose** — `find_addons.py` is a reporter that never reaches zero
  and that is by design.

  ✅ **What proves each batch landed.** `find_addons.py --only <venue>` reports
  exactly the rows deliberately left as prose and no others; `validate.py` and
  `check_versions.py` green; `addon_check.mjs` driven against the converted
  venue; and the count of dishes in that record is **unchanged** — a changed
  count means a row was merged, which is not this item's work.

  **Depends on:** `28k`, `28m`. **Does not depend on** `28i`, `28j` or `28l` —
  no id moves, so none of them are in the path. That independence is the
  reason to sequence this item early.
