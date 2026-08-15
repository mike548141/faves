# 0041 — A dish carries its own open questions

**Status:** accepted
**Date:** 2026-08-15

## Context

Transcription sessions leave small, specific gaps behind: a price label that sat
behind a cabinet frame, a jar whose nine words might be ingredients or might be
nine flavours, a bottle-list line that is probably two products run together.
Each needs one fact from the real world, not a decision.

They were recorded as prose in `ROADMAP.md` — *"Gold Lining — two unread prices:
the Falafel Wrap and the Bliss Balls"*. That has two failures.

**It goes stale silently.** The moment someone brings a price back, the roadmap
is wrong and nothing says so. This repo has already watched a hand-copied tally
in the same file go wrong three times — the stub count was corrected on
2026-08-09, re-counted on 2026-08-15, and made wrong again hours later by three
new venues. The roadmap's own text now says *"do not re-type the numbers — derive
them."* A list of dish names is the same mistake with different nouns.

**It is invisible where it matters.** The gap is a fact about a dish, and the
person best placed to close it is someone standing in the shop looking at that
dish. They are holding the app, not the roadmap.

Underneath both sits a data problem. `price: null` was carrying two
incompatible meanings — *the shop prices this on application* (1841's Fish of the
Day) and *we tried to read it and failed* (Gold Lining's Falafel Wrap). The menu
screen rendered both as `—`. A reader could not tell the shop's uncertainty from
ours, and neither could the next transcriber.

## Decision

**The gap lives on the dish.** An optional `needs: [{what, note?, since?}]`,
`what` from a closed set (`price`, `ingredients`, `allergens`, `name`,
`availability`).

- **In the app** it renders as a small `?` pill between the description and the
  tag row, opening the same disclosure control the venue header already uses.
  The note says *what would clear it*, not merely that something is missing —
  the point is to make the next action obvious to whoever is standing there.
- **In the price slot** a dish with `needs: price` shows `?` instead of `—`, so
  the two kinds of absence finally read differently.
- **As the worklist**, `tools/needs.py` derives the list from the data. The
  roadmap points at the command and stops naming dishes.

## Rejected

- **Leave it in ROADMAP.md.** The status quo, and it loses on the two failures
  above. Keeping it *also* in the roadmap alongside the data was rejected for
  the same reason: two copies is the drift, not the cure.
- **Put the chip in the existing `dish-tags` row.** Cheapest to build, and
  wrong: two of those chips are allergen warnings, and the whole design intent
  of that row is that a `⚠` there means *this food could hurt you*. Adding a
  record-keeping note in the same row, in the same shapes, dilutes precisely the
  chips that must not be diluted. It gets its own row and its own glyph.
- **Reuse `⚠` for the indicator.** Same objection, one level down. `⚠` belongs
  to the allergen chips and the refresh caveat. `?` says *unknown* without
  spending the caution budget, and shape carries it before colour does — the
  rule `disclosure.js` already follows.
- **Infer the gap from `price == null`.** No new field, and it would tag every
  market-price dish and all 41 McDonald's rows as defects. The distinction
  between "varies" and "unread" is exactly what cannot be inferred; it has to be
  stated. This is the same reasoning as ADR 0025's one-way rule and the
  "no tag = not stated" rule: absence is not evidence.
- **A free-text `todo` string.** Easier to write, impossible to filter, count or
  render consistently, and it would drift into a scratchpad. The closed set is
  the same discipline the tag vocabulary and `verifiedBy` already use.
- **Translate the indicator into te reo.** `reo.js` draws a safety boundary: the
  allergen chips and the refresh caveat stay English until a reo review, because
  a misreading could hurt someone. This says the same class of thing about the
  same class of fact, and one of its kinds is `allergens`. It stays English and
  falls through automatically.

## Consequences

- The closed set is now written in **three** places — `site/js/needs.js` (labels
  and fix text), `tools/validate.py` (what is legal), `tools/needs.py` (the
  report). `test_validate.py` fails if they drift, because the dangerous
  direction is silent: a kind the renderer doesn't know is dropped, so the data
  would claim a gap no reader ever sees. That guard was verified by injecting a
  kind into one file and watching it fire.
- A dish with both a price and `needs: price` is an **error**. The indicator
  hides itself when a price exists, so a stale entry would be invisible in the
  app while `needs.py` kept reporting a job already done — a worklist that lies
  is worse than none.
- 🚩 **Scope deliberately stops at the dish.** Section-level gaps (Gold Lining's
  juice fridge is not itemised at all) and venue-level ones (1841's menu is a
  2025 document; The Borough's phone is third-party) have nothing to hang a dish
  indicator on, and the venue header already has ADR 0037's ⓘ/⚠ for the second
  kind. Those stay in the roadmap for now. If the same drift bites there, the
  fix is the same shape one level up — not a second mechanism.
- The app now tells a visitor what we don't know about a dish. That is a
  deliberate widening of the honesty surface, consistent with ADR 0037 doing it
  for the menu as a whole, and it makes the gaps fixable by whoever is nearest.
