- [ ] **A branch that moves: the roaming branch and its dated spots**
      `[L][schema][data][ux][content]` — owner-raised 2026-11-14: *"treat this
      as a branch where the location changes and the opening hours / days are
      quite variable."* ⚑ Owner's call on the shape; nothing built until a real
      truck is named.

  **The gap, precisely.** A branch today is a street address with a weekly
  `hours` object (ADR 0006, 0011). A food truck is a *sequence of spots*, each
  one dated: a place, a window, and the day it holds for. The week model has
  honest gaps (`null` day = "not published", ADR 0105) but no dates, and the
  only dated venue facts are three lifecycle events and a price's `from`. So
  the truck's one essential fact — *where and when next* — has nowhere to go.

  **Options, each with what it costs:**

  1. **A pitch is a branch — no schema change.** A truck that trades at the
     same market every Sunday is a branch with `address` = the market's,
     `hours` = Sunday only, every other day `[]`. Fits today, validates today,
     renders today. **Pro:** zero build; the branch picker, nearest-open
     (ADR 0054) and the maps handoff all just work. **Con:** it is a lie the
     moment the truck moves, and it cannot say *"not out this Sunday"* — a
     recurring pitch is the one case it covers, and a one-off is the case the
     owner raised.
  2. **A roaming branch carries dated `spots`.** A branch whose `address` is
     `{"roaming": true}` — a state said as a value, exactly ADR 0155's shape —
     and a `spots[]` list of `{ "date", "from", "to", "address", "lat", "lng",
     "note", "source" }`, newest last. Resolution: the spot whose `date` is
     today is *the* branch for distance, status and maps; no spot today ⇒ a
     third status, **"not out today"**, with the next spot named if one is
     dated. **Pro:** the honest shape; a spot carries its `source` like every
     other dated reading (ADR 0031); old spots age out of `site/data/` into
     `data/history/` under ADR 0047's rule (the phone ships only what it
     renders — today's and the next few). **Con:** a new shape every surface
     must learn — badge, sort, distance cut, card, contact card, fallback
     `<ul>`, `summary.json`'s `h` — and a `null`-vs-absent decision for "we
     were not told" versus "they said nothing", which ADR 0105 has already
     had to make once for days.
  3. **A new `kind`.** `"mobile"` in `kinds.js` with `hasLocation: false`,
     `hasHours: false`, and its own words. **Pro:** one row, and every screen
     that asks the table gets the right answer for free (ADR 0065). **Con:**
     wrong unit: a chain can own one truck among fixed branches (a bakery with
     a market cart), and `kind` is per *record*. The truck's difference is in
     the **branch**, which is where the owner put it.

  **Recommendation: option 2, built after option 1 has carried one real
  venue for a few weeks.** Option 1 is free and tells us what a real schedule
  looks like; option 2 is the shape the brief describes; option 3 puts the
  fact on the wrong object. Reasoning the owner may weigh differently: option
  2's cost is mostly in surfaces, and surfaces are where this repo's silent
  defects have lived (the branch-id incident, ADR 0103, had *no visible
  symptom*), so each surface change wants a `*_check.mjs` assertion, which is
  most of the `[L]`.

  **What every surface must do, whichever shape wins:**
  - The **open/closed badge** gains a third honest state and its words. "Hours
    not published today" (ADR 0105) is not it: the truck *has* published, and
    the answer is "not out today", ideally followed by when it next is.
  - **Distance sort and the distance limit** (ADR 0091): no spot ⇒ no
    distance. A roaming branch with nothing today must neither sort as
    nearest nor be cut as too far; it needs the same explicit handling Cook
    at Home's anywhere-branch got, and a `distance_check.mjs` assertion that
    it is **still on the page**.
  - **The maps handoff** points at today's spot or offers nothing — never at
    the venue's registered address, which for a truck may be a depot or a
    home (`030`'s rule).
  - **A spot is a dated reading** with a `source` (the truck's own post, the
    owner, in person). A spot nobody told us is `null`, never inferred from
    last week.
  - **`gen_summaries.mjs`** re-fingerprints the venue on every spot change;
    that is the intended path (`510/030`) and costs an installed phone one
    file. Measure it once on a real truck's first month.

  **Open with the owner before the build:** which truck (he has not named
  one), and whether the "next spot" is a thing we are *told* or a thing he
  wants us to *fetch* from the venue's own channel — the content rule
  (`CLAUDE.md`, 2026-08-16) makes that his word, not a default.
