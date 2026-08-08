# 0023 — The data carries its time dimension; the UI does not

- **Status:** Accepted
- **Date:** 2026-08-08
- **Owner ask:** "all application, system and user data must have a time
  dimension… the UI stays the same but the data model will record prices
  against a dish with timestamps"
- **Doctrine:** atelier `PRINCIPLES.md` §9 (added 2026-08-08). This repo is
  named in that section's generalised case as the dataset that *lacked* the
  dimension: one nullable `verified` field, no world time, unable to say when a
  venue opened, when it entered the guide, or tell a refit from a closure.

## Context

Every fact in `site/data/restaurants/*.json` was written as though the present
were the only tense. A price was a number. A dish was on the menu or absent
from the file. A venue was in `index.json` or gone from it. Nothing recorded
*when* any of it became true, and — the part that makes this a defect rather
than a simplification — nothing recorded when we *found out*.

Four questions the owner wants answerable that the old shape could not answer
at all: when did this place open, and when did we add it · what did this dish
cost before · what is on the winter menu · is this place shut for a refit or
gone for good. A fifth is coming: what will it cost from Wednesday.

Git dates the *file*, which is why the gap stayed invisible. But git is not
shipped to the browser, a menu refresh rewrites a whole file in one commit, and
a commit date is when we *typed* the price, never when the shop *raised* it.
Git is the archive of our edits; it is not the history of the world.

## Decision

Four optional primitives in the JSON, and one resolver
([`site/js/temporal.js`](../../site/js/temporal.js)) that projects a record onto
a single day before anything else sees it. Records with no dates resolve to
themselves, so the whole corpus stayed valid through the change.

**Two clocks, never collapsed.** *World time* (`from`, `to`, `date`, `opened`)
is when a thing was true out there. *Record time* (`recorded`, `offBy`, `added`,
and the existing `verified`) is when we read or wrote it. They diverge as a
rule here, not as an exception: we learn a price by reading a printed menu,
years after it changed. An entry takes effect on its `from` when we know it and
otherwise on its `recorded` — the day we saw it, by which it was demonstrably
already true. Without that fallback almost none of our history could be
recorded at all, because we hardly ever learn the day a price moved.

1. **Temporal value** — a field is the plain scalar, or a dated series
   `[{value, from?, recorded?, note?}]`. Applied to dish `price` and to
   `address`/`phone` (top level and per branch).
2. **Lifecycle** — `{opened, added, events: [{type, date, until?, note?}]}`
   with `closed-temporarily` / `reopened` / `closed-permanently`. `added` is
   required on every venue.
3. **Availability** — `{from?, to?, offBy?, season?}` on a menu section or a
   dish. `season` recurs (NZ months), so a winter menu is one fact rather than
   a row per year.
4. **Revisions** — `[{date?, recorded?, change}]` on a dish: the dated log of
   what changed about it, which is where "the muffin went vegan" lives.

**The UI does not change — with one exception.** `resolveRecord()` runs inside
`data.js`, so `price.js`, `menu.js`, `cart.js`, search and ranking all keep
reading `item.price` as a number and never learn that time exists. Someone
choosing dinner should see tonight's menu and nothing else. <!-- datescan:allow: product vocabulary — "tonight's menu" is the question this app answers, not a dated claim -->
The exception is a
closure, which gets a badge and a banner: a stale price costs a dollar, a
closed venue costs a wasted trip across town, so it states itself.

## Alternatives rejected

- **A parallel history file per venue.** Keeps the menu files clean, but splits
  one fact across two files that can disagree, and doubles the edit for a
  refresh. The series lives with the value it belongs to.
- **`price` stays a number, history goes in `priceHistory`.** Two places to
  write the current price, so they drift; the validator would exist mostly to
  police that duplication. The series is the single source of truth and the
  scalar is its one-entry shorthand.
