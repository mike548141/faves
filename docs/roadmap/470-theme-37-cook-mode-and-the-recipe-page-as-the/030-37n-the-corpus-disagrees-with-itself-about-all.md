- [ ] 🚩 **37n — the corpus disagrees with itself about allergens** `[M][data]`
      📌 **CLAIMED AND DELIVERED 2026-09-20 (session `3e87e0bf`, orchestrated
      queue run); CLAIM RELEASED.** The 2026-09-07 deferral reason was a second
      live agent on the same files; that agent was gone (tree clean, every
      `p1-*` branch merged and pruned), so the sweep ran. **The bracket stays
      open because work is still owed** — four rulings, listed at the foot —
      **not because the sweep is unfinished.** Do not re-run the sweep; read
      the delivery note before touching this.
      — **TOOLING DELIVERED 2026-08-16, THE DATA SWEEP IS NOT.** The report the
      item asked for exists: `tools/allergen_disagreements.py` groups dishes into
      ten declared classes across all 55 venues and names every row whose tagging
      disagrees with its class. It currently reports **7 class/allergen splits
      over 58 rows**. Read-only by design — it reports and never writes, because
      every class is right about the *typical* food and can be wrong about one
      kitchen. **The sweep itself is the open work**, and it is a human pass over
      those 58 rows against [ADR 0025], not a tool run.
      🔑 **`tools/tag_allergens.py`'s silent decline was worse than recorded, and
      measurement — not reasoning — found it.** The first diagnosis said 6 of 55
      files, all caused by add-on options inflating the positional `tags` count.
      A peer measured the corpus and found a **seventh with no add-ons at all**,
      breaking the count the other way: six of its 87 items carry no `tags` key.
      **And the two tags the tool identified and failed to write were both on
      items with no `tags` key** — an item with no tags array is simultaneously
      the most likely to be missing a tag and the thing that makes the whole file
      unpatchable. The decline is not spread across the corpus; it concentrates
      on exactly the records the tool exists to protect. Both causes are fixed
      (structure-aware patching, section notes read and sorted into
      tag/report/ignore), `--apply` now exits **non-zero** when it could not
      write, and `tools/test_tag_allergens.py` pins all of it by putting each bug
      back. This is face 4 of [ADR 0072].
      ✅ **ALL FOUR OWNER CALLS ARE NOW MADE — 2026-09-07 (session faves-b1).
      THE SWEEP IS UNBLOCKED.** Each was put to him in plain language with its
      options, costs and a recommendation; he took the recommendation in all
      four. **Nobody needs to re-ask these.**
      1. **The tier a note-derived tag carries → STATED, unchanged.** A note
         saying "sesame bun" *did* state the allergen; the inference is only
         about scope. Keeps the published audit number intact.
      2. ***"Dairy free cheese available"* → REPORT ONLY, do not tag.** The note
         proves a substitution exists; it does not say which dishes carry the
         default, so tagging would guess at scope. 🔑 He took this **over** the
         fail-safe argument, and the reasoning matters for future calls: an
         over-warning is not free — it trains readers to ignore the warning,
         which is the real cost of tagging on a guess. ADR 0025's one-way rule
         is not a licence to tag whenever tagging is the safer direction.
      3. **`crumbed → contains-egg` → NOT A RELIABLE RULE, report only.** The
         word does not distinguish a house egg-wash from a frozen commercial
         product, and **30 of 42 disagreeing is the corpus saying so already**.
         "Split by venue type" was offered and declined: there is no data field
         for it, so it is report-only with extra steps.
      4. **Add-on options → YES, include them in the report.** They have no
         `dishId` and are not dishes, so rows need handling and the report gets
         marginally messier. Worth it: including them already found one real
         gap, and [`110/040`](../110-theme-5-richer-dish-data/040-an-add-on-naming-fish-carries-no-allergen-warning.md)
         — a salmon add-on carrying no allergen warning at all — is exactly this
         class, found by accident rather than by mechanism.

      ⏸️ **NOT STARTED THIS SESSION, deliberately, and the reason is
      sequencing not effort.** Two agents were already live on 2026-09-07 and
      one of them (`110/040`) owns `tools/tag_addon_options.py`, the allergen
      tables in `site/js/`, and option tags across `site/data/`. The 37n sweep
      touches `tools/tag_allergens.py` (its two known rule defects) and tags
      across the same records. **Running two allergen-editing agents at once
      invites a merge conflict in safety-critical data**, which is the one place
      this repo should not accept one. Next session takes it with all four calls
      already made.

      🎯 ~~**Four calls for the owner before the sweep runs**~~ — **ANSWERED
      ABOVE 2026-09-07.** Original wording kept for the record: — see the questions
      recorded with this session in `SESSIONS.md`: the tier a note-derived tag
      carries; whether *"dairy free cheese available"* should tag or only report;
      whether `crumbed → contains-egg` (30 of 42 disagree) is a real class or a
      bad one; and whether add-on options belong in the report at all.
      🚩 **Two live rule defects found and deliberately not fixed**, because a
      rules change touches every venue and belongs with the sweep: `\bmuffins?\b`
      cannot match "McMuffin" (no word boundary between "c" and "M"), so both
      McDonald's McMuffins can never be found; and the "wheat bakery item" rule
      fires on `slices`, which tagged *"Black Fungus Slices"* as gluten — a
      fail-safe tag for a wrong reason, and an EXCLUDE candidate.

  ✅ **DELIVERED 2026-09-20 (session `3e87e0bf`, branch `allergen-37n-sweep`,
  merged at `322db41`).** The sweep the item had owed since 2026-08-16 is run:
  **8 class/allergen splits over 86 rows → 3 over 44.** 46 tags added across 45
  rows in 16 records, 1 removed. Every addition rests on an ingredient the menu
  itself names — never on a bare dish name.

  🛑 **THE REMOVAL IS THE FINDING, AND THE SECOND RULE BUG WAS WORSE THAN
  FILED.** `slices?` in the *"a wheat bakery item"* rule read **both senses of
  the word**. Swept across every name, description, ingredient and note: 11
  true cabinet slices and **7 false ones** — including one this item never
  mentioned. Charley Noble's cocktail ***Dave Dobbyn · Slice of Heaven*** (gin,
  sherry, amaro, lemon) was the **only one of that venue's six cocktails**
  carrying `contains-gluten`, on the strength of a **song title**.
  🔑 Fixed with a lookbehind/lookahead, **never the `exclude` this item's own
  text proposed** — and that distinction was break-probed rather than argued:
  rebuilding it as the proposed veto fails the assertion *"a cabinet slice is
  still a wheat bakery item"* on the line `'Caramel slice, with slices of ham'`
  while every *"not gluten"* line still passes. The veto would have traded an
  over-warning for a miss, which is the water-chestnut fault this repo has
  already recorded once. `test_tag_allergens.py` 92 → **94 cases**.

  ❌ **The FIRST reported rule bug was NOT REAL, and checking is the point.**
  `\bmuffins?\b` no longer exists — `f7717a1` (2026-09-09, item `080/160`) had
  already made it a compound tail, all five McMuffins carry `contains-gluten`,
  and the test suite already pins it. **Nothing was changed.** Acting on the
  finding as handed over would have been an edit to a working safety rule. A
  findings list is evidence, not a work order.

  🎯 **Four questions left open rather than guessed, each needing a ruling:**
  (1) does an *Italian sausage* carry wheat rusk, or join the continental-
  sausage exclude beside chorizo and salami (Bambina, 2 rows)? (2) Abrakebabra
  sells a **cheaper** *Cheese Lovers Turkish Pizza* ($15 vs $18) — positive
  evidence cheese is **not** its default, so should the pizza class narrow for
  Turkish pizza, or are all six a data gap? (3) Dragonfly's Taiwanese Popcorn
  Chicken **was** tagged, on the venue's own `gf-option` rather than on the
  coating — classically it is sweet-potato starch, so check that call. (4)
  🛑 **The report can never reach zero while the 2026-09-07 ruling on
  `crumbed → contains-egg` stands** — 36 of the 44 remaining rows are that
  class. So `--strict` in CI, the tool's own stated endgame, is unreachable:
  either drop `contains-egg` from that class's watch list or accept a report
  that always fires, which is ADR 0072's decorative-guard shape.

  🚩 **And a bigger finding fell out of it, filed separately as
  [`470/060`](060-a-section-name-is-evidence-the-tagger-never-reads.md):** 68
  items sit under a section named `Pizza`, `Gourmet Burgers` or `Sandwiches`
  carrying neither `contains-gluten` nor `gf`, because **neither tool reads a
  section's name**. Re-measured independently by the orchestrator before
  filing: 230 items in those sections, 162 tagged, **68 not**, across 5 venues.
