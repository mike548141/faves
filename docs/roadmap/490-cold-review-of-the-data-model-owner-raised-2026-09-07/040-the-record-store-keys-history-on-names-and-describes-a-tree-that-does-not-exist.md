- [~] 🔎 **The record store keys history on names, not ids, and its documents
      describe a tree that does not exist** `[M][tools][docs]` — Theme 38 review
      (`../../reviews/2026-09-07-1216-theme-38-cold-review.md` §3c, §7 E2).
      Engineering call; recommended.

  🔒 **CLAIMED 2026-09-08 (session faves-o1, orchestrating)** — the review's
  recommendation is the brief. Delivered by a sub-agent in its own worktree
  (`faves-o1-history-rekey`, branch `history-rekey`), landing by PR so CI
  runs before the merge.

  **The identity finding.** `ARCHITECTURE.md` says *"the id is what carries the
  price history … across the rename"* and ADR 0051's consequences say
  `split_data.py` keys history on the id. Read the tool: `dish_key`
  (`tools/split_data.py:55-75`) adds `dishId` to a key only *"when the data gives
  one"*, the history files predate ids and were never re-keyed, and `same_dish`
  (`:78-87`) matches on section **heading** + name + code whenever the key has no
  id. Measured: **226 of 227 rows carry no `dishId`**; every row keys on the
  heading string, not `sectionId`. So a dish rename ADR 0051 permits, or a heading
  rename ADR 0058 permits, orphans the row. `--check` fails on the orphan — the
  right failure — but the id is doing none of the work the records credit it with.

  **The layout finding.** Documented in `ARCHITECTURE.md:67-74` and
  `data/README.md:34-44` but absent from the tree: `data/entities/`,
  `data/people/`, `data/history/venues/` (no tool writes it). Present in the tree
  and documented in neither: `data/estimates/` (24 recipes, validated by
  `recipe_estimates.py`, not in CI), `data/images/` (41 rows, **no validator**),
  `data/withdrawn/` (2 rows, **no validator** — and the only store keyed on
  `sectionId` and `dishId`, i.e. the only one keyed correctly).

  **Also:** a venue id rename never reaches `data/` — `read_history(vid)` opens the
  file by the new id, finds nothing, and `--check` passes with "0 with a history
  file"; `ARCHITECTURE.md:389` says only a moved price needs the series form while
  265 dishes carry a one-entry series exactly as its own §Refreshing prescribes;
  and the decisions table still says the repo is private.

  📋 **The work.** One tool run that adds `dishId` and `sectionId` to every history
  key (the `--check` round-trip is the proof, already written); a `history/`
  writer that follows `renames.js`; documentation of the three undocumented
  stores; a validator for `images/` and `withdrawn/` (or fold them into
  `split_data --check`); removal of the three phantom directories from both docs.
  No payload change, no schema change.
