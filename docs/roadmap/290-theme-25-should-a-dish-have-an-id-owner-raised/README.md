# Theme 25 — Should a dish have an id? (owner-raised 2026-08-16)

✅ **BUILT 2026-08-16 (ADR 0051).** Claim cleared. `site/js/dish-id.js` is the
single resolver; `dishId` is **required and seeded** on all 1755 rows, not
optional-and-derived — the owner ruled mid-build that identity must be
**immutable**, and an id recomputed from a mutable display name is not. The 22
colliding rows are disambiguated with the first of each group keeping the bare
slug, so nothing that ever worked moved. Fixed with it: the `$56`-for-`$49`
overcharge, three elements sharing `id="dish-cheeseburger"`, a duplicate
`aria-controls` target, a shared add-on radio group, and an export/import round
trip that re-merged the two Cheeseburgers. Measured cost: **+12.6 KB gzipped**,
16.3% of the data cache. Detail → ADR 0051.

✅ **Theme 25's residue is closed — 2026-08-16** (`727cea9`, `b92270c`). Three
of the four items shipped and the fourth was answered by measurement. Full
original text and the evidence → [`ROADMAP-DONE.md`](../../ROADMAP-DONE.md).

- ✅ **A shared shortlist now lands on the dish you meant.** The wire format
  gained an optional `k` array, positionally parallel to the existing bare-string
  `d` — old codes decode byte-identically, old decoders never look at `k`, and
  `CODEC_VERSION` did not move. 🔎 **The order-line trick did NOT transfer, and
  the reason generalises:** an order line is a *positional array*, so its id
  became slot 4; a shortlist group is a *keyed object*, so the equivalent is a
  new **key**. Same feature, same day, two mechanisms — and the wrong one looked
  obviously right. Proved end to end with a real click on the $21 Gold Card
  Cheeseburger, landing on its own key and never the $28 Mains one.
- ✅ **`temporal.js` no longer deletes a pick written as a `dishId`.** Filtered
  through `findDish` now. The gate still drops a pick whose dish is genuinely out
  of season, in every form, and returns it in December.
- ✅ **The retired `sprig-and-fern` fixture is renamed** — and it was worse than
  the item said. That id is not merely stale: it resolves *live* through
  `renames.js`, so those tests were exercising the venue-rename migration by
  accident. Now `fixture-venue`, except where a test exercises the migration on
  purpose.
- 🔎 **Cross-record `goesWith` refs — measured, and deliberately NOT built.**
  There are **zero** cross-record refs in the corpus (7 same-record ones, all
  resolving), so the gate has nothing to catch. More decisively, the roadmap's
  framing was wrong about the fix: widening `ALL_NAMES` would still not let you
  point at a disambiguated row, because the wire format is `id#Display Name` and
  `pairingLinks` renders the post-`#` text as the chip's **visible label**.
  Writing `id#cheeseburger-gold-card` would validate and even anchor correctly,
  and the chip would read "cheeseburger-gold-card" to the reader. So this is a
  **wire-format question** (a ref carrying both an id and a label), not an
  `ALL_NAMES` question. Reopen when a cross-record ref actually needs to reach
  one of the 3 venues with duplicate dish names.

<!-- Numbered 25, not 22: two other live sessions had already taken 22, 23 and
     24 while this branch was open. The note on Theme 19 says to check
     `grep '^## Theme' ROADMAP.md` before adding one — it is there because this
     keeps happening, and it happened again here. -->

Owner, on reading ADR 0044's "a dish's `name` is its identity": *"that is fine
but does a dish need a unique ID as well so it is referenceable when a name
changes, as menus tend to?"*

**The answer is yes, and the reason is sharper than it first looks.** A dish's
name is doing four jobs at once today:

| Job | Where | What a rename breaks |
|---|---|---|
| URL anchor | `#dish-<slug(name)>` | every link anyone has shared to that dish |
| Pick reference | `picks: ["Bastard"]` | the pick silently stops matching (validate.py catches this one) |
| Stored heart | `d:<venueId> <name>` | the heart detaches, on every family phone |
| Stored rating | `d:<venueId> <name>` | same |

Three of those four fail **silently**, which is the same shape of problem
`renames.js` was written for at the venue level (ADR 0042's consequences) — and
that is the precedent to follow, not reinvent.

There is a second reason the venue level didn't have: **a menu refresh is
append-only** (ADR 0023). A renamed dish is supposed to *carry its history over*
— its price series, its revisions, its `verified` dates. With the name as the
only identity, "carry it over" is a manual instruction a transcriber has to
remember, and nothing checks it. An id makes it mechanical.

**Recommended shape** — deliberately mirroring what already worked for venues:

- `dishId`, kebab-case, unique within the venue, **optional at first**. Absent =
  `slug(name)`, which is what every existing anchor already resolves to, so
  nothing moves on the day it lands.
- `formerNames: []` beside it, holding what the dish used to be called — the
  dish-level twin of `formerIds`, and the thing that lets an old shared link and
  an old stored heart still find it.
- One resolver module, the way `renames.js` is the single place a venue id is
  canonicalised, so no consumer learns two ways to identify a dish.
- `validate.py` enforces uniqueness within a venue and that `picks` resolve
  through the same path.

🎯 **Approved by the owner 2026-08-16 — and explicitly for a NEW session.** Not
started here, deliberately: it is a personal-data migration on every family
device, and it wants a session that is only doing this. Its own ADR.

🔎 **This is not hypothetical — the corpus already breaks it, today.** Found
while building Theme 14 on 2026-08-16, verified by measurement rather than
reasoning. `slug(name)` is **not unique within a venue**: 22 dish rows across 3
venues collide on 10 distinct names, and **every collision is at a different
price**. Sprig & Fern is the worst — `Cheeseburger` appears in Mains ($28),
Kids ($15) and Gold Card ($21); `Fish and Chips` likewise; five more names
appear twice. Southern Cross and The Borough each have a `Heineken` on tap and
in bottles at different prices.

All four jobs in the table above are already failing on that data:

- **URL anchor** — three elements share `id="dish-cheeseburger"`. Invalid HTML,
  and `#dish-cheeseburger` can only ever reach the first one, so the Gold Card
  price is unlinkable.
- **Stored heart / rating** — keyed `d:<venueId> <name>`, so hearting the kids'
  fish and chips hearts all three.
- **Pick reference** — a `picks` entry naming one of these resolves to whichever
  comes first.
- **The order tally overcharges.** `cart.js` matches a line on `(venueId, name)`
  and increments, so adding the $21 Gold Card Cheeseburger to a tally already
  holding the $28 Mains one produces **2× Cheeseburger at $28 = $56** instead of
  $49. Reproduced against the real module, not inferred:

```
lines: 1 [["Cheeseburger",28,2]]
total charged: 56  — correct would be: 49
```

  🚩 **A $7 error on a real venue, silently.** Deliberately **not fixed** in the
  Theme 14 session that found it — this is dish identity, which the owner
  reserved for a session of its own, and a partial fix here would have made the
  migration harder. Theme 14's own widening of the cart key (adding the add-on
  selection) neither helps nor worsens it: both Cheeseburgers carry an empty
  selection, so they still collide.

**Where a fresh session should start:** the four jobs table above is the brief;
`site/js/renames.js` is the working precedent to copy (single resolver, canonical
before the lookup, non-destructive rewrite on read, a `validate.py` gate holding
the data and the resolver in step); and `tests/renames.test.js` shows the shape
of the tests, including the one that matters most — *nothing moves on day one*.

---
