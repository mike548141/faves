- [x] **28n — Convert the prose size ladders: additive, and no id moves**
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

  📌 **Claimed 2026-10-02 (`faves-4f`): every venue except Abrakebabra.**

  ✅ **First batch landed 2026-10-02 (`faves-4f`, PR #88).** 48 rows became
  `selects` groups: Southern Cross 21, Hotel Bristol 19, Spices Indian 3,
  BurgerFuel 3, Baylands 2. Every dish count and price unchanged (asserted
  per venue); no allergen tag changed; identical ladders share one group.
  The rule applied: convert only when the menu names every rung, including
  the one at the dish's printed price. So Victoria (56 offers), Borough (42),
  Khandallah (9), Simmer (5), Petone (1) and 15 Southern Cross offers stay
  prose: an unnamed larger pour, or an unlabelled rung at the dish's own
  price. Victoria's one clean candidate (Lucky's espresso, black/white) was
  reverted: trimming "with milk" orphaned the dish's `contains-dairy` tip.
  🎯 **Owner fork:** ADRs 0130/0133 would allow an unlabelled rung to
  convert, rendering as "$24 size". That would take most of the remaining
  beers and wines. Convert them, or keep them prose?
  📌 **Claim released.** Abrakebabra (the size × protein venue) stays 28o's.

  ✅ **Owner ruled 2026-10-02: convert the unlabelled rungs** as ADRs 0130 and
  0133 already allow (an unlabelled variant reads "$24 size"; nothing
  invented). Those accepted ADRs supersede this item's older "stays prose"
  line for unlabelled sizes; the other two refusals (two volumes at one
  price, an empty slot) still bind. Ready to take, Abrakebabra still last.

  📌 **Claimed 2026-10-02 04:40 UTC (`faves-77`): the second batch, the
  unlabelled rungs the owner ruled convertible (worker in a worktree).
  Abrakebabra still excluded.**

  ✅ **Second batch built 2026-10-02 (`faves-77` worker, PR pending).** 82
  rows became `selects` groups with unlabelled rungs: Victoria 31, Borough 27,
  Southern Cross 15, Khandallah 9. Dish counts (189, 132, 141, 72), ids,
  prices, tags and tagNotes are identical before and after. An unlabelled rung
  has no name and an id `size-N`; a rung the menu names ("425ml", "Large
  glass", "Bottle", "Large", "1L") keeps its name. Left as prose:
  - Victoria 2 rows: Lucky's espresso. Trimming "with milk" orphans the
    `contains-dairy` tip (re-tried, `--explain --check` red, reverted).
  - Simmer 5: two dishes printed on one line ($18 / $16), three happy-hour
    "$1 off" lines. None is a ladder of one dish.
  - Spices Indian 2: the Combo's "without drink" price (a different plate,
    not a size) and the samosa (no dish price to be the default).
  - Petone 1: "All pizzas $24" is a section note, not a ladder.
  Khandallah's Voyage water names its 500ml rung because the dish title does.

  ✅ **Closed 2026-10-02 (`faves-77`, PR #97, merged with CI 8 of 8).** Batch
  two converted 82 rows at four venues (counts and reasons above); every
  convertible ladder outside Abrakebabra is now a choice. What stays prose
  does so under the refusals that still bind, or is not a ladder at all
  (Simmer's five, Spices' two, Petone's section note, Lucky's espresso).
  Abrakebabra stays `28o`'s. Orchestrator checked the Victoria wine render
  at 390 px ("$11 size", "Large glass $19", "Bottle $50") and re-ran
  `gen_summaries --check` and `validate.py` on `main` after the merge.
