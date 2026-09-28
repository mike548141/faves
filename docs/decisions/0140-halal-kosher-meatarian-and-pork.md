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
water-chestnut reason. Three escape scopes on purpose: a word that can only
mean not-pork (vegan, plant-based, mock, meatless) escapes every pork word; a
**substitute ingredient** (coconut, tempeh, tofu, soy, mushroom…) escapes only
the product it replaces — "coconut bacon", "soy chorizo", "tofu sausages" —
and never `pork`; another *meat* escapes only the usually-pork rule, because
"Chicken bacon ranch" is chicken **and** bacon.

🛑 **The middle scope is a review finding, not the first design.** The first
cut put the substitute ingredients in the every-word escape, and an
independent review running the real regexes found four pork dishes untagged:
"Sweet soy pork belly", "Coconut pork curry", "Mushroom pork dumplings",
"Tofu pork mince". Each is now a probe that must tag, beside the substitute
products that must not, and putting the old escape back is a break-probe.
The same review added gammon, lardo, streaky and lap chong (named) and
salumi (usually-pork) to the table.

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

- **463 dishes and 11 add-on options** carry `contains-pork`: **429** from the
  tagger (370 STATED, 57 DERIVED, 2 PHOTO — the review's rule fix added none,
  since none of the four missed shapes is in today's corpus; the one extra
  is 1841's Nachos, below), **30 hand-tagged** on same-venue evidence, and
  **4 hand-tagged** as owner-ruled known-dish inference. 419 dishes name a
  core pork word.
- **The 30 hand-tagged rows and their evidence** (no `tagNotes` — those are
  tool-written only; `--explain --check` stays clean with a tag no rule
  explains, and the tagger never removes one):
  - sprig-and-fern-tawa, Gold Card *Chicken Parma* — its Mains twin reads
    "…Napoli sauce, ham, mozzarella cheese".
  - hell-pizza, *Half Buffalo Half Beast* — "half The Beast", which is
    "5-pepper free-range pepperoni". (Its missing `contains-dairy` is left
    for the owner.)
  - pizza-hut, *Loaded Hawaiian With Double Toppings* — the venue's own
    Hawaiian is "pineapple and ham".
  - noodle-canteen, *Combination fried rice* (no description) — its
    Combination noodles and Combination soup list "prawn(s), beef, pork and
    chicken".
  - thai-tara-express, all **26** untagged dishes saying "a choice/selection
    of meat" (28 carry the phrase; two were already tagged) — the venue's
    Meat choices section lists "Chicken, pork, beef or vegetable with tofu"
    as "The standard choice of meat". Fried rice, Green curry fried rice,
    Nasi goreng, Tom yum fried rice, Spicy fried rice, Pad thai, Pad see ewe,
    Pad kee mao, Green, Red, Yellow and Panang curry, Sizzling cashew nuts,
    Sizzling black pepper, Sizzling house special, Hot pot tom yum soup, Tom
    yum noodle soup, Laksa curry noodle soup, Tom kha soup, Tom yum soup,
    Thai chilli, Thai basil, The cashew nut, Sweet and sour, Satay sauce,
    Ginger and vegetable.
- **Owner-ruled 2026-09-29 on the rows held for him.**
  - 1841's *Nachos* ("Pulled pork or vegetarian…"): **"Yes, vegetarian
    option"** — its `v` became `v-option`, which does not spare pork, so the
    tagger then wrote `contains-pork` with its own tip ("The menu says
    “pork”"). It still answers the Vegetarian filter through `v-option`.
  - **Known-dish inference — "Only the clearest".** A group apart from the
    30 above, because the evidence is NOT the venue's words: it is what these
    dishes are in New Zealand, and the owner ruled which ones are clear
    enough to warn on. Each carries `contains-pork` with **no tagNotes**
    (those are tool-written only), so its tip is the generic one —
    "Recorded when this menu was entered. If it matters, check with the
    venue." — which is the honest sentence for an inference nobody printed.
    - pizza-hut *Meat Lovers* ("The original Meat Lovers pizza!") — the
      chain's Meat Lovers carries ham, bacon and pepperoni.
    - kc-cafe *Two Combination BBQ Meat on Rice* and *Three Combination BBQ
      Meat on Rice* (no description) — a Cantonese BBQ-meat combination
      plate is built on char siu and roast pork.
    - takeaway-at-churton *Hawaiian Burger* (no description) — a NZ
      takeaway's Hawaiian burger is ham and pineapple.
  - **Excluded by him, left untagged:** pizza-hut *Super Supreme*,
    garage-project *Charcuterie*, and the Hotel Bristol group's kids
    *Meatballs*.
- **Every dish naming a pork word while tagged v/vg/-option**, and what
  happened — `v`/`vg` spared (the venue's claim wins): hell-pizza's
  *Veggie Mischief*, *Veggie Wrath*,
  *Plant-Based Mischief* and *Plant-Based Wrath* (plant-based chorizo), the
  Borough's *Mini VIP Pizza* (pepperoni as a topping choice). `v-option` /
  `vg-option` tagged: 1841's *Nachos* (after the owner's `v-option` ruling,
  above), *Cheese & Bacon Loaded Fries* ×3 (Hotel Bristol,
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
