# 0045 — Prices convert, and localisation can follow you

**Status:** accepted
**Date:** 2026-08-16
**Supersedes in part:** [0043](0043-a-venue-carries-its-own-clock-and-currency.md) — its
"price bands are a calibration, not a conversion" rule, and its optional
`currency` field

## Context

ADR 0043 gave each venue its own currency and refused to convert between them:
with no rates, converting meant inventing them, and a band nobody measured is
worse than no band. That was right at the time and wrong as a permanent
position — the owner's instruction (2026-08-16) was to convert, with three
conditions that between them decide the whole design:

- **rates ship with the app**, updated occasionally, no live FX API;
- **the interface must not show a currency code against a price** — no
  "NZD $14.50 for X";
- but a reader must still be able to see **what the shop charges in** and
  **what they will pay in their own money**;
- and where the two are the same, there must be **no noise at all**.

Alongside it: language, units and currency are all the same question — how
should this look, for someone *here*? — so each should be able to answer
"whatever people use where I am".

## Decision

### Rates are data, not a call

`site/data/fx.json`: a base (NZD), an `asOf` date, a named source, and 35 rates.
Written by `tools/fetch_fx.py`, committed, refreshed daily by
`.github/workflows/fx.yml`, cached beside the menus, read offline.

A live FX API was never available to us: it is a third-party runtime dependency
(ADR 0001 forbids it outright) and it goes blank in flight mode — which is
exactly when someone abroad is looking at a menu and wondering what it costs.

The cost is staleness, and the answer to staleness is disclosure, not silence.
The file carries its own date; the app shows it beside the prices and beside the
setting. And the framing is always "about": a reference rate is not what a card
charges, because the issuer's margin sits on top.

### The interface stays quiet

| Reader's currency | What renders |
|---|---|
| Same as the shop's | Exactly what it always did. `$14.50`. No note, no code, no marker. |
| Different | The converted figure with its own symbol — `£3.26` — and the conversion disclosed **once per menu**, never per dish. |

The once-per-menu disclosure is two things: a line under the menu header naming
both currencies, and the existing ⓘ beside the prices (ADR 0037) giving the
rate's date and stating plainly that **the shop will take its own price**.

This is what the "no noise" condition means in practice. For every reader at
home looking at a local menu — which is nearly every reader, nearly always — the
page is byte-for-byte what it was before conversion existed.

### Every price states its currency

`currency` is now **required** on every venue record and checked against the
shipped rates. All 45 existing records were stamped `NZD`.

The owner asked for the currency to be recorded against every *price*. It is —
by declaration rather than repetition: a menu is one document in one currency,
so one field answers it for all 187 of a venue's dishes. An individual item may
still override it (`item.currency`) for the rare menu that quotes a line in
another currency. What matters is the property, and the property holds: **no
stored price is of unknown currency**, because a price that cannot be converted
looks exactly like one that can.

### "Local" resolves from the device, timezone first

All three localisation settings accept `local`, and it is the default.

Resolution order is the feature: **the device's timezone, then its locale
region.** A Wellington phone that lands in London reports `Europe/London` (the
timezone follows the traveller) and `en-NZ` (the locale does not), and the person
standing in the London café wants pounds and miles.

Geolocation is deliberately not used. The app already asks for location for
"Near me", and turning a permission granted for one purpose into a second,
unasked-for use is a bad trade for a guess this good about something the reader
can override in two taps.

`settings.get()` returns every `local` already resolved, so no consumer knows the
word exists; `settings.raw()` is the stored preference, for the settings screen.
Currency is the exception — it cannot be resolved without knowing which venue's
price is being rendered, so `place.js` resolves it per price.

### Price bands calibrate through the base currency

ADR 0043's refusal is reversed. One calibration, in NZD, reached from any other
currency by conversion. A Tokyo venue showing no band at all told a reader less
than one held to the same yardstick — and the yardstick is at least stated.

What conversion still cannot fix is that cheap in Wellington is not cheap in
Hanoi. So a band is a comparison *within this collection*, which is what it
always was for a reader scrolling one list.

## Consequences

**An order spanning currencies can now be added up.** It used to read
`$42.50 + £18`, because the two were not addable. Converted into whatever the
reader is seeing, they usually are — and where a rate is missing the joined form
survives, because a wrong single total is worse than an awkward true one.

**Two import cycles had to be broken**, and both had already killed a screen —
the browser reporting a constant used before it was ready.
`home.js` (the collection's own
defaults) and `defaults.js` (the two distance numbers) are leaf modules that
import nothing, so nothing on the cycle imports anything on the cycle. Constants
shared by three modules should start there rather than arrive there.

**A daily push to `main` is a daily deploy.** The refresh job commits only when a
rate actually moved, and bumps `DATA_VERSION` in the same commit so installed
phones refetch — the lockstep rule, honoured by the tool rather than by a human
remembering.

**A currency with no shipped rate is a validation error**, not a warning: the
venue would render correctly in its own currency while silently ignoring the
reader's choice.

## Alternatives rejected

**A live FX API.** Ruled out by ADR 0001 and by the offline guarantee, and it
fails at the exact moment it is most wanted.

**Show the currency code against every price.** The obvious way to make a
converted price honest, and the owner ruled it out — rightly. It would put "NZD"
on 1,200 dish prices to answer a question almost nobody is asking, and it is
noise even when nothing is being converted.

**Round converted prices to a "nice" number.** `£3.26` looks like false
precision; `£3.30` would be a fabrication. The arithmetic is what it is, and the
"about" is carried by the words around it.

**Convert to the reader's currency and hide the shop's entirely.** You cannot
pay in it. The shop's currency is named in both disclosures for that reason.
