# 2026-11-15 0222 UTC — the owner's three truck rulings, and the Food truck style

**Dispatched by** the owner, on the laptop, in the same session as
`2026-11-14-0340` (session `1bdd7eb4`), answering the three calls that record
put to him from `520/040`.

## His words

- *""Rock Yard Food Truck" is a branch of "Rock Yard Vietnamese
  Restaurant""*
- On keeping the truck a separate record until branches can carry menus:
  *"agreed"*
- On the dated spot: *"they wll need multiple stypes i.e. sightings,
  announed/booked time & place, schedule"*
- On a Food truck vibe: *"I agree "Food truck" is another vibe like
  Takeaway, Dine-in, Delivery, Cook yourself etc"*

## What changed

- **`site/js/vibes.js`:** `food-truck`, facet `style`, leading the styles.
  The eight trucks carry it in place of `counter-order`. `SHELL_VERSION` →
  `2026-11-15.1`; summaries regenerated (`summary.json`, `catalogue.json`).
- **`site/js/search.js`:** "food trucks" and "trucks" map to the label;
  "truck" already matched inside it. Unit tests for both, and the synonym
  test break-probed: deleting the `trucks` line fails exactly one test.
- **Board:** `520/040` closed with the three rulings in his words; `010`
  carries the three-kinds ruling (sighting, announced or booked, schedule)
  where the build will read it.

## Judgement calls

- 🚩 **Where the style went.** His examples (Takeaway, Dine-in, Delivery)
  are the *Dining* filter, `orderMode`, and Cook at Home is a record kind;
  none of them is a vibe. He was asked about the vibe vocabulary and said
  yes, and a truck is also takeaway, so a Dining value would either hide
  trucks from Takeaway or double-file them. Built as a style; told him it
  moves to the Dining filter cheaply if that is what he meant.
- **Nothing links the truck to the restaurant in `site/data/`.** He stated
  the relationship; no screen would render a link field (ADR 0047), so it is
  recorded on the board, where the Theme 30 merge will read it.
