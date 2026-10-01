# 0153 — A retired dish id is absorbed on read, and gated against git (28l)

**Status:** accepted · **Date:** 2026-10-02 · roadmap `310/090` (28l), under the
owner's 28j ruling of 2026-09-09 (*"silently absorb it"*)

## Context

A ladder merge (28o, 28p) folds N sibling rows into one dish and puts the
retired ids in its `formerIds`. `findDish` already resolves a retired id, so a
heart on one never read "No longer on the menu". But the menu row never asks
`findDish`: the heart lights on the raw stored id, the rating reads the raw key
and the "favourites" query filters on the raw id. A heart under a retired id
was therefore dark, its rating empty, and its dish hidden by the filter that
asks for it. Measured on 2026-09-28 and again on 2026-10-02 with
`rename_check`. Ten live rows in one venue carry a former id today, so this is
a live defect as well as the merge's precondition.

Three more things were open. Nothing checked that a retired id was claimed at
all. `split_data.py --check` failed every merge, because its round trip
compared raw row counts. And 28l asked for the fix to come before any data
moved.

## Decision

1. **Absorb on read, once the record is in hand.** `formerIdMoves(record)` maps
   each retired id to the dish that claims it. A page passes each record it
   draws hearts against to `favourites.absorb` and `ratings.absorb` before it
   renders: the menu page, the recipe page and the home screen's Favourites
   view (from the search index, which carries `formerIds`). The stores keep
   those moves and apply them on every later read, so a profile switch,
   another tab or a sync pull lands on the live id too. The absorbed heart
   takes the live dish's name, because the ruling is that the heart was always
   on the dish. A heart already on the live dish wins and the retired one
   folds into it.
2. **Nothing is written by the absorb.** The stored string changes at the
   person's next write to that store, as ADR 0152 decided for moved recipes.
   A rating that is never rewritten is still read correctly on every visit,
   because every read absorbs.
3. **The gate is in `validate.py`, against a git ref.** Every id a venue
   answered to at the ref, live or former, must still be answered for in one
   of three ways: claimed in a live dish's `formerIds`, recorded as departed in
   `data/history/dishes/`, or withdrawn in `data/withdrawn/`. The default ref
   is HEAD. CI passes the state before the push. The check prints its scope on
   every run, and says NOT CHECKED when no ref resolves. Run against
   2026-08-20, 09-01 and 09-20, it reports 15 or 16 retirements in each, all
   accounted for and none flagged. So it would have fired on no real commit.
4. **`split_data.py` changes its arithmetic and leaves the history alone.**
   Rows that reach one dish through a retired id fold into one row, and the
   superseded entries they hold are counted instead. Two rows on one live id
   still fail, because that shape is a duplicate.

## Rejected

- **Matching retired ids where they are read**, in `has`, `get` and
  `favouriteDishIds`, instead of moving the entry. There are three call sites
  and more to come. Un-hearting a lit row would add a second heart instead of
  removing the old one. The Favourites view would keep two rows for one dish.
- **Persisting the move when it is absorbed.** That is a rewrite of stored data
  because the data changed, not because the person did something. ADR 0152
  rejected a one-off rewrite at page load for this reason, and
  `tests/storage-writers.test.js` holds the rule.
- **A step in the upgrade chain.** `formerIds` arrive with data, not with a
  build. Each merge would need a `USER_SCHEMA` bump, which pauses older tabs,
  and the step would have to carry the moves as an app-side list.
- **Gating against `find_variants.py`'s proposals.** Those describe a merge
  before it happens. After it, the ids are gone from the tree, and only an
  earlier state can show that they existed.
- **A committed ledger of every id ever issued.** That would be a new store to
  keep in step, and git already is that ledger.
- **Re-keying the price history onto the surviving id.** The rows record what
  each size cost. Merging them would lose that, and only another migration
  could undo it.

## Consequences

- `rename_check` now asserts that a heart, a rating and the favourites query
  reach a dish through its `formerIds`. Before this change it deliberately
  did not.
- A correction that deletes a dish which never existed has no home here except
  `data/withdrawn/`. If that becomes a real case, it is a question for the
  owner.
- **Still open** (not built):
  - Where a merged-away row's record goes (28l item 4, the owner's call).
  - A saved order line on a retired row does not merge with the same plate
    ordered after the merge (28j follow-on 3). Nothing records which size a
    retired row became.
  - Order links minted before a merge keep their old id (`CODEC_VERSION`).
