# 0138 — A recipe ingredient is a fixed, pre-selected add-on

**Status:** accepted
**Date:** 2026-09-28
**Builds:** roadmap `350/020` (22e) step 4, owner-ruled 2026-09-28.
**Extends:** [0048] (`composeTags`) and [0092] (an unstated claim is unknown)
to recipe ingredients · [0070] (the ingredient list's shape).

[0048]: 0048-an-add-on-is-part-of-the-dish-you-are-ordering.md
[0092]: 0092-an-add-on-option-states-what-it-is.md
[0070]: 0070-an-ingredient-list-may-be-grouped-and-the-group-is-part-of-the-line.md

## Context

The owner, from the Chocolate Lava Cakes, 2026-09-28: allergens and diet
labels attach either to the dish as a whole or to *"a particular addon /
ingredient that might be varied"*. For example, someone may use a chocolate
without peanut traces. The reader still sees one row that updates as parts
change. He is not asking for ingredient swapping yet, but he wants *"a single
mechanics that serve both needs to future proof us"*.

In the same session he asked for an info tip on an ingredient (*"You can
substitute with other chocolates, dark is recommended"*), which *"may be
specified by me, the recipe/restaurant source, or inferred by you"*.

## Decision

1. **An ingredient line may be an object**: `{ text, tags?, trace?,
   traceSource?, note?, noteSource? }`. Its `text` is its identity for the
   tick key, the scaler, the shopping list and cook mode, so an object line
   behaves exactly as the string it replaced.
2. **A line with `tags` is a part, and a part is an add-on option that is
   always selected.** `ingredients.js` `composeRecipe` hands the parts to
   `addons.js` `composeTags` unchanged. Allergens union in. A diet claim
   survives only if every part states it and none contradicts it, so an
   untagged part is unknown and never safe (0092). One mechanism, two
   callers.
3. **Composed once, at the load seam** (`data.js` `load`), not on the recipe
   page. Every consumer of `item.tags` then sees the part's allergen: the menu
   row, the flagged accent, the diet filter, search and the report screen. A
   page-level composition would have left all of those silently missing the
   chocolate's soy. `ownTags` keeps the dish's own set for a future swap to
   recompose from.
4. **A part carries its own trace** (0136); `partTrace` feeds the tag row.
5. **Notes say who wrote them.** `noteSource` is `owner`, `publisher` or
   `inferred`, and an inferred note reads *"Our suggestion, not the recipe's:"*
   on screen. It opens from an ⓘ at the end of its line (`disclosure()`,
   placed outside the tick's label).
6. **The gates.** `validate.py` refuses a dish diet claim that a part does not
   state. Composition would otherwise drop it on screen with nothing saying
   why: the recipe page has no picker to explain it the way the add-on picker
   does. It also refuses a trace on a line with no tags, and a note with no
   source. The tagger (`tag_allergens.py` `ingredient_lines`) never reads a
   part's words: doing so would write the part's allergens onto the whole
   dish, where swapping the part could never remove them.

## Consequences

- The lava cakes' and brownie's chocolate lines are parts: `["v",
  "contains-soy"]` plus the Whittaker's trace. Soy left the lava cakes' own
  tags and comes from the part instead.
  🚩 **The brownie gained `contains-soy`.** Its line reads "dark chocolate,
  preferably Whittaker's", and Whittaker's 72% states *"CONTAINS: SOY"*.
  Under [0025] (infer by default) that is a tag. It is the one warning this
  step added rather than moved.
- The lava cakes' chocolate carries the owner's note, source `owner`, in his
  words with the spelling corrected. It is flagged to him because
  substituting the chocolate changes what the line's tags describe.
- A tip for a tag only a part carries reads *"From the ingredients: <the
  line>."*, generated at load. The tagger's `tagNotes` still explain only the
  dish's own tags.
- Venue add-ons are unchanged. The shared half is `composeTags`, which was
  already there.

[0025]: 0025-infer-allergens-by-default.md
