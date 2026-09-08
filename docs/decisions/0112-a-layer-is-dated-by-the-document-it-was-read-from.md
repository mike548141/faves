# 0112 — A price layer is dated by the document it was read from, not by the folder it sits beside

- **Status:** Accepted
- **Date:** 2026-09-09
- **Supersedes nothing.** It corrects a *fact* asserted in
  [0023](0023-time-dimension-in-the-data.md)'s "Evidence at adoption", not a
  decision 0023 took. 0023 stays Accepted and unedited.
- **Roadmap:** `500/020`, the `b029` half.

## Context

Roadmap `500/020` asked one question: two intake photographs of the Takeaway @
Churton leaflet are dated **2025-11-25** and sit between that venue's "2019"
layer and its 2026-08-08 reading — **do their prices differ from either?** If
they did, a price layer had been thrown away, which is what ADR 0023's history
store exists to prevent.

They do not. **All 179 priced dishes match the held layer to the cent, zero
differ, and no dish is in one and not the other.** Nothing was lost and there
was nothing to recover.

But answering the question meant opening the *other* evidence for the first
time, and that is where the finding is.

## The finding

**The 179 price entries labelled `recorded: "2019", note: "2019 menu scan"`
were not read in 2019 and were not read from anything dated 2019.** They were
transcribed on **2026-07-06** from `menu 2.pdf` — a two-page scan of the
printed leaflet.

Four independent lines, each checkable:

1. **The 2019 photographs are not a menu.** `IMG_2689` and `IMG_2690`
   (2019-06-04, iPhone 7) are in-store shots of the counter: a row of
   laminated pack cards and three kids-pack cards. Between them they show a
   price for **seven** dishes. They cannot be the source of 179.
2. **The prices entered the repo at `1ba220f` (2026-07-06)** —
   *"Transcribe menus (Spices, Takeaway, Thai Tara)"* — carrying **180 dishes,
   179 priced, 1 unpriced**, with `verified: null`.
3. **`menu 2.pdf` is that leaflet.** `/CreationDate D:20260706181009+12'00'`,
   2 pages, `DCTDecode`, no text layer, 3512×2488 — one scanned side per page.
   Reading them shows the identical layout, the identical 82 numbered items,
   the identical unnumbered reverse, and the identical typos as the b029
   photographs (*"Pineapple Fritterb"*, *"Cinnemon Donut"*, *"Corn Frtitter"*,
   *"Lecttuce"*, *"Prawn Culet"*, *"Meduim"*).
4. **The multisets are equal.** The 179 prices in the record at `1ba220f` and
   the 179 prices on the b029 leaflet are the *same multiset*, not merely the
   same range.

The date was attributed at `816cb7e` (2026-08-08), the ADR 0023 retrofit. That
session mined git for the superseded values — correctly — and then dated them
from the only other thing in the venue's intake folder, which happened to be
two 2019 photographs. The folder was read as if it held one document.

## Decision

**A price entry's `recorded` is the date of the document it was read from,
established from that document's own metadata (ADR 0038). Proximity in an
intake folder is not evidence of provenance.**

Applied here, as a **correction** under ARCHITECTURE's refresh rule 5 — *did
the shop change it, or did we?* We did. So the entries are overwritten and
**no entry is added**; recording this as a series would fabricate a price
movement that never happened.

| | Before | After |
|---|---|---|
| `data/history/prices/takeaway-at-churton.json` | 174 entries `recorded: "2019"` | 174 entries `recorded: "2026-07-06"` |
| `data/history/dishes/takeaway-at-churton.json` | 5 entries `recorded: "2019"` | 5 entries `recorded: "2026-07-06"` |
| entry count | 179 | **179** — unchanged, which is why the append-only guard passes |

**The seven the photographs do evidence keep their 2019 fact, in words.**
`family-pack-1`, `family-pack-2`, `family-pack-3`, `seafood-pack`,
`calamari-pack`, `fish-burger-pack` and `kids-packs` are legible on the
2019-06-04 counter cards at the same price, so their note reads
*"2026-07-06 leaflet scan (menu 2.pdf); price also legible in-store
2019-06-04"*. The other 172 read *"2026-07-06 leaflet scan (menu 2.pdf)"*.

