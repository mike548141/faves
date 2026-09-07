# 0098 — History joins on ids, and the name tier is a fallback

**Status:** accepted
**Date:** 2026-09-08

## Context

`tools/split_data.py` keys every row in `data/history/` on
`{section heading, dish name, code}`, and added a `dishId` "when the data gives
one". The history files predate ADR 0051 and were never re-keyed, so measured on
2026-09-08: **226 of 227 rows carried no `dishId`, and none carried a
`sectionId`.** The join really ran on the two strings the data model exists to
let a shop change — ADR 0051 permits a dish rename with the id pinned, ADR 0058
permits a heading rename because the anchor comes from the id.

Three documents said otherwise. `ARCHITECTURE.md` §Refreshing: *"The id is what
carries the price history … across the rename."* ADR 0051's consequences:
*"`split_data.py` keys a dish's history on its id."* Neither was true, and
nothing disagreed with them, because no venue with history had ever renamed a
dish. `--check` would have failed on the orphan — the right failure, arriving
after the loss it describes.

Two adjacent faults surfaced while fixing it, both measured rather than reasoned
about:

- **A venue rename never reached the record.** `read_history(vid)` opened the
  new id's filename, found nothing, and `--check` passed reporting
  *"0 with a history file"*. A break-probe proved `--check` could not see this:
  with the fix's `formerIds` fallback removed, every other question in the check
  was asked of an empty record and the run passed.
- **The writer replaced the file it should have appended to.** Running
  `split_data.py` after the documented refresh procedure rewrote a venue's whole
  record with the one row that refresh happened to move. `--check --against`
  catches it afterwards; the writer should never have caused it.

## Decision

**A history row is joined to its dish by `sectionId` and `dishId` first, and by
the section heading plus the dish name only where a row carries no id.** The
heading and the name stay on every key as reading matter for a human, not as the
join. `match_dish` runs two passes in the order `findDish` in
`site/js/dish-id.js` uses — a live id beats another dish's `formerIds` entry —
so retiring an id cannot hijack a row belonging to a dish that still exists.

`--rekey` performed the one-off: **227 of 227 rows resolved**, nothing guessed,
a second run changes nothing. The 14 departed dishes also gained a `dishId` on
their stored *item*, seeded `slug(name)` exactly as `seed_dish_ids.py` wrote
every live one — they left the payload before ids existed, so restoring one
verbatim, which is what that store is for, would have produced a dish
`validate.py` refuses.

`read_history` follows a venue's `formerIds`, `--check` fails on a history file
**no venue read**, and the writer merges instead of replacing.

## Rejected

- **Drop the name tier entirely.** Tempting, and it would make the fallback
  impossible to drift back into. Rejected because the tier is what makes the
  re-key *safe*: a row that cannot be resolved to an id is left keyed as it was
  and reported, rather than guessed at. A guess here points a price series at a
  dish that never had that price — worse than a name-keyed row, and silent.
  What replaces the deletion is a **count**: `--check` prints how many rows are
  still joined on the name alone, every run, pass or fail. The fallback can no
  longer become the norm without saying so on the line above the tick.
- **Derive `dishId` as `slug(name)` for keys that lack one.** This is what the
  old comment declined to do, and it was right: a derived id moves when the shop
  renames the dish, which is the whole failure. Ids are only ever read from the
  data, never derived — the one exception is the departed items above, where the
  slug is not a join key but the id the payload would have carried.
- **Check that every history file's id is *claimed* by a venue** (its own id or
  a `formerIds` entry) rather than that it was *read*. Simpler, and it passes on
  the exact failure it exists to catch: with the rename fallback broken, the
  file is still claimed, still unread, and still invisible to every other
  question. The break-probe in `tools/test_split_data.py` is what settled this —
  the claimed-id version passed it.
- **Migrate the file automatically on a venue rename** (write the new id, delete
  the old). Rejected as machinery with no case in the corpus to exercise it: the
  read fallback already makes the rename harmless, and a tool that deletes a
  history file is the shape ADR 0023 exists to prevent. `--check` names the file
  and the venue instead, and a human moves it.

## Consequences

- A dish or heading rename the data model permits no longer orphans a price
  series. `tools/test_split_data.py` holds this: four permitted-rename cases,
  each **paired with a break-probe** that reverts the id-first line and must
  fail, plus two refusal cases. 8/8, and it runs in CI.
- Every key `split_data.py` writes from now on carries both ids, because the
  payload requires `dishId` (`seed_dish_ids.py --check`) and `sectionId`
  (`seed_section_ids.py --check`) on everything.
- The record store's diff got wider: 227 rows gained two lines each. That is the
  one-off cost of a re-key and does not recur.
- `data/history/` still holds no record of a rename that has *happened* — the
  ids make one survivable, they do not log it. Nothing needs that today; said
  here so a future session does not read this ADR as promising it.
