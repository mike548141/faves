# 0070 — An ingredient list may be grouped, and the component is part of the line's identity

**Status:** Accepted.

**Date:** 2026-08-16

## Context

ROADMAP 37l, from the owner while reading a recipe: *"Some recipes have multiple
components. For example Booth's Ginger Crunch has the base and the icing, look at
how we should organise the ingredients to improve this."*

**The corpus had already answered the first half.** `ingredients` is a flat list
of strings, so four recipes invented grouping by prefixing the component into the
string itself — `"Sauce: 150g brown sugar"`. The counts, measured rather than
eyeballed: Upside-Down Plum Cake **14 of 14** lines, Chocolate Self-Saucing
Pudding 4 of 12, Sticky Date Pudding 3 of 10, Booth's Ginger Crunch 4 of 9. A
convention four records reach for independently is a missing field, not a style
choice, and the plum cake is the proof — the prefix is doing all the structural
work and the reader pays for it on every single row.

`cook.js` had already conceded the point from the other side. `ingredientTerms`
strips a leading `"Label: "` before matching a line against a step, with the
comment *"a group label, not a thing"* — the code was treating the prefix as
structure while the schema insisted it was text.

**The half that was not obvious is the tick.** [ADR
0067](0067-a-tick-is-keyed-on-the-line-not-its-place.md) keys a tick on an FNV-1a
hash of the line's raw text. Splitting `"Sauce: 150g brown sugar"` into
`{component: "Sauce", text: "150g brown sugar"}` changes that text, so ROADMAP
37l recorded the trap: every existing tick on all four recipes would silently
detach. They would not error. They would just stop matching.

## Decision

**1. `ingredients` is a list whose entries are EITHER a plain string OR a group
`{component, items[]}`.** Not a whole-list XOR (flat *or* grouped): Booth's
Ginger Crunch lists its base unlabelled and then names "Ginger icing", which is
how a cookbook reads and which invents no component name the owner never
supplied. A flat recipe is untouched — no migration is forced on the other
twenty.

**2. Loose lines must lead, and a component may not repeat.** Both are enforced
by `tools/validate.py`, not left to the render. A bare line *after* a component
renders under that component's heading while claiming not to belong to it, and
the reader cannot tell which block it is in. Two groups with one name put two
identical headings on a page and, worse, can key two different lines to the same
tick.

**3. The line's tick key is `"<component>: <text>"` — the component is part of
the line's identity, not decoration.** This is the decision the migration trap
was hiding, and it is a correctness question that would have been live even on a
greenfield corpus. **Sticky Date Pudding lists `"60g butter"` in the pudding and
`"Sauce: 60g butter"` in the sauce.** Hash the text alone and those are one key:
tick the butter for the sauce and the pudding's butter ticks itself. ADR 0067's
own rule — *"two lines with identical text share one tick, which is also the
answer a reader would give"* — is right, and these two lines are **not**
identical. The component is what makes them different.

**4. Every consumer reads the list through `site/js/ingredients.js`.** Five
places read `item.ingredients` today: the recipe page, the collection list's
expanded body, cook mode's per-step panel, and two search haystacks. One helper
returns blocks for rendering and flat keys for matching, so no screen has to know
which way a given recipe was written.

## Consequences

**No tick detached.** Because the key is `"<component>: <text>"`, it reproduces
byte-for-byte the string the four recipes already held. Checked programmatically
across all 24 recipes before and after the migration: 0 mismatches. This is a
consequence of decision 3, not its motive — the migration problem dissolved once
the correctness question was answered first, which is the general shape worth
keeping: **ask what the identity IS, and the compatibility question often stops
existing.**

**Cook mode is unaffected, and the schema change is why we know.**
`ingredientsForStep` is called from exactly one place and is now handed the keys
— the same strings it received before — so `ingredientTerms` keeps stripping the
prefix it was already stripping and its tests did not move.

**A component heading is a real `h3`** (an `h5` in the list's expanded body,
under its `h4`), so a grouped list is navigable by heading rather than by bolder
text.

**`tools/tag_allergens.py` had to learn the shape.** It builds its match text
from `name` + `desc` + `ingredients`, and `validate.py` imports it, so a grouped
list broke the *validator* — not the tagger — at the first run. A component name
is a label and never an allergen, so only the items are flattened into the match
text.

**The mutation suite grew 83 → 93.** Ten cases pin the union and its two
readability rules; a shape check alone would have let both rules through.

## Rejected

**A whole-list XOR — flat *or* fully grouped.** It reads cleaner in the schema
and it forces a lie in the data: the ungrouped half of Ginger Crunch, Sticky Date
Pudding and the chocolate pudding would each need a component name ("Base",
"Pudding") that no owner ever supplied. Inventing facts to satisfy a shape is the
wrong trade.

**Keying the tick on the display text and accepting the loss.** ROADMAP 37l
offered this as the honest alternative — "accept the loss knowingly and say so".
It was rejected not because losing ticks is unacceptable but because it is
**wrong on the merits**: the sauce/pudding butter collision means the display
text is not an identity, so a key built on it would keep producing wrong answers
long after the migration was forgotten.

**A `{source, relation}` pair for 37e's attribution**, landed alongside this. One
string holds the credit as it should read. A pair would make the app supply the
framing, and the app cannot know whether a recipe was adapted, taken whole or
merely inspired by its source — guessing that is how a credit becomes wrong.

## What a green run does not show

That the **grouping in the data is true**. Nothing here can tell you that the
plum cake's "Topping" really is a topping; that came from the recipe as the owner
wrote it, and re-cutting a recipe into components no cook recognises would pass
every check in this repo.
