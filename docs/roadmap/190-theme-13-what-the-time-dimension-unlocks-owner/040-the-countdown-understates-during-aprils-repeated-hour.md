- [ ] 🔎 **The countdown understates by up to an hour during April's repeated
      hour** `[S][js]` — measured 2026-09-07 (session faves-dst) while closing
      `030`. **Filed rather than fixed**, on that item's own rule: it buys
      evidence, and changing the model was out of scope unless something failed.
      Nothing failed — this is a characterised imprecision, not a regression.

  **What happens.** New Zealand leaves NZDT at 03:00 on Sunday 2027-04-04, so
  the wall clock **02:00–02:59 occurs twice** and that Sunday is 25 hours long.
  `openStatus` computes `left = seg.end - at` in **wall-clock minutes**, so
  during the first pass through the repeated hour it measures to the wall clock
  and not to the instant.

  Measured on Dragonfly's real Sat 16:30–03:00 span:

  | Instant (real time) | Wall clock | Badge | Real minutes to close |
  | --- | --- | --- | --- |
  | `2027-04-03T13:30Z` | Sun 02:30 **NZDT** | `Closes in 30 min` | **90** |
  | `2027-04-03T14:30Z` | Sun 02:30 **NZST** | `Closes in 30 min` | 30 |

  So for sixty minutes, once a year, the badge is an hour pessimistic. It also
  runs the whole 60→1 sequence twice, which a reader watching the card would see
  as the number jumping back up.

  🔑 **Why this is small, and why it is filed anyway.**
  - It errs in the direction that sends someone **early**, which is the direction
    ADR 0094 deliberately chose over the alternative when it replaced the
    understated `null` close. A late-running countdown would be the serious one.
  - It affects only venues whose close falls in the hour after a fall-back
    transition — today that is Dragonfly alone, the corpus's only wrapping span.
  - It is **not** a bug in the wrap, the week boundary, or the timezone read: all
    three were swept across both transitions and are correct (`030`).
  - Filed because it will otherwise be rediscovered and re-investigated from
    scratch, which is the cost `030` was explicitly bought to avoid.

  **Why it is not a one-line fix.** The countdown would have to be computed
  between two **absolute instants** rather than two wall-clock minute
  coordinates. `openStatus` is pure in `(hours, now)` where `now` is
  `{dow, minutes}` — a wall clock with no offset in it — so it cannot tell the
  two 02:30s apart even in principle. Any fix changes that signature and
  therefore every caller and every fixture, and it must not disturb the
  wall-clock semantics that make everything else correct: *"we shut at 3am"*
  means the wall clock, and the open/closed verdict must keep reading it that
  way. That is a model change, and it belongs to the owner to want.

  📋 **Options, offered rather than recommended** (a child repo does not settle
  this on its own):
  1. **Leave it, documented.** Zero cost; the behaviour is pinned by an
     assertion in `tests/hours-dst.test.js` so nobody "fixes" it by accident.
  2. **Pass the instant alongside the wall clock** — `openStatus(hours, now,
     date)` — and use it for the countdown only, leaving the open/closed verdict
     entirely on wall-clock minutes. Smallest change that is actually correct;
     costs a second time source in a function whose purity is the reason it is
     testable, and the risk is a future edit reaching for the wrong one.
  3. **Suppress the countdown for the hour after a fall-back transition** and
     show `Open · until 3am` instead. Cheap and never wrong, but it needs
     transition detection the engine does not currently have, to buy an absence.
