- [ ] 🛑 **A section's NAME is evidence, and neither allergen tool reads it —
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

  🔑 **The mechanism, and it is one line.** `dish_text()` in
  `tools/tag_allergens.py` composes the name, description, ingredients and the
  section's **note** — and never the section's **`section`** field. So the
  single most reliable piece of evidence on the page, the heading the shop
  itself wrote over the dish, is the one input the tagger cannot see.
  `tools/allergen_disagreements.py` is blind the same way, which is why 37n's
  report never named these rows: **both tools share the blind spot, so their
  agreement is not corroboration.**

  ⚠️ **This is NOT the same item as [080/160](../080-theme-4-content-growth-ongoing-in-parallel/160-the-allergen-corpus-has-holes-the-tagger-cannot-see.md).**
  That one is *"the tagger is matching words the menu does not use"* — a
  vocabulary problem inside the text it already reads. This one is a whole
  **input** it never reads at all. Related, and worth reading together, but
  fixing either leaves the other standing.

  📋 **Options, with the trade named. No recommendation — this is a tagging
  policy call and the safety direction runs both ways.**
  1. **Teach `dish_text()` to read the section name.** One line, and it
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
