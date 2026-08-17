- [~] 🚩 **37n — the corpus disagrees with itself about allergens** `[M][data]`
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
      🎯 **Four calls for the owner before the sweep runs** — see the questions
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
