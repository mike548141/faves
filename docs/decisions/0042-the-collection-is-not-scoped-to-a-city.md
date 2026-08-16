# 0042 — The collection is not scoped to a city

**Status:** accepted
**Date:** 2026-08-16

## Context

Faves was written as a Wellington app. Not as a stated constraint — nobody
decided it — but as an assumption that settled into the product's own words:
the page title, the manifest name, the About lede, the share text and the te
reo subtitle all said *Wellington*, and a source comment said flatly *"this app
is Wellington's"*.

That was a fair description of the data. Every venue held to date sits in the
Wellington region, because that is where the household lives and eats.

The owner's intent was never that narrow (2026-08-16): a place loved anywhere
in the world may be added. The copy was describing today's data as though it
were the product's boundary — and a boundary written into the interface is the
kind a future session defends rather than questions.

## Decision

**The collection is scoped to what we like, not to where it is.** Product copy
names no city and no country. Wellington may appear as a *fact about a venue*
(its area, its address, its coordinates) and as illustration in historical
records; it may not appear in the framing of the product.

The venue data itself keeps its real place names, obviously. The three ADRs
that reason from a Wellington example (0006, 0029, 0035) keep their text —
they are accepted records of their own moment, and an example is not a scope.

## Consequences

The rename is cheap. What it exposes is not: three behaviours are still
hard-coded to New Zealand, and each is *correct for every venue held as at
2026-08-16* and *silently wrong* for the first venue that sits outside NZ.
They are marked at the source with `#!####` / `#!###` rather than left to be
rediscovered.

1. **Timezone (blocking).** `hours.js` computes open/closed in
   `Pacific/Auckland` and `temporal.js` reads the current date the same way
   (ADR 0006). A London venue would show open/closed against Wellington's
   clock — off by half a day, with no visible sign it was wrong. Fixing it
   means a per-venue `timezone` (IANA) in the schema, defaulted to
   `Pacific/Auckland` where absent, and an ADR superseding 0006. The visible
   string *"Open/closed times are New Zealand time"* and the `Hours · NZ time`
   label become wrong at the same moment.
2. **Currency.** Prices are NZD by construction — the About panel states it
   once for the whole site rather than per price (ADR 0037), and the `$`/`$$`
   bands in `price.js` are calibrated to NZD. A venue priced in another
   currency needs the statement to move down to the venue.
3. **Hemisphere.** `temporal.js` maps `summer` to Dec–Feb. That inverts north
   of the equator.

None of the three is fixed here. The trigger for each is the same: **the first
non-NZ venue.** Adding one before the timezone work lands ships a wrong answer,
not a missing one — so the timezone fix is a prerequisite to that data change,
not a follow-up to it.

## Alternatives rejected

**Leave the copy, since the data is all Wellington anyway.** It reads as honest
description, but it is the mechanism by which an accident becomes a rule: every
future session reads *"this app is Wellington's"* and builds to it. The words
were already doing that work in `temporal.js`.

**Fix the timezone and currency handling in the same change.** Tempting, and
wrong to bundle: the copy fix is safe and complete on its own, while the
timezone change alters a schema, migrates 36 venue files and supersedes an
accepted ADR. Shipping the honest framing now, with the gaps marked and
unclaimed, beats holding it behind a migration nobody needs until a venue
actually arrives from somewhere else.
