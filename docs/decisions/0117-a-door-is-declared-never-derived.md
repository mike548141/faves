# 0117 — A door is DECLARED, never derived

**Status**: accepted
**Date**: 2026-09-09
**Extends:** the order-mode axis (roadmap
[`010/010`](../roadmap/010-two-structural-owner-rulings-2026-08-16-23-15/010-service-is-renamed-to-order-mode-including-the.md))
with a third value · **does not touch**
[0089](0089-a-dish-has-a-price-per-door.md), which prices a dish per door and is
a different question · answers half of roadmap
[`370/010` (30g)](../roadmap/370-theme-30-a-venue-has-menus-plural-owner-raised/010-30g-a-delivery-price-is-a-service-fee-not-a-se.md)

## Context

The owner asked, 2026-09-09:

> *"The All dining drop down on the main page needs Delivery added as an option,
> it currently only has Takeaway and Dine-in"*

This is the same axis he framed himself on 2026-08-16, in the breath that raised
30g — *"choosing dine-in vs takeaway (pickup) vs delivery?"* — and 30g's closing
line already ruled out the alternative reading: *"`order-mode` is now the settled
word for the shipped venue filter … do not open a fourth word."* So the shape of
the change was never in question. **Where the venues come from was.**

Adding the `<option>` alone would have shipped a control that returns an empty
list on all 57 records: **not one venue's `services` array carried `delivery`**,
because `validate.py`'s `SERVICES` did not permit the value. A filter that can
only ever say *"no places match"* is worse than no filter — it reads as a broken
app rather than as a gap in the data.

Three sources of an answer were available in the repo, and they are **not**
interchangeable:

| Source | What it actually says | Venues |
|---|---|---|
| `services[]` | the doors this venue opens | 0 (the value was not permitted) |
| a dish's `prices.delivery` (ADR 0089) | what this dish costs through that door | 1 |
| `ordering[].platform` | a link we hand the reader | 19, of which 10 name a courier |

## Decision

### 1. `delivery` joins `ORDER_MODES` and `SERVICES`

One axis, three values, one vocabulary — `filters.js` `ORDER_MODES`, its
`ORDER_MODE_LABEL`, `validate.py`'s `SERVICES`, the schema in
`ARCHITECTURE.md`, the `<option>` in `index.html`, and a te reo gloss.

### 2. The filter reads a DECLARATION, and never derives one

A venue answers *Delivery* because its own record says
`"services": [… "delivery"]`. It does **not** answer because some dish of its
carries a `prices.delivery`, and it does **not** answer because its `ordering`
list names Uber Eats.

**The rejected alternative was to derive it from `prices.delivery`**, which is
attractive — it needs no data edit at all, and it was already in the tree. It is
wrong in both directions:

- **False negatives, silently.** A venue that delivers *at counter prices* has
  no per-door price to derive from. On today's corpus that is nine of the ten
  venues below: only `kk-malaysian` carries delivery prices, so a derived filter
  would have offered **one** place and looked, to a reader, exactly like a
  complete answer.
- **It answers a different question.** ADR 0089's `prices` map exists so a
  reader can see what a dish costs through a door they have already chosen. *Does
  this place deliver* is asked before that, by someone who has chosen nothing.

The same reasoning refuses derivation from `ordering[]`, for a sharper reason:
that list mixes couriers with **pickup** links. `rock-yard-restaurant`'s is
literally `/order-pickup`. A rule reading that list at runtime would tell a
reader a place delivers because it has a website.

### 3. `ordering[]` is EVIDENCE an author reads once — not a rule the app runs

The distinction §2 draws is about **when**, and it is the whole of it. Deriving
at query time is banned. Reading the same field once, by hand, to write a
declaration down is what *declaring* means — every field in `services` got there
by somebody reading something.

The ten venues marked on 2026-09-09 are exactly those whose own `ordering` names
a platform that carries food to an address — Uber Eats, DoorDash, Delivereasy,
Easy Eats, and Pizza Hut's own `/order/pizzas/delivery`:

`daily-bakery` · `kc-cafe` · `kk-malaysian` · `noodle-canteen` · `pizza-hut` ·
`pizza-pomodoro` · `spices-indian` · `thai-tara-express` · `the-ramen-shop` ·
`wellington-kebab-grill`

**Nine venues with an `ordering` link were deliberately left unmarked** —
`crepes-a-go-go`, `dragonfly`, `gong-cha`, `pandan-asian-cuisine`,
`rock-yard-restaurant`, `rs-satay-noodle-house`, `satay-kingdom-cafe`,
`sushi-bi`, `the-catch-sushi-bar`. Every one says *"Order on our site"*, *"Order
direct"* or the shop's own storefront name, and **nothing in the record says
whether that order gets delivered or collected.** Marking them would be a
guess, and the guess fails in the expensive direction: a reader who filters to
Delivery and rings a shop that does not deliver has been told something untrue by
this app. They stay out until the owner or a reading says otherwise.

The remaining 38 venues carry no `ordering` link at all. **Absence of a link is
not evidence of absence of delivery** — it is silence, and the filter treats it
as such.

### 4. The vocabulary and the control it is painted on are joined by a test

`ORDER_MODES` lives in `filters.js`; the `<option>` list is hand-written in
`index.html`. Nothing in the repo read both until now, and each half is right on
its own while broken:

- a mode in the vocabulary with no `<option>` is **unreachable** — nobody can
  select it, and every unit test passes;
- an `<option>` with no vocabulary entry resolves to `"all"`, so the control
  reads **"Delivery"** over the **unfiltered** list. That is precisely the fault
  `filtersFromQuery`'s doc comment describes for a bad URL, arriving through the
  markup instead, where no validation stands.

`tests/filters.test.js` now reads `site/index.html` and asserts the option values
are `"all"` followed by `ORDER_MODES` exactly, and that every option's
`data-i18n` key exists in `reo.js`. **Break-probed three ways** on 2026-09-09,
each failing a different count: dropping the vocabulary entry fails 3 tests,
dropping the `<option>` fails 2, dropping the `data-i18n` attribute fails 1.

## Consequences

- **The Delivery option returns 10 of 57 venues.** That is a real answer, not a
  complete one, and §3 says exactly which question is still open.
- 🎯 **Two owner calls are left open by this ADR, and neither is ours:** whether
  the nine ambiguous `ordering` venues deliver, and whether the 37 silent ones
  do. Both are content, and content here is owner-supplied or owner-directed.
- **The te reo gloss is `Hīkawekawe`, marked draft.** It is the owner-nominated
  dictionary's own headword — noun, *"(goods) deliveries"* — taken whole, which
  `reo.js`'s SAFETY BOUNDARY permits, rather than composed from parts, which it
  does not. The caveat written beside it is real: the entry is the *logistics*
  sense, and this control means *the shop brings dinner to you*. It wants a
  fluent speaker's eye, at the same standing as `filter.allStyles` beside it.
  This is **not** the `filter.orderMode` case — that one stays English-stale
  because te reo has no attested abstract noun for "dining" at all.
- **`?order-mode=delivery` stopped being the unknown-value test fixture**, since
  it is now a valid value. Replaced with `?order-mode=courier` and the note
  saying why, because *"a test whose fixture became valid"* is the one shape that
  turns green by meaning less.
- **30g's premise moves again.** That item asks whether a delivery premium is a
  fee on the order or a price on the dish. It is untouched: this ADR adds the
  door, not the money. But the *venue-level* half of the owner's 2026-08-16
  sentence — *"it may require choosing dine-in vs takeaway (pickup) vs
  delivery"* — is now built.
