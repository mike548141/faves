- [x] 🔎 **The record store keys history on names, not ids, and its documents
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

  ✅ **DELIVERED 2026-09-08 (session faves-o1).** Worktree
  `/Users/mike/worktrees/faves-o1-history-rekey`, branch `history-rekey`,
  ADR 0099. Nothing under `site/` changed: `check_versions.py --range
  origin/main..HEAD` → *"Version lockstep not in scope: nothing under site/
  changed."*

  **The re-key.** The 227 was re-derived before touching anything — the count
  the review published still held. `--check` before: *"keys: 1 of 227 history
  row(s) joined on dishId · 226 still joined on the name alone"*. One
  `python3 tools/split_data.py --rekey` run: *"✓ split_data --rekey: 227 of 227
  history row(s) re-keyed on sectionId + dishId."* After: *"keys: 227 of 227
  history row(s) joined on dishId · 0 still joined on the name alone"*, and
  `--check` clean over 57 venue files. **No row was unresolved and none was
  guessed at** — every one matched a live dish (212) or its own departed row
  (15) by heading and name before the ids were written. A second `--rekey`
  changes 0 rows. Superseded-entry counts against HEAD are unmoved: 174 + 38
  price entries, 15 departed dishes.

  The 14 departed dishes with no `dishId` on their stored **item** were seeded
  too (`slug(name)`, exactly what `seed_dish_ids.py` wrote for every live dish).
  They left the payload before ids existed, so restoring one verbatim — what
  that store is for — would have produced a dish `validate.py` refuses.

  **The tool.** `dish_key` writes both ids; `same_section` and `same_dish` join
  on them first and fall back to the heading and name only for a row that has
  none; `match_dish` orders its two passes like `findDish` in `dish-id.js`, so a
  live id beats another dish's `formerIds`. `--check` prints the name-only count
  every run, pass or fail, so the fallback cannot quietly become the norm again.

  **Venue renames — both halves, and why.** `read_history` follows a record's
  `formerIds` (already held in step with `renames.js` by `validate.py`, so no
  new field), **and** `--check` now fails on a history file **no venue read**.
  The second is not the belt to the first's braces: the break-probe proved
  `--check` could not see the fault at all. With the `formerIds` fallback
  removed, every other question in the check is asked of an empty record and the
  run passes — which is precisely the "0 with a history file" this item
  describes. Checking that a file's id is *claimed* would also have passed it;
  checking it was *read* is what fires.

  **A third fault, found while fixing the second.** The writer **replaced** the
  history file instead of appending to it, so following §"Refreshing a menu"
  (append a price, run the tool) would have rewritten a venue's whole record
  with the one row that refresh moved — 174 rows down to 1, caught by
  `--check --against` only afterwards. It merges now.

  **Break-probe, verbatim.** Each permitted-rename case reverts one line of the
  tool to its pre-ADR-0099 form and must fail:

  ```
  ✓ control: a clean fixture passes --check
  ✓ a dish renamed with its dishId pinned: passes, and the probe fails it
  ✓ a section heading renamed with its sectionId pinned: passes, and the probe fails it
  ✓ a dish id retired into formerIds: passes, and the probe fails it
  ✓ a venue id corrected, history still under the old id: passes, and the probe fails it
  ✓ an orphaned history file: --check refuses it
  ✓ a refresh appends rather than replacing
  ✓ …and the probe that replaces is caught
  ✓ split_data: 8/8 cases behaved.
  ```

  The venue-rename probe **failed first** — it passed against the version of
  `--check` that only followed `formerIds`, which is how the unread-file check
  came to exist.

  **Validators.** New `tools/check_records.py` covers `data/images/` and
  `data/withdrawn/`; `--selftest` breaks a good fixture 15 ways and catches
  15/15. The hardest assertion runs **file→row**: every dish `image` in the
  payload must have a provenance row, because a photograph published from a
  public repo with nothing saying where we got it is the actual risk. For
  `data/withdrawn/` it enforces the separation that store's own note explains —
  a row there must not also be in `data/history/dishes/`, or `split_data`
  restores the dish twice.

  **CI.** `repo invariants` (already required by `protect-main`, so a step
  inside it is required the moment it lands) gains four: `check_records.py`,
  its `--selftest`, `test_split_data.py`, and `recipe_estimates.py --check` —
  the last of which had run only when a human typed it, while it holds the
  safety invariant that every cook-mode countdown names its source. Nine
  checks in that job became thirteen; its own comment said "nine" and now says
  so.

  **Documentation.** `data/README.md` gains a table of what each store holds,
  who writes it and what checks it. `history/venues/` is gone from both
  documents — nothing ever wrote or read it. ⚠️ **`entities/` and `people/`
  were NOT removed, against the letter of this item**, and that is a deliberate
  deviation reported rather than taken quietly: `registry.py` defines and
  enforces their shape, `test_registry.py` builds them to prove it, and
  `ownership.json` holds `{"edges": []}`. They are an empty store with a
  decided shape, not a phantom, and deleting the description would have opened
  a new documentation gap where ADR 0046's model is written down. They now say
  plainly that they do not exist yet.

  Two more corrections in the same edit: the decisions table said the repo was
  **Private** (public since 2026-08-09 — the one row a reader checks before
  deciding whether a push can be taken back), and *"only a price that actually
  moved needs the series form"* read as a prohibition on the 265 one-entry
  series in the corpus. All 265 are correct, and the derivation is now in the
  document: **213** are what ADR 0047 leaves when it splits a moved price out of
  the payload, **52** (1841 Bar & Restaurant) are one dated reading of a menu
  read once.

  🚩 **Found on `main`, and since fixed by someone else.** While this branch
  was open, `docs/decisions/README.md` on `main` carried an **unresolved merge
  conflict** — `<<<<<<< HEAD` at :1037, `>>>>>>> 6cb391d` at :1074, from commit
  `f6869a6`, straddling the ADR 0096 and 0097 index entries — in the file that
  is the ADR **allocator**. `check_decisions.py` passed throughout, because both
  entries were textually present. It was reported rather than resolved here (it
  was another session's conflict), and `f4a5958` on `main` has since resolved it
  and filed the gap as `340/280`. This branch merged that resolution in; the
  0099 entry is appended after it, and this paragraph is corrected rather than
  left standing, because it was true when written and is not now.

  🚩 **And the allocator collided again, exactly as it is documented to.** This
  record was drafted as **0098**; the post-push check found branch
  `dst-countdown` had already pushed
  `0098-the-verdict-reads-the-wall-clock-the-countdown-counts-real-time.md`.
  Neither is on `main`, so nothing was broken — but per
  `docs/decisions/README.md`, the record with **fewer inbound references
  moves**, not the one that landed second. Measured: theirs 24 occurrences
  across 8 files including `site/js/hours.js` and its tests, mine 12. **This
  one moved, to 0099.**
