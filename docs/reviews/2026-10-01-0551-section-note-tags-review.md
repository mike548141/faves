# Section notes that cite an allergen tag: the review list

Roadmap `080/280`, 2026-10-01. Owner ruling (`faves-55`, 2026-10-01): a pointer
flag, then a review. The flag exists now; this is the review.

## The short version

**31 allergen tips** cite a section note, across **8 notes** in **7 venues**
(the item counted 31 on 2026-10-01; recounted the same day, still 31).
**One note is a pointer** (Groundup's lunch board, 5 tips). The other **seven
describe the dishes under them**, and I recommend keeping all 26 of their tags.

🎯 **Yours to rule on:** the five Groundup gluten tags, the only ones whose sole
evidence is a pointer. Nothing has been removed. The tool never removes a tag,
and these five stay until you say. Their tips now read *"Kept as a precaution:
the only reason on record is a note over this section that points to other
food (…), so it may not apply to this dish."*

Regenerate the list at any time, read-only:
`python3 tools/tag_allergens.py --section-notes`.

## How to read the tables

"Other evidence a rule can see" is what the tool could quote for the same tag
from the dish's own words, its photo caption, or its section heading. It is
empty for most rows because a tip only cites the note when the dish's own
words have nothing. A heading alone (Sprig and Fern's "Pizza") is evidence the
tool reads but never writes from (ADR 0123), so it supports a tag without
creating one. **"none" does not mean the tag is wrong.** A hand correction
leaves no trace the tool can see.

My recommendations rest on the menu text only. None was checked with a venue.

## The review

### charley-noble / Woodfired Grill

> All grill items served with a choice of sauce (peppercorn brandy, blue cheese,
> salsa verde — chimichurri on the Gluten Free menu) or butter (black garlic,
> Café de Paris, garlic/rosemary/chive, wasabi nori); additional sauce or butter
> $4. The Woodfired Grill section itself carries the venue's own gluten-free
> asterisk (cooked on a shared grill/surface with gluten-containing items), and
> only black garlic and wasabi nori butters are marked GF — Café de Paris and
> garlic/rosemary/chive are not.

**Reading: DESCRIBES THESE DISHES (through a choice).** Recommend: **KEEP all 7.**
Every grill item comes with a sauce or a butter. The butters are always dairy, and
two of the sauces name it. A diner who picks salsa verde or chimichurri gets no
dairy, so this over-warns for them, and that is the safe direction.

| Dish | Tag | Other evidence a rule can see | My recommendation | Your ruling (keep / drop) |
|---|---|---|---|---|
| Eye Fillet (200g) | `contains-dairy` | none | KEEP | |
| Greenstone Creek Scotch Fillet (300g) | `contains-dairy` | none | KEEP | |
| Greenstone Creek Sirloin (300g) | `contains-dairy` | none | KEEP | |
| Southern Stations NZ Wagyu Ribeye on the Bone | `contains-dairy` | none | KEEP | |
| NZ Lamb Rump (300g) | `contains-dairy` | none | KEEP | |
| NZ Lamb Rump (400g) | `contains-dairy` | none | KEEP | |
| A5 Sirloin (Japanese Wagyu) | `contains-dairy` | none | KEEP | |

### groundup-cafe / Lunch and Light Bites

> The board also says: see our cabinet of fresh filled paninis, savouries,
> slices and cakes.

**Reading: POINTER (flagged).** Recommend: **per row, below.** The note sends the
reader to the cabinet. It says nothing about what these dishes contain.

| Dish | Tag | Other evidence a rule can see | My lean (menu text only, not verified with the venue) | Your ruling (keep / drop) |
|---|---|---|---|---|
| Nachos | `contains-gluten` | none | **DROP** — Described as corn chips, beans, mince, cheese. Nothing on the menu names flour. Corn chips are normally wheat free, though some brands are not. | |
| Thai Beef Salad | `contains-gluten` | none | **KEEP** — Topped with "crispy noodles", which are usually fried wheat noodles. | |
| Corn Fritters | `contains-gluten` | none | **KEEP** — Fritters are a flour batter as a rule. The menu gives no description. | |
| Wedges | `contains-gluten` | none | **ASK THE VENUE** — Plain wedges would not carry gluten, but many kitchens coat them in seasoned flour. The menu does not say. | |
| Bowl of Fries | `contains-gluten` | none | **DROP** — Potato chips with no flour named. A shared fryer would be a cross-contact warning, which is a different thing from an ingredient and is not what this tag says. | |

### rock-yard-restaurant / Combo Lunch

> All combos are served with jasmine rice & roti. Swap roti for veggie soup for
> a gluten-free option.

**Reading: DESCRIBES THESE DISHES.** Recommend: **KEEP.** "All combos are served
with jasmine rice & roti" is a plain statement of what you are served. The same
note offers soup in place of roti as the gluten free option, which confirms roti
is the default.

| Dish | Tag | Other evidence a rule can see | My recommendation | Your ruling (keep / drop) |
|---|---|---|---|---|
| Combo Hanoi | `contains-gluten` | none | KEEP | |

### rock-yard-restaurant / Curries

> Rich, aromatic, and soul-warming — best enjoyed with a side of steamed rice,
> coconut rice, or warm roti to soak up every drop. All curries contain peanuts
> and cannot be removed.

**Reading: DESCRIBES THESE DISHES.** Recommend: **KEEP all 3.** "All curries
contain peanuts and cannot be removed." The venue says it outright.

| Dish | Tag | Other evidence a rule can see | My recommendation | Your ruling (keep / drop) |
|---|---|---|---|---|
| Chicken Curry | `contains-peanuts` | none | KEEP | |
| Tofu & Mushroom Curry | `contains-peanuts` | none | KEEP | |
| Kaffir Lime Seafood Curry | `contains-peanuts` | none | KEEP | |

### simmer / Pizzas

> All with a tomato sauce base and mozzarella. Friday from 5pm only.

**Reading: DESCRIBES THESE DISHES.** Recommend: **KEEP all 3.** "All with a tomato
sauce base and mozzarella." Mozzarella is dairy.

| Dish | Tag | Other evidence a rule can see | My recommendation | Your ruling (keep / drop) |
|---|---|---|---|---|
| Meaty boy | `contains-dairy` | none | KEEP | |
| Pepperoni & the sundried syndicate | `contains-dairy` | none | KEEP | |
| Hei Hei Hawaiian | `contains-dairy` | none | KEEP | |

### sprig-and-fern-berhampore / Pizza

> Our pizza bases contain dairy. Gluten free bases and gluten + dairy free bases
> available on request, no charge. Vegan cheese also available — just ask.

**Reading: DESCRIBES THESE DISHES.** Recommend: **KEEP all 4.** The note is about
the pizza bases and offers gluten free bases "on request", so the default base is
wheat. The tag was read from the word "pizza" in the note. Heading evidence
agrees.

| Dish | Tag | Other evidence a rule can see | My recommendation | Your ruling (keep / drop) |
|---|---|---|---|---|
| Margherita | `contains-gluten` | the heading: “Pizza” | KEEP | |
| Prosciutto | `contains-gluten` | the heading: “Pizza” | KEEP | |
| Super Salami | `contains-gluten` | the heading: “Pizza” | KEEP | |
| Mediterranean | `contains-gluten` | the heading: “Pizza” | KEEP | |

### sprig-and-fern-petone / Pizza

> All pizzas $24. Gluten free pizza bases available; dairy free cheese available.

**Reading: DESCRIBES THESE DISHES.** Recommend: **KEEP all 5.** The tag was read
from "All pizzas $24", a price line, so the wording is thin. The substance holds:
these are pizzas, and "gluten free bases available" implies the default is wheat.

| Dish | Tag | Other evidence a rule can see | My recommendation | Your ruling (keep / drop) |
|---|---|---|---|---|
| Fame | `contains-gluten` | the heading: “Pizza” | KEEP | |
| Three Little Pigs | `contains-gluten` | the heading: “Pizza” | KEEP | |
| Fungus Amongus | `contains-gluten` | the heading: “Pizza” | KEEP | |
| Omertà | `contains-gluten` | the heading: “Pizza” | KEEP | |
| Starman | `contains-gluten` | the heading: “Pizza” | KEEP | |

### sprig-and-fern-thorndon / Burgers

> All burgers served with lettuce, tomato and pickle on a sesame bun with hot chips.

**Reading: DESCRIBES THESE DISHES.** Recommend: **KEEP all 3.** "All burgers
served with lettuce, tomato and pickle on a sesame bun." Covers the fish and black
bean burgers too.

| Dish | Tag | Other evidence a rule can see | My recommendation | Your ruling (keep / drop) |
|---|---|---|---|---|
| Chicken Schnitzburger | `contains-sesame` | none | KEEP | |
| Fish Burger | `contains-sesame` | none | KEEP | |
| Black Bean Burger | `contains-sesame` | none | KEEP | |

## What changed in the tool

- `tools/section-note-pointers.json` flags a note as a pointer, keyed by venue
  id and `sectionId`, and carries the note's exact text. It is a tool config,
  not a field in `site/data/` (ADR 0047: no screen renders it).
- The tagger's section-note reading skips a flagged note. The veto is on the
  note only. A dish's own words, photo and heading still count.
- An entry whose venue, section or note no longer matches is stale and fails
  `validate.py`, `--explain --check` and the sweep.
