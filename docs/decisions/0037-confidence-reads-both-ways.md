# 0037 — The confidence note reads both ways, and details carry their own date

**Status**: accepted
**Superseded in part (added 2026-08-17):** §3's second home (the About-dialog
currency line) is superseded by
[0075](0075-currency-is-stated-once-where-it-is-asked.md); §3's first home
(the per-venue ⓘ) and the rest of this record stand.
**Date**: 2026-08-15
**Builds on**: [0031](0031-verified-carries-its-derivation.md),
[0036](0036-refresh-caveat-reads-the-method.md)

## Context

ADR 0036 made the "needs a refresh" caveat a computed thing: `refreshCaveat`
reads the method and ages it, and the menu header shows an ⓘ when the answer
is yes. The owner asked for the other half, 2026-08-15:

> *"I think the user should be able to tell when a menu was last updated. […]
> It could appear as more of a warning if a restaurants information, menu, or
> pricing is at a lower confidence (e.g. an old menu). When the information is
> up to date we could have a info (vs warning) info tip that tells you the
> restaurants info (phone, address, opening hours, etc) and menu are up to
> date, and when the menu was last confirmed correct."*

Two problems with what we had.

**An absent icon said nothing.** Showing the ⓘ only on bad news meant its
absence was ambiguous: a menu read in store days before you looked, and a menu
nobody had ever checked, rendered identically. A reader cannot tell
"we checked, it's current" from "no comment" by looking at nothing. The date
line lower down (`Read in store, 8 Aug 2026`) carried the fact, but it is
small, grey, below the fold on a phone, and reads as metadata rather than as
an answer.

**`verified` does not mean what the ask needs it to mean.** It dates the
*menu* — ADR 0031 defines it as how and when the menu was read. The owner's
wording covers the venue's **details** too: phone, address, opening hours.
Those are separately true and separately rot. A takeaway card photographed at
the counter dates the prices on it; the hours printed beside them may be a
year stale, and a menu PDF emailed to us dates neither. Widening `verified`
to cover contact details would have made every existing record silently claim
something no one ever checked — a claim stronger than its evidence, which the
apex forbids outright.

A third thing rode along. The owner also asked for the currency to be
findable without prepending "NZD" to every price:

> *"Most users would assume NZD without thinking about it but I detest
> websites that don't make the currency clear. […] place it somewhere that if
> some one were specifically wondering which currency they can quickly find
> the answer."*

## Decision

### 1. The ⓘ is always present; only its tone changes

One control, two tones, decided by `refreshCaveat(record).show`:

| | Glyph | Colour | Says |
|---|---|---|---|
| needs a refresh | ⚠ | `--warn` amber | the existing caution, unchanged (ADR 0036) |
| current | ⓘ | `--info` blue | what was checked, when, and in what currency |

Recipes keep a bare title: there is no shop to have checked with, so neither
tone is true of them.

**Colour is never the signal.** `--info` and `--warn` sit **1.06:1** apart in
luminance — near-identical to anyone reading by brightness or with a colour
vision deficiency. So the glyph carries the difference (⚠ vs ⓘ), the
accessible name carries it ("Why this menu needs a refresh" vs "When we last
checked this menu"), and the colour only reinforces what those already say.
`disclosure()` grew a `glyph` option for this; every other caller keeps ⓘ.

`--info` is deliberately **not** `--ok`. Green already means "open right now"
on this site, and a confidence note is a different claim about a different
thing; the two must stay readable side by side in the same header.

### 2. Venue details carry their own reading

New optional pair on a venue record, mirroring `verified`/`verifiedBy`
exactly — same closed method set, same full-date precision:

```jsonc
"verified": "2026-08-15",           // the MENU was read this day
"verifiedBy": "in-store",
"detailsVerified": "2026-08-15",    // phone/address/hours were checked this day
"detailsVerifiedBy": "in-store",
```

Absent means **those were never checked as a distinct act** — the honest
majority case. The note then talks about the menu only and says nothing about
the phone or the hours, rather than borrowing the menu's credit for them.

One asymmetry with `verified`, on purpose: a `detailsVerified` with no
`detailsVerifiedBy` is an **error**, not a warning. ADR 0031 warns instead of
erroring because a pre-0031 corpus already existed and backfilling it would
have been invention. There is no pre-0037 corpus. Every use of this field is
being written now, so a method-less one is a gap being *created*, and the
gate can be strict from the first day.

### 3. Currency is stated twice, in the two places it is asked about

- **The per-venue ⓘ**, because someone wondering "is this NZD?" is looking at
  the prices when they wonder it.
- **The About dialog**, under "Prices", for whoever goes looking for a fact
  about the site rather than about a venue.

Not appended to individual prices. ~1,200 dishes each carrying "NZD" would
cost every reader legibility to answer a question almost none of them are
asking — which is precisely the owner's own framing of the trade.

## Consequences

- **The absence of the ⓘ now means something specific** (this is a recipe
  collection), and its presence always resolves to a stated position. There
  is no third, silent state left.
- **`detailsVerified` starts almost entirely empty** — three venues at
  writing, the ones whose card, cover or shopfront sign was read on
  2026-08-15 alongside the menu. That is not a backlog to fill; it is the
  field reporting the truth. It fills as venues get re-read.
- **The intake step gains a question**: "did this source establish the venue's
  details as well as its menu?" A board photo usually does not. A takeaway
  card with hours printed on it does. `intake/README.md` now asks it.
- **A stale-details venue is not yet distinguishable from an unchecked one**
  in the UI: the note simply omits details in both cases. Ageing
  `detailsVerified` the way `refreshCaveat` ages `verified` is the obvious
  next step and deliberately not taken now — with three records carrying the
  field there is no evidence yet about what limit would be right, and
  inventing one would repeat the mistake ADR 0036 had to correct.
- **The copy stays English**, like the caution it shares a popover with
  (`reo.js`'s safety-text rule). Splitting languages inside one control would
  be worse than either choice. Queued with the other draft strings for the
  fluent-speaker review already on the roadmap.