- **Full bitemporality (valid-time + transaction-time on every field).** The
  heavy end, and §9 says most data does not earn it. We carry the two clocks
  only where a question needs them.
- **A `closed: true` flag.** Loses *when*, cannot express a reopening, and
  rewrites history as it flips. Named in §9 as the thing not to do.
- **Deleting retired dishes (the status quo).** A hard delete destroys every
  date attached to a dish including the fact that it ever existed — which is
  precisely what had already happened to five Churton dishes, and what this ADR
  reversed by restoring them from git with a dated end-state.
- **Bumping precision to a full date everywhere.** Rejected: the Churton scan
  is dated only "2019". `YYYY` and `YYYY-MM` are valid dates in this schema and
  comparisons widen them to their real interval, because rounding an unknown
  day up to 1 January would be inventing evidence.

## Consequences

- **Payload — cheap over the wire, and not by luck.** Retired dishes and old
  prices ship to the client. On disk that looks expensive:
  `takeaway-at-churton.json` 30 KB → 72 KB, whole-corpus data 209 KB → 252 KB.
  Compressed, which is what a visitor actually downloads, it nearly vanishes:
  **34.0 KB → 35.1 KB gzipped for the entire corpus, +1.1 KB (+3%)**; Churton
  itself 3.0 KB → 3.7 KB. A dated series is intensely repetitive
  (`"recorded": "2019", "note": "2019 menu scan"` 174 times over), which is
  exactly what a compressor eats. First visit remains ~161 KB gzipped
  (126 KB shell + 35 KB data), well inside the 300 KB budget. The escape hatch,
  if a venue ever accumulates history that does matter, is an archive file the
  trend view fetches on demand — deliberately not built yet.
- **Editing cost.** A price that has not moved stays a bare number; only a real
  change forces the series form. The venue's `verified` date supplies the
  record time for every undated price in its menu, so the common case costs
  nothing.
- **`validate.py` gained** ordering checks (a series must be written oldest
  first), transition checks (nothing follows a permanent closure; you cannot
  reopen a trading venue), and a required `lifecycle.added`. Type checks on
  the values inside a series are the same ones a flat price always got —
  gaining a time dimension must not weaken the schema.
- **What was NOT retrofitted.** `opened` (world time — when each business
  started trading) is absent everywhere, because we have never established it
  for any venue. Absent means "never established"; a guess would have been
  worse than a gap, and §9's "unknown is not none" is the reason the field can
  be absent rather than null-and-ambiguous.

## Evidence at adoption

The retrofit used git as the source, and mined the *whole* corpus rather than
one venue: across every restaurant file's history there are exactly two commits
that changed a price.

- **Takeaway @ Churton** (`c2dc20b`) — a genuine refresh, a 2019 menu scan
  replaced by the 2026-08-08 printed menu. 174 dishes gained a two-entry series
  (Wonton Soup $10.50 → $17.50), including two whose printed *name* changed and
  which would otherwise have read as "dropped in 2026" — a false claim about
  the world. Five dishes the refresh deleted were restored with
  `available.offBy`, since we know the day we confirmed them gone and not the
  day they came off.
- **Gold Lining** (`1ae3d9e`) — a Double Choc Cookie going `null` → $5.50. This
  is a *correction*, not a price change: we did not know the price, then we
  did. Recording it as a series would have fabricated a price rise. It stays a
  bare number, dated by the venue's `verified` field.

That distinction is the whole reason this was not done by script over the git
log. A diff in a commit is evidence about *our record*; only a human reading of
why the commit happened tells you whether the *world* changed.

`lifecycle.added` was mined for all 31 venues from each file's adding commit —
record time, known exactly, never guessed.

## Follow-on

Recording a future-dated entry already works and already resolves correctly
(today keeps today's price; `pending()` returns the announced one). Showing it
— "coffee is $6 from Wednesday" — and the price-trend view that `priceSeries`
exists to feed are ROADMAP Theme 13, deliberately unbuilt here.
