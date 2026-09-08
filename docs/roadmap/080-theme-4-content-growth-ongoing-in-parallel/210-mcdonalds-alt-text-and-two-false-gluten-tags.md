- [ ] 🎯 **Two allergen decisions the tagger cannot take: reading image `alt`,
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

  ✅ **OWNER RULED 2026-09-09 (session faves-p1) — BOTH: fix the two false
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
