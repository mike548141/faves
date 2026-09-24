- [ ] 🚩 **37n — the corpus disagrees with itself about allergens** `[M][data]`
      📌 **CLAIM RELEASED 2026-09-24 (session `3e87e0bf`) — the four owner
      rulings of 2026-09-21 are DELIVERED and merged** (`1afd916`, ADR 0122).
      The report stands at **1 split / 1 row**: `abrakebabra/pizza-slice`,
      which the delivering worker deliberately left reporting because nothing
      says which pizza it is cut from and silencing it would need either a
      venue hard-coded into a corpus-wide table or a section heading read —
      and reading headings is [`470/060`](060-a-section-name-is-evidence-the-tagger-never-reads.md)'s
      answered question, not this item's to pre-empt.
      🛑 **So `--strict` is still NOT reachable, and that is now a known
      one-row gap rather than an unbounded one.** Wiring it is a separate item
      and was not attempted. The bracket stays open for that row alone — the
      sweep and all four rulings are done. **Do not re-run the sweep.**
      📌 **RE-CLAIMED 2026-09-24 (session `3e87e0bf`) for the FOUR OWNER
      RULINGS of 2026-09-21** — narrow the pizza class for Turkish pizza; drop
      `contains-egg` from the `crumbed` watch list; add `italian sausage` to
      the continental exclude; keep Dragonfly's tag. Branch
      `allergen-rulings`.
      ⚠️ **This claim went in AFTER the worker was dispatched, not before, and
      that is the wrong order** — the rule is claim before work, and releasing
      the earlier claim when the sweep delivered left the item open while a
      worker was live on it. No peer took it in the window, so nothing was
      lost; recorded because a near miss that goes unwritten is how the rule
      erodes.
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

  ✅ **ALL FOUR QUESTIONS RULED BY THE OWNER 2026-09-21, AND EXECUTED
  2026-09-24 (branch `allergen-rulings`, [ADR 0122](../../decisions/0122-declining-to-infer-is-not-asserting-an-absence.md)).**
  The report goes **3 class/allergen splits over 44 rows → 1 split over 1 row**.
  🛑 **Not one dish's tags changed, in either direction.** `site/data/` is
  byte-identical, a `tag_allergens.py` dry run proposes 0 tags, and a case in
  the new test suite fingerprints `site/data/` around three report runs so it
  stays that way. Every change is to the CLASS TABLE — what the report
  *watches*, never what the corpus *carries*.
  1. **Turkish pizza — the class narrows.** A new `turkish-pizza` class keeps
     `contains-gluten` and drops `contains-dairy`; the six Abrakebabra rows
     leave the cheese-by-default class. 🔑 **Ruled on the FOOD, not the price.**
     Lahmacun is a wheat flatbread baked with minced meat, onion, tomato and
     parsley — cheese is a variant, not the default. The *Cheese Lovers* row
     being $3 cheaper was offered as evidence and was put to him as **worthless**
     (a cheese-only pizza is cheaper because it has no meat on it); he ruled
     without it. Recorded because a bad argument that reached the right answer
     is the kind that gets reused. **No row gained `contains-dairy` and none
     gained `df`** — narrowing declines to infer a presence, it does not assert
     an absence.
  2. **`crumbed` stops watching `contains-egg`.** 36 rows leave the report. The
     2026-09-07 ruling already said the tagger will never infer it; a class
     that goes on watching for a tag the house has decided not to write can
     never be satisfied, which is [ADR 0072](../../decisions/0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)'s
     decorative-guard shape aimed at this repo's own safety report. The
     `crumbed → contains-gluten` half is untouched and the class still holds
     **75 rows** — verified, because deleting the class satisfies "no longer
     reports" just as well.
  3. **`italian sausage` leaves the wheat-rusk class.** Salsiccia is pork, salt
     and fennel in a natural casing. 4 rows leave the class — Bambina's two
     (the split) and Pizza Pomodoro's two Salsiccia pizzas, which were carriers
     for the wrong reason. 🛑 **Done as a LOOKBEHIND on the `sausages?`
     alternative, NOT as a fifth `exclude` entry beside chorizo and salami**,
     because an `exclude` hit here vetoes the row's membership of the whole
     class: a plate reading *"pork sausages, italian sausage"* would stop being
     watched for the rusk in its **pork** sausages. Break-probed, not argued —
     rebuilt as the veto it fails *"a plate naming BOTH sausages keeps the
     plain one watched"* **and nothing else**.
     ⚠️ Bambina's `italian-sausage-hot-honey` still carries **no tags at all**.
     That is its own defect and it belongs to [`470/060`](060-a-section-name-is-evidence-the-tagger-never-reads.md)
     (it is one of that item's 68 rows) — leaving the sausage class did not
     silence it, because the pizza class never held it either.
  4. **Dragonfly's Taiwanese Popcorn Chicken KEEPS `contains-gluten`.** No code
     change; recorded here so nobody removes it later. Classically the coating
     is sweet-potato starch, so a future session will reason its way to
     removal — but the venue advertises a **`gf-option`** on that dish, which
     is the shop saying the default preparation is not gluten-free. Removing
     the tag would not be declining to infer; it would be **inferring an
     absence** from a cookbook, against the kitchen's own statement.

  🎯 **THE BRACKET STAYS OPEN, and here is exactly what is left.** One row and
  one wiring decision, neither of them the sweep:
  - **`abrakebabra/pizza-slice` still reports, deliberately.** A $4 *"Pizza
    Slice / Chicken."* in the **Sides** section, at a shop whose only pizza is
    Turkish — but it prints neither the word "Turkish" nor anything else saying
    which pizza it is cut from, and no intake material exists for this venue
    (`data/intake/menu-sources.json` has no Abrakebabra row). The two ways to
    silence it are hard-coding the venue into a corpus-wide table of food
    claims, or reading the **section heading** — and that capability is
    `470/060`'s open question, which a child decision may not pre-empt. So it
    reports, and a human rules. A case in the test suite pins its presence so
    nobody silences it by reflex.
  - **`--strict` is therefore still NOT reachable**, and wiring it was out of
    scope for this session. It needs its own item once the row above is called.

  ✅ **The class table gets its first test: `tools/test_allergen_disagreements.py`
  — 14 cases, 6 break-probes, wired into CI and the verify list.** Nothing had
  ever tested any of the table's ten-plus food claims, and the failure mode is
  invisible: a class narrowed to nothing just makes the report **shorter**,
  which reads as progress. 🔑 **Two of the six breakers are about the
  MECHANISM, not the outcome** — on today's corpus the veto and the lookbehind
  print an **identical** report, so no outcome test can tell them apart. `b3`
  and `b6` rebuild each narrowing as the veto and require exactly one synthetic
  menu line to notice. The harness asserts each breaker's covered cases fail
  **and that no other case does**, because a case that fires on every breaker
  localises nothing.

  🔎 **One finding, reported and NOT fixed — and the fault is LIVE, not
  hypothetical.** The `exclude` entries already in the `sausage` class
  (`sausage roll` · chorizo · salami · pepperoni · kransky · lap cheong ·
  Chinese sausage) are vetoes of exactly the shape ruling 3 declines.
  ⚠️ **This paragraph said "nothing is wrong today" when it was first written
  and that was WRONG** — the first measurement counted the rows the veto
  catches and never asked whether any of them *also* named an ordinary sausage.
  Re-measured properly the same day: of the **11** rows vetoed, **3 carry a
  sausage token that is no part of the excluded phrase**, so the veto silences a
  true rusk claim:

  | row | the line | vetoed by |
  |---|---|---|
  | `daily-bakery/sausage-roll` | *"Flaky pastry filled with savoury **sausage**"* | `sausage roll` |
  | `pizza-pomodoro/carne-small` | *"salami, ham, and **sausage**"* | `salami` |
  | `pizza-pomodoro/carne-large` | *"salami, ham, and **sausage**"* | `salami` |

  🔑 **All three already carry `contains-gluten`, so the report reads the same
  either way** — which is exactly why nobody had noticed, and exactly the
  measurement trap the corrected sentence above records. The two Carne rows are
  the fault shape proper: an unqualified *sausage* losing its watch because a
  **salami** sits on the same line. Converting these to lookbehinds is a
  separate finding, outside the four rulings, and it wants its own break-probe
  against `'Caramel slice, with slices of ham'`-shaped lines.

  🚩 **And a bigger finding fell out of it, filed separately as
  [`470/060`](060-a-section-name-is-evidence-the-tagger-never-reads.md):** 68
  items sit under a section named `Pizza`, `Gourmet Burgers` or `Sandwiches`
  carrying neither `contains-gluten` nor `gf`, because **neither tool reads a
  section's name**. Re-measured independently by the orchestrator before
  filing: 230 items in those sections, 162 tagged, **68 not**, across 5 venues.
