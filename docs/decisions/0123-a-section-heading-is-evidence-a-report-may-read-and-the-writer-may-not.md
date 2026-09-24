# 0123 — A section heading is evidence a report may read and the writer may not

**Status**: accepted
**Date**: 2026-09-24
**Answers** roadmap
[`470/060`](../roadmap/470-theme-37-cook-mode-and-the-recipe-page-as-the/060-a-section-name-is-evidence-the-tagger-never-reads.md)
(owner ruling, 2026-09-24) · **applies**
[`0025-infer-allergens-by-default`](0025-infer-allergens-by-default.md) ·
**extends the tier scheme of**
[0114](0114-an-image-caption-is-evidence-one-tier-below-the-menu.md) ·
**is bounded by** [0097](0097-a-hedge-is-not-a-warning.md) and
[0122](0122-declining-to-infer-is-not-asserting-an-absence.md)

## Context

`tools/tag_allergens.py` reads a dish's `name`, the parts of its `desc` that are
not priced add-ons, its `ingredients`, its photo `alt` and — since 2026-08-17 —
its section's `note`. It has never read the section's own **`section`** field:
the heading the shop printed over the dish.

The cost was measured before this record was written. **230** items sit in a
section named `Pizza` / `Gourmet Pizza` / `Gourmet Burgers` / `Sandwiches` /
`Pizzas`. **162** carried `contains-gluten` or `gf`; **68** carried neither —
and the split ran *inside* single sections. `hell-pizza`'s *Morning After Pizza*
warned about gluten and *Mordor*, off the same dough in the same oven, said
nothing, because the tag tracked whether the **dish's own name** happened to
contain the word "pizza". `tools/allergen_disagreements.py` is blind the same
way, so the two tools' agreement was never corroboration.

The owner ruled on 2026-09-24: **both halves, data first**. The 68 rows were
tagged by hand on the heading the shop wrote (67 tagged, 1 declined), and then
the tool was taught to read the field, behind a break-probe written **before**
the feature because the danger he was shown — a section called *"Gluten Free
Pizza"* feeding the word `pizza` to the gluten rule — lands on exactly the row a
coeliac is hunting for.

🔑 **The probe found a bigger danger than the one it was written for, and it
found it by measurement.** A dry run of the heading against all 57 records
produced **70 findings the corpus does not already carry, and roughly 48 of them
are false.** They fall into two classes, neither of which any hedge can see:

| class | what a word match does with it | live rows |
|---|---|---|
| **The heading is a DISJUNCTION** — it names the *union* of what sits under it | reads it as a claim about every member | `Beer & Cider` → `contains-gluten` on an apple cider ×11 · `Chicken & Fish` → `contains-fish` on Chicken McNuggets ×7 · `Sushi & Sashimi` → `contains-fish` on an Avocado Roll ×16 · `Laksa & Noodle Soup` → `contains-shellfish` on a Beef Noodle Soup ×5 · `Waffle & Popcorn` → gluten on popcorn ×5 |
| **The heading is not about food** | reads a category of transaction as an ingredient | `hell-pizza`'s **Anti Pizza** — the venue's own word for the part of its menu that is *not* a pizza, holding a lamb shank · BurgerFuel's **Bun swaps**, holding `Gluten friendly bun` and `Low Carborator lettuce bun` |

🛑 **That second row is the whole argument.** Those two BurgerFuel rows are the
exact rows [0097](0097-a-hedge-is-not-a-warning.md) and
[0116](0116-a-substitution-names-the-food-you-are-not-getting.md) were written
to keep a false gluten warning off. The heading `Bun swaps` says "Bun"
with **no negation anywhere near it**, so `hedge_before` has nothing to
cancel. A writing
section-tier would have put a gluten warning back on a gluten-friendly bun,
undoing two records with one line.

## Decision

**The section heading is read, reported, and never written.** It is a fourth
tier, `SECTION`, below `PHOTO`, and `--apply` splits it off before anything can
reach the patcher.

- **`section_text(section)` is separate text, never merged into
  `ingredient_text()`** — [0114](0114-an-image-caption-is-evidence-one-tier-below-the-menu.md)'s
  reason, unchanged. Glue the heading onto the dish's name and one string
  carries two strengths of evidence, `first_unhedged` lets a hedge in one cancel
  a match in the other, and the tier cannot be counted — so the refusal to write
  could not be *expressed*.
- **The tier goes last**, after the dish's own words, the note and the caption,
  so `--tier SECTION`'s count is what reading the heading actually *buys*.
