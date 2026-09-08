# 0105 — A day may say nothing, and that is not "closed"

**Status:** accepted. Extends the model of
`0006-hours-model-and-timezone.md` (amended by `0043`, and by `0094` which
reversed one of its rejected alternatives). 0006's four-part day shape —
`[]` = closed, a list of `[open, close]` pairs, a null close, all seven keys
required — stands unchanged; this adds a fifth reading it did not have.

**Date:** 2026-09-08 • Roadmap `190/020`

## Context

`hours` is `null`, or a full week keyed `mon`…`sun`. A day is a list of
`[open, close]` pairs and `[]` means *the venue is closed that day*. There is
no way to write *"the venue did not say."*

**The venue that needs it.** Abrakebabra publishes its opening hours on its
own site as four lines — **Sunday to Tuesday**, **Thursday**, **Friday**,
**Saturday**. There is no Wednesday line. Not "closed Wednesday": no line at
all. So the record could either

- claim six days it knows and **one it does not** (`wed: []`, which renders
  as **Closed**), or
- drop all seven and carry `hours: null`.

It does the latter, and has since 2026-09-07. Six known days were thrown away
to avoid publishing one false one, because the false one is false in the
**dangerous direction**: telling a reader a kebab shop is shut while it is
trading is exactly what ADR 0094 was written to stop, and a shop closed only
on a Wednesday is implausible on its face. That trade was a bad one and it was
the only one available.

**This is the neighbour of `190/010`, not the same defect.** 0094 fixed *the
week cannot hold a close after midnight*. This is *the week cannot hold a day
it was never told about*. Both are "the shape cannot carry what the venue
actually said", and closing one did nothing for the other.

**The repo already has this rule and applies it elsewhere.** `verified` has
three distinguishable states (no date, a date with no method, both).
A dish `price` of `null` means *priced on application* and a `needs` entry
means *we failed to read it*. `hours` was the field where "unknown is not
none" had not been applied, and it is the field where the wrong reading sends
someone across town.

## Decision

**1. A day may be `null`, and `null` is not `[]`.**

- `[]` — the venue says it is closed that day.
- `null` — the venue publishes nothing about that day.

Chosen over a sentinel string and over a venue-level `hoursPartial` note. Two
reasons, and neither is brevity. First, **it needs no new vocabulary**:
`hours: null` already means "nothing known about the venue’s week", so `hours.wed:
null` is the same word meaning the same thing one level down, and a reader of
the data does not have to learn anything. Second, a caption beside a
machine-readable week that still says "closed" is the shape this repo already
knows fails — a caption and a computation that disagree are resolved by
whichever one the screen renders.

**Omitting the key was checked first and is not free.** `segments()` reads
`hours[key] || []` and `groupWeek` reads `formatDay(hours[key])`, so before
this change a missing key was byte-for-byte indistinguishable from `[]` in
both — and `validate.py` rejects a week without all seven keys anyway. So the
cheapest-looking option was not available, and it would have been the wrong
one regardless: an explicit `null` records *we asked and were not told*, where
a missing key is indistinguishable from a typo.

**2. The engine answers in a sixth state, `unknown-today`, and it carries
words.** `openStatus` returned five states; `unknown` (no hours at all) means
*draw no badge* at every call site. Folding the new case into it would leave a
reader with **nothing**, and a blank is the same shape as the bug — it cannot
be told apart from nobody having thought the day worth mentioning. So the new
state is separate, and every existing render draws it without modification,
because they all draw `label · detail` and skip only on `unknown`.

**3. The order of the tests is part of the decision: being open beats an
unknown day.** A Tuesday span running to 03:00 puts the reader inside an
opening at 2am on an unpublished Wednesday, and we know that from *Tuesday's*
line. So containment is asked first; only where there is no positive evidence
does the silence decide.

**4. An unknown day between now and the next opening hedges the detail.**
On a Tuesday night with Wednesday unpublished, `Closed · opens Thu 5pm`
quietly re-asserts the very Wednesday the record was rewritten to stop
asserting. The verdict is untouched — *closed right now* is known and true —
but the detail becomes `next published opening Thu 5pm`, with the hedge
leading so it cannot be skimmed past.

**5. What the reader sees.**

| Where | Unknown day | A real closed day |
| --- | --- | --- |
| Badge, on the day | `Hours not published today` | `Closed · opens Thu 12pm` |
| Week table row | `Wed  Not published` | `Mon  Closed` |
| Badge, night before | `next published opening Thu 12pm` | `opens Wed 12pm` |

