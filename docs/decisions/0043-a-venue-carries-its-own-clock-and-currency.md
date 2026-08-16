# 0043 — A venue carries its own clock and currency

**Status:** accepted
**Date:** 2026-08-16
**Amends:** [0006](0006-hours-model-and-timezone.md) — the venue's timezone is
now read off the record rather than written as a constant · [0037](0037-confidence-reads-both-ways.md)
— the ⓘ names the venue's currency, not the site's

## Context

[ADR 0042](0042-the-collection-is-not-scoped-to-a-city.md) removed Wellington from
the product's framing and listed what that exposed: three behaviours still
hard-coded to New Zealand. The owner's instruction (2026-08-16) was to fix them —
Faves should work out currency, time and the rest from where a place actually is.

The three were not equally visible, but they shared a failure mode, and it is the
worst kind: **a confident wrong answer**. A London venue rendered
"Open · until 9pm" against Wellington's clock. Its £8.95 rendered as "$8.95".
Its "summer menu" surfaced in December. Nothing on screen admitted any of it. A
missing answer prompts a reader to check; a wrong one does not.

ADR 0006 was right when it was written — it chose the venue's zone over the
device's precisely so a guest browsing from Sydney saw Wellington's answer. It
just wrote that zone as a constant, because at the time "the venue's zone" and
`Pacific/Auckland` were the same sentence.

## Decision

**Three facts about where a venue is, resolved in one module (`site/js/place.js`).**

| Fact | Source | Absent means |
|---|---|---|
| `timezone` | optional field, venue or **branch** level | the collection's home, `Pacific/Auckland` |
| `currency` | optional field, venue level | the collection's home, `NZD` |
| hemisphere | **derived from `lat`** — never stored | unknown; callers keep south rather than guess |

**Timezone resolves per branch**, the same way `venueHours` already does: a chain
with a Wellington branch and a Sydney one is open in each on its own clock, and
the branch on screen is the one we owe an answer about. Currency is venue-level —
a menu is one document in one currency, so a venue genuinely pricing in two is
two records.

**Hemisphere is derived, not stored.** A coordinate already answers the question,
and a stored copy is one more thing that can disagree with the pin.

**The render takes one clock, read per zone.** `makeClock(date)` freezes a single
instant and answers `at(tz)`, memoised. The whole list is still ranked against one
moment — two venues cannot disagree about what time it is because the render took
a moment to run — while each is judged on its own zone. Ranking, filtering and the
route sort take that clock instead of a resolved `{dow, minutes}`; the pure core
(`openStatus`, `tierFromHours`) is untouched and still takes a plain moment.

**Both defaults are stated as the collection's home, not as a fact about the
world.** An unstated venue is not *presumed to be in New Zealand*; it is presumed
to be like the 38 records that existed when this shipped. That framing is what
lets the change migrate 38 files by editing none of them.

### What the reader sees

- **Prices** render with the venue's own symbol (`Intl.NumberFormat`,
  `narrowSymbol`): `$12`, `£8.95`, `¥900`. Whole amounts still drop the cents.
- **The ⓘ beside the prices** names that venue's currency in words. It used to
  say "All prices are in New Zealand dollars (NZD)"; it now says what *this*
  venue's are.
- **About** no longer claims a site-wide currency, because there isn't one. It
  states the rule instead — each place's prices are in its own currency, and the
  ⓘ names it — and gained a matching paragraph about the clock.
- **The hours label** says `Hours · London time` rather than `Hours · NZ time`,
  and only when the viewer's own clock differs from *that venue's*.
- **The home-screen timezone note** names the zone when the whole list shares
  one and stops naming any when it doesn't.
- **An order spanning currencies shows one total per currency** (`$42.50 + £18`).
  Adding NZD to GBP produces a figure that is not money.

### Price bands are a calibration, not a conversion

`$`/`$$`/`$$$` thresholds are keyed by currency, and **a currency we have not
calibrated gets no derived band at all** — a curated `priceBand` still shows, and
otherwise the venue simply carries no price chip.

This is deliberately a gap rather than a guess. "$" means *cheap here*, which is
a fact about local prices, not an exchange rate: running NZD's numbers through
today's FX would produce a confident band nobody measured. This repo has already
had to correct one invented threshold (ADR 0036). Adding a currency means sitting
with that country's menus and choosing its two numbers. `validate.py` warns when
a record uses an uncalibrated currency, so the missing chip is announced rather
than discovered.

## Consequences

**No data migration.** Every existing record is correct unchanged; the first
non-NZ venue states two fields. `validate.py` checks `timezone` against the
stdlib's own IANA database (the same source the browser's `Intl` consults) and
`currency` against ISO 4217's shape, so a typo is caught at commit rather than
rendered.

**A malformed zone or currency degrades, never throws.** Both fall back rather
than blanking a page mid-render. A bad zone falls back to *home*, not to the
viewer's device: home is wrong for one venue in a knowable way, where the device
clock is wrong differently for every reader and looks right to whoever is testing.

**`site/js/place.js` must stay in the service worker's precache list** — it is on
the boot path for every screen.

**Still unfinished, and named here so it isn't rediscovered:** menu *content* in
another language — dish names in their own script, and the `lang` marking WCAG 2.2
AA 3.1.2 requires for them — is a separate problem from where a venue is, and gets
its own record.

## Alternatives rejected

**Convert prices to the viewer's currency.** It needs live FX rates, which means a
network dependency and a number that is stale offline — against both ADR 0001 and
the offline guarantee. It is also the wrong answer: you pay the menu price, in the
menu's currency.

**Derive the timezone from the coordinates.** Elegant, and impossible offline
without shipping a tz-boundary dataset — megabytes, and a third-party dependency
the zero-dependency rule forbids. A country also spans zones, so a `country` field
could not have stood in for it either.

**Store the hemisphere alongside the timezone.** It would be a second field
capable of contradicting the latitude already in the record, for a fact one line
of arithmetic answers.

**Keep one `now` and one currency, and simply document the limit.** That is what
the code did until 2026-08-16, and the documenting is exactly what never happened —
the constraint lived in a comment that said "this app is Wellington's" while the
product was told it wasn't.
