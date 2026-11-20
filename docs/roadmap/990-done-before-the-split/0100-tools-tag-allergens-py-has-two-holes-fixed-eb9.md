- [x] ✅ **`tools/tag_allergens.py` has two holes — fixed `eb9b38f`.** Cheddar
  plus 13 further named cheeses join the dairy rule as **STATED**; `tartare
  sauce` joins egg as **DERIVED**; `tortilla`/`burrito`/`quesadilla` join gluten
  as **DERIVED**, with a `corn tortilla`/`rice paper` exclusion so the rule does
  not over-reach. **6 real missing tags were found and applied**: 3 ×
  `contains-dairy` on Hell Pizza, 3 × `contains-egg` on fish dinners at KTC and
  Takeaway @ Churton. Verified independently 2026-08-16 by re-running the sweep
  on a clean tree: **`0 tag(s) missing — 0 STATED, 0 DERIVED`**, i.e. the corpus
  is settled, not merely the tool patched.
  ⚠️ **What deliberately stays open, and why a rule cannot close it:** three
  `sprig-and-fern-tawa` Cheeseburger twin warnings. Those rows carry stub
  descriptions, and [ADR 0025](../../decisions/) forbids restoring a *positive*
  allergen claim from a stub — inferring presence from an absence of text is the
  one direction the one-way rule does not permit. It needs a human reading the
  physical menu, so it belongs to Theme 4's content backlog, not to tooling.
  🔎 The original item asked for the diff to be treated as the *measure of how
  long this had been wrong*: 6 tags across 55 venues and 1755 dish rows is a
  small number, and the honest reading is that the hole was narrow rather than
  that the corpus was fine — `cheddar` only bites where a menu names the variety
  and never the word "cheese", which is a writing habit, not a cuisine.
  Original text: `[S][tools]` — the dairy rule matches `cheese` but not bare
  `cheddar`; no rule at all for `tartare sauce` (egg) or `tortilla` (gluten);
  fixing them adds tags to existing records, so it is a data change as well as a
  tools change (bump `DATA_VERSION`, expect `validate.py`'s allergen warnings to
  move).
