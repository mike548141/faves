# 0040 — "No gluten added" and "no gluten option" map onto the closed tag set

**Status:** accepted
**Date:** 2026-08-15

## Context

Three pub menus transcribed on 2026-08-15 (1841, The Borough, Southern Cross)
label gluten with a vocabulary the repo's closed tag set does not contain. Two
of the three print the same legend, near-verbatim:

> (V) vegetarian | (NGA) no gluten added | (NGO) no gluten optional
> We try our absolute best but our kitchen is not a gluten-free zone.

`NGA` says the dish as it is made contains no gluten ingredient. `NGO` says a
gluten-free version can be made on request. Neither says "gluten free", and both
sit under a printed disclaimer that the kitchen shares equipment — the venues are
being careful on purpose, and the wording is the care.

The repo's tag vocabulary is closed and extended deliberately, not ad hoc
(ARCHITECTURE.md, "Tag vocabulary"). It has `gf` and `gf-option`, and nothing
between them. So every dish on these menus forced a choice.

This is a group-wide pattern, not a one-venue quirk — Star Group runs 50+ NZ
venues on this legend and The Borough kept it after leaving the group. The next
session transcribing any of them will hit the same question, which is why it is
recorded rather than left as a code comment.

## Decision

**`NGA` → `gf`. `NGO` → `gf-option`. `VO` → `v-option`.** The venue's own wording
is additionally preserved verbatim in the dish `desc` ("No gluten added"), so the
hedge the menu prints survives to the screen even though the tag flattens it.

`NGO` → `gf-option` is near-exact: both mean "ask and you can have it without
gluten". `NGA` → `gf` is the lossy half, and is the decision being recorded.

## Rejected

- **Add `nga` to the tag vocabulary.** The honest encoding, and it loses to cost:
  a new tag needs a dietary chip, a filter, a translation, a legend entry and a
  place in `dietary.js`'s matching — for a distinction most users read as "gluten
  free" anyway. Revisit if a coeliac user ever asks for it; the data would not
  have to be rewritten, only re-mapped.
- **Leave `NGA` dishes untagged.** "No tag = not stated" is the house rule, so an
  untagged dish is invisible to the gluten-free filter. That discards a fact the
  menu *did* state and makes the filter useless on precisely the venues that
  bothered to mark their menu up. Under-reaching here has a real cost.
- **Map `NGA` → `gf-option` as well.** Safer-sounding, and wrong: it would tell a
  reader they must ask for a modification to a dish that already contains no
  gluten. A false instruction is not a conservative one.

## Consequences

- A `gf` tag in this repo now means "no gluten ingredient", **not** "safe for
  coeliac disease in a dedicated kitchen". That was already true of every `gf`
  tag sourced from a pub menu carrying the same disclaimer; this record makes it
  explicit rather than introducing it.
- The one-way inference rule (`0025-infer-allergens-by-default.md`) is untouched.
  This mapping transcribes what the menu *states*; it is not an inference, and it
  still never removes a `contains-*` tag. `tag_allergens.py` continues to add
  `contains-gluten` to an `NGO` dish, which is correct — the default preparation
  does contain gluten.
- 🚩 **The gap this leaves, raised not patched:** the site cannot currently tell a
  reader that a kitchen is shared. That is a real safety limit, it applies to far
  more than these three venues, and it wants a venue-level disclaimer field
  rather than a per-dish tag. Deferred: three records are not an evidence base
  for a schema change (the restraint `0037-confidence-reads-both-ways.md` applied
  to ageing a field, and ADR 0038 to per-branch provenance).
