- [ ] **28h — The variant enumerator: nothing else here can be sized without
      it** `[M][tools]` — the first part of `490/050`'s decomposition
      (owner ruled 2026-09-09: a size or a protein is a **choice on one dish**).
      Build `tools/find_variants.py`, a reporter over `site/data/restaurants/` <!-- pathscan:allow: the tool this item exists to create — deliberately absent -->
      that names every candidate ladder, classifies its shape, and says what
      joins into it.

  🔎 **Why this is part one and not a footnote: the number the ruling was
  given does not reproduce.** The ask that produced the ruling cited *"348
  size-ladder rows"*; an earlier draft of `490/050` cited **363**. Re-measured
  at `e50c0ee` with `python3 tools/find_addons.py --quiet`:

  | figure | at `e50c0ee` | verdict |
  |---|---|---|
  | `size-ladder` class | **336 offers** on **187 distinct dish rows**, 11 venues | the real prose tally |
  | Theme 28b's total | **363** (`size-ladder` 336 + `diet-substitution-price` 16 + `per-head` 11) | the tool prints this line itself — **363 is right, as an ownership total, not as a row count** |
  | 665 prose offers / 36 venues | **reproduces exactly** | ✅ |
  | **348** | **no combination of the tool's twelve class tallies sums to 348** (checked exhaustively over all 4,095 subsets) | ❌ unreproducible |

  🛑 **And the far more important miss: `find_addons.py` cannot see the
  population that actually carries the risk.** It reads *prose in `desc`*. A
  prose ladder is **one row with one `dishId`** — converting it is purely
  additive and no id ever moves. The rows whose ids *disappear* are the ones
  already split into separate dishes, and **no tool in this repo counts
  them**. Measured with a throwaway script at `e50c0ee`:

  | population | rows | ids at risk |
  |---|---|---|
  | **A — prose ladders** (`"Regular $16.50; large $18.00."`) | 336 offers / **187 rows** / 11 venues | **0** — the row keeps its id |
  | **B — split-row ladders** (Chicken/Lamb/Vegetarian Kebab, each its own dish) | **133 groups / 381 rows / 21 venues** | **248 `dishId`s surrendered** |
  | in both (a protein row that also states two sizes in prose) | 42 rows | — |

  **Three shapes, and they are not evenly spread.** Of the 133 groups:
  **protein 78** (16 venues) · **size 47** (7 venues) · **size × protein 8**
  (one venue — Abrakebabra, where the protein is the row and the size is the
  prose on it). So the corpus does need a two-dimension shape, but exactly one
  venue exercises it today.

  **How ambiguous is the merge?** Comparing siblings field by field: **63 of
  133 groups differ only in name and price** — a mechanical merge is
  defensible. **70 differ in something else** (`tags` 58, `desc` 46, `prices`
  6) and each needs a human. That is `28a`'s argument, now measured: it is
  true of 53% of groups and false for the other 47%.

  **What the tool must do.** Enumerate both populations; classify shape
  (size / protein / size × protein); classify merge difficulty (mechanical vs
  needs-a-human, naming which field diverges); and for each surrendered id,
  report what joins into it — `data/history/prices/`, `data/images/`,
  `picks`, `goesWith`. Exit 0 always, like `find_addons.py`: this is prose
  and judgement, and a gate that can never reach zero gets switched off.

  ✅ **What proves it landed.** `--selftest` break-probes: a fixture whose
  siblings' `tags` agree must be classified mechanical and one whose `tags`
  diverge must not; a group of one must not be reported at all; the
  unmutated corpus must still be classified. Plus the counts above must
  reproduce from the tool rather than from this item — a number typed into a
  roadmap item has gone stale here at least five times. Listed in
  `CLAUDE.md`'s verify block and run in CI.

  **Depends on:** nothing. Everything else here depends on it.
