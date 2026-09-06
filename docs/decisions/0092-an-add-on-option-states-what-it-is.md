# 0092 — An add-on option states what it IS, and what stays unknown is said once

**Status**: accepted
**Date**: 2026-09-07

## Context

Configuring a dish can kill a dietary claim, and `site/js/addons.js`
`composeTags` reports two shapes for that, deliberately worded apart
(ADR 0048): a **fact** — *"Halloumi contains dairy, so this is no longer
vegan"* — and an **absence** — *"We can't say whether Mushrooms is dairy
free, so we can't say this still is."* `addons-ui.js`'s own header says
flattening the two "would teach the reader to discount both, and a
discounted allergen warning is worse than none."

The rule held and the absence line drowned the facts anyway, by volume
rather than by wording. The owner raised it on 2026-08-17 looking at a
real configuration:

> *"We can't say whether Bacon is vegetarian, so we can't say this still
> is. We can't say whether Bacon is gluten free, so we can't say this
> still is."*

Two sentences, one option, and nobody needs telling bacon is not
vegetarian. Three separate problems, only the last about words:

1. It reports **our data gap** as if it were the reader's risk.
2. It fires **indiscriminately**, so its presence carries no signal.
3. It is **two sentences to say one thing**, repeating the name in both.

He ruled on 2026-08-22: do **(a) tag, then (b) collapse** — close the
data gap first, then collapse only what is genuinely still unknown. The
wording-only option was declined.

**The baseline in the roadmap item was re-derived before touching
anything, and half of it does not survive.** The item recorded 155
options / 62 tagged / 93 untagged / 40% "concentrated in seven venues",
giving **807** option × dish combinations, measured 2026-08-17.
Re-measured against the corpus **at that same commit** (`268c366`), the
first four reproduce exactly — and the venue count is eight, not seven.
**807 does not reproduce by any attachment-respecting method.** It is
reproducible only by crossing every untagged option at a venue against
every claim-bearing dish at that venue *while ignoring which groups are
actually attached to which dishes* — that arithmetic gives 807 to the
unit. Respecting attachment, the real figure at that commit was **72**
untagged-option × claim-dish pairs (158 counting one per claim, which
includes options that carry a tag but are silent about the claim in
question). The problem was real; the headline was about 11× too large.

## Decision

### (a) Two positive tags, and they are NOT allergens

`has-meat` and `has-fish`, applied to **add-on options only** by
`tools/tag_addon_options.py`. They contradict `v` and `vg` in
`CONTRADICTS`, which moves Bacon, Salami, Prosciutto and Salmon off the
absence branch entirely. The line becomes **"Bacon is meat, so this is
no longer vegetarian."**

**Outside the `contains-` namespace on purpose.** Meat is not an
allergen. A ninth `contains-` tag would have joined four separate
allergen tables — the chips in `menu.js` and `recipe.js`, the avoid list
in `settings.js`, the `startsWith("contains-")` filter in `report.js` —
as one nobody can filter on, which is a half-built allergen and its own
kind of dishonesty. `addons.js` `isAllergen` is the same prefix test, so
a `contains-meat` would also have produced a useless plain line
("Bacon contains meat.") on every dish that makes no dietary claim at
all — the exact noise this item exists to remove.

**Legal on an option, an ERROR on a dish** (`validate.py`
`OPTION_ONLY_TAGS`). ADR 0047 asks which screen renders a field: for
these two it is the picker's warning line, reached only through
`composeTags` from an *option's* tags. `menu.js` `tagChip` has no entry
for them, so on a dish they would paint a raw, unexplained chip.

**ADR 0025's one-way rule binds unchanged, and it is why this is small.**
The sweep may only ever state what IS present. It never adds `v`, `vg`,
`gf` or `df` to an option and never removes a tag.

- **Bacon, Salami, Prosciutto, "Extra meat", Salmon** — tagged. The
  option's own name settles it.
- **Spinach, Tomatoes, Rocket, Aloe Vera, the pearls and jellies** —
  nothing. *"Spinach is vegetarian"* is a claim of absence (no meat, no
  fish, no stock) however obvious it looks.