**Nothing is written into `site/data/`.** The payload holds one entry per dish,
`recorded: "2026-08-08"`; the string `2019` appears nowhere under `site/data/`.
So no field was added for a screen to render (ADR 0047) and `DATA_VERSION` is
not bumped — a redate of a repo-only record store is not a payload change.

## What this costs, and what it buys

**It does not move a single price.** Every value is untouched; only the claim
about *when we read it* changed.

**It shortens a seven-year window to five weeks.** The record said Wonton Soup
went $10.50 → $17.50 somewhere in 2019–2026. It actually went $10.50 → $17.50
somewhere between **2026-07-06** and **2026-08-08** — or, taking b029 as the
lower bound on the leaflet's circulation, the $10.50 was still in print on
2025-11-25. A 67% rise over seven years and a 67% rise over five weeks are not
the same fact about the world, and the second is the one the evidence supports.

**It removes a premise ADR 0023 relied on.** 0023's *Alternatives rejected*
declines full-precision dates because *"the Churton scan is dated only
2019"* — the corpus's only cited instance of a loosely-dated reading. That
instance was not real. Reduced-precision `YYYY` / `YYYY-MM` dates stay valid in
the schema and nothing about the resolver changes; but the corpus now contains
**no** reduced-precision `recorded` date at all, so if that rejection is ever
revisited it should be revisited on a live example rather than this one.

## Rejected

- **Adding a `confirmed: "2025-11-25"` field to all 179 entries.** The first
  answer, and wrong twice. It records the *photograph's* date as if it were a
  reading of the shop, and 179 identical annotations is precisely the shape ADR
  0031 refused when it declined to backfill a method onto these same rows —
  *"174 identical annotations that change nothing is noise, not evidence"*.
  The fact is about the layer, so it is stated once, at the layer.
- **Setting `from: "2019-06-04"` on the seven.** `from` is world time and means
  *takes effect on*. The photographs show the price was **already** true then,
  which is a different and weaker claim. There is no field for "already true
  by", so it is said in the entry's `note` rather than invented as one.
- **Leaving `recorded: "2019"` and explaining it in prose.** The value is what
  `temporal.js` and any future consumer read; a note beside a wrong number is
  the decorative shape ADR 0072 names.
- **Adding `IMG_7234`/`IMG_7235` to `data/intake/menu-sources.json`.** They are
  the venue's evidence, but they live in `intake/ingredients/raw_food_photos/`,
  and that record is folder-scoped — `check_provenance.py --rebuild` scans the
  named folder, so foreign filenames under the Churton entry would be wiped by
  the next rebuild and read as drift before then. They are recorded in
  `data/intake/not-products.json`, which is the store for exactly this: images
  somebody opened, and what they hold.
- **Touching `verified` / `verifiedBy`.** Correct as they stand, and ADR 0107
  settles it: `verified` may not be fresher than its evidence, and these
  photographs are **older** than the record's 2026-08-08 reading. An older
  document cannot date a newer reading. `paper-menu` is also right — and note
  `intake_exif.py` suggests `in-store` for these two frames purely because they
  are photographs with a GPS fix. They are a leaflet on a kitchen bench, not a
  board on a wall; the tool's suggestion is a heuristic and the images outrank
  it.

## Consequences

- **A guard exists for the loss this was not.** `check_append_only` counts
  entries, and a correction changes values without changing counts — which is
  why an honest redate of 179 entries passes it, by design, and why the
  reasoning has to be written down here instead.
- **`check_provenance.py` cannot catch this class.** It compares a venue's
  `verified` against its folder's evidence dates. It has nothing to say about a
  *price entry's* `recorded`, which is the field that was wrong, and it read
  this venue as supported throughout. Not a defect in the tool — a gap named so
  the green is not read as coverage.
- **The other three venues in `500/050`(b) inherit the question.** KC Cafe
  (9 photos, 2015), R&S (1, 2017) and Spices (2, 2023) each have older intake
  photographs and no price history. Before any of them is mined, the first
  question is now *which document did the record come off* — not *what is the
  oldest file in the folder*.
- **Privacy.** Both b029 frames carry a GPS fix on what is a private address,
  not the shop; no coordinate or distance is recorded anywhere in this repo,
  and the leaflet was photographed at home. The frames show a person's feet on
  a kitchen floor and nothing else personal; no name, handwriting or private
  number was transcribed. The only phone number here is the business's own,
  which the record and the leaflet both already print.
