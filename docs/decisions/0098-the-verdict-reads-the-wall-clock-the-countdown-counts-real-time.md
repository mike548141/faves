# 0098 — The verdict reads the wall clock, the countdown counts real time

**Status:** accepted. Amends `0094-a-close-before-its-open-means-the-next-day.md`
(whose *Consequences* line *"counts down correctly to its real close"* was true
only away from a daylight-saving transition) and `0006-hours-model-and-timezone.md`
(amended by `0043`), both of which otherwise stand.

**Date:** 2026-09-08

## Context

`openStatus` was pure in `(hours, now)` where `now` was `{dow, minutes}` — a
**wall clock with no offset in it**. Every quantity it produced, verdict and
countdown alike, was therefore measured in minutes-of-week.

That is right for the verdict and wrong for the countdown, and the two nights a
year a zone changes offset are where they part company. Measured 2026-09-07
(roadmap `190/030`, then filed as `190/040`) on Dragonfly's real Sat 16:30–03:00
span:

| Instant | Wall clock | Old badge | Real minutes to close |
| --- | --- | --- | --- |
| `2027-04-03T13:30Z` | Sun 02:30 **NZDT** | `Closes in 30 min` | **90** |
| `2027-04-03T14:30Z` | Sun 02:30 **NZST** | `Closes in 30 min` | 30 |
| `2026-09-26T13:00Z` | Sun 01:00 **NZST** | `Open · until 3am` | **60** |
| `2026-09-26T13:59Z` | Sun 01:59 **NZST** | `Open · until 3am` | **1** |

Three artefacts fell out, all pinned as *"correct rather than defects"* by
`tests/hours-dst.test.js` and `tools/midnight_check.mjs` on 2026-09-07:

1. **April understated by up to an hour** and ran the whole 60→1 sequence
   **twice**, which a reader watching the card sees as the number jumping back up.
2. **September swallowed the countdown entirely.** The wall-clock window
   (02:00–02:59) fell inside the hour that does not exist, so the badge stepped
   from "Open · until 3am" straight to "Closed" — never wrong, never shown.
3. **A close inside the deleted hour overstated.** A 02:30 close read
   *"Closes in 31 min"* at 01:59 NZST and *"Closed"* one real minute later — the
   countdown contradicted by its own engine, in the **late** direction ADR 0094
   named as the serious one.

The 2026-09-07 session recommended leaving all three documented: one hour, one
night a year, erring safe. **The owner overruled that on 2026-09-07** and chose
to compute between absolute instants, accepting the stated cost — a refactor of
the code stabilised the same day.

## Decision

**The open/closed VERDICT reads the wall clock. The COUNTDOWN counts real
time.** *"We shut at 3am"* is a wall-clock promise, so containment stays in
minutes-of-week exactly as ADR 0094 left it. *"Closes in 30 min"* is a promise
about the reader's next half hour, so it is the real minutes between two
instants.

