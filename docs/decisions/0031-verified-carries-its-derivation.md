# 0031 — `verified` carries its derivation: a sibling method, at record level

- **Status:** Accepted
- **Date:** 2026-08-09
- **Doctrine:** atelier `PRINCIPLES.md` §9, which binds retrofits as well as
  new designs (Mike ruled 2026-08-09). The binding sentences:

  > A field holding a *conclusion* — `verified`, `approved`, a price, a
  > status — is an assertion, and an assertion with no derivation is both
  > unfalsifiable and un-ageable: nothing distinguishes a fact the owner
  > confirmed directly from one a scraper inferred and never rechecked, and
  > the two render identically. Store the result, and alongside it **when it
  > was established and by what method**.

  And, on the state this repo was in:

  > (Mike, 2026-08-09 — the generalised case below is the shape that prompted
  > it: a bare nullable "verified" flag, carrying neither date nor method.)

  Faves is that flag. ADR 0023 gave it a date; this gives it a method.

## Context

`verified` was a nullable ISO date on the venue record: "the menu was last
checked on this day". ADR 0023 made it load-bearing — it is the record time
every undated price in the menu inherits (`temporal.js` `defaultRecorded`).

Two dates in the corpus, and the corpus itself shows why a date is not
enough. `docs/SESSIONS.md` records how every menu was actually obtained, and
the spread is wide: Gold Lining was photographed **in the shop**; Churton was
transcribed from a **printed menu** the owner carried in; TJ Katsu came off
the venue's **own site**, which is visibly stale (©2017, its own nav 404s);
Subway's hours came from **four aggregators that contradicted each other**.
Batch 3 (`WORKPLAN.md`) went further and drew the line explicitly — "prices
from paper menus, **not** delivery apps". Every one of those readings would
have produced an identical `"verified": "<date>"`, and they are not equally
likely to be wrong. That is §9's charge, in this repo's own data.

## Decision

**`verified` keeps its shape; a sibling `verifiedBy` carries the method.**
Six values, a closed set, each naming a **source class** and never a person:

`in-store` · `paper-menu` · `official-site` · `phone` · `delivery-app` ·
`third-party` — defined with their error modes in `ARCHITECTURE.md`
("Derivation — how we know, not only when").

**Granularity: the record, with a per-reading override already in place.**
A price-series entry may state its own `method`; omit it and the entry
inherits the venue's. Nothing else gains a method.

**Enforcement** (`validate.py`, following the file's existing conventions —
an error is a shape/consistency breach, a warning is a visible gap):

| Condition | Result |
|---|---|
| `verifiedBy` off the closed set | error |
| `verifiedBy` set, `verified` null | error — a method with no date establishes nothing |
| `status: "verified"` without both | error — the claim *is* the derivation |
| `verified` set, `verifiedBy` absent | **warning** — no backfill; the gap stays loud |
| series entry `method` off the set | error |

**Rendering**: the menu header's date line reads "Read from a paper menu,
8 Aug 2026" instead of "Verified 8 Aug 2026". Nothing else changed. <!-- datescan:allow: quoted UI copy — the date as the menu screen prints it, not a dated claim -->

