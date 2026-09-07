- [x] ✅ **The whole hours model is now tested across the daylight-saving
      switch — in BOTH directions — and it is CORRECT** `[M][js][tools]` —
      raised as a gap by
      [ADR 0094](../../decisions/0094-a-close-before-its-open-means-the-next-day.md)
      *Consequences* on 2026-09-07, widened to the whole model by the owner the
      same day, and **closed the same day with evidence** (session faves-dst).

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — TEST THE WHOLE HOURS MODEL,
  not only the wrapping spans.** He was offered three options — cover the
  wrapping spans before the switch (recommended), wait and see, or sweep the
  whole model — and **took the widest**: *"not just wrapping spans but every
  hours computation across the switch, including served windows and
  countdowns."*

  ## 🔑 The verdict, stated plainly

  **The hours model handles the daylight-saving switch correctly, in both
  directions, on all four surfaces the ruling named.** Nothing was changed in
  `site/js/` — this item bought evidence and the evidence came back clean, which
  is the outcome its own text predicted was most likely and asked to be recorded
  as a good one.

  **WHY it is correct, so the next session need not re-derive it.** `hours` are
  **wall-clock** times ("we shut at 3am") and `nowIn`/`todayIn` read the venue's
  **wall clock** through `Intl` at a real instant. Both sides of every comparison
  are therefore in the same coordinate system, and a transition moves them
  together. `segments()` genuinely has no notion of a 23- or 25-hour day — and
  never needs one, because it is never handed an elapsed duration, only a wall
  clock. The concern in the original text was real and the arithmetic it
  described is real; what it missed is that the arithmetic is never asked a
  question a short or long day could distort.

  ## 🚩 Two consequences that are NOT defects but do surprise

  Both are pinned by assertions rather than left to be rediscovered, because a
  reader meeting either would reasonably file it as a bug.

  1. **September swallows the countdown.** NZDT starts at 02:00 on Sunday
     2026-09-27, so the wall clock 02:00–02:59 **never occurs**. Dragonfly's
     "closing soon" window for its 3am close is exactly that hour, so on that one
     night the badge steps from **"Open · until 3am"** at 01:59 NZST straight to
     **"Closed"** at 03:00 NZDT — one minute of real time later. No number is
     wrong; the number is never shown. Measured, not reasoned about: sweeping
     every minute of the 23-hour day produces **zero** `closing-soon` minutes.
  2. **April runs the countdown twice.** NZST returns at 03:00 on Sunday
     2027-04-04, so 02:00–02:59 occurs **twice**. The 60→1 sequence runs twice,
     an hour of real time apart, with byte-identical badges. During the first
     pass it **understates the real time remaining by up to an hour** — at 02:30
     NZDT it says *"Closes in 30 min"* when the door shuts 90 minutes later. That
     errs in the direction that sends someone early, which is the direction ADR
     0094 already chose for the understated close it replaced. Fixing it means
     computing in absolute instants rather than wall-clock minutes — a different
     model, not a patch — so it is **filed, not fixed**: see item 190/040.

  ## What was tested, and on which instants

  Every instant is a literal UTC string, so the clock is frozen by construction
  and the verdict is the same on any day it is run — the requirement CLAUDE.md
  keeps restating, and stronger here, where a check that only told the truth on
  2026-09-27 would be worthless on the 28th.

  | Surface (as the ruling named it) | Covered by | On |
  | --- | --- | --- |
  | 1. A wrapping span across the switch | `openStatus` on Dragonfly's real week | 01:59 NZST / 03:00 NZDT (one minute apart), 01:00 NZST, both April 02:30s |
  | 2. `servedStatus` | four `served` fixtures, incl. one closing and one opening inside the deleted hour | the same instants |
  | 3. The countdown | every-minute sweeps of both switch days | 1,380 (Sep) + 1,500 (Apr) readings |
  | 4. `todayIn()` / the day boundary | every-minute sweeps + the roll to Monday | the same 2,880 readings |

  Plus `nowIn`, `makeClock` (one instant, two zones that disagree about the
  offset) and `viewerOnVenueTime`. **The April switch back IS covered** — it was
  flagged as the harder direction and it is, but a wall-clock model matching a
  span twice during a repeated hour is the *right* answer, not the failure mode
  the naive-containment worry anticipated.

  **New synthetic shapes, because the corpus has none** (roadmap `340/150`: the
  corpus is uniformly healthy, so a whole class ships unexercised): a close at
  02:30 and an open at 02:15 — both wall clocks that do not occur on
  2026-09-27. The engine copes: the first counts down to 31 minutes and is then
  simply shut, the second is open the instant the clock steps past it.

  ## The controls

  - **A zone with no DST** (`Australia/Brisbane`) is swept on the identical
    instants and must show an ordinary 24-hour day with every wall clock
    occurring exactly once. Without it, a sweep that counted nothing — or a
    `nowIn` returning a constant — would satisfy every *"minute 120 never
    appears"* assertion for the wrong reason.
  - **Same wall clock, two offsets, identical badge.** Two ordinary Mondays a
    week apart, both read at **14:30 local** — one NZST, one NZDT. 14:30 is
    chosen so an hour's error lands outside the control venue's 14:00 opening; a
    clock hard-wired to the winter offset fails *here* and passes nearly
    everywhere else.
  - **An ordinary venue is never open at 2am on a switch night** — the absence
    assertion, swept over every small-hours minute of both days.

  ## 🚩 Break-probe results — every group, with numbers

  A test-only change fails by passing on both correct and broken code, so each
  group was shown to fail against a deliberate break. Four probes, each reverted
  with `git checkout`:

  | Probe | What was broken | New unit tests failed | Browser assertions failed |
  | --- | --- | --- | --- |
  | **1a** | `hours.js` `zoneFormatter` hard-wired to `Etc/GMT-12` — New Zealand's *winter* offset frozen, i.e. "the platform does not handle DST" | **12 of 22** | **9 of 68** |
  | **1b** | `temporal.js` `todayIn` formatter hard-wired the same way | **exactly 2**, both naming `todayIn` | — (no `todayIn` assertion on these screens) |
  | **2** | ADR 0094's wrap removed (`end = base + c`) | **6 of 22**, every one a wrapping span | — |
  | **3** | `containing()` matches unconditionally — every venue reads open | **9 of 22**, *including both CONTROLs* | — |

  **Probe 1a is the one that matters** and its discrimination is the evidence
  this file is worth anything: **all nine browser failures name an NZDT
  instant**, and **not one of the six original June assertions failed**. The
  control pair failed, which is the entire reason it exists. Probe 1b's isolation
  — exactly two failures, both `todayIn` — shows the day boundary is
  independently load-bearing rather than decorative (ADR 0072). Probe 3 shows the
  controls catch a change that makes everything read open.

  ⚠️ **Collateral, reported rather than tidied away:** probe 1a also failed
  **2 of 48** existing tests in `tests/hours.test.js` — *"nowIn reads a real
  instant in the zone it is handed"* and *"a venue's open status follows ITS
  zone"*. Both are per-zone tests and the probe ignores the zone argument
  entirely, so this is the probe's blast radius, not a second finding.

  ## Where the coverage lives

  - **`tests/hours-dst.test.js`** (new) — 22 tests. Deliberately a separate file
    from `tests/hours.test.js`, which drives pure functions with a hand-written
    `now` and so cannot contain a transition: the switch lives in `nowIn` and
    `todayIn`, the two functions those tests do not exercise. **That is precisely
    why this ground was untested**, and it is worth saying rather than leaving as
    an accident of file layout.
  - **`tools/midnight_check.mjs`** (extended) — **34 → 68** assertions, seven new
    frozen instants on the two real transitions, both render paths (`menu.js
    hoursRow`, `app.js hoursBadge`). Its header's *"It does not exercise a DST
    boundary… untested ground"* paragraph was **replaced**, not left standing: a
    check's description is not evidence about the check, and a stale one is how
    this repo has been burnt before.

  📋 **ADR 0094 was NOT edited.** It is accepted, and its *Known and not built*
  list still reads *"No DST coverage. Every fixture is NZST June."* That was true
  when written and an accepted ADR is superseded, never revised. The current
  truth lives here and in `docs/ARCHITECTURE.md`.
