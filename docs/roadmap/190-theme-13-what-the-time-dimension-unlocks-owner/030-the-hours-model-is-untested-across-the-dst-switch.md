- [~] ⏳ **The whole hours model is untested across the daylight-saving switch,
      and the switch is 2026-09-27** `[M][js][tools]` — recorded as a gap by
      [ADR 0094](../../decisions/0094-a-close-before-its-open-means-the-next-day.md)
      *Consequences* on 2026-09-07, and **widened to the whole model by the
      owner the same day.**

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — TEST THE WHOLE HOURS MODEL,
  not only the wrapping spans.** He was offered three options — cover the
  wrapping spans before the switch (recommended), wait and see, or sweep the
  whole model — and **took the widest**: *"not just wrapping spans but every
  hours computation across the switch, including served windows and
  countdowns."*

  ⏳ **It is dated work.** New Zealand moves to NZDT (UTC+13) at **02:00 on
  Sunday 2026-09-27**, about three weeks out. This is the one item on this board
  with a real external deadline, and after it passes the evidence is a live
  incident report instead of a test.

  **Why it is untested, stated precisely so the scope is not guessed at.** Every
  fixture in `tests/hours.test.js`, `tools/midnight_check.mjs`,
  `tools/served_check.mjs` and `tools/branch_check.mjs` is a **June** instant —
  NZST, UTC+12, no transition anywhere near it. `makeClock()` and `todayIn()`
  resolve a venue's local day through its timezone, so the switch is handled by
  the platform rather than by our arithmetic — **which is a reason to expect it
  works, not evidence that it does.**

  🚩 **Four surfaces the ruling covers, and what could go wrong at each:**
  1. **A wrapping span across the switch** — the genuinely new ground.
     Dragonfly holds **four** wrapping spans, and a Saturday 16:30→03:00 on the
     night of the 26th passes through a 02:00 that becomes 03:00. `segments()`
     works in absolute minutes-of-week, which has **no notion of a day that is
     23 hours long**, so the arithmetic and the wall clock disagree for exactly
     one night.
  2. **`servedStatus`** — the same `segments()`, so it inherits whatever 1 does.
  3. **The countdown** (*"closes in 20 min"*) — computed from `seg.end - at`, and
     ADR 0094 made `at` sometimes a *wrapped* coordinate. A switch inside that
     window is where an off-by-an-hour would be least visible and most annoying.
  4. **`todayIn()` / the day boundary** — which calendar day a venue is "in"
     when the offset moves, which decides *which* day's hours are read at all.

  🔑 **The assertion has to be on a FROZEN clock at the switch instant**, the way
  `served_check` and `midnight_check` already work — for the reason CLAUDE.md
  keeps giving: *a check whose verdict depends on the hour gets switched off
  within a week.* Here it is stronger still: a check that only tells the truth on
  2026-09-27 is worthless on the 28th. And the April switch back (NZDT→NZST,
  where a day is **25** hours and 02:00–03:00 happens twice) wants the same
  treatment — a repeated hour is the harder direction, because a naive
  containment test can match a span **twice**.

  🚩 **Break-probe requirement, since this is a test-only change.** A test that
  passes on both correct and broken code is the failure mode here. Each new
  assertion must be shown to fail against a deliberately broken clock — the
  standard `midnight_check` set on the same day, where removing the wrap failed
  8 unit + 9 browser assertions and removing only the week-boundary re-ask
  failed exactly 2 + 3, all naming Sunday.

  📋 **Not in scope unless the tests find something:** changing the model.
  This item buys **evidence**, and the most likely outcome is that the platform
  handles it and we can say so with a number. That is a good outcome and should
  be recorded as one — *"tested, correct"* is worth as much here as a fix, and
  costs the next session the whole investigation.
