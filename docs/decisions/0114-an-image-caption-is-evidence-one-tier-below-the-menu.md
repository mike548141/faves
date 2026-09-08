# 0114 — An image caption is evidence, one tier below the menu

**Status**: accepted
**Date**: 2026-09-09
**Amends:** [`0025-infer-allergens-by-default.md`](0025-infer-allergens-by-default.md)
— its two tiers become three · [0097](0097-a-hedge-is-not-a-warning.md) — its
corpus sweep for free-from forms was incomplete and is re-run here; the guard it
built is unchanged, only its word list grows

> ADR 0025 is one of two records sharing that number, so it is cited by
> filename. Nothing about its decision changes here; it gains a third tier.

## Context

McDonald's is 41 items with **no `desc` on any of them** — names, prices we
could not read, and photographs. Thirty of the 41 carried no `contains-*` tag
at all after [0110](0110-a-rule-word-may-end-a-compound-never-start-one.md)'s
compound tails had taken what the names allow.

The record does carry prose, in one place nothing read: the image `alt`.
*"A Big Mac: two beef patties, lettuce, cheese, pickles and sauce in a
three-layer sesame seed bun."* Five burgers say **sesame seed bun** and showed
no allergen at all — and sesame is a declarable New Zealand allergen. So the
page already told a screen-reader user about the sesame while the chip row
beside it said nothing, which is the reader who depends on text getting the two
halves of one row to disagree.

Reading it is the owner's ruling of 2026-09-09, put to him with four options
and taken at its widest: **fix the two false gluten tags AND read image `alt`.**

**What is NOT settled by "read it" is what the reading is worth.** ADR 0025's
`STATED` tier means *the menu names it*. An `alt` names what is in a
**photograph**, and three things are true of a picture that are not true of a
menu line:

- **nobody promises the photograph is of the dish as served.** It is a stock
  shot of one variant. The corpus has one already: `McFlurry`'s caption says
  *"crushed biscuit pieces"* — that is the Oreo one, not the flavour a reader
  is buying.
- **the caption is partial by construction**, because it is written for layout
  and for a screen reader rather than as a description of the food. The same
  record's `Hot Chocolate` reads *"in a takeaway cup"* and gains nothing, while
  `Iced Chocolate` gains dairy purely because the photographer's cup had cream
  on it. **Coverage follows the photography, not the food.**
- **it is a chain's marketing prose about its own product.** No part of it is
  an ingredient declaration.

## Decision

### 1. A third tier, `PHOTO`, below `STATED` and `DERIVED`

`tools/tag_allergens.py` reads `item.alt` as its own text and records every
finding from it as tier **PHOTO** — *whichever rule fired*. `names sesame` is a
STATED **rule**; reading it off a photograph does not make the **evidence**
stated. The tier names the evidence, not the reasoning.

**The caption is never merged into `ingredient_text`.** Glue it onto the name
and description and one string carries two strengths of evidence, a hedge in
one half cancels a match in the other, and the tier cannot be reported at all.
Separate text, separate tier, **same rules and the same four guards** — the
hedge, `declared_free`, `CONTRADICTED_BY` and the add-on test all apply to a
caption exactly as they apply to a description.

**The caption is read LAST.** A dish whose own name or description carries the
evidence is credited to the menu at its real tier, so `--tier PHOTO`'s count is
what the photographs actually *bought* rather than what they happened to
repeat.

### 2. What the weaker tier means ON SCREEN — a gate, not a chip

A tag written into `tags` is a tag; the data has carried no tier since ADR 0025
and this record does not add one. So if nothing else changed, PHOTO would be a
distinction **only the tool knows about** — [0072](0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md)'s
decorative guard, in the one part of this repo where being wrong hurts someone.

**A PHOTO tag is therefore refused on a dish that carries no `needs: allergens`
entry**, and every refusal is printed. That entry already renders on the dish
row — *"Allergen details unconfirmed. Ask the venue before ordering."* — so the
gate makes the caveat and the tag inseparable: **no tag read off a photograph
can land on a row whose page claims a confirmed allergen picture.**

The 41 caveat notes are corrected in the same commit. They read *"A tag here is
inferred from the dish name"*, which this change makes false; they now say the
tag may come *"from the caption written for its photograph — not from an
ingredient list, and a photograph is not a promise about what you are served."*

