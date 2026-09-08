- [x] 🔎 **Nothing joins the photograph population to the records, so a
      harvest cannot report its own coverage** `[S][tools]` — found 2026-09-08
      by the intake audit (session faves-o1). This is the mechanism gap that
      let `020` stay invisible.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — `python3 tools/products.py
  --coverage`, `data/intake/not-products.json`, and
  [ADR 0102](../../decisions/0102-a-harvest-reports-its-own-coverage-and-a-gap-is-not-a-failure.md).
  On CLAUDE.md's verify list.

  **It went in `products.py`, not `product_bursts.py`.** The claim being
  settled is a claim about the STORE — has it read what it was given — which is
  what `--reshoot` already asks one level in. `product_bursts.py` is the
  population's tool and knows nothing about `data/products/`; teaching it to
  read the store inverts the dependency and makes a burst grouper fail because
  a product record is malformed. `products.py` now shells out to it exactly as
  it shells out to `intake_exif.py`.

  🔎 **The measurement, verbatim** (`--coverage --photos <primary checkout>`):

  ```
  Coverage — 183 photograph(s) in 59 burst(s) against 87 product record(s).
    bursts harvested    44
    bursts read, not a product    15 (26 photograph(s))
    bursts with neither            0
    photographs no source.files names    2

  Photographs inside a harvested burst that no source.files names — the
  burst was read, these frames were not:
    · raw_food_photos/IMG_7562.jpeg  (b053)
    · raw_food_photos/IMG_8118.jpeg  (b059)
  ```

  ✅ **Both of this item's known answers reproduce exactly.** 15 uncited
  bursts, and `IMG_7562` (b053) / `IMG_8118` (b059) named by no `source.files`
  while sitting inside harvested bursts. Those two are left alone — they belong
  to `020`.

  🚩 **The composite break-probe is IN THE TOOL, not in a session log**, so the
  number stays measured rather than remembered — `--probe`, verbatim:

  ```
  --probe (before the exclusions are applied): exact-string comparison
  reports 17 uncited burst(s); parsing reports 15.
    composite source.burst fields: b023+b051, b023+b059, b026+b045
    only the naive version calls these uncited: b026, b051
  ```

  `parse_burst()` splits on `+`, requires each part to match `b\d{3}`, and
  refuses anything that does not re-emit its input exactly (ADR 0076's rule) —
  so an unfamiliar spelling is a reported malformed field, never half-read.

  🔑 **"Read, and deliberately not a product" is a tracked record, not a
  silence.** `data/intake/not-products.json` names the 15 bursts with what the
  images hold, how many there are, who read them and when (citing `020`, which
  opened all 26). The file count is the tripwire: if a burst grows, the record
  stops matching. A `notAProduct` flag was rejected — there is no record to put
  it on, and inventing an empty one puts non-products in a product store.

  ⚖️ **A gap reports; a contradiction fails.** Uncited bursts and unnamed
  photographs are WORK and exit 0. What exits 1 is the store disagreeing with
  the population. All four contradiction guards were verified by reintroducing
  the fault — one run, four mutations, four errors and nothing else:

  ```
  error: act-ii-…: source.burst 'b006 + b007' is not a burst id or a
         '+'-joined list of them
  error: not-products.json says b003 holds 9 photograph(s); the burst holds 3.
         Someone added to it after it was read
  error: not-products.json says b006 is not a product, but osm-bar-6-pack was
         harvested from it
  error: not-products.json excludes b099, which is not in the population
  ```

  🛑 **`intake/**` is gitignored, so in CI, on a fresh clone and in EVERY
  WORKTREE this proves nothing** — it prints `intake not present` and exits 0.
  The exclusions file's *shape* is still checked on every `products.py` run,
  which is the only reading it gets there. `--photos` points it at a checkout
  that has the material; that is how the figures above were taken.

  **Two tools, no join.** `tools/product_bursts.py` prints the **population**
  (183 photographs, 59 bursts). `tools/products.py` validates the **records**
  (87 valid, `--stats`, `--reshoot`). **No tool reconciles bursts against
  `data/products/*.json`**, so "how much of the intake has been read" is a
  question the repo cannot answer and never asked. Everything was green
  throughout — [ADR 0072]'s shape exactly: a guard whose output is the same
  whether or not the thing it guards is complete.

  🚩 **And the naive version of the fix gets it wrong.** `source.burst` is
  sometimes a composite (`"b026+b045"`), so an exact-string comparison reports
  **17** uncited bursts where the true answer is **15**. The reconciliation has
  to parse the field, not compare it — which is the whole reason it is worth
  writing once rather than grepping ad hoc.

  📋 **The work**, small: a `--coverage` mode on `products.py` (or a few lines
  in `product_bursts.py`) that prints every burst with no record and every
  photograph named by no `source.files` entry, and a line in the verify list.
  It found this in ten lines when it was finally run by hand.
  🔑 It also wants a way to say **"read, and deliberately not a product"** —
  otherwise the 26 recipe photographs will be reported as a gap forever, which
  is how a check gets switched off.