**The instant travels inside `now`, not beside it.** `nowIn` and
`makeClock().at()` return `{dow, minutes, epochMs, tz}` — the wall clock, the
instant it was read at, and the zone it was read in (the *resolved* zone, so a
malformed record's fallback cannot make the two reads disagree). `openStatus`
keeps its arity and gains a `minutes` field: the real minutes until its own
verdict changes, `null` when there is nothing to count to.

**The invariant this buys, and the one to keep if anything here is ever cut
down: when the badge says "Closes in N min", N minutes of real time later the
venue is shut.** It is swept across both transitions rather than sampled.

**Finding the instant costs two probes, not a search.** Adding the wall-clock
delta to the instant is exact whenever the offset is the same at both ends; when
it is not, the miss *is* the offset change, so correcting by it lands on the
answer. A third probe would only repeat the second. When neither converges the
target wall clock **does not exist** (a close inside a spring-forward gap), and
the honest answer is the transition itself — the instant the verdict flips —
found by bisecting the bracket the two probes straddle, where the wall clock is
monotonic and bisection is therefore safe.

**A hand-written `{dow, minutes}` still works and falls back to wall-clock
minutes.** That is not a silent degradation: a bare wall clock cannot tell the
two 02:30s apart *even in principle*, so wall minutes is the only answer
available. Every production `now` comes from `nowIn`/`makeClock().at()`, which
always carry both — **pinned by its own unit test**, because the way this rots
is somebody reshaping the clock read, not a caller forgetting an argument.

**Purity is untouched.** Nothing in the engine calls `Date.now()`; the instant
is an input. `servedStatus` is deliberately **not** changed: nothing renders its
`minutes` as a duration, so moving it would buy an untested surface.

## Rejected

- **Leave it documented** (the 2026-09-07 recommendation). Zero cost, and the
  error sends people early rather than late. **Declined by the owner,
  2026-09-07.** Recorded so it is not re-proposed.
- **`openStatus(hours, now, date)` — pass the instant as a third argument.**
  The item's own option 2, and the smallest change that is correct. It loses on
  the failure it makes possible: two time sources in one signature that can
  disagree, and one call site (`menu.js`'s contact bar) has no `date` in scope
  and would have had to mint its own — a *second* clock read, a moment after the
  first, in the one function whose subject is that a moment matters. Carrying
  the instant inside `now` makes the mismatch unrepresentable and changes no
  caller at all.
- **Suppress the countdown for the hour after a fall-back** and show
  `Open · until 3am`. Cheap and never wrong, but it needs transition detection
  the engine does not have, to buy an *absence* — and it fixes neither September
  artefact.
- **Keeping the "closing soon" gate on wall-clock minutes** while printing real
  ones, which is the literal reading of "only the countdown moves". It renders
  `Closes in 90 min` under an amber "closing soon" dot, breaks the 1–60
  invariant `tests/hours-dst.test.js` asserts, and still runs the sequence
  twice. The gate reads the real number instead, which is what makes "closing
  soon" mean the reader's last hour.
- **Scanning minute by minute for the flip.** Exact and obvious, and O(minutes)
  per venue per render on a screen that calls `openStatus` three times for each
  of 57 venues.

## Consequences

**Five assertions flipped, deliberately and visibly**, each carrying its old
expectation in a comment so the change is legible rather than merely applied:

| Where | Was | Now |
| --- | --- | --- |
| Apr 02:30 NZDT | `Closes in 30 min` | `Open · until 3am`, `minutes: 90` |
| Apr 02:30 NZST | `Closes in 30 min` | unchanged — the pair must now **differ** |
| Apr sweep | 120 closing-soon minutes | **60**, strictly descending, no repeat |
| Sep 01:59 NZST | `Open · until 3am` | `Closes in 1 min` |
| Sep sweep | **no** closing-soon minute | 60, at 01:00–01:59 NZST |
| Sep 01:59, close in the gap | `Closes in 31 min` | `Closes in 1 min` |
| Sep 01:59, open in the gap | `Opens in 16 min` | `Opens in 1 min` |

Two of those go beyond the item, which named only the April understatement. The
September pair is not a choice: measuring real time moves that window wherever
it belongs, and the old expectations were the wall clock's answer.

**Coverage.** `tests/hours-dst.test.js` 24 tests (was 22); `midnight_check.mjs`
**73** assertions (was 68) — the April pair added to app.js's home-card path,
which menu.js's path had covered alone, plus the state assertion at 02:30 NZDT.
`tests/hours.test.js` is untouched and green: it drives hand-written wall clocks
and is exactly the fallback case.

**Verified by reintroducing the bug.** Returning the wall-clock delta from
`realMinutes` — the pre-0098 model, one line — fails **7 tests**, all in
`tests/hours-dst.test.js`, all naming a transition, and **nothing else in the
other 1,188**.

**Cost, stated.** One extra `Intl` read per open venue per `openStatus` call on
an ordinary day, two on a transition night, against a cached formatter. Not
measured as a render regression; named here so nobody has to rediscover that it
is not free.

**Known and not done.** `viewerOnVenueTime` still compares wall clocks, which is
what it is for. `servedStatus.minutes` is still wall-clock (see above). Nothing
renders `openStatus().minutes` yet — it exists because the 60-minute gate means
the interesting values are the ones the badge does *not* show, and it is what
lets a test pin 90.