🔑 **Say what the gate does not do today.** All 41 alt-bearing dishes in the
corpus carry the caveat, so it currently refuses **nothing** — which is
literally ADR 0072's shape, and saying so is the only honest defence. Two
things keep it real: the refusal is **printed**, and `test_tag_allergens.py`
drives two rows with the *same* caption where only one carries the caveat, so a
gate that stopped working fails a named case.

### 3. Not a `may-contain` render

ADR 0025 deferred a distinct render for derived tags, and that deferral stands.
It needs a vocabulary change, a new chip treatment and changes to
avoid-preference matching, all in safety-critical code, and the owner has not
ruled on it. This record uses vocabulary the app already ships instead.

## Alternatives rejected

- **Read `alt` at `STATED` strength**, on the argument that a chain's own alt
  text is copy it wrote about that product. It is — and it is copy about a
  *photograph*. The `McFlurry` and `Hot Chocolate` rows above are the two
  counter-examples, both from the corpus.
- **Refuse, and treat the gap as owner-supplied content owed.** Consistent with
  the rule that menu content is never harvested on a hunch — but nothing is
  being harvested: the caption is already in the record, already on the page,
  and already read aloud to one class of reader. Overruled by the owner.
- **A tier field on the tag in `site/data/`.** ADR 0047: name the screen that
  renders it. Nothing does, so it would be payload every phone downloads to
  express something no reader sees.
- **Read the caption FIRST**, so every photo-sourced fact is visible as PHOTO.
  Every tag still lands and the corpus is byte-identical; what breaks is the
  accounting, because `--tier PHOTO` would then count tags the menu's own words
  already justified. Break-probed: reversing the order fails *"the menu's own
  words outrank the caption for the same tag"* and nothing else.

## Consequences

- **34 tags on 19 dishes, all McDonald's** — 14 dairy, 11 gluten, 5 sesame,
  4 egg. **Five burgers gain `contains-sesame`**, which is the outcome the
  ruling was worth. Re-measured here rather than inherited from the item, and
  it agrees with the item's figure exactly. `DATA_VERSION` moves;
  `SHELL_VERSION` does not, because nothing under `site/` outside `data/`
  changed.
- **`--compounds` reads captions too**, added the same day. A reach the tagger
  has and its near-miss reporter does not is a report quietly narrower than the
  thing it claims to describe.
- **No `site/js` change was needed and none was made.** The four tags PHOTO can
  write are all already in `ALLERGEN_LABEL`, the chip maps, the avoid list and
  `validate.py`'s `TAGS` — checked rather than assumed, because a whitelist
  sheds the field added after it.
- **`test_tag_allergens.py` 68 → 81 cases**: four probe groups (two of them
  PHOTO-only, on a driver that asserts `tag@TIER` rather than the tag alone),
  one end-to-end case on the real McDonald's record, and six breakers. Three
  EXISTING breakers had to be repaired in the same commit — the lettuce
  lookbehind (below) moved the source line they patch, and the runner reported
  them as `PATCH MATCHED NOTHING` rather than passing.

### The sweep's own findings, which are not this record's to fix

- 🚩 **`slices?` in the wheat-bakery rule fires on "slices OF something".**
  Found by sweeping the captions: *"a slice of melted cheese"*. Across the
  corpus it reaches "Slices of chicken" ×3 at Pizza Hut, "Duck Slices",
  "Fungus Slices" ×2, "Leg Slices", "sirloin slices" — and
  `charley-noble`'s **`Dave Dobbyn • Slice of Heaven`, which is a cocktail**
  carrying `contains-gluten` whose only evidence is the word *slice*. Seventeen
  shipped rows rest on that alternative and most of them are cabinet traybakes
  where it is right, so narrowing it is a rule-set decision with its own
  measurement, not a side-effect of this one. No tag among the 34 rests on it.
  Filed at `080/220`.
- 🚩 **A caption gains dairy on `Soft Serve Cone` from "ice cream" and says
  nothing about the WAFER CONE**, which is wheat. `cone` and `wafer` are not
  rule words. That is a pre-existing vocabulary gap, surfaced here because the
  caption is the first prose that row has ever had. Filed at `080/220`.
- 🚩 **`Gluten friendly bun` is still PROPOSED on every dry run**, from
  *"Switch the **wholemeal bun** for a gluten friendly bun"* in its own
  description. The words are really there and they are really wheat; what is
  false is that *this* row contains them, which is a fact about **substitution**
  that no word rule can honestly reach. Every mechanism that would silence it is
  an item-level veto of the class ADR 0097 rejected. Left as an open ask at
  `080/220` rather than resolved here.