The badge is the muted ink with a **hollow** dot — the one state that must not
be a traffic light, because red repeats the false "Closed" this exists to
stop and green is a claim. The words carry it; the dot only stops the eye
reading a verdict nobody gave.

**6. "Open now" drops it, and the ranking does not.** The filter's clause is
unchanged: `unknown-today` is not `open`, so the venue leaves the list. *"Open
now"* is a **claim**, and a partial week is the one thing that cannot support
it; a place in that list that turns out to be shut breaks the only promise the
button makes. What stops that being a silent deletion is that the venue is
untouched in the unfiltered list — where its card now reads *"Hours not
published today"* instead of a false *"Closed"* — and that `availabilityTier`
puts it at **tier 2**, above every venue we know is shut, which is what tier 2
already meant ("can't rule it out"). Widening "Open now" to admit maybes, or
captioning the home screen with a count of what the clause removed, are
product decisions and neither was taken here.

**7. Strict validator, tolerant engine.** `validate.py` still demands all
seven keys and now refuses a week where *every* day is null (that is
`hours: null`, in seven times the bytes). The engine reads a missing key the
same safe way as an explicit null anyway, because a hand-written or
half-migrated object must not be the thing that asserts a shut day.

## Consequences

- **No record changed.** The corpus was swept: **57 venues, 72 hours blocks,
  35 `[]` days, 32 records carrying `hours: null`**. Not one day is `null`
  today, so no existing venue's rendered answer moves — every new branch is
  reachable only from data that does not yet exist. That is the whole blast
  radius, and it is why this could land without re-verifying 57 venues.
- 🛑 **Abrakebabra's six days were NOT restored, and that is a real gap.**
  The item's own point was that six known days had been thrown away — but
  **nothing in this repo records Abrakebabra's times**, only which days it
  publishes (the roadmap item, `080/190`, and the transcription commit
  `bf118cc` all name the four lines and none of them gives an hour). Inventing
  them would be the same fault in a new costume. The mechanism is delivered
  and the record still carries `hours: null`; restoring it needs someone to
  re-read the venue's site.
- 🔎 **How wide is it? Measured, and the measurement does not settle it.**
  All **35** `[]` days fall on **Monday, Saturday or Sunday** — not one on a
  Tuesday, Wednesday, Thursday or Friday. That is consistent with every one
  being a genuine closed day and inconsistent with a transcription having
  swallowed an unpublished mid-week day, which is the Abrakebabra shape. It is
  **not proof**: a venue can publish nothing for a Sunday just as easily. Only
  re-reading each source answers it, and none was changed here.
- The `served` dialect is **deliberately not extended**. A section's window is
  our own transcription of what a menu states, where "not served that day" is
  the natural reading; `check_served` still requires a list. And a `hours` day
  that is `null` now *skips* the "served on a day the venue is shut" warning,
  because that warning needs to know the venue is shut and on that day we do
  not.
- Guarded by `tests/hours-unknown-day.test.js` (14 tests, every one paired
  against the same record with `wed: []`), a `tierFromHours` case in
  `tests/ranking.test.js`, an "Open now" case in `tests/filters.test.js`,
  three mutations in `tools/test_validate.py` (one of them the **positive**:
  the shape the ruling exists for must sail through), and **16 assertions in
  `tools/midnight_check.mjs`** — the file that already owns the hours badge on
  both render paths at a frozen clock.
- 🚩 **The browser fixture is STAGED, and that is stated in the check's own
  header.** No corpus record has an unknown day, so the check intercepts one
  venue's JSON *in the page* and nulls its Wednesday. Every instant is read
  **twice** — patched and unpatched — because "the badge says we do not know"
  is satisfiable by an engine that says it about every venue on every day.
- **Break-probed.** Reverting the three engine hunks fails **8 unit tests**
  (of 1,264) and **6 browser assertions** (of 89), every one naming the
  unknown day, and nothing else.

## Rejected

- **A venue-level `hoursPartial` note carrying prose.** Cheap, and it leaves
  the machine-readable week still lying about Wednesday: every open/closed
  computation stays wrong while a caption says otherwise.
- **Leave it — records with a partial week keep dropping the whole field.**
  Honest, and it costs every reader the six days the venue did publish.
- **A sentinel string** (`"unknown"`, `"unpublished"`) in place of `null`. New
  vocabulary for a state the shape already spells one level up, and a string
  where every other "we don't know" in this record is a `null`.
- **Folding the state into `unknown`.** It is the smallest diff and it ships
  the blank.
- **Letting `unknown-today` into "Open now".** It would put a maybe inside a
  list whose entire promise is a certainty.