- **The existing hedge machinery is reused, not duplicated.** `first_unhedged`
  on the heading cancels *"Gluten Free Pizza"* exactly as it cancels *"Gluten
  free toast"*, and `declared_free` on a heading that is **nothing but** the
  claim (`Gluten Free`) silences that allergen for the dishes underneath, read
  the way a `gf` tag is read. Writing a second rule for the same question is the
  duplicated-rule failure this repo has already paid for.
- **The count prints on every run; the list prints on `--tier SECTION`.** The
  count is the tripwire — N going to N+1 is a dish that arrived under a heading
  naming what it is made of. The list is on demand because two thirds of it is
  the disjunction class, and a report nobody reads is worth nothing
  ([0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)).

**The boundary this may not cross is still ADR 0025's.** Nothing here writes
`gf`, `df`, `v` or `vg`, and nothing removes a tag. A heading that declares a
free-from means *we will not claim the allergen is there*, and carries no
opinion about whether it is.

## Alternatives rejected

- **Teach `ingredient_text()` to read the heading — the item's own option 1,
  "one line".** This is the rejection the record exists for. It ships the
  finding at `STATED`/`DERIVED`, which is a *writing* tier, so on today's corpus
  it writes a gluten warning onto an apple cider and onto BurgerFuel's
  gluten-friendly bun. It is break-probed under that name — `break: the heading
  merged into ingredient_text (the item's option 1, shipped)` — and it fails
  three cases, one of which reads the two bun rows off disk after a real
  `--apply`.
- **Write from the heading, but only when the heading is not a disjunction**
  (no `&`, `and`, `/`, `,`). Measured rather than reasoned, because it is a
  good idea and it nearly works: **19 of the 70 survive the filter, and 16 of
  those 19 are right** — the Beer/Fish/Sashimi/Laksa/Waffle classes all go.
  The three that remain are `hell-pizza`'s lamb shank under **Anti Pizza** and
  **both** BurgerFuel bun rows. So the filter's residue is *precisely* the
  rows 0097 and 0116 exist to protect, and a guard that clears the easy cases
  while leaving the dangerous one is worse than none, because it reads as
  thorough. (The same 16 true rows are still reported by the tier as shipped —
  nothing is lost by not writing them.)
- **A `noPropagate` field on a section**, so a venue's `Anti Pizza` could opt
  out. A new precached field that no screen renders, refused by
  [0047](0047-the-app-ships-only-what-it-renders.md), and it answers only the
  cases somebody already noticed.
- **Put it in `allergen_disagreements.py` instead**, which is read-only by
  construction so the harm is structurally impossible. Attractive, and refused
  on where the evidence lives: that tool's classes are corpus-wide *food* claims
  keyed on item text, and section membership would sweep ciders into the `beer`
  class — the same 70 rows, in a table whose entries are supposed to be
  statements about food. The tagger is where a field is read.
- **Report only the rows whose siblings under the same heading are already
  tagged** — the self-contradiction test, which is the defect as 470/060 states
  it. It does not survive the measurement either: under `Beer & Cider` the beers
  *are* tagged, so the ciders still report. Recorded because it is the obvious
  next idea and it costs an afternoon to re-derive.

## Consequences

- **`site/data/` is untouched by this half.** The tagger's dry run proposes
  **0** tags, as it did before, and `tools/allergen_disagreements.py` prints a
  **byte-identical** report — it reads item text and nothing here changed any.
  The data pass that did move 67 rows is a separate commit.
- **The report stands at 70 findings on the day it lands**, and it cannot reach
  zero, for the same reason `--strict` is unreachable in
  [0122](0122-declining-to-infer-is-not-asserting-an-absence.md): some rows are
  uncallable and silence would be a decision taken by default. Said plainly
  rather than left to be discovered.
- 🛑 **The probe caught a decorative guard in this record's own
  implementation.** The first draft of the `declared_free`-on-a-heading group
  asserted that a `Margherita` under a heading called *"Gluten Free"* gains no
  gluten tag — which is true with the guard **deleted**, because no rule matches
  a bare "gluten" at all. The breaker said so, the group was rewritten to put a
  *Toast* and a *Brownie* under that heading, and the guard is now load-bearing.
  A break-probe that is written first still has to be written *honestly*.
- **Six probe groups and four break-probes**, in `tools/test_tag_allergens.py`
  (105 cases, in CI). Each breaker names the case it must fail and fails no
  other: the merged-text one fails three, the writer split one, the heading
  hedge one, the heading declaration one.
- 🚩 **Whether the tagger should ever WRITE from a heading is open, and it is
  the owner's.** This record answers "not on this evidence"; it does not answer
  "never". The 70-row list with each finding's basis is what a decision would
  be taken on, and `--tier SECTION` prints it.
