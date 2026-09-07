- [ ] 🔎 **`hours` cannot say "we do not know about this day" — an empty day
      asserts CLOSED** `[S][data][js]` — found 2026-09-07 (session faves-b1)
      while transcribing Abrakebabra for `080/190`. The neighbour of `010`, and
      **not** fixed by ADR 0094.

  **The venue.** `abrakebabra` publishes its opening hours on its own site as
  four lines: **Sunday to Tuesday**, **Thursday**, **Friday**, **Saturday**.
  There is no Wednesday line. Not "closed Wednesday" — no line at all.

  🛑 **The shape has three states and needs four.** A day key holds a list of
  `[open, close]` pairs, and `[]` means *not open that day*. There is no way to
  write *"the venue did not say"*. So a record either:
  - claims six days it knows and **one day it does not** (`wed: []` reads as
    CLOSED on the screen), or
  - drops all seven and carries `hours: null`.

  **What the record does, and why.** `hours: null`. Six known days were thrown
  away to avoid publishing one false one, because the false one is false in the
  **dangerous direction** — telling a reader a kebab shop is shut when it is
  trading is exactly what ADR 0094 was written to stop, and a shop closed only
  on a Wednesday is implausible on its face. That trade is a bad one and it was
  the only one available.

  🔑 **This is the same class as `010` and a different half of it.** `010` was
  *the week cannot hold a close after midnight*; ADR 0094 fixed that, and
  Abrakebabra's Thursday-to-Saturday closes after midnight are now perfectly
  writable. This is *the week cannot hold a day it was never told about*. Both
  are "the shape cannot carry what the venue actually said", and closing one
  does nothing for the other.

  🚩 **`§9`'s own rule already names this: unknown is not none.** The corpus
  applies it to `verified` (no date, a date with no method, and both are three
  distinguishable states) and to a dish `price` (`null` is *"priced on
  application"*, and a `needs` entry is *"we failed to read it"*). `hours` is
  the field where the rule was not applied, and it is the field where the wrong
  reading sends someone across town.

  🔎 **How wide? Not measured, and say so.** One record is known to be affected.
  A sweep of the corpus for records whose `hours` are `null` would **not**
  answer it — most nulls are simply "never checked" — so the real question is
  how many venues publish a partial week, and that can only be answered by
  re-reading sources. No claim is made here beyond the one venue.

  📋 **Options, none taken:**
  1. **Let a day be `null`** as distinct from `[]`: `null` = we do not know,
     `[]` = the venue says closed. Smallest data change, and it puts the
     distinction where the reader's question is. Costs a pass over
     `site/js/hours.js` (`segments`, `openStatus`, the next-open search),
     `validate.py`, and whatever the menu screen prints for an unknown day —
     which must be *"hours not published"*, never a blank that reads as closed.
  2. **A venue-level `hoursPartial` note** carrying prose. Cheap, and it
     leaves the machine-readable week still lying about Wednesday, so every
     open/closed computation stays wrong while a caption says otherwise.
  3. **Leave it.** Records with a partial week keep dropping the whole field.
     Honest, and it costs every reader the six days the venue did publish.
  🎯 **Recommendation: option 1.** It is the same shape as the fix `010` got —
  make the data able to say the true thing — and option 2 is the shape this
  repo already knows fails, because a caption and a computation that disagree
  are resolved by whichever one the screen renders.
