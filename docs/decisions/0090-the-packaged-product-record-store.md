# 0090 — A packaged-product record store, quoted from labels and never served

**Status**: accepted • **Date**: 2026-09-06

## Context

The owner added `intake/ingredients/` — 183 photographs of packaged food in his
house, plus five JSON exports from earlier attempts at the same job with ChatGPT
and Gemini — and asked for everything harvestable off them:

> *"Make sure you harvest everything you can from these. For example
> manufacturer, product identifiers, product size/weight/volume, servings,
> nutritional information etc… We may use this info in the cooking at home info,
> we may also use it for a future healthy food, eating and food diary, food
> planning feature(s) or a separate app."*

So the consumer is explicitly undecided. That is a fact about *where the data
goes*, not a reason to defer collecting it: the packets get thrown out and the
labels go with them.

**The prior exports could not be reused.** Of 107 records in the richest one,
only 37 carried any nutrition figures and **none** carried a barcode, pack size,
ingredients, allergens, storage or origin. Worse, spot-checking the one export
that did carry ingredients against its own source photograph found it had
recorded *"Sweetcorn (62%), Water, Sugar, Salt"* where the label reads
*"Sweetcorn (48%), Water, Corn Starch, Sugar, Salt, Acidity Regulator (Citric
Acid)"* — a wrong percentage and two dropped ingredients, in a list that reads
perfectly. The exports are a good **index of what exists**; they are not data.

## Decision

**`data/products/`, one JSON file per product, validated by
`tools/products.py`.** Repo-only under ADR 0047: no screen renders a barcode, a
manufacturer's address or a sodium figure, and `site/data/` is precached onto
every phone in full.

Three rules are **enforced by the validator**, not left to care:

1. **No location, ever.** 137 of the 183 photographs carry EXIF GPS clustered
   inside one 73 m × 51 m box — a private address — and this repo is public. The
   schema has no field for a position and the validator rejects every spelling
   of one. A capture date plus a position is a movement record.
   **This rule is superseded in full by
   [0115](0115-where-a-product-was-seen-is-a-business-not-a-coordinate.md)** —
   owner-ruled 2026-09-09. Read literally, *"No location, ever"* also forbids
   **reading** GPS at intake, which `tools/intake_exif.py` does and must keep
   doing, and it forecloses recording that a product was seen **in a shop**,
   which is a fact about a business. 0115 replaces the wording; the privacy
   floor beneath it — no coordinate in a tracked record — is unchanged. Rules
   2 and 3 below are untouched.
2. **No eating events.** This is a store of *products*, not of meals. "He had
   this for lunch on Tuesday" is health-adjacent personal data about a named
   person. The transcripts in `intake/` are full of it; none of it comes
   through.
3. **An allergen list is QUOTED, never inferred.** `allergens.contains` holds
   what the label's own "Contains:" statement says, in the label's words. It is
   not the app's `contains-*` vocabulary and it is never derived from the
   ingredient list.

`needs` is the fourth rule and the one that makes the store honest: **a record
with no nutrition must say it needs nutrition.** Otherwise "we looked and it
isn't legible" and "nobody looked" are byte-identical for ever.

`source.kind` is its own closed vocabulary — `own-photo` | `label-text` |
`manufacturer` — and deliberately NOT ADR 0046's `public-record` | `given`. That
pair governs records about **people and ownership**; a Wattie's label is neither,
and forcing it into that vocabulary would blur a distinction ADR 0046 exists to
draw.

## Consequences

**87 products.** Nutrition 74 (85%), ingredients 62 (71%), allergens 48 (55%),
manufacturer 42 (48%), barcode 19 (21%).

**The limiting factor is framing, not legibility, and it cannot be fixed by
trying harder.** Where a back panel is in frame the read is excellent — full
panel, ingredient list, "Contains" and "May be present" lines, barcode digits.
Where the photograph shows only the front, there is a brand and a net weight and
nothing else. About a third of the corpus is front-only. `--reshoot` therefore
ranks gaps by what a second photograph would **buy**: 41 products have no
readable allergen statement, 1 no panel, 36 want detail, 2 want only a barcode.
An unranked list is one nobody walks.

