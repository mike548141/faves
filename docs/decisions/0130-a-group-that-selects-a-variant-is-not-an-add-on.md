# 0130 — A group that SELECTS a variant is not an add-on

**Status:** accepted
**Date:** 2026-09-28
**Amends:** [0048](0048-an-add-on-is-part-of-the-dish-you-are-ordering.md) §1
— an add-on group gains `kind`; §3 (**allergens union, dietary claims
intersect**) is **not** amended, and this record is built around keeping it ·
**Answers:** [0092](0092-an-add-on-option-states-what-it-is.md)'s
deliberately-open alternative, *"a notion of a group that selects a variant
rather than adds to the plate"* · **Roadmap:** `310` 28k (the schema) and 28s
(the checks that would have stayed green), under the owner's rulings on 28i
(2026-09-09, option 3) and 28j (silent absorption)

## Context

The owner ruled on 2026-09-09 that a size or a protein is a **choice on one
dish**, not a separate dish. The corpus cannot say so: ADR 0048's add-on group
means *"put this on the plate"*, and a Regular/Large is not something you put on
a plate — it is which plate. Using an `adds` group for it (Gong Cha does today)
has three faults, each named in the roadmap item:

1. **The residue.** An option carrying no ingredient still degrades every
   dietary claim under intersection, so "Large" makes a vegetarian drink read
   *"Large isn't tagged vegetarian"* (ADR 0092's largest remaining residue).
2. **The price.** An option's `price` is a surcharge, added to the dish by
   `selectionPrice` and `cart.js`. `Margherita — Small $14.50 / Large $29.00` is
   not a $14.50 surcharge; it is a different plate.
3. **The count.** `select: "one"` means *at most* one. A dish with a size has a
   price on its row before anything is tapped, so exactly one is always chosen
   and one is the default.

And 28b's counter-examples bind any shape: 26 rows record that the venue prints
two prices and **never names** the larger size; Hell's drinks state two volumes
at **one** price; and a structure that required a price per size would force
inventing prices the menu never stated.

## Decision

### 1. `kind: "adds" | "selects"`, and absent means `adds`

Every one of the 50 groups written before this field validates unchanged and is
checked by the code that always checked it (`test_validate.py` runs the whole
pre-existing add-on suite unmodified, plus an explicit `"kind": "adds"` case).

### 2. The shape of a `selects` group

```json
{ "id": "size", "name": "Size", "kind": "selects",
  "options": [
    { "name": "Regular", "id": "regular", "dishPrice": 14.5, "default": true, "tags": ["v"] },
    { "id": "size-2", "dishPrice": 29.0, "tags": ["v"] }
  ] }
```

- **`dishPrice`, never `price`.** The dish's *whole* price as that variant.
  A new word rather than `price` re-read by kind, because every consumer
  written before this record reads an option's `price` as a delta — the same
  number under the same key would be charged twice ($14.50 + $29.00) by every
  one of them the day a ladder reached the screen. A key no old reader knows is
  a key no old reader can misread. `price` on a variant is an error; so is
  `dishPrice` or `default` on an `adds` option.
- **Absolute, not a delta**, as the roadmap item argued: the menu prints
  absolutes, and a delta puts arithmetic between the menu and the screen for no
  gain.
- **Exactly one `"default": true`.** None and two are both errors; `false` is
  an error (only the default says anything).
- **The dish's `price` IS its default's `dishPrice`**, checked per dish —
  including through a dated price series, by its latest entry. The row prints
  `item.price` before anything is tapped; two numbers would be a price no
  variant has.
- **`select`, `max` and a group `price` are refused**, not ignored: a variant
  group always chooses exactly one, a cap can never bind, and one default price
  for every size is a price the menu did not state. A field silently ignored is
  a field a transcriber believes is doing something.
- **At least two options** — a ladder of one chooses nothing.
- **`name` is optional** on a variant (28b's 26 unlabelled rows); its `id` is
  then required and written by hand, because there is no name to seed one from.
  **Two variants may share a `dishPrice`** (Hell's 13 drinks).
- **A `dishPrice` is never `null`.** If the menu does not state what a size
  costs, the ladder stays in the prose — ADR 0048 §2's rule, and 28b's third
  refusal honoured rather than filled.

### 3. Dietary claims: a variant restates its dish's, exactly

ADR 0048 §3 is **not** amended — the owner held that question out of the
migration on 2026-09-09 (28i) so a food-safety rule and a 285-id data change
could not be mistaken for each other. Under intersection:

- a variant stating **fewer** claims than its dish strips them when picked —
  the residue in fault 1, and the reason ADR 0092 left this open;
- a variant stating **more** claims than its dish restores nothing:
  `Falafel` tagged `v` on a `Kebab` that is not cannot make the kebab
  vegetarian, however it reads in the file.

So `validate.py` requires every variant to carry **exactly** its dish's claim
tags (`v`, `vg`, `gf`, `df` and their `-option` forms), and nothing that
contradicts one (`CONTRADICTS`, read out of `addons.js`: a `has-meat` variant of
a `v` dish is an error). That is rule 1 of the item — *exempt from ADR 0092's
residue sentence* — delivered by the data rather than by a change to
`composeTags`: a variant that agrees with its dish can never drop a claim, so
the residue never has anything to say. And it is 28i's option 3 enforced rather
than trusted: a protein ladder whose rows disagree on a claim **cannot** be
expressed as one dish, and stays separate dishes until §3 is ruled on.

Allergens still **union**: a variant may carry `contains-*` its dish does not
(halloumi is dairy), and composition adds it when picked.

The cost, stated: a size group **shared** by two dishes with different claims
fails for one of them, so it must be written twice. Absolute prices already make
sharing rare — two dishes can share a ladder only if they share every price.

### 4. Refused for now — each an open question, not a guess

- **Two `selects` groups on one dish** (size × protein). Two absolute ladders
  cannot price the four plates they jointly choose. One venue is shaped like
  this (Abrakebabra). An error, and 🎯 open.
- **Per-channel prices beside a ladder.** ADR 0089's `prices.delivery` is one
  number per dish; beside variants it would silently mean the default's.
  An error, and 🎯 open — it touches KK Malaysian, whose curry and laksa
  ladders also carry delivery prices.

### 5. No screen draws it yet, so the picker withholds it

ADR 0047 asks which screen renders a field. For `kind` the answer is roadmap
28m's, which has not landed. Offered through today's picker, a `selects` group
would read as a pick-one of extras — nothing chosen, each variant +$0 (its
price is in `dishPrice`, which `optionPrice` rightly never reads), composed as
if it went on the plate. So `groupsFor` in `site/js/addons.js` **withholds**
`selects` groups until 28m replaces that line, and the row shows `item.price` —
which validate.py holds equal to the default's. Under-offering, never
mispricing. No record in `site/data/` carries a `selects` group; every fixture
lives in a test.

## The checks that would have stayed green (roadmap 28s)

Each gained an assertion or a written refusal. A stated "this check cannot see
dishes" is a result; a silent one was the defect.

| check | what was wrong | now |
|---|---|---|
| `validate.py` twin allergens | joined on a duplicate **name**; a merge removes the duplicates, so the sweep went **quieter** as the fault was applied | a **second join**: a dish against its own variants (dish ∪ option allergens), same warning semantics |
| `validate.py` `find_dish` | a pick resolving through the `slug` tier to a dish now displayed under another name, or through a **retired** id, passed silently | warns, naming the dish it reached and the id to write |
| `seed_dish_ids.py --check` | can only see a **missing** id, never a gone one | prints the dish **count** beside the tick and says it is a count, not a proof; claiming retired ids is 28l's coverage check |
| `check_fallback.py`, `check_precache.py`, `sw.js` | venue-/path-keyed | **written refusal** in each docstring: they cannot see a dish, by construction |
| `test_split_data.py` | never opens the corpus; its CI job name reads as corpus cover | **written refusal**; the merge round-trip is 28l's to decide |
| `price.js` `priceBand` | a merge moves the median | unit test: a ladder counts **once, at its default**; the corpus band shift is 28o's per-batch proof to print — **no test reads a real venue** |
| `search.js` | a merge loses index entries | **deferred** — whether a variant's name ("Falafel") joins its dish's haystack is a ranking decision for 28m, and no test can assert an answer nobody has given |
| `to_top_check.mjs` | passed vacuously on a document too short to cross the threshold; skipped up/down silently | both are now **failing assertions** |
| `focus_check.mjs` | printed a dish and add-on it never opened; its header claimed a "dim" behaviour removed at `d03f443` | fixture and claim removed; the header says that behaviour is now **unchecked** |
| `device_check.mjs`, `sync_check.mjs` | re-derived fixtures change subject silently; lookup by folded name takes the first match | refuse (exit 2, before Chrome) a fixture whose folded name is shared; `device_check` prints its re-derived dish |
| a heart surviving a rename | asserted nowhere, end to end | **`tools/rename_check.mjs`**: renamed with id pinned ⇒ heart, rating and "favourites" query all hold; with a **control** where the id moves and they must not |
| `tag_addon_options.py` | crashed (`KeyError: 'name'`) on an unlabelled option | reads the id when there is no name (reproduced on the pre-change tool, fixed) |

🔎 **Found while building the rename check, and NOT fixed here** (it is 28l's):
with the dish's id moved **and** the old id in its `formerIds`, the seeded heart
does **not** light the menu row, the rating reads 0, and the "favourites" query
hides the dish — measured, 2026-09-28. The row's ♥ is `favourites.has(entry)`,
which compares the raw stored id and never reaches `findDish`'s `formerIds`
tier. 28j's list of three follow-ons names the filter and the ratings but **not
the row's own heart**, so "silent absorption" needs a fourth.

## Consequences

- `site/js/addons.js` is a shell change (`SHELL_VERSION`). No `site/data/`
  change, so no `DATA_VERSION`, and no byte of the payload moves.
- 28m replaces the withholding line with the variant control; its
  `addon_check.mjs` assertions (default priced on the row, no "choose up to N",
  no residue sentence on a variant) are its own.
- 28n and 28o migrate **into** this shape; nothing here converts, merges or
  re-keys a dish.
- The two refusals in §4 are the likeliest things a migration session will hit
  first. Each fails loudly, by design.

## Alternatives rejected

- **`price` read by `kind`.** Shorter, and wrong in every consumer that exists:
  each would sum an absolute as a surcharge.
- **Deltas.** Arithmetic between the menu and the screen, and a surcharge on the
  default that is always zero.
- **A variant's claims composed as neutral** (neither intersected nor able to
  restore). It removes the residue without restating tags — and lets a
  `Chicken` variant with no tags leave a `v` dish reading vegetarian. That is
  the claim-from-silence ADR 0025 forbids, and it amends §3 by the back door.
- **Letting a variant restore a claim** (28i option 1). The owner held it out of
  this migration; it stays his.
