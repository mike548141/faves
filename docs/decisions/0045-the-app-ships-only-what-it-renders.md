# 0045 — The app ships only what it renders

**Status:** accepted
**Date:** 2026-08-16
**Amends:** [0023](0023-time-dimension-in-the-data.md) — a refresh still
appends, but the appended history lands in the research store rather than the
payload · [0015](0015-split-precache-versioning.md) — the data cache now
carries strictly less

## Context

`site/data/restaurants/<id>.json` is precached in full by the service worker
([`sw.js`](../../site/sw.js), `cache.addAll` over every venue in the index), so
a field added there is downloaded by every installed phone whether any screen
reads it or not. The corpus had accumulated three classes of field that no
screen reads:

- **Superseded price entries.** ADR 0023 made a refresh append rather than
  overwrite, so a dish's `price` is a dated series. `temporal.js` resolves the
  current value from it and also computes `priceSeries` and `priceNext`.
- **Dishes that came off the menu**, marked `available.offBy` — used by
  `temporal.js` only to decide the dish is *not* shown.
- **Venues retired from the collection.**

The owner ruled on 2026-08-16: data the app will never render — now or in a
future feature — must not be in the app's dataset, but must still be kept for
research, analytics and history.

**The evidence, gathered before acting rather than assumed.** `priceSeries`,
`priceNext` and `asOf` have **zero consumers** anywhere under `site/` outside
the module that computes them; the only references are in `temporal.js` itself
and its unit tests. So the history was not feeding a feature, not even a quiet
one. The `offBy` dishes are likewise load-bearing only in the negative: the app
uses the marker to hide the dish, so a dish deleted outright and a dish marked
gone render identically.

**Payload cost is honestly small, and that is not the argument.** All venue
files gzip to about 56 KB against a 300 KB first-visit budget, and the price
history within them accounts for roughly 648 bytes of it — 1.2%. The case for
the split is not the kilobytes at the measured size. It is that a payload with
no rule about what may enter it accretes forever, invisibly, one field at a
time, and the ratchet only turns one way.

## Decision

**Two stores, cut on *rendered* versus *not rendered* — not on *current* versus
*historical*.**

| Store | Path | Served | Holds |
|---|---|---|---|
| Payload | `site/data/` | yes, precached | exactly what a screen can show |
| Record | `data/` | never | everything else, kept forever |

A dish keeps **one** price entry: the current one, with its `recorded` date and
derivation intact, because the app *does* render how old a price is (ADR 0036's
refresh caveat, ADR 0031's derivation). Superseded entries move to
`data/history/prices/<venue>.json`. Dishes marked `available.offBy` move to
`data/history/dishes/<venue>.json`.

**The refresh rule gains a second half.** ADR 0023 said a changed price gains a
dated entry beside the old one. It still does — the entry is simply appended to
the research store while the payload's single entry is replaced. A *correction*
(we recorded it wrong) still overwrites and appends nothing, in both stores. The
test is unchanged: did the shop change it, or did we?

`tools/split_data.py` performs the move and, with `--check`, proves the two
stores still reconstruct the pre-split corpus. That check is the guard against
the failure this decision could cause: history silently dropped instead of
relocated.

## Rejected

**Leave it, because 648 bytes is nothing.** This was the recommendation put to
the owner, on the measurement above, and he ruled against it. He is right about
the mechanism even where the current number is small: the payload had no rule,
and a store with no rule about what enters it is one where every individual
addition is defensible and the total is not. Fixing it at 648 bytes is cheaper
than fixing it at 60 KB, and the migration cost is the same either way.

**Generate the payload from the record at build time.** Cleanest in theory: one
source of truth, the payload derived. Rejected because it puts a build step
between the record and the served bytes, and zero build step is a hard
constraint — `site/` is served exactly as committed. The split is a one-time
move plus a `--check` reconciliation, which needs no build and no runtime.

**Keep history in the payload but strip it in the service worker.** Would save
the bytes on the wire but not in the repo's hot read path, and it makes `sw.js`
know about menu semantics, which it deliberately does not.

## Consequences

- The payload can only grow by adding something a screen shows. That is now a
  rule with a check behind it, not a habit.
- Price history stops being visible to anyone reading a venue file, so the
  research store is the only place it lives. `split_data.py --check` is what
  stops that becoming a quiet deletion.
- `temporal.js` keeps `priceSeries`/`priceNext`: they are correct, tested, and
  cost nothing until a series arrives. If a future screen wants a price graph,
  the data is in the record store and the resolver is already written.
- A venue that closes permanently is **not** covered by this decision. The app
  renders a closure badge (`closure-ui.js`), so a closed venue is rendered and
  stays in the payload by this ADR's own test. Whether it should later retire to
  the record store is a product question — how long a regular deserves to be
  told a place is gone — and is left open deliberately. No venue carries a
  closure today, so nothing is blocked on it.