**The capture burst, not the file, is the unit.** `tools/product_bursts.py`
groups photographs taken within 45 seconds — front-then-back — because a
front-of-pack shot is unharvestable alone and is the *label* for the back shot
twelve seconds later. 183 photographs, 59 bursts, nothing unplaced.

🚩 **The finding that justifies rule 3, observed live.** Two agents reading the
same photograph reached opposite conclusions on the sweetcorn percentage, one
asserting 62% was *"unambiguous at maximum zoom"*. Reading it by hand settles it
at **48%** — and the 62 is real, on that same label, in the nutrition panel
directly above, where it reads `258kJ (62Cal)`. Confident, and off by one line.
A quoted list can be checked against the photograph; a reconstructed one cannot,
and looks identical.

🔎 **`leakscan` caught something two human passes had missed.** Two product notes
had written *"given the peanut allergy"* — a health fact about a person, in a
public repo. Rewritten. The other 32 findings were manufacturers' own printed
factory addresses, which a regex cannot tell from a house, so
`data/products/*.json` is exempted from that rule. **The guard moved rather than
vanished:** `products.py` refuses a street address anywhere except
`manufacturer.address`, and immediately found three notes carrying a
distributor's — now folded into the field that may hold one. If that glob is
ever widened, this check moves with it.

**What a clean validator run does NOT mean.** It checks shape, not truth. It
cannot tell you a sodium figure was read correctly, that the barcode digits are
the ones under the bars, or that an ingredient list is complete. Nothing but a
second person and the photograph can.

## Alternatives rejected

- **Reusing the ChatGPT/Gemini exports as data.** Measured above: mostly empty,
  and demonstrably wrong where it mattered most. Kept as a name index only.
- **Putting products in `site/data/`.** ADR 0047 settles it — name the screen
  that renders it, and there isn't one yet.
- **Deferring the whole store until its consumer is decided.** The photographs
  exist now and the packets do not last. A record store with no reader is
  exactly what `data/` is for.

## Addendum — 2026-09-08: the promised index now exists, and these numbers have moved

Two corrections to this record, appended rather than edited. Nothing above is
withdrawn; the *Decision* stands unchanged.

**1. *"Kept as a name index only"* was a promise, not a description.** No index
was written — the exports were read once, judged, and left in `intake/`. Found
by the intake audit of 2026-09-08 (roadmap `500/040`), which noted that an
accepted record describing a thing that does not exist is worse than a gap,
because the next reader stops looking. **The index now exists**:
`data/intake/name-index.json`, generated by `tools/intake_index.py`. It holds
**152 names** from the five exports — name, brand where the export gives one,
which export file it came from, and whether a `data/products/` record matches.
**63 have a record; 89 have none**, including a five-SKU Fresh 'n Fruity yoghurt
line that was never photographed.

🛑 **No nutrition figure from those exports is in it, and none ever will be** —
for the reason this record already gives above: the sweetcorn list. Copying
those numbers in would launder bad data into the repo behind its own provenance
rules. `conversation_export_partial.json` is excluded entirely under rule 2 and
is named in the index's header only to record that it was seen and refused.

**2. The *Consequences* statistics have drifted, and one of them fell.**
Re-measured 2026-09-08 on the same 87 records, `tools/products.py --stats`:

| | This record (2026-09-06) | Measured 2026-09-08 |
|---|---:|---:|
| nutrition | 74 | **76** |
| ingredients | 62 | **69** |
| allergens | 48 | **47** |
| manufacturer | 42 | 42 |
| barcode | 19 | **21** |

`--reshoot`'s 🔴 safety tier now names **52** products, not 41, and its other
tiers read 0 / 28 / 1 against this record's 1 / 36 / 2. **Allergens went down**,
which a growing corpus cannot explain: a record lost that field. Stated rather
than chased — the figures above are what the tool prints today, and a headline
number outlives its derivation unless somebody re-derives it.

**3. The coverage gap this record left open is closed by
[ADR 0102](0102-a-harvest-reports-its-own-coverage-and-a-gap-is-not-a-failure.md).**
*"183 photographs, 59 bursts, nothing unplaced"* is true and means unplaced **in
a burst** — not uncited by a record. 15 bursts had no record at all, because 26
of the photographs are recipes and a menu leaflet rather than products.
`products.py --coverage` now reconciles the two, and
`data/intake/not-products.json` is how a burst says *read, and deliberately not
a product*.
