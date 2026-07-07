# 0007 — Recommended pairings (`goesWith`), not a meal reorg

**Status**: accepted • **Date**: 2026-07-08

## Context

Cook-at-Home (and menus generally) are flat lists of individual dishes,
but people eat *meals*. The owner floated two shapes: reorganise the data
around meals (a "meal" = main + sides + dessert), or keep dishes flat and
add "goes well with" suggestions. Whatever we pick must stay within the
hard constraints — static, no backend, no accounts, no ratings.

## Decision

Add an optional **`goesWith`** list per menu item: pairing references,
each either a dish `name` in the same record or a cross-record
`"restaurant-id#Dish Name"`. The menu screen renders them as deep-link
chips ("Goes well with …") under the dish. It's our curation — static
data, validated (every reference must resolve, like `picks`), no backend.

## Rejected

- **Reorganise around meals (`meal` as a first-class set):** more
  expressive, but a much larger reorg of both data and UI, and it
  hard-codes *one* grouping — a dish can belong to many meals, and forcing
  a single parent loses that. Better built *after* pairings exist, only if
  flat-list-plus-pairings proves too loose. Deferred, not dropped.
- **Crowd ratings / "people also ordered":** needs a backend, accounts and
  moderation — breaks three non-goals. `goesWith` gets the "what goes with
  this" value with none of that.

## Consequences

`goesWith` is additive and reversible — absent on most items, no schema
churn. It **generalises beyond recipes**: a restaurant dish can point at a
drink, or cross-link to another venue, which is the same mechanism the
future order tally (Theme 1) and the health app (Theme 6) can lean on — a
"meal" becomes an emergent set of linked dishes rather than a rigid
parent record. Validation resolves cross-record refs via a dataset-wide
name map (pre-pass in `validate.py`), so a broken pairing fails CI.
