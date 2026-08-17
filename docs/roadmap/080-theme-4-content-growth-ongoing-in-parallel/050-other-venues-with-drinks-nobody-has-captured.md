- [~] **Other venues with drinks nobody has captured** `[M][content]` —
      ✅ **the derivation is done 2026-08-16** (`tools/drinks_gap.py`);
      transcribing what it finds stays open and owner-gated.
      **Derived, not re-typed** (same fix as ADR 0041 gave dish-level gaps):
      `python3 tools/drinks_gap.py --gaps` reads `cuisine`/`vibe`/name against
      each record's own section-heading vocabulary (no naive "Beer"/"Wine"
      string match — see the tool's docstring for the 175-heading harvest
      behind it) and finds **3** non-stub venues with a drink signal and no
      drink rows: **1841 Bar & Restaurant**, **Baylands Brewery**, and
      **Sprig + Fern Tawa** (a brewery bar; its record is food-only). Run
      `--count`/`--json` for the full 54-venue picture including the
      `probable`-tier venues (weaker signal — e.g. a bare "Bar" in the
      name, or a bakery/dessert cuisine tag) the strict list above doesn't
      include. ⚠️ **Adding drinks silently affects `priceBand`** — measured
      with `--price-effect`: of the 11 venues that already mix food and
      drink rows, **5 (45%)** get a cheaper blended median than their
      food-only median (never the other way), and 2 of those 5
      (BurgerFuel, Hell Pizza) shipped the cheaper blended band with
      **no curation** — a pre-existing mislabel this item didn't cause but
      did surface, and ✅ **fixed 2026-08-16**: both now carry a curated
      `priceBand: "$$"` and `pricePerPerson` taken from the food-only
      median (15.75 and 23.50 against a `$`/`$$` boundary of 15), matching
      the two 2026-08-15 pubs (Southern Cross, The Borough) plus Khandallah
      Trading Company. All five flippers are now curated; `--price-effect`
      is the regression check. Detail →
      [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md), Theme 4.
      🔑 **Worth keeping:** the mislabel was invisible to every existing
      gate — `validate.py` passes a record with no `priceBand` because the
      field is optional and the app derives one. It took a tool built to
      answer a *different* question (which venues lack drinks?) to surface
      it, which is the argument for deriving worklists rather than eyeballing
      them.
