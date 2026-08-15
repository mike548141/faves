# 0025 — Infer allergens by default where confidence is high

**Status**: accepted
**Date**: 2026-08-09
**Supersedes**: [0024](0024-derived-allergen-tags.md)

> ⚠ **The number 0025 was allocated twice.** This record and
> [`0025-settings-index-and-panels.md`](0025-settings-index-and-panels.md)
> are unrelated decisions sharing one number, found 2026-08-15. It went
> unnoticed because this record was never added to the index in
> [`README.md`](README.md) — the one place the clash would have shown.
> Owner ruled the same day to leave both in place rather than renumber an
> accepted record and break 24 inbound references on a public repo.
> **Cite this one by filename, never as "ADR 0025".** Nothing about the
> decision below changed; this note is filing metadata.

## Context

ADR 0024 (2026-08-08) treated inference as a **narrow exception**: three
enumerated rules (satay → peanut, unnamed "seafood" → shellfish, laksa →
shellfish), permitted because the alternative left a peanut-allergic
reader unwarned at a venue called Satay Noodle House. Everything else
still waited for a menu-writer to spell the allergen out.

The owner ruled on 2026-08-09, verbatim:

> *"I am ruling that it is preferable that we infer information like
> allergens where the menu writer hasn't bothered to define it and we
> have a high confidence that we are correct e.g. if a dish contains
> satay then we can assume it contains peanuts."*

That inverts the default. Inference is no longer an exception needing
justification — it is the **preferred** behaviour wherever confidence is
high, and the burden moves onto *not* tagging.

The gap this closes was large. Before this change the corpus carried 45
gluten tags, 45 dairy, 18 soy, 17 egg and 1 sesame across 1,062 dishes —
so the allergen filter was close to useless for anyone avoiding those
five. It wasn't that the food was free of them; it was that most
menu-writers never mention them.

## Decision

**Infer an allergen wherever a dish's name or description implies it with
high confidence**, via an enumerated, checkable rule set in
`tools/tag_allergens.py`. Applied 2026-08-09: **542 tags** across the
corpus (251 STATED, 291 DERIVED).

**The one-way rule — the hard limit on all of this.** Inference may only
ever *add* a `contains-*` tag. It must never add `gf`, `df`, `v` or
`vg`, and never remove a tag.

- Inferring **presence** is fail-safe. Worst case, someone avoids a dish
  they could have eaten — an inconvenience.
- Inferring **absence** would assert safety from a guess. That is the
  exact failure this feature exists to prevent, and no confidence level
  licences it.

"No tag = not stated" is unchanged and still true: absence still means
we don't know, never that a dish is free of something.

**Two tiers, still recorded**, because the count is what makes the claim
auditable:

- **STATED** — the menu names the allergen or an unambiguous form of it
  ("Prawn Cutlet", "…with Oyster Sauce", "Almond Croissant").
- **DERIVED** — the menu names a dish whose defining ingredient it
  doesn't print (satay → peanut; tempura → wheat and egg; a wheat-flour
  wrapper; an espresso milk drink; laksa → belacan).

**Three guards keep inference from over-reaching**, each earned from a
real false positive found by dry-run against the corpus:

1. **Per-rule exclusions.** "Rice noodles" are not wheat; "peanut
   butter" and "oat milk" are not dairy; "pumpkin pie spice" is not a
   pie; a "fish cake" is not a bakery cake.
2. **Curation outranks a pattern.** A dish already tagged `gf` is never
   given `contains-gluten`; `vg`/`df` block `contains-dairy`; `vg`
   blocks `contains-egg`; `v`/`vg` block the derived shellfish rules.
   (`gf-option` deliberately does *not* block — the default preparation
   still contains gluten.)
3. **Paid add-ons are not ingredients.** "Add chicken, halloumi, prawns
   or beef +$7" does not make a garden salad shellfish.

**"Creamy" is deliberately not matched for dairy.** In the cuisines on
this list it means coconut cream at least as often as dairy — it was
tagging every Malaysian laksa and curry. Losing a few true hits is the
right trade: an inference should under-reach, not mis-fire.

**The UI copy carries the change.** The allergen disclosure already says
tags are "what the venue stated, plus a few we add where the dish name
makes it near-certain". With inference now the default that "a few" is
no longer honest, so the wording is updated to say most tags are ours
and derived from the dish.

## Alternatives rejected

- **Keep 0024's narrow exception.** Rejected by the owner's ruling. It
  also produced a strange result: the app inferred peanut in satay but
  said nothing about wheat in a schnitzel, which is not a defensible
  line to draw for a reader.
- **Infer dietary tags too** (`gf`, `df`, `v`). Rejected on the one-way
  rule — these are claims of *absence*. A dish with no meat words in its
  name is not thereby vegetarian (stock, fish sauce, lard), and marking
  it `v` would be a safety claim built on silence.
- **A `may-contain` tier in the vocabulary**, rendering derived tags
  distinctly. Rejected in 0024 as disproportionate for 36 tags; at 291
  it is *more* attractive, and it remains the obvious upgrade. Still
  deferred: it needs a vocabulary change, new render treatment and
  changes to the avoid-preference matching, all in safety-critical code,
  and the flat tag plus honest copy already gets the warning in front of
  the reader. **This is now the strongest queued follow-up in this area.**
- **Ask each venue.** Correct and unscalable; worth doing
  opportunistically when a menu is next re-verified in store.

## Consequences

- The app **over-warns rather than under-warns**, deliberately. A
  shellfish-avoiding reader now sees a warning on a laksa whose shellfish
  content is inference, and the dietary filter dims it.
- **Watch for alarm fatigue.** 216 gluten tags means most of a fish and
  chip shop's menu now warns — which is *true*, and exactly what a
  coeliac reader needs, but if warnings become wallpaper they stop being
  read. If that shows up in use, the `may-contain` tier above is the
  answer, not a retreat from inference.
- Derived tags are **indistinguishable from stated ones in the data**.
  `tools/tag_allergens.py` is the record of which is which and
  re-running it reproduces the classification.
- The tool **skips rather than guesses** on a record whose items lack
  literal `tags` arrays (a positional patch would write tags onto the
  wrong dishes) and reports what it skipped. `mcdonalds.json` was
  normalised so it participates.
- **New menus inherit this**: `validate.py` warns when the sweep is
  owed, so a transcription can't quietly reintroduce the gap.
