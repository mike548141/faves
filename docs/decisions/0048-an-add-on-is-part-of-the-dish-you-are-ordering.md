# 0048 — An add-on is part of the dish you are ordering

**Status:** accepted
**Date:** 2026-08-16
**Amends:** [0025](0025-infer-allergens-by-default.md) — its one-way inference
rule gains a mirror for composition · [0015](0015-split-precache-versioning.md)
— add-on groups are payload, so a venue file carrying them bumps `DATA_VERSION`

## Context

Theme 14 has two halves that end in the same place: what the menu *offers*
(priced extras) and what you *ask for* (customisation). This record settles the
first — 14a, and the 14d safety rule that cannot ship after it.

**The information was already captured; only the shape was wrong.** Measured
across the 48 records on 2026-08-16: **28** dish descriptions carry a priced
add-on in prose (`Add gravy $3.`, `Add chicken, halloumi, prawns or beef +$7.`,
`No gluten added bun +$2.5.`), **63** carry an unpriced choice (`choice of`,
`choose`), **17** dishes *are* add-ons wearing a dish's clothes (`Combo
upgrade`, `Extra halloumi`, `Add rice`), and **11 whole sections across 9
venues** — 92 rows — are add-on groups rather than things you would order
alone. Sprig & Fern is the densest at 12 of 63 dishes plus a 12-row
`Brunch Sides` section.

**The corpus already proves the safety case rather than merely implying it.**
`tools/tag_allergens.py` deliberately *excludes* add-on prose from its
inference (`ADD_ON` + `ADD_ON_PRICE`, its lines 163–167) — correctly, because
"add prawns +$7" does not make a garden salad shellfish. But the prawns' own
`contains-shellfish` then has nowhere to live. Every allergen named in an
add-on across the corpus is presently dropped on the floor. Wellington Kebab
Grill's counter card offers satay among twelve free sauces: the most serious
allergen in the app's vocabulary, on a dish that carries no warning when you
tap it.

## Decision

### 1. Groups are defined once per venue and referenced

`record.addOnGroups` is a list of group definitions. A section
(`section.addOns`) or a dish (`item.addOns`) names the ids that apply; a dish
gets its section's groups first, then its own. So "brunch sides" attaches to
eight brunch dishes without being written eight times, and a sauce board
spanning every section is written once.

```json
"addOnGroups": [
  { "id": "sauces", "name": "Our delicious sauces",
    "select": "many", "max": 3, "price": 0,
    "options": [
      { "name": "Satay", "tags": ["contains-peanuts", "vg", "gf", "df"] },
      { "name": "Garlic yogurt", "tags": ["contains-dairy", "v", "gf"] }
    ] }
]
```

- `select`: `"one"` or `"many"`. The Garden Salad's "chicken, halloumi, prawns
  **or** beef" is a pick-one; brunch sides are pick-many.
- `max`: optional cap, `"many"` only. "Choose up to 3" is a rule the venue set,
  so it lives in the data — not in the UI, or the order sheet will happily
  produce something the shop refuses to make.
- `price` on the group is a default for its options; an option overrides it.
- `tags` is **required** on every option, and may be empty. See rule 3.

### 2. An add-on price is never null. Free is 0, and 0 is written down

A dish price already carries three states (`docs/ARCHITECTURE.md`): a number; a
`null` meaning "the shop prices this on application", rendered `—`; and a
`null` **plus** a `needs: price` entry meaning "we failed to read it", rendered
`?`. An add-on must not inherit that ambiguity, so `validate.py` **rejects a
null add-on price**. If we do not know what an extra costs, it stays in the
prose and is not structured yet.

**Free is explicit, not implied by absence** — and this deliberately tightens
what the roadmap proposed. The roadmap argued a missing price should *mean*
free, so twelve free sauces need not say so twelve times. The terseness is
worth having and the implication is not: a transcriber who simply forgets a
price then produces a silently free add-on and an under-stated total, with
nothing to catch it. The group-level default gets the terseness back —
`"price": 0` once for the whole sauce board — while leaving every option's cost
answerable from the data. A price that is absent at **both** levels is an
error, not a zero.

### 3. Safety composes: allergens union, dietary claims intersect

`site/js/addons.js` `composeTags(dishTags, selection)` returns the tags of the
dish **as configured**. Two rules, both fail-safe, mirroring ADR 0025's one-way
rule and adopted for the same reason:

- **Allergens union.** Present on any part ⇒ present on the whole.
- **Dietary claims intersect.** The whole is vegan only if every part is.

So composition can only ever *add* a `contains-*` or *remove* a
`gf`/`df`/`v`/`vg`. It can never invent a safety claim, which is the one thing
this data is not allowed to do.

**Intersection, not contradiction — the call that cost the most thought.** The
gentler rule is to drop a dietary claim only when an option positively carries
a clashing allergen, reading the contradiction table out of
`tools/tag_allergens.py`. It is wrong: grilled chicken carries no `contains-*`
at all, because meat is not an allergen, so a vegan dish plus chicken would
still read vegan. Intersection makes an untagged option *visibly* degrade the
claim instead of silently keeping it. Untagged options are the content sweep's
problem (Theme 14b), not a reason to soften the predicate.

The screen must still tell the two apart, so `composeTags` reports each lost
claim as `contradicted` (the option states a clashing allergen) or `not-stated`
(the option simply never said). "Halloumi contains dairy" is a fact; "we cannot
say whether Mushrooms is dairy free" is an absence. Flattening them into one
warning teaches the reader to discount both.

`dishFlagged` and `dishSatisfiesDiet` are unchanged — they already take a bare
tag array, so composition happens before the call, not inside it.

### 4. A configuration makes a new order line, and the share link does not bump

Cart line identity widens from `(venueId, name)` to
`(venueId, name, selectionKey)`. A dish added twice with different add-ons is
two lines, not a quantity of 2. `selectionKey` sorts its parts, so the same
choices made in a different order are the same line.

**The share codec does *not* get a version bump**, against the roadmap's
expectation, and the measurement is why. `CODEC_VERSION` is shared by all three
payload types — order, shortlist and personal transfer — and checked with a
strict `!==` in two places. Bumping it to carry one optional field would
invalidate every outstanding shortlist and transfer link for a change those
payloads do not use. Instead the wire line stays the positional
`[name, price, qty]` triple with the configuration **appended as a fourth
slot**, which every existing decoder already ignores by construction, and slot
1 becomes the **configured** unit price so an old reader still totals correctly.

That leaves an old app showing the right money against an incomplete
description. The degradation direction is what makes it acceptable: dropping an
add-on can only ever *under*-specify an order — it can never add something to a
plate. A bump would have to earn its cost against three payload types, and this
change does not.

### 5. Options are standalone records, not references to menu items

The brunch sides *are* menu items, so an add-on could point at one by id. It
may not yet: pointing at a dish is Theme 25's question, owner-reserved for its
own session, and 14a would otherwise be blocked behind a personal-data
migration. v1 options carry their own `name`, `price` and `tags`. Theme 14f
(combos) inherits the same constraint.

## Consequences

- A venue file gaining `addOnGroups` is a `site/data/` change ⇒ bump
  `DATA_VERSION`; `site/js/addons.js` is a shell change ⇒ bump `SHELL_VERSION`
  and add the module to the `sw.js` precache list.
- `personal-data.js` whitelists order-line fields explicitly, so the new
  selection field must be added there or it is silently dropped on export.
- `price.js` derives the venue price band from dish prices only. Add-on prices
  must never feed it, or a board of $2.50 ramen toppings drags a venue into
  `$`.
- The tag vocabulary is unchanged — an add-on option validates against the same
  closed set as a dish.
- **What this does not fix:** dish identity. `slug(name)` is not unique within
  a venue today, which is Theme 25's territory and is left alone here on
  purpose. The evidence gathered while building this is recorded there.
