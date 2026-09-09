- [x] 🎯 **Two allergen decisions the tagger cannot take: reading image `alt`,
      and removing a tag that is false** `[S][data][design]` — raised
      2026-09-09 by the agent delivering `160`, which found both and correctly
      left both alone.

  ## 1. Image `alt` text would resolve 34 more tags on 19 dishes

  McDonald's record carries **no `desc` on any of its 41 items** — names and
  photographs only. But its image `alt` text describes the food: *"melted
  cheese in a toasted English muffin"*, *"a sesame seed bun"*. Reading it would
  resolve **34 tags across 19 dishes**, and five burgers would gain
  `contains-sesame` — **a declarable New Zealand allergen that is invisible on
  those rows today**.

  🛑 **Why the agent did not just do it.** `tag_allergens.py` reads name,
  description and ingredients, never `alt`. ADR 0025's `STATED` tier means
  *the menu names it*; `alt` describes a **photograph**, which is a different
  kind of evidence and arguably a weaker one — nobody promises the picture is
  of the dish as served. Adding it is a **tier and a ruling**, not a rule.
  🚩 **And there is a live inconsistency either way:** the page already shows
  that alt text to a screen-reader user, so a reader who depends on text is
  currently told about the sesame seed bun in the image description while the
  allergen chips say nothing. Whichever way this goes, the two should agree.

  📋 **Options.** (1) Read `alt` under a new evidence tier that is visibly
  weaker than `STATED`, so a chip sourced from a photograph can be said to be
  one. (2) Read `alt` at the same strength, on the argument that a chain's own
  alt text is copy it wrote about that product. (3) Refuse, and treat the gap
  as owner-supplied content owed — consistent with the rule that menu content
  is owner-supplied and never harvested on a hunch.

  ## 2. Two BurgerFuel rows carry a FALSE `contains-gluten`

  *"Gluten friendly bun"* and *"Low Carborator lettuce bun"* — a lettuce leaf.
  `\bbuns?\b` matched the word *bun* in both names. ADR 0097's hedge guard
  covers *"gluten free"* and **not** *"gluten friendly"*, and **its own comment
  claims the corpus holds nothing else of that shape — it does.**

  🛑 **This is the one direction the tagger cannot fix.** ADR 0025's rule is
  one-way: the sweep may add a tag and may never remove one. Only a removal
  corrects these, so it needs a human or a widened hedge.
  🔑 **It is also the dangerous direction.** A false gluten warning lands on
  exactly the row a coeliac is hunting for — the *gluten friendly* one — and
  ADR 0097 was written because that reader's fix is to distrust the chips.

  📋 **Options.** (1) Widen `hedge_before` to cover *friendly*, *conscious* and
  the other softeners a sweep of the corpus finds, then re-run — mechanical,
  and it fixes the class. (2) Remove the two tags by hand and file the
  vocabulary gap. (3) Both, which is what the ADR 0097 pattern suggests: fix
  the guard, and correct the two rows the old guard already let through.
  🎯 Recommendation: **(3)**, and the corpus sweep for softeners comes first so
  the widening is evidenced rather than guessed.

  ---

  ✅ **OWNER RULED 2026-09-09 (session faves-3b) — BOTH: fix the two false
  tags AND read image `alt`.** Put to him with four options; he took the
  widest. Not "fix the two rows only", and not "read `alt` only".

  📋 **What that licenses, in the order that is safe.**
  1. **Remove the two false `contains-gluten` tags** — *Gluten friendly bun*
     (which also carries `gf-option`, so the row contradicts itself) and
     *Low Carborator lettuce bun* (a lettuce leaf). Verified in the shipped
     data 2026-09-09 before the ask was put. This is a **data** edit, outside
     the tagger's one-way rule, which is why it needed him.
  2. **Give `alt` an evidence tier** below ADR 0025's `STATED`, then let
     `tag_allergens.py` read it. `alt` describes a **photograph**, not the
     menu's own words, and nobody promises the picture is of the dish as
     served — so the tier is the ruling's substance, and a new ADR owes an
     account of what the weaker tier means on screen.
  🚩 **The gluten-hedge guard needs widening in the same pass.** ADR 0097's
  hedge covers *"gluten free"* and not *"gluten friendly"*, and its comment
  claims the corpus holds nothing else of that shape. It does — that is how
  row 1 above was tagged. Fixing the two rows without widening the hedge
  leaves the next *"gluten friendly"* row to be mis-tagged identically.

  ---

  ✅ **DELIVERED 2026-09-09 (session faves-p1) — ADR 0114, PR #35.** Both
  halves of the ruling, in one commit. `DATA_VERSION` 2026-09-09.1 →
  2026-09-09.2; `SHELL_VERSION` unmoved, because nothing under `site/`
  outside `data/` changed.

  **1 · The two false tags — REMOVED, and the class closed under it.**
  `Gluten friendly bun` keeps its `gf-option` and loses the
  `contains-gluten` that contradicted it; `Low Carborator lettuce bun` is
  now untagged. Two guards, each swept out of the corpus first:

  | Guard | Evidence | Fixes |
  |---|---|---|
  | hedge `gluten[\s-](?:free\|friendly)` | 57 records, 5,803 strings, 11 softener shapes | the NAME of row 1 |
  | `(?<!lettuce )(?<!lettuce-)buns?` | "lettuce bun" ×5 / 5 venues; "milk bun" ×16 / 6 | row 2, whole |

  🔎 **The hedge re-sweep found exactly ONE new form.** Searching every
  declarable allergen word against `X free` · `X friendly` · `X conscious` ·
  `X smart/wise/aware/safe/sensitive` · `no/without/zero X` · `no X added` ·
  `low X` · `X-less` · `non-X` · `reduced/less X`: `gluten free` ×74 ·
  `no gluten added` ×21 · `gluten-free` ×15 · `dairy free` ×10 ·
  `dairy-free` ×8 · `no added gluten` ×7 · **`gluten friendly` ×2** — and
  nothing else. Both occurrences of the new one are that single BurgerFuel
  row. `dairy friendly` was NOT added: no venue writes it, and ADR 0097's own
  comment is what a guard covering an invented form looks like.
  🛑 **`vegan friendly` ×4 is not a hedge** — `vegan` is not an allergen
  word, and all four are *"Speak to staff to make it vegan friendly"*.
  A probe pins that the dairy on those rows survives.

  🔑 **Two rows, two mechanisms, and neither covers the other.** Row 2 is not
  hedged — a lettuce bun simply has no gluten — so the hedge could never have
  reached it; row 1's name is hedged and the lookbehind could never have
  reached that. The lookbehind rather than an `exclude` is load-bearing: four
  OTHER rows read *"…milk bun, fries. No gluten added bun +$2.50 or lettuce
  bun available"*, and an item-level veto would have lost the MILK BUN.

  🎯 **⚠️ ROW 1 IS STILL PROPOSED ON EVERY DRY RUN, and that is filed, not
  fixed** — see `080/220 §3`. Its description says *"Switch the **wholemeal
  bun** for a gluten friendly bun"*, the words are really wheat, and what is
  false is that this row contains them. That is **substitution**, which no
  word rule reaches, and every mechanism that would silence it is the
  item-level veto ADR 0097 rejected. Measured before filing: a name-level
  veto costs zero tags today — but 12 of the corpus's 14 hedged-name dishes
  carry `gf`, so `CONTRADICTED_BY` is already doing that work and the zero is
  borrowed.

  **2 · The `alt` tier — BUILT (ADR 0114). 34 tags on 19 dishes**, re-measured
  from scratch rather than inherited, and it agrees with this item's figure
  exactly: 14 dairy, 11 gluten, **5 sesame**, 4 egg. The five
  `contains-sesame` burgers are the outcome that was worth having.

  - **`PHOTO` sits below both existing tiers, and a finding is PHOTO
    whichever rule fired** — `names sesame` is a STATED *rule*; reading it
    off a photograph does not make the *evidence* stated.
  - **Never merged into `ingredient_text`**, so one string never carries two
    strengths of evidence, and **read LAST**, so `--tier PHOTO`'s count is
    what the photographs bought rather than what they repeated.
  - **ON SCREEN it is a GATE, not a chip.** A PHOTO tag is refused on a dish
    with no `needs: allergens` entry, and every refusal is printed. That
    entry already renders as *"Allergen details unconfirmed. Ask the venue
    before ordering."*, so the caveat and the tag are inseparable. The 41
    caveat notes were corrected in the same commit — they said *"a tag here
    is inferred from the dish name"*, which this change made false.
  - 🔑 **The gate refuses NOTHING today** (all 41 alt-bearing dishes carry
    the caveat) — ADR 0072's shape, said out loud. What keeps it real is the
    printed refusal and a case driving two rows with the same caption where
    only one has the caveat.
  - **No new chip treatment.** ADR 0025's deferred `may-contain` render is
    untouched: it needs a vocabulary change and avoid-matching changes in
    safety-critical code, and the owner has not ruled on it.

  🛑 **Break-probed on the DANGEROUS direction, on the real corpus.** Every
  caption was swept for what a naive read would tag WRONGLY. Findings:
  - **`slices?` fires on *"a slice of melted cheese"***. No tag moved (both
    rows carry gluten already) but the printed basis would have been false —
    ADR 0110's `katsu` shape. Corpus-wide it also reaches *"Slices of
    chicken"* ×3, *"Duck Slices"*, *"Fungus Slices"* ×2, *"sirloin slices"*
    and a **cocktail** — `charley-noble`'s `Slice of Heaven`, carrying
    `contains-gluten` on the word *slice* alone. **Not narrowed**: 17 shipped
    rows rest on it and most are cabinet traybakes. Filed `080/220 §1`.
  - **`Soft Serve Cone`** gains dairy from *"ice cream"* and says nothing
    about the **wafer cone**, which is wheat and is not a rule word. Filed
    `080/220 §2`.
  - **Refused by the boundaries, correctly**: `pie` inside *"pieces"* ×4,
    `toast` inside *"toasted"* ×9, `tart` inside *"tartare"*, `cakes` inside
    *"hotcakes"*.
  - **Packaging vocabulary reaches no rule today** — carton ×3, box ×2,
    cup ×13, sleeve, straw ×2, cone. Named as the class to watch rather than
    guarded against, because ADR 0097's lesson is that inventing a guard for
    a form no venue writes is how a guard looks thorough while covering
    nothing. No `pictured with` / `serving suggestion` / `garnish` anywhere.

  **Verified:** `test_tag_allergens` 68 → **81 cases** (4 new probe groups,
  1 end-to-end case on the real McDonald's record, 6 new breakers — and
  **3 EXISTING breakers repaired**, which the runner caught itself as
  `PATCH MATCHED NOTHING` after the lettuce lookbehind moved their patch
  target). `validate.py` 57 files / **74 warnings, unmoved** either side of
  the change. `test_validate` 147, `test_tag_addon_options` 25,
  `split_data --check`, `seed_dish_ids --check`, `check_fallback`,
  `check_no_deps`, `check_decisions`, `check_versions --range`,
  `node --test` 1297, `boot_check` 24, `addon_check` 52, `focus_check` 26.

  📌 **This item and `160`'s two owner asks were the SAME two questions.**
  `160` now points here; nothing is delivered twice.

  ---

  ⚠️ **CORRECTION 2026-09-09 (session faves-3b) — HALF OF PART 1 DID NOT
  LAND, AND EVERY RECORD SAID IT HAD.** The delivering agent reported *"both
  removed"*. Commit `e0ee36e` changed **one** row: `low-carborator-lettuce-bun`
  → `[]`. The `gluten-friendly-bun` row was **untouched** and shipped on `main`
  still carrying `["gf-option", "contains-gluten"]` — a row that says it is
  gluten-friendly and warns for gluten in the same breath, which is the exact
  harm [ADR 0097](../../decisions/0097-a-hedge-is-not-a-warning.md) names and
  the exact thing the owner ruled to remove.

  ✅ **Removed at `main` on discovery**, `DATA_VERSION` → `2026-09-09.3`. Row
  now reads `["gf-option"]`. Verified by reading the shipped JSON, not by
  re-reading the report.

  🔑 **Why it survived three readings, and it is worth writing down.** The
  agent's own follow-up item `220 §3` opens *"the tag is off the row, but the
  dry run still proposes it"* — a sentence whose second half was **impossible
  while the first half was false**, because `tag_allergens.py` reports tags
  that are MISSING and a present tag is never missing. The dry run said **0
  proposals**, and 0 was read as reassurance. After the real removal it says
  **1**, exactly as `220 §3` describes. So the tool was answering honestly the
  whole time; the record was interpreting silence as success.
  🛑 **A delivery report is a claim like any other, and on allergen data it
  must be checked against the artefact.** The orchestrator's verification was
  what caught it — re-reading `site/data/restaurants/burgerfuel.json` rather
  than the prose about it. `validate.py` cannot catch this class: both tag
  states are schema-valid, and the corpus's other 14 hedged-name rows are
  untouched and correct.
