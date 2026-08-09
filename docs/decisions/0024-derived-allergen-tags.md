# 0024 — Allergen tags may be derived from the dish name, in an enumerated set

**Status**: superseded by [0025](0025-infer-allergens-by-default.md) (2026-08-09)
**Date**: 2026-08-08

## Context

The standing rule (CLAUDE.md, WORKPLAN Phase 1) is: *"Only tag what the
menu states or the restaurant confirms — remember 'no tag = not stated',
never guess allergens."* It exists to prevent a **false absence**: a
reader with an allergy seeing no warning and inferring safety.

Two problems surfaced while transcribing Takeaway @ Churton's menu
(2026-08-08), and the owner asked for both to be fixed.

**1. Satay carried no peanut tag anywhere the menu didn't spell it out.**
Satay sauce *is* peanut sauce. Where a menu happened to print "served
with peanut sauce" (KK Malaysian, Thai Tara Express, Hell Pizza) the
dishes were tagged `contains-peanuts`. Where the menu just said "Satay"
(R & S Satay Noodle House, Takeaway @ Churton, KC Cafe) they were bare.
So the app already asserted "satay = peanut" — inconsistently, decided
by whether a particular menu-writer was verbose. Given a household nut
allergy, a peanut-allergic reader browsing R & S — a venue whose *name*
is Satay Noodle House — saw no warning on any of its satay dishes.

**2. Shellfish tagging was internally inconsistent.** In the same
record, Battered Mussel and Calamari Ring were tagged and Prawn Cutlet
and Crab Stick were not. A fleet-wide audit found **100 missing tags
across 8 venues**, including every prawn/shrimp dish at Takeaway @
Churton and every oyster-sauce dish at KC Cafe.

The honest reading is that these are two different failures. The second
is not a rule problem at all — the menus *do* state "Prawn Cutlet"; the
tags were simply missed by hand-tagging venue by venue over many
sessions. The first is a genuine gap in the rule: the menu states a
*dish*, and the allergen is in the dish's definition rather than its
printed words.

## Decision

Allergen tags come from two tiers, and the difference is recorded rather
than blurred.

**Tier 1 — STATED.** The menu names the ingredient. Tagging is *reading
the menu*, not guessing, and needs no new licence. This covers the
crustacean/mollusc vocabulary: prawn, shrimp, squid, calamari, scallop,
mussel, oyster (**including oyster sauce**, which is oyster extract and
a widely missed exposure), paua, crab, kanikama/surimi, lobster,
crayfish, clam. **64 of the 100** tags applied were this tier.

**Tier 2 — DERIVED.** The menu names a dish whose defining ingredient it
does not print. Permitted only for the **enumerated** rules below —
never open-ended, never a general licence to infer:

| Rule | Tag | Basis |
| --- | --- | --- |
| dish name/description contains "satay" | `contains-peanuts` | satay sauce is peanut sauce; the app already tagged it wherever a menu spelled it out |
| an **unnamed** "seafood" mix ("Seafood Congee", "…or Seafood") | `contains-shellfish` | a seafood mix in these cuisines reliably includes prawn or squid |
| "laksa" | `contains-shellfish` | laksa paste standardly contains belacan / dried shrimp |

**36 of the 100** tags were this tier.

**A dish the venue itself calls vegetarian or vegan stands the derived
*shellfish* rules down** — its own tag is better evidence than our
inference. Satay is deliberately exempt from that carve-out: peanut
sauce is entirely compatible with a vegetarian dish, and "Vegetarian
Satay" is precisely the dish someone would wrongly assume is safe.

**Optional paid extras are not ingredients.** "Add chicken, halloumi,
prawns or beef +$7" does not make a garden salad shellfish. The audit
strips any clause carrying both an "add" and a "+$" price before
matching — found by dry-run, which would otherwise have flagged four
Sprig + Fern dishes that contain no shellfish at all.

**The UI copy changes to match.** The allergen disclosure said *"We only
show what venues told us"*, which tier 2 makes false. It now reads:
"Tags are what the venue stated, plus a few we add where the dish name
makes it near-certain (satay is peanut, an unnamed seafood mix is
shellfish). No tag still means not stated, never that a dish is free of
it." Shipping derived tags under the old wording would have been the
quiet kind of dishonesty this repo's apex forbids.

**The audit is a tool, not a one-off.** `tools/tag_allergens.py` reports
by default and applies with `--apply`; re-run it after any menu
transcription. The gap existed because tagging was done by hand, record
by record — a checkable rule is the only durable fix. It patches the
`tags` arrays in the raw text rather than round-tripping the JSON, so it
never reformats a hand-maintained file.

## Alternatives rejected

- **Keep the strict rule and tag nothing** — the status quo. Rejected:
  it was already being violated inconsistently (satay *was* tagged at
  three venues), and it left a peanut-allergic reader unwarned at a
  venue called Satay Noodle House. "No tag = not stated" protects the
  reader only if the reader knows to treat every untagged dish as
  unknown; in practice an app that warns on 3 of 22 satay dishes teaches
  the opposite.
- **A new "may contain" tier in the tag vocabulary** (e.g.
  `may-contain-peanuts`), rendered distinctly. Genuinely better in
  principle — it would let a reader see provenance per dish. Rejected
  **for now** as disproportionate: it needs a vocabulary change, new
  render treatment, and changes to the avoid-preference matching in
  `dietary.js` and `settings.js`, all in safety-critical code. The flat
  tag plus honest copy gets the warning in front of the reader today;
  this stays the obvious upgrade if per-dish provenance is ever wanted.
- **Ask each venue.** Correct and unscalable — 31 records, and it
  blocks a safety fix behind phone calls. Worth doing opportunistically
  when a menu is next re-verified in store.

## Consequences

- The app now **over-warns** rather than under-warns on these classes.
  That is the deliberate direction: a missed peanut warning is a safety
  failure, an extra one is an inconvenience. It does mean a
  shellfish-avoiding reader sees warnings on dishes whose shellfish
  content is inference (a laksa broth), and a dietary filter will dim
  them.
- **`contains-peanuts` only, never `contains-nuts`**, for satay —
  peanuts are legumes and the app carries the two preferences
  separately.
- Derived tags are indistinguishable from stated ones **in the data**.
  The audit tool is the record of which is which, and re-running it
  reproduces the classification; the ADR carries the counts (64/36).
  If that ever needs to be per-dish, that is the rejected "may contain"
  tier above.
- The tool is deliberately **additive only** — it never removes a tag,
  so an owner or venue correction always wins over the sweep.
