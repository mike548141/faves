- [x] 🔎 **`hours` cannot say "we do not know about this day" — an empty day
      asserts CLOSED** `[S][data][js]` — found 2026-09-07 (session faves-b1)
      while transcribing Abrakebabra for `080/190`. The neighbour of `010`, and
      **not** fixed by ADR 0094.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — worktree
  `/Users/mike/worktrees/faves-o1-hours-unknown`, branch `hours-unknown`,
  **ADR 0105**. Landed by PR so CI runs before the merge.

  **Option 1, as recommended — a day may be `null`.** `[]` stays *the venue
  says closed*; `null` is *the venue did not say*.
  🔑 **The cheaper-looking spelling was checked first and is not free.**
  Omitting the key is **not** distinguishable today: `segments()` reads
  `hours[key] || []` and `groupWeek` reads `formatDay(hours[key])`, so a
  missing key was byte-for-byte identical to `[]` in both — and `validate.py`
  already refuses a week without all seven keys. `null` was then chosen over a
  sentinel string for a reason that is not brevity: `hours: null` already means
  *nothing known about the venue’s week*, so `hours.wed: null` is the same
  word at the next depth of the same tree, and nobody has to learn a new
  vocabulary.

  **The engine answers in a sixth state and it CARRIES WORDS.**
  `openStatus` gains `unknown-today`. It is deliberately **not** folded into
  `unknown`, which means *draw no badge* at every call site — a blank cannot be
  told apart from nobody having thought the day worth mentioning, which is the
  same shape as the bug. Because every render draws `label · detail` and skips
  only on `unknown`, the new state reaches the reader through **app.js
  `hoursBadge`, menu.js `hoursRow`, the branch status, `branchSummary` and the
  contact bar with no change to any of them** — the consumer sweep's real
  finding, and the reason this landed without touching `menu.js` at all while
  two peers were in it.

  **What a reader sees:**

  | Where | Unknown day | A real closed day |
  | --- | --- | --- |
  | Badge, on the day | `Hours not published today` | `Closed · opens Thu 12pm` |
  | Week table row | `Wed  Not published` | `Mon  Closed` |
  | Badge, night before | `next published opening Thu 12pm` | `opens Wed 12pm` |

  The badge is muted ink with a **hollow** dot — the one state that must not be
  a traffic light: red repeats the false "Closed", green is a claim.

  🚩 **Two decisions beyond the item's text, both in its own spirit.**
  1. **Being open beats an unknown day.** Containment is asked BEFORE the
     silence, so a Tuesday span running to 3am still reads *Open* at 2am on an
     unpublished Wednesday — we know that from Tuesday's line.
  2. **An unknown day before the next opening hedges the detail.** On a Tuesday
     night, `Closed · opens Thu 5pm` quietly re-asserts the Wednesday the record
     was rewritten to stop asserting. The verdict is untouched; the detail
     becomes `next published opening Thu 5pm`, hedge leading. Without this the
     Wednesday claim walks back in through the detail line.

  🎯 **"Open now" DROPS an unknown-today venue, and the justification is that
  the button is a claim.** A partial week is the one thing that cannot support
  *"somewhere I can eat right now"*, and a place in that list that turns out to
  be shut breaks its only promise — the same clause already drops a venue with
  no hours at all, so admitting this one would make the filter incoherent with
  itself. What stops it being a *silent* drop: the venue is untouched in the
  unfiltered list, where its card now reads "Hours not published today" instead
  of a false "Closed"; and `availabilityTier` puts it at **tier 2**, above every
  venue we know is shut, which is what tier 2 already meant. Widening the filter
  to admit maybes, or captioning the home screen with a count of what it
  removed, are product calls and neither was taken.

  🛑 **ABRAKEBABRA'S SIX DAYS WERE NOT RESTORED, AND THAT IS THE ITEM'S OWN
  POINT LEFT OPEN.** Nothing in this repo records its TIMES — only which days it
  publishes. The evidence was searched: this item, `080/190` §4, the
  transcription commit `bf118cc` and its full message, `data/` (no history,
  no ownership row, no images row), and every commit that ever touched
  `site/data/restaurants/abrakebabra.json` — the field has read `hours: null`
  since the file was created, so there is no earlier version to recover. All
  four sources name the four published lines and **none gives an hour**.
  Inventing them is the same fault in a new costume, so the record is unchanged
  and the mechanism is delivered without it. Restoring it needs someone to
  re-read kebabcentral.co.nz.

  📊 **HOW WIDE — measured, and the measurement does not settle it.**
  **57 venues · 72 hours blocks · 32 records carrying `hours: null` · 35 days
  written `[]` · 0 days written `null`.** So no existing record's rendered
  answer moves: every new branch is reachable only from data that does not yet
  exist, which is the whole blast radius.
  🔎 **All 35 `[]` days fall on Monday, Saturday or Sunday — not one on Tue,
  Wed, Thu or Fri.** That is consistent with every one being a genuine closed
  day and inconsistent with a transcription having swallowed an unpublished
  mid-week day, which is the Abrakebabra shape. It is **not proof**: a venue can
  publish nothing for a Sunday just as easily, and only re-reading each source
  answers it. Nothing was changed on this evidence. The 32 nulls are not
  re-litigated here — the item already says most are "never checked".

  🧪 **Guarded by** `tests/hours-unknown-day.test.js` (14 tests, each paired
  against the SAME record with `wed: []` — the sharpest pair differs by one byte
  and picks the same next segment, so the two strings differ by the hedge and
  nothing else), a `tierFromHours` case in `tests/ranking.test.js`, an
  "Open now" case in `tests/filters.test.js`, **three** mutations in
  `tools/test_validate.py` (140 → 143; one is the POSITIVE — the shape the
  ruling exists for must sail through), and **16 assertions in
  `tools/midnight_check.mjs`** (73 → 89).
  **Why `midnight_check` and not `served_check`:** both freeze the clock and
  that is all they share. `served_check` owns a menu SECTION's window, which
  annotates and never filters; this is the venue's own open/closed BADGE on the
  two render paths `midnight_check` already drives, and it is the neighbouring
  half of the same defect — `010` was *the week cannot hold a close after
  midnight*, this is *the week cannot hold a day it was never told about*.
  🚩 **Its fixture is STAGED and the file says so in its own header.** No corpus
  record has an unknown day, so the check intercepts one venue's JSON **in the
  page** and nulls its Wednesday — rewriting the parsed body, not the network
  response, so it survives the service worker. Every instant is read **twice**,
  patched and unpatched, because "the badge says we do not know" is satisfiable
  by an engine that says it about every venue on every day.

  🔨 **BREAK-PROBE** — the three engine hunks reverted (the `unknown-today`
  return, `formatDay`'s null row, the hedge), all new tests kept:

  ```
  ✖ ON the unknown day the verdict is 'we do not know', not 'Closed'
  ✖ BEING OPEN BEATS AN UNKNOWN DAY — a span wrapping into it wins
  ✖ an unknown day between now and the next opening HEDGES the detail
  ✖ …and with no unknown day in the way the wording is untouched
  ✖ formatDay: 'Not published' for null, 'Closed' for []
  ✖ the week table prints the unknown day, and does not merge it with Closed
  ✖ a week that says nothing about ANY day never renders a false Closed
  ✖ availabilityTier: a week that never published TODAY is tier 2, not tier 3
  ℹ pass 1256
  ℹ fail 8
  ```

  and in the browser, six assertions and no others (83 of 89 still green):

  ```
  FAIL  sprig-and-fern-petone @ Wed 3 Jun 13:00 NZST: the menu page's badge
        reads "Hours not published today"
  FAIL  sprig-and-fern-petone @ Wed 3 Jun 13:00 NZST: the week table prints
        "Wed  Not published"
  FAIL  sprig-and-fern-petone @ Tue 2 Jun 22:30 NZST: the menu page's badge
        reads "Closed · next published opening Thu 12pm"
  FAIL  sprig-and-fern-petone @ Tue 2 Jun 22:30 NZST: the week table prints
        "Wed  Not published"
  FAIL  sprig-and-fern-petone @ Wed 3 Jun 13:00 NZST: the state is
        "unknown-today", NOT "closed"
  FAIL  home @ Wed 3 Jun 13:00 NZST: the card badge reads "Hours not published
        today"
  FAILED — 83 passed, 6 failed
  ```

  Restored: `node --test` `pass 1264 · fail 0`, `midnight_check`
  `OK — 89 passed, 0 failed`.

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
