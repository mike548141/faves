# 0140 — Halal, Kosher and Meatarian are food preferences; pork is a presence tag

**Status:** accepted
**Date:** 2026-09-29
**Supersedes (in part):** [0092](0092-an-add-on-option-states-what-it-is.md)'s
rejection of a meat tag in the `contains-` namespace — for pork only.
`has-meat` stays exactly as 0092 made it.
**See also:** [0025](0025-infer-allergens-by-default.md) (the one-way rule) ·
[0118](0118-an-allergen-key-a-build-cannot-name-is-carried-not-dropped.md) ·
[0127](0127-a-settings-field-a-build-cannot-name-is-carried-not-dropped.md) ·
[0095](0095-an-add-on-carries-both-axes.md) ·
roadmap `350/030` (22f, the sibling "absence claim" preference) and `350/040`
(Meatarian's open question).

## Context

The owner asked, 2026-09-29: *"add Meatarian to the food preferences for
someone that only eats dishes with meat in them"* and *"a food preference for
someone who doesnt eat pork or pig products - I think that is true for Muslim
and hebrew faiths"*. He was told halal and kosher are wider than no-pork
(alcohol and slaughter; shellfish and meat-with-dairy) and ruled, verbatim
where quoted:

1. **"Use Halal and Kosher and if a restaurant marks it as such we can show
   that."** Settings gains **Halal** and **Kosher**. There is **no** separate
   "No pork" option.
2. Halal and Kosher each **warn on pork**, a new inferred presence tag
   `contains-pork`. **Kosher also warns on shellfish** through the existing
   `contains-shellfish` (he took the recommendation). Meat-with-dairy is out
   of scope — no dish-level meat tag exists to pair with dairy.
3. **"Flag the usually-pork ones":** sausage, pepperoni and salami warn UNLESS
   the menu names another meat; dumplings, wontons and mince only when the
   menu says pork; gelatine is **not** flagged (it was in the declined "flag
   every maybe" option); named pig products — pork, bacon, ham (not
   hamburger), prosciutto, pancetta, chorizo, speck, porchetta, nduja, char
   siu, crackling, lard and the like — always. Vegan, vegetarian,
   plant-based and mock versions must not be tagged, and a pork tag yields to
   `v`/`vg`, **not** to `v-option`.
4. **A restaurant's own "halal"/"kosher" is shown**, as claim tags only ever
   stated by the venue — never inferred by any tool.
5. **Meatarian: "I will decide dishes later. For now just add it to the food
   preferences as an option for users to select."**

## Decision

### Pork is `contains-pork`, and it is not an allergen

It lives in the `contains-` namespace so every allergen path carries it with
no new code: the tagger and its tips, the add-on union in `addons.js`, the ⚠
flagged treatment, `report.js`'s prefix filter. That is exactly the reach
0092 refused `contains-meat` because nobody could filter on it; pork *is*
reachable (through Halal and Kosher), which is the difference. It contradicts
`v`, `vg`, `halal` and `kosher`, both in `CONTRADICTED_BY` and `CONTRADICTS`.

**Two tagger rules, split by the owner's words.** STATED: a named pig product
(and `pig`, because the corpus writes "Pig Ears" and "Pig Intestine"). DERIVED:
a usually-pork food — sausage, pepperoni, salami, spare ribs, hot dogs,
cheerios, saveloys, frankfurters, kransky, cabanossi, kielbasa, bratwurst —
unless another meat is named against it. Judgement calls the ruling left open:
**spare ribs in, bare ribs out** (the corpus has "Corn Ribs", a vegetarian
dish, and beef short rib); **hot dogs, cheerios, saveloys, frankfurters,
kransky in** (usually pork in NZ); **tonkotsu in**, **tonkatsu in except
"tonkatsu sauce"** (all five corpus tonkatsu are the sauce); **lap cheong in**.
Not matched: `belly` (Fish Belly), `pulled` (pulled lamb), gelatine.

**Every narrowing is a fixed-width lookbehind**, never an `exclude`, for the
water-chestnut reason. Two escape lists on purpose: a plant or mock qualifier
escapes both rules; another *meat* escapes only the usually-pork rule, because
"Chicken bacon ranch" is chicken **and** bacon.

### Halal and Kosher are claim tags only a venue writes — dish-level only

`halal` and `kosher` are in `TAGS`, and **no tool emits them**
(`test_tag_allergens.py` probes it). An absence of `contains-pork` is never
read as either, anywhere: search answers "halal" only from the literal tag.

**Dish-level, not venue-level — the smaller honest option.** A tag reuses the
chip ("As the venue marks it"), the search word and validation that already
exist; a venue-wide field would be a new field in the precached payload (ADR
0047) with a new screen to render it, and nothing in the corpus states either
word today. A venue that is halal throughout can tag every dish. A venue-level
statement stays open for when a real menu says it.

They are **claims that intersect in composition** (`addons.js` `DIET_KEYS`),
never filters: an option's own `halal` never lands on an unstated dish, and a
pork topping kills a dish's Halal as a fact. They are **not** in
`DIET_FILTERS`, so nothing dims on them.

### Halal, Kosher and Meatarian are `foodPrefs`, not `diet.dietary`

Stored as a **top-level** settings list, because `sanitiseDiet` drops a
dietary key it does not know — every older build would strip "halal" on its
next write and sync would carry that back as a deletion — while an unknown
top-level field is carried opaquely by every build since ADR 0127. Unknown
keys inside `foodPrefs` are carried too (0118's rule, from day one). A
two-sided sync conflict **unions** (Halal only adds warnings), and an import
merges rather than replaces.

**One pure function decides the warning set:** `effectiveAvoid(avoid,
foodPrefs)` in `dietary.js`, read by the menu render (which its live re-apply
re-runs), the recipe page and the add-on picker. It never writes storage.

**Meatarian is provably inert.** It is in `INERT_PREFS`, reaches no
`DIET_FILTERS`, `STATED_CLAIMS` or `OBSERVANCE_WARNS` entry (a test holds all
three), and the Settings copy says plainly it changes no menu yet. The trap
was real: `dishSatisfiesDiet` answers false for an unknown key, so a
Meatarian key in a filter set would dim every dish on every menu.

### The tests keep their teeth

`tests/tag-labels.test.js` required every `contains-*` tag to be avoidable in
Settings. Pork has no chip by ruling, so the rule became *reachable from
Settings* — directly or through an offered observance — plus a named test that
Halal **and** Kosher reach pork and no "Pork" chip exists. "Every Settings key
is a tag" gained its `FOOD_PREFS` half: each is an observance, a stated claim,
or deliberately inert.

## Rejected

- **A "No pork" avoid chip.** The owner ruled against it.
- **Halal/Kosher as `DIET_FILTERS` entries.** Every unstated dish would dim —
  which today is every dish.
- **Inferring `halal` from "no pork on the menu line".** The absence claim ADR
  0025 forbids; slaughter and alcohol are not on a menu.
- **Storing in `diet.dietary`.** An older build strips it (above).
- **An `exclude` for plant-based versions.** Loses "Plant-based chorizo, or
  pepperoni"'s pepperoni — probed and break-probed.
- **Venue-level `halal`.** Larger than any current data needs (above).

## Consequences

- **428 dish tags** (369 STATED, 57 DERIVED, 2 PHOTO) and **11 add-on options**
  gained `contains-pork` on 2026-09-29; 419 dishes name a core pork word.
- **Every dish naming a pork word while tagged v/vg/-option**, and what
  happened — `v`/`vg` spared (the venue's claim wins): 1841's *Nachos*
  ("Pulled pork or vegetarian", `v` — reads like a `v-option`, a data
  question for the owner), hell-pizza's *Veggie Mischief*, *Veggie Wrath*,
  *Plant-Based Mischief* and *Plant-Based Wrath* (plant-based chorizo), the
  Borough's *Mini VIP Pizza* (pepperoni as a topping choice). `v-option` /
  `vg-option` tagged: *Cheese & Bacon Loaded Fries* ×3 (Hotel Bristol,
  Khandallah, Southern Cross), Dirty Little Secret's *Caeser Salad*
  (pancetta), Rock Yard's *Roti Rolls* (a pork-belly choice), the Ramen Shop's
  *Steamed bao buns* and *Kids ramen*.
- A pork chip now shows (muted) on those dishes for every reader, and the
  picker says "Bacon contains pork" as a plain line. `addons-ui.js`
  `SUBSTANCE` treats `has-meat` and `contains-pork` as one substance, so it is
  one sentence, not two.
- The collapse control counts pork among "allergens" ("⚠ +2 allergens") —
  wording not revisited here.
- `validate.py` now warns on a `v`/`halal` dish carrying pork and a `kosher`
  dish carrying shellfish; two twin-row warnings surfaced (Rock Yard's
  Vermicelli Noodles, Sprig & Fern Tawa's Gold Card Chicken Parma) — stub
  descriptions, the class `check_twin_allergens` exists for.
- Meatarian's behaviour is roadmap `350/040`, open with the owner.
