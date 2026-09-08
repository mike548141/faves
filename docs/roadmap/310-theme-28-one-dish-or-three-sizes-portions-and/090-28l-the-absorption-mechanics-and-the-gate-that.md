- [ ] **28l — The absorption mechanics, and the gate that must exist BEFORE a
      single row is merged** `[M][tools][js]` — the safety rail for `28o` and
      `28p`. Nothing under `site/data/` changes in this item either.

  🛑 **Order matters here more than anywhere else in this decomposition.**
  `28o` retires 248 `dishId`s. Every join listed below already exists; the
  question is only whether it is caught the day it breaks or a fortnight later
  on someone's phone. Build the gate first.

  **What this item delivers.**
  1. **A `formerIds` coverage check.** For every id the enumerator (`28h`)
     reports as surrendered, exactly one live dish must claim it. `validate.py`
     already refuses a former id that is also live, and refuses two dishes
     claiming one — what nothing checks is that a retired id was claimed **at
     all**, and an unclaimed one is a silently dropped heart.
  2. **The favourites-filter fix** — `site/js/menu.js:1714-1720` and
     `site/js/dish-filters.js:123` match the raw `e.dishId` against
     `dish.dataset.dishId` and never consult `findDish`, so `formerIds` does
     not reach them. See `28j` for why this hides the base dish from the reader
     who hearted it. It also already drops pre-ADR-0051 hearts carrying no
     `dishId`, so this is a fix with a live defect behind it, not migration
     scaffolding.
  3. **A ratings re-key**, in the shape `migrateDishKeys`
     (`site/js/dish-id.js:172-194`) already establishes: idempotent, rewrite on
     read, no "have I migrated yet" flag. Hearts need no rewrite (they are
     entry objects re-keyed on every read); ratings do (they store the key
     string). ⚠️ A rating whose dish was never also hearted reaches **no
     screen** — orphan it and it is stored forever, invisible forever.
  4. **A decision, recorded, about where a retired row's record goes.**
     `data/history/dishes/` means *the shop stopped selling it* — false here.
     `data/withdrawn/` means *pulled by policy*, and already holds exactly this
     shape (`data/withdrawn/pizza-pomodoro.json` carries *"Large Margherita
     (Online Deal)"*). Nothing in the code says which store a
     **became-a-choice** row belongs in, and `tools/check_records.py` enforces
     mutual exclusion between them, so guessing costs a red gate. 🎯 If neither
     store fits, that is a third store or a new `reason`, and it is the
     owner's to rule.

  🚩 **Three joins that will NOT be fixed by any of the above, and each needs a
  named answer in this item.**
  - **`tools/recipe_estimates.py --check` does not consult `formerIds`**
    (`:107-115`). A vanished id warns; a new base dish with no estimate
    **errors**.
  - **`picks` are written as names.** 7 of the corpus's 40 picks point at a row
    inside a ladder (`kk-malaysian` Chicken Curry and Chicken Mee Goreng,
    `pandan-asian-cuisine` Beef rendang, `rs-satay-noodle-house` Chicken
    Noodles Soup, `wellington-kebab-grill` Chicken kebab / Mixed iskender /
    Chicken shawarmama box). `validate.py:2033` **errors** on an unresolvable
    pick, so this one at least fails loudly.
  - **Share links cannot be versioned out of it.** `CODEC_VERSION` is compared
    with a strict `!==` and bumping it invalidates every outstanding link
    (`site/js/share-codec.js:139-141`). An order link minted before the merge
    keeps its old id and will never merge with a post-merge line for the same
    plate.

  ✅ **What proves it landed.** A break-probe per rail: remove the `formerIds`
  claim from one base dish and the coverage check must fail naming it; revert
  the favourites-filter fix and the browser assertion in `28j` must fail and
  nothing else; revert the ratings re-key and the seeded rating must go
  unreachable. Plus `python3 tools/split_data.py --check` and
  `python3 tools/check_records.py` green on a fixture where one id has been
  retired — those two already error correctly (`split_data.py:407-419`,
  `check_records.py:125-127`), and this item's job is to make them error
  *before* the data lands, not after.

  **Depends on:** `28h`, `28j`'s answer. **Blocks:** `28o`, `28p`.
