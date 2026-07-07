# 0003 — Cook at Home as a `kind:"recipes"` record

**Status**: accepted • **Date**: 2026-07-08 (backfilled; decided 2026-07-06)

## Context

"Cook tonight" wants to sit in the same decision flow as the takeaways —
the same home list, the same "Pick for us" shuffle — so a group choosing
dinner sees staying in as one of the options, not a separate app. But a
recipe is not a venue: it has no address, phone, service, or price.

## Decision

Add a single collection, `site/data/restaurants/cook-at-home.json`, that
reuses the restaurant shape with a `kind` discriminator (`"venue"`
default, or `"recipes"`). For recipes the venue-only fields relax
(`area`/`city`/`address` may be null, `services` empty, no contact/order
card), and each menu item may carry optional recipe fields (`serves`,
`time`, `ingredients`, `steps`). `section`, `picks`, `tags`, search, and
dietary chips all work unchanged. This is the **one** sanctioned
deviation from the venue-only model — no other content types are planned.

## Rejected

- **A separate content type with its own route/renderer:** duplicates
  the menu screen, the filters, and the card logic for a collection that
  is 95% the same shape.
- **A second mini-app for recipes:** splits the one-list, one-shuffle UX
  that is the whole point of putting "cook at home" in front of the group.
- **Forcing recipes into a fake "venue":** misleading contact/service
  semantics (a phone number and "takeaway" tag on a recipe) and pollutes
  the area/cuisine filter facets.

## Consequences

One code path renders both; the recipes collection is excluded from the
area/cuisine facets and rendered as an accent-tinted "Recipes" pin on the
home screen, with ingredients + method in a collapsed `<details>` per
recipe. Family attributions in recipe titles are permitted under the
owner-approved personal-data exception (see `CLAUDE.md`). Builds on
[0002](0002-json-per-restaurant-git-as-cms.md).
