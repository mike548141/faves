- [ ] **28s — The checks that would stay GREEN while being wrong** `[M][tools]`
      — swept 2026-09-09 while decomposing `490/050`. The reds are easy; these
      are the ones that would let a bad merge ship, and two of them get
      *quieter* as the fault is applied.

  🛑 **The worst one, and it is an inversion.** `validate.py`
  `check_twin_allergens` (`tools/validate.py:2196–2216`) is the only check in
  the repo that compares one dish's allergen tags against another row's. Its
  join key is the **duplicate display name** — it exists because Sprig & Fern
  lists seven dishes twice and every Gold Card row carried *fewer*
  `contains-*` tags than its twin. A merge removes the duplicate names **and**
  reduces tags to the sibling intersection in the same operation. Afterwards
  `len(rows) < 2` is always true, the sweep emits nothing, and the run reads
  cleaner — **at the exact moment the fault it was built for has been applied
  248 times as policy.** Every neighbouring allergen check is a `warn()` and
  `main()` exits on errors only, so they quieten too.
  ✅ The fix is not to keep the duplicate names: it is to give the check a
  second join — the base dish and its `selects` options — so it compares a
  merged row against its own variants. **This must land with `28k`, not
  after `28o`.**

  🚩 **The other silent passes, each with why it cannot see the change.**
  - **`tools/seed_dish_ids.py --check` reports an id that is MISSING, never
    one that has gone.** It skips any dish that already has a `dishId` and
    never counts rows, so `✓ every dish carries its own dishId` is exactly as
    true of a 3,258-dish corpus as of today's 3,506.
  - **`tools/check_fallback.py` is venue-only** — its three regexes read the
    card, the venue name and the `restaurant.html?id=` href. The word "dish"
    does not appear in the file. Same for `check_precache.py` (path existence)
    and `sw.js` (venue-keyed). **Stated plainly so nobody expects cover here.**
  - **`tools/test_split_data.py` never opens the corpus.** Its venue, price
    rows and dish rows are literals in a `TemporaryDirectory`; `ROOT` is a
    copy source. It will stay 8/8 green while all 212 real history rows are
    orphaned — and its CI job is named *"Prove history is joined to dishes by
    id, not by name"*, which reads as corpus coverage and is not.
  - **`site/js/price.js` moves a venue's price band with nothing watching.**
    `priceBand` takes the **median** of every positive dish price
    (`MIN_ITEMS = 3`). Collapsing eight protein rows priced $18–$22 into one
    moves that median and can move a venue between `$` and `$$` on the home
    card; a thin menu can fall under `MIN_ITEMS` and lose its band entirely.
    `tests/price.test.js` reads no corpus file and no tool asserts any real
    venue's band.
  - **`site/js/search.js` loses 248 index entries and nothing measures the
    real index.** Dishes *are* ranked on names — a name hit outranks a desc
    hit, a name-start outranks mid-word — so what "chicken", "large" and
    "vegetarian" find globally changes. `tests/search.test.js` asserts against
    its own five-record fixture.
  - **`tools/to_top_check.mjs` passes VACUOUSLY if the menu gets shorter.**
    Every presence assertion is gated on `y >= 600` and its verdict is
    `notOffered.length === 0`; a document that no longer reaches the threshold
    scores `past === 0` and prints *"0 positions past the threshold, shown at
    every one"*. Its depth sweep `[1200, 2400, 4000]` is filtered by `maxY`,
    so an empty list skips the up/down assertion the check exists for.
  - **`tools/focus_check.mjs` declares a fixture it never drives** —
    `CONFIG_DISH = "Garden Salad"` and `CONFIG_OPTION = "Prawns"` appear only
    in an interpolated console banner. A live instance of ADR 0072's
    decorative-guard class, printing a dish it did not open.
  - **`tools/device_check.mjs` and `tools/sync_check.mjs` re-derive their
    fixtures** (first allergen-tagged dish; `items[0]` and `items[1]`), so
    they silently change subject rather than fail. `sync_check` drives
    `li.dish[data-name=…]`, which is the **folded name** — if a merge ever
    produced two rows folding alike, `querySelector` takes the first, which is
    the wrong-line bug that family exists to catch.
  - **`validate.py find_dish` cannot tell a resolved pick from a correct
    one.** Its second tier matches `slug(ref)` against `dishId`, so a base
    that keeps `chicken-kebab` while displaying "Kebab" leaves the pick
    `"Chicken kebab"` resolving, silently, to a dish nobody curated. This is a
    second argument for `28o`'s "mint a fresh base id" recommendation.
  - **Nothing anywhere asserts that a stored heart survives a rename** —
    end to end, in a browser. That promise is the whole justification for
    `dishId` existing (ADR 0051) and it is unverified today. `28j` is where it
    gets a check.

  ✅ **What proves this item landed.** Each of the above either gains an
  assertion or gains a **written refusal** saying why it will not: a stated
  "this check is venue-only" is a result, a silent one is the defect. The
  twin-allergen second join and the heart-survives-a-rename assertion are the
  two that must exist before `28o` runs.

  **Depends on:** `28h`. **Blocks:** `28o` (the twin-allergen join and the
  heart assertion, specifically — the rest may land alongside).