**Applied, not backfilled.** Two records carry a `verifiedBy` because
`SESSIONS.md` states how each was read: `gold-lining-cafe` → `in-store`
(2026-08-07/08 entry: "Owner photographed the printed BRUNCH and DRINK cards
plus the cabinet, bakery, slice and blackboard displays in-store"), and
`takeaway-at-churton` → `paper-menu` (2026-08-08 entry: "rebuilt from the
printed menu the owner dropped into `intake/`"). Those are the only two
records with a `verified` date at all, so the retrofit is complete and the
warning fires on nothing. Recording a method we *have* is not backfill;
inventing one we don't is, and none was invented.

## Rejected

- **Per-price derivation** — the roadmap's own framing, and the one this ADR
  most nearly took. It loses on evidence, not on cost. Acquisition in this
  operation is a *session* act: one person reads one source and transcribes a
  whole menu, so the method is a property of the reading, not of a dish.
  Where a menu genuinely has two readings, the schema **already** separates
  them — they are two entries in a price series with their own `recorded`
  dates — so the honest place for a finer method is that entry, and it is
  built (see Decision). What per-price would add today is 31 records × several
  hundred dishes of a field that "no backfill" forbids populating: it would
  ship 100% empty and read as ceremony. §9 is explicit that this is a defect
  in its own right — "carrying more than the questions justify is §2 KISS
  violated in the other direction". **Test that would reverse this:** a venue
  whose menu is assembled from two sources in one sitting (board photo for
  names, delivery app for prices — the R & S Satay shape). Then the record has
  no single method and per-price becomes the only honest answer.
- **`verified` becomes an object `{date, method}`.** Cohesive, and the
  roadmap's literal wording ("`verified` grows date + method"). Rejected on
  compatibility: `verified` is read as a bare string in four live places
  (`temporal.js` `defaultRecorded`, `menu.js` `new Date(...)`, `report.js`
  `venue.verified || "never"`, `report-ui.js`). The site is installed on
  phones. An object reaching any renderer that predates the change prints
  `[object Object]` into a bug report — a shipped lie, and precedence rule 2
  ranks that above the tidiness of one field. A sibling field is invisible to
  every old consumer and to old JSON alike. §9 says "alongside", not "nested".
- **A `confidence` score (0–1, or high/medium/low).** Tempting, because it is
  what a staleness policy wants to consume. Rejected: we cannot defend the
  numbers, and a scale we invented would be a claim stronger than its evidence
  (precedence rule 2). The method is the fact; a policy can map methods to
  weights when a policy exists and has to justify itself.
- **Reduced-precision `verified` (`"2019"`), matching ADR 0023's dates.**
  Rejected: a *reading* happens on a day we know we did it. It is the menu
  *document* that may be loosely dated, and that date already has a home on
  the series entry. Loosening `verified` would let "we checked sometime in
  2019" pass as a check.
- **Backfilling the method for the 174 Churton 2019 price entries.** Their
  provenance is known (ADR 0023: "a 2019 menu scan") — but `paper-menu` is
  exactly what the record already inherits from `verifiedBy`, because both
  Churton readings were paper menus. 174 identical annotations that change
  nothing is noise, not evidence.
- **A new `provenance.js` module.** The vocabulary lives in `temporal.js`
  beside `verified` itself, which already owns that field and its fallback
  chain. A second module would split one fact's rules across two files and add
  a precache-list entry for six strings.

## Consequences

- **Backwards compatible in both directions, by construction.** Old JSON: no
  `verifiedBy` → `verification()` returns `{method: null}` and the header
  renders the wording it always did. Old cached JS: never sees a new key it
  must understand, because `verified` is unchanged. `series()` gained a
  `method` on every entry, which is additive — the one test asserting the
  entry shape exactly was updated.
- **Staleness became computable.** `resolveRecord` now stamps every
  `priceSeries` entry with the method behind it, so ROADMAP Theme 13b's price
  trend can honour its own honesty constraint: a `paper-menu` reading from
  2019 and an `in-store` one from 2026 are two points from different
  instruments, and the view can say so rather than drawing a line.
- **A gap this exposed and did not close.** The menu screen's "needs a
  refresh" caveat keys off `!verified`. With methods in the data, the bare
  presence of a date is the weaker signal: a `third-party` reading should
  probably still caveat, and TJ Katsu / Sushi Bi currently sit at
  `verified: null` partly *because* setting a date would silently switch their
  (correct) caveat off. Queued as ROADMAP Theme 13g rather than fixed here —
  it is a content-policy call about which methods count as a check, and
  guessing it would have changed live UI on judgement rather than evidence.
- **`in-store`, not `owner-in-store`.** The roadmap named the latter. A
  household member reading a board is the same source class as the owner
  doing it, and the schema must not start naming people (the no-personal-data
  hard constraint).
- **No `inferred` / `guess` value.** Deliberate: we do not store prices we
  inferred, the same discipline as "no tag means *not stated*". Adding one
  would need its own decision, because it changes what the data may contain.
- **ADR number collision to watch:** `0025` already exists twice in this
  directory (`0025-infer-allergens-by-default`, `0025-settings-index-and-
  panels`). This one took `0031` against an index that ends at `0030`;
  parallel sessions may have taken it too.