- **"No added gluten bun", "Oat", "Coconut"** — nothing, and REVIEWED
  for a person. "No added gluten" is deliberately weaker than "gluten
  free"; promoting a venue's hedge into a safety tag is the owner's call.
  The corpus is already inconsistent here — "GF bun" and "Gluten Free
  Toast" carry `gf`, the three "no added gluten" rows carry nothing —
  and this ADR does **not** resolve that.
- **Gravy, Patty, "Port jus", "Dry rubbed"** — nothing, and REVIEWED.
  Meat or not is a judgement the name does not settle, and the corpus
  proves it: it carries one `Gravy` tagged `v` and two tagged nothing.

**Measured effect: 18 tags across 6 venues, 17 options gaining their
first tag.** Coverage 64/161 → 81/161 (39% → 50%). Every one of the
remaining 80 is an option about which nothing positive can be said, so
**most of the gap the item asked to close cannot be closed by tagging at
all** — which makes (b) the load-bearing half, not the polish.

### (b) One quiet sentence for the whole configuration

Facts first, one per claim, individual and loud, exactly as before. Every
remaining absence is held back and said **once**, last:

> *"Spinach and Tomatoes aren't tagged vegetarian or gluten free, so
> those labels describe the dish as listed."*

It says **"aren't tagged"**, not "we can't say whether", because that is
the true statement and it is shorter. It never says an extra is safe: the
claim has already been dropped from the dish by the time it renders, and
the sentence explains which labels no longer cover what was configured.

`composeTags` gained `silent` on a `not-stated` drop — **every** chosen
option that failed that claim, not just the first — because naming only
the first would understate the residue. A drop killed by a *fact* carries
no `silent` list: the fact is the news.

**An option can appear in both sentences, and that is correct.** Bacon on
a `v` + `gf-option` dish reads *"Bacon is meat, so this is no longer
vegetarian. Spinach, Tomatoes and Bacon aren't tagged gluten free, so
that label describes the dish as listed."* Bacon says nothing about
gluten, so leaving it out of the gluten sentence would understate the
hedge — and understating a safety hedge is the wrong direction. What must
never happen is one option named twice for the *same* reason, which is
what 14h actually complained about.

### The distinction in `addons-ui.js`'s header survives

More sharply than before: the facts are now first, individual and loud,
and the absence is one closing line. What is flattened is the absence
against **itself**, never against a fact.

## Alternatives rejected

- **Reword only, tag nothing** — the owner declined this on 2026-08-22.
  It papers over a data gap rather than closing it.
- **`contains-meat`, inside the allergen namespace.** Simpler in the
  vocabulary, wrong in every consumer: see above.
- **Infer `v` on obviously-vegetable options** ("Spinach is vegetarian").
  It would close most of the remaining 80 in one sweep, and it is exactly
  the safety claim built on silence that ADR 0025 forbids. Stock, fish
  sauce and lard are all invisible in an option's name.
- **Tag "No added gluten bun" `gf`** from the venue's own words, as "GF
  bun" and "Gluten Free Toast" already are. Defensible and NOT taken:
  the venue chose the weaker phrase, and upgrading its hedge is a food
  safety judgement the sweep must not make. Reported for the owner.
- **Suppress the residue on options that add nothing** — Gong Cha's
  `Regular`/`Large` size options carry no ingredient and can never make a
  drink unsafe, yet they degrade every claim. **Left open deliberately**:
  it needs a notion of a group that selects a variant rather than adds to
  the plate, that is a schema question, and inventing one here to make a
  sentence shorter would be the wrong order. It is the largest remaining
  source of residue and belongs on the board.

## Consequences

- Sixteen options across six venues now positively kill `v`/`vg`, so a
  vegetarian reader configuring a brunch is told a fact instead of a
  hedge. `DATA_VERSION` and `SHELL_VERSION` both move.
- The residue is one sentence per configuration however many options and
  claims feed it — but it is **still there**, and it still costs the
  claim. Nothing here makes an untagged extra read as safe.
- `validate.py` warns when the sweep is owed, so a new menu cannot
  quietly reintroduce the gap, and errors if either tag lands on a dish.
- `tools/tag_addon_options.py` reports what it REFUSES as loudly as what
  it applies. A tool that quietly guesses is worse than one that reports
  a gap, and 80 of 161 options remain a reported gap.
- The roadmap item's **807** is superseded by the numbers above. Anyone
  citing it should cite this record instead.
