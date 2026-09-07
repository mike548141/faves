- [x] 🔎 **The countdown understates by up to an hour during April's repeated
      hour** `[S][js]` — measured 2026-09-07 (session faves-dst) while closing
      `030`. **Filed rather than fixed**, on that item's own rule: it buys
      evidence, and changing the model was out of scope unless something failed.
      Nothing failed — this is a characterised imprecision, not a regression.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — worktree
  `/Users/mike/worktrees/faves-o1-dst-countdown`, branch `dst-countdown`,
  ADR 0098. Landed by PR so CI runs before the merge.

  **The shape chosen, and why not the item's option 2.** The instant travels
  **inside `now`** — `nowIn`/`makeClock().at()` return
  `{dow, minutes, epochMs, tz}` — rather than as a third argument
  `openStatus(hours, now, date)`. Option 2 is the smaller diff on paper and
  the larger hazard in practice: it puts two time sources in one signature that
  can disagree, and `menu.js`'s contact bar has no `date` in scope, so it would
  have minted a **second** clock read a moment after the first, inside the one
  function whose subject is that a moment matters. Carrying it inside `now`
  makes the mismatch unrepresentable, and **no call site changed at all** — the
  seven consumers (`app.js` `hoursBadge`, `menu.js` `hoursRow`, its branch
  status and `branchSummary`, its contact bar, `filters.js` "Open now",
  `ranking.js` `tierFromHours`) all already pass a clock reading through
  untouched. Purity holds: nothing calls `Date.now()`; the instant is an input.

  **The verdict still reads the wall clock**, per the constraint: containment,
  `segments()`, the week boundary and "until 3am" are byte-identical. Only the
  duration moved.

  🔁 **Five assertions flipped, and TWO of them go beyond this item.** The
  September pair was not a choice — measuring real time moves the closing-soon
  window to wherever it belongs, and the old expectations were the wall clock's
  answer:

  (April instants are 2027-04-03; September ones 2026-09-26.)

  | Instant | Was | Now |
  | --- | --- | --- |
  | 13:30Z (02:30 NZDT) | `Closes in 30 min` | `Open · until 3am`, 90 |
  | 14:30Z (02:30 NZST) | `Closes in 30 min` | same — the pair must **differ** |
  | April sweep | 120 closing-soon minutes | **60**, strictly descending |
  | 13:59Z (01:59 NZST) | `Open · until 3am` | `Closes in 1 min` |
  | September sweep | **no** closing-soon minute | 60, at 01:00–01:59 NZST |
  | 01:59, close inside the gap | `Closes in 31 min` | `Closes in 1 min` |
  | 01:59, open inside the gap | `Opens in 16 min` | `Opens in 1 min` |

  The last two are the spring-forward gap the brief asked to cover: a close the
  zone steps over resolves to the **transition instant**, so the number is
  never negative, never NaN, and never contradicted by the badge one minute
  later. That was the LATE direction ADR 0094 named as the serious one.

  **Evidence.** `node --test` — `pass 1195 · fail 0` (24 tests in
  `tests/hours-dst.test.js`, was 22). Browser checks run **sequentially** at
  `FAVES_CDP_TIMEOUT_MS=60000`, load 8–11 throughout, every one reporting
  `tree /Users/mike/worktrees/faves-o1-dst-countdown/site · shell 2026-09-08.1
  · dst-countdown@8017995`:

  | Check | Result |
  | --- | --- |
  | `midnight_check` | `OK — 73 passed, 0 failed` (was 68) |
  | `boot_check` | `OK — 24 passed, 0 failed` |
  | `served_check` | `OK — 55 passed, 0 failed` |
  | `branch_check` | `OK — 84 passed, 0 failed` |
  | `device_check` | `OK — 25 passed, 0 failed` |

  The 68 → 73 is the April pair added to app.js's home-card path (menu.js's had
  covered it alone), plus the state assertion at 02:30 NZDT.

  🚩 **A peer took `SHELL_VERSION 2026-09-08.1` on `main` while this ran**, so
  `origin/main` was merged in and the bump moved to **`2026-09-08.2`** — caught
  by `check_versions.py --range origin/main..HEAD`, which the bare form would
  have called clean. Re-verified on the merge (`dst-countdown@a7ceef0`, shell
  `2026-09-08.2`): `node --test` `pass 1219 · fail 0`, `boot_check`
  `24 passed`, `midnight_check` `73 passed`, `device_check` `25 passed` — the
  last because the merge brought `site/js/personal-data.js` with it.

  **Break-probe** — `realMinutes` reverted to `return wallDelta` (the pre-0098
  model, one line), new tests kept:

  ```
  ✖ a venue trading till 3am is OPEN through the September jump and shut after it
  ✖ the week boundary and the DST boundary are crossed at once, and both hold
  ✖ SEPTEMBER SHOWS THE COUNTDOWN ONCE, in real minutes, for a 3am close
  ✖ APRIL runs the countdown ONCE, and the first pass through 02:30 is 90 real…
  ✖ the countdown is the difference between two INSTANTS across the fall-back
  ✖ a close INSIDE the deleted hour counts down to the instant it is REACHED
  ✖ an open INSIDE the deleted hour is honoured the instant the clock steps past it
  ℹ pass 1188
  ℹ fail 7
  ```

  Seven, all in `tests/hours-dst.test.js`, all naming a transition, and nothing
  else in the other 1,188. Restored: `pass 1195 · fail 0`.

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

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — FIX IT PROPERLY.**
  🚩 **He OVERRULED the recommendation**, which was to leave it documented: one
  hour, one night a year, erring in the safe direction. He chose to compute
  between **absolute instants** rather than wall-clock minutes.
  🛑 **The cost he accepted, stated plainly:** this changes the signature of
  `openStatus` and every caller — a meaningful refactor of the exact code that
  was stabilised on 2026-09-07 (ADR 0094 and the DST sweep), for one hour a year.
  🔑 **The pattern across his rulings this session is worth naming for whoever
  frames the next ask.** He was offered the cheaper, narrower option four times
  and took the thorough one every time (the stub sweep, DST, agent teardown, and
  this). **The recommendation being smallest is not what he optimises for.**
  🚩 **Sequencing:** it touches `hours.js` and every consumer, so it must not run
  concurrently with work in `menu.js`. And the frozen-clock coverage added on
  2026-09-07 (`tests/hours-dst.test.js` 22 tests, `midnight_check` 68
  assertions) is the safety net — this refactor must leave all of it green, and
  the April assertions must **flip from pinning the understatement to pinning
  the correct answer**, which is a deliberate, visible change to what those
  tests claim.

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
