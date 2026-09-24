- [x] 🛑 **A section's NAME is evidence, and neither allergen tool reads it —
      ✅ **DONE 2026-09-24, both halves, branch `section-name-evidence`.**
      67 of the 68 rows tagged by hand (1 declined); the tool now reads the
      heading as a fourth tier that is **reported and never written**
      ([ADR 0123](../../decisions/0123-a-section-heading-is-evidence-a-report-may-read-and-the-writer-may-not.md)).
      Full account at the foot of this file.
      📌 **CLAIMED 2026-09-24 (session `3e87e0bf`) — OWNER RULED option (3),
      BOTH HALVES, in that order.** The data pass now, tagging the 68 rows by
      hand on the heading the shop itself wrote; **then** the tool change,
      behind its own break-probe. He was shown the tool-only option and its
      danger — a section named *"Gluten Free Pizza"* would feed the word
      `pizza` to the gluten rule — and the data-only option and its cost, that
      the next pizza added restarts the gap with nothing to notice. Branch
      `section-name-evidence`.
      ⚠️ **Re-measured at `1afd916`, after the four allergen rulings landed:
      still 230 items in those sections, 162 tagged, 68 not, same five venues.
      The rulings did not touch it** — nothing in them reads a section name.
      68 items sit under `Pizza`, `Gourmet Burgers` or `Sandwiches` carrying
      neither `contains-gluten` nor `gf`** `[M][data][tools]` — found
      2026-09-20 by the worker delivering [37n](030-37n-the-corpus-disagrees-with-itself-about-all.md),
      which flagged it as outside its own lane and did not touch it. **Filed,
      not fixed.**

  **The measurement, re-run independently by the orchestrator before filing.**
  Across all 57 records, **230** items live in a section whose name matches
  `pizza|sandwich|burger|toastie`. **162 of them carry `contains-gluten` or
  `gf`. 68 carry neither.** Five venues:

  | venue | rows | example |
  |---|---|---|
  | `hell-pizza` | 29 | *Pandemonium*, in **Gourmet Pizza** |
  | `takeaway-at-churton` | 16 | *Beef & Egg*, in **Gourmet Burgers** |
  | `bambina-pizzeria` | 13 | *Margherita*, in **Pizza** |
  | `sprig-and-fern-tawa` | 6 | *Margherita*, in **Pizza** |
  | `simmer` | 4 | *Meaty boy*, in **Pizzas** |

  🛑 **The corpus contradicts itself inside a single section, which is what
  makes this a defect rather than a gap.** On `hell-pizza`, *Morning After
  Pizza* carries `contains-gluten` and *Mordor* — same section, same dough,
  same oven — carries nothing. The tag tracks whether the **dish's own name**
  happens to contain the word "pizza", not whether the dish is a pizza. A
  reader filtering for gluten sees one of them and not the other, and there is
  no fact about the food behind the difference.

  🔑 **The mechanism, read in the file rather than taken from the report.**
  The composition the matcher runs over is **`ingredient_text()`** in
  `tools/tag_allergens.py` (line ~922): it keeps the item's `name`, each clause
  of its `desc` that is not a priced add-on, and `ingredient_lines(item)`.
  A section's **note** reaches a dish by a separate path (`read_section_note`),
  but the section's own **`section`** field — the heading the shop wrote over
  the dish — is never fed to the matcher at all. Grepped across both tools, the
  only read of `section.get("section")` is at line 1265, where it labels a
  section note **for a human to review**; nothing matches on it.
  `tools/allergen_disagreements.py` is blind the same way, which is why 37n's
  report never named these rows: **both tools share the blind spot, so their
  agreement is not corroboration.**
  ⚠️ **This paragraph named `dish_text()` when the item was filed. There is no
  such function** — the worker's report said so, the orchestrator published it
  unchecked, and a `grep` found it in neither tool. The *finding* survived the
  check and the *citation* did not, which is the difference between a symptom
  and its site. Corrected 2026-09-21 in the same session that introduced it.

  ⚠️ **This is NOT the same item as [080/160](../080-theme-4-content-growth-ongoing-in-parallel/160-the-allergen-corpus-has-holes-the-tagger-cannot-see.md).**
  That one is *"the tagger is matching words the menu does not use"* — a
  vocabulary problem inside the text it already reads. This one is a whole
  **input** it never reads at all. Related, and worth reading together, but
  fixing either leaves the other standing.

  📋 **Options, with the trade named. No recommendation — this is a tagging
  policy call and the safety direction runs both ways.**
  1. **Teach `ingredient_text()` to read the section name.** One line, and it
     changes the report for **all 57 venues at once**, not just these five.
     🛑 The danger is the reason it was probably left out: a section named
     *"Gluten Free Pizza"* would then feed the word **pizza** to the gluten
     rule, and a `gf` section would start tagging its own contents as gluten.
     Any version of this needs the `gf`-section case break-probed **first**,
     not after.
  2. **A 68-row data pass**, tagging by hand with no tool change. Safest per
     row, fixes only today's corpus, and the next pizza added starts the
     count again.
  3. **Both** — the data pass now, the tool change behind its own probe.
  🛑 **What none of these may do is assert an absence.** Adding
  `contains-gluten` to a Margherita rests on the section heading the shop
  wrote, which is positive evidence. Removing one, or adding `gf`, would not.

  🚩 **Why this outranks an ordinary content gap.** Every one of the 68 is a
  wheat product under a heading that says so, sitting in a corpus where 162 of
  its own neighbours are tagged. This is not *"we have not got to it yet"* —
  it is the app saying different things about two identical dishes, and the
  allergen layer is the one surface where that is not a cosmetic defect.

  ---

  ## ✅ Delivered 2026-09-24 — both halves, in the ruled order

  **The count was re-measured independently before anything changed**, at
  `07f79ba`, with a script that walks `site/data/restaurants/` and reproduces
  the filing's own `pizza|sandwich|burger|toastie` section match: **230 items,
  162 carrying `contains-gluten` or `gf`, 68 carrying neither**, same five
  venues in the same proportions. The filing was exactly right.

  ### Part 1 — the data pass (`data: tag 67 rows on the heading the shop wrote`)

  **67 of the 68 gained `contains-gluten`.** One-way only: no `gf`, no `df`,
  nothing removed, and the patch went through `tag_allergens.py`'s own raw-text
  patcher behind an assertion that every byte outside a `tags` array is
  unchanged.

  | venue | tagged | the heading it rests on |
  |---|---|---|
  | `hell-pizza` | 28 | Gourmet Pizza 11 · Vegetarian Pizza 10 · Plant-Based Pizza 4 · Super Gourmet Pizza 3 |
  | `takeaway-at-churton` | 16 | Gourmet Burgers 13 · Toasted Sandwiches 3 |
  | `bambina-pizzeria` | 13 | Pizza 8 · Sandwiches 5 |
  | `sprig-and-fern-tawa` | 6 | Pizza |
  | `simmer` | 4 | Pizzas |

  🛑 **ONE ROW WAS DECLINED, AND IT IS THE CASE THE RULING'S CAUTION EXISTS
  FOR.** `hell-pizza` / **Lamb Shank and Mash**, under the heading **Anti
  Pizza** — Hell's own word for the part of its menu that is *not* a pizza. A
  lamb shank with rosemary and mint gravy, mash and minted peas is not a wheat
  product, and there the heading is evidence **against** the inference. It is
  left untagged and it is the corpus's proof that a heading cannot be trusted
  blind. (The other four items under that heading — ribs and three baked pennes
  — were already tagged and are untouched.)

  🔎 **Two things worth carrying forward.**
  - **10 of the 67 already carried `gf-option`** (`simmer` 4,
    `sprig-and-fern-tawa` 6) — the venue itself saying the default preparation
    is not gluten-free. That is the strongest evidence in the set, and it is
    why ADR 0025's second guard deliberately does **not** let `gf-option` block
    the tag. Those ten were never in doubt.
  - **No section heading anywhere in the corpus declares a free-from.** Swept
    all 57 records for `free|friendly|gf|df|without|no ` in a `section` field:
    the only two hits are `burgerfuel`'s *"Free range chicken"* and
    `the-borough-tawa`'s *"Wine — alcohol free"*, neither of them an allergen
    claim. The *"Gluten Free Pizza"* trap the owner named is **real and not yet
    in the data** — which is the best possible time to have guarded it.

  ### Part 2 — the tool (`tools: read the section heading as its own tier`)

  **The break-probe was written first and watched to fail**, per the ruling.
  Against the unchanged tool, 4 of the 6 groups failed and the two that passed
  are the ones that *must* pass before and after — the unchanged
  `read_section_note()` path, and the control. Then the feature, and all six
  green.

  | probe group | what breaks it |
  |---|---|
  | an ordinary `Pizza` heading reaches the gluten rule, as SECTION | the tier not existing; the tier being merged into a writing one |
  | a hedged heading does not warn about the allergen it negates | `pattern.search` in place of `first_unhedged` on the heading |
  | a heading that is NOTHING BUT a free-from claim silences that allergen | `declared_free(heading)` dropped |
  | the section NOTE path still tags, at its own tier | a refactor merging the two fields |
  | a dish's own words still tag it, under a silent heading | **the control** — a matcher mangled into tagging nothing |
  | a disjunctive heading is reported, never promoted to a writing tier | the tier being written from |
  | *(a real `--apply` on BurgerFuel)* a section heading is reported and never written | anything that lets a heading reach the patcher |

  **Four break-probes, all caught.** The one that matters is
  `break: the heading merged into ingredient_text (the item's option 1,
  shipped)` — it stages this item's own cheapest option exactly as it would
  have landed, and fails three cases including the one that reads BurgerFuel's
  two bun rows off disk after a real write.

  🛑 **THE ANSWER ON THE HEDGE MACHINERY, WHICH IS THE FINDING OF THIS HALF.**
  Reusing it was right and it was not enough. `first_unhedged` cancels *"Gluten
  Free Pizza"* on the heading exactly as it cancels *"Gluten free toast"* in a
  dish name — no second rule, no seven hand-edited patterns — and
  `declared_free` covers a heading that is nothing but the claim. **But the
  hedge is not where the danger lives.** A dry run of the heading over all 57
  records proposes **70 findings and roughly 48 are false**, in two classes no
  hedge can reach because neither contains a negation:

  - **the heading is a DISJUNCTION**, naming the union of what sits under it —
    `Beer & Cider` → `contains-gluten` on an apple cider ×11 · `Chicken & Fish`
    → `contains-fish` on Chicken McNuggets ×7 · `Sushi & Sashimi` → the same on
    an Avocado Roll ×16 · `Laksa & Noodle Soup` → `contains-shellfish` on a Beef
    Noodle Soup ×5 · `Waffle & Popcorn` → gluten on popcorn ×5;
  - **the heading is not about food** — `Anti Pizza` (the lamb shank above) and
    BurgerFuel's `Bun swaps`, which holds `Gluten friendly bun` and `Low
    Carborator lettuce bun`: **the exact two rows ADR 0097 and ADR 0116 were
    written to keep a false gluten warning off.**

  So the heading is a fourth tier, `SECTION`, **reported and never written**
  (ADR 0123). The count prints every run as a tripwire; `--tier SECTION` prints
  the list. A no-disjunction filter was measured rather than argued — **19 of
  the 70 survive it and 16 are right, but the 3 that are wrong are the lamb
  shank and *both* protected bun rows**, so it clears the easy cases and leaves
  the dangerous one while reading as thorough.

  🎯 **ONE THING IS LEFT FOR THE OWNER, and it is deliberately not decided
  here.** Whether the tagger should **ever write** from a heading is his call.
  This delivery answers *"not on this evidence"*; it does not answer *"never"*.
  The 70-row list with every finding's printed basis is what that decision would
  be taken on.

  🔎 **A defect found in passing, and left alone as out of lane.**
  `takeaway-at-churton`'s *Crumb Chicken Fillet* is invisible to the
  `battered|crumbed|schnitzel|katsu|tempura` rule because the menu writes
  **"Crumb"**, not "crumbed". It is tagged here on its heading, and the
  vocabulary gap belongs to
  [080/160](../080-theme-4-content-growth-ongoing-in-parallel/160-the-allergen-corpus-has-holes-the-tagger-cannot-see.md).

  **Verified:** `test_tag_allergens.py` 105/105 with all 4 new breakers caught ·
  `allergen_disagreements.py` **byte-identical before and after both commits**
  (which is the item's own point restated — that report reads item text and is
  blind to every row here) · `test_allergen_disagreements.py` 20/20 ·
  `validate.py` 57 valid · `test_validate.py` · `seed_dish_ids --check` ·
  `split_data --check` · `test_split_data` 8/8 · `check_no_deps` ·
  `check_fallback` · `check_precache` · `check_decisions` · `check_stashes` ·
  `node --test` · `boot_check` · `focus_check` · `check_versions`
  (`DATA_VERSION` `2026-09-20.2` → `2026-09-24.1`).
