# 0100 — A click waits for a still box, and a starved wait buys one whole retry

**Status**: accepted • **Date**: 2026-09-08

## Context

Two owner rulings of 2026-09-07 land together on purpose, because either one
alone makes the other worse.

**Roadmap `210/070`** — the harness reads geometry while it is still animating.
A sweep written for `210/060` scrolled with the two-argument `scrollTo(0, y)`,
which obeys `app.css`'s `html { scroll-behavior: smooth }`; 238 swept
"positions" were nearly all the same position, and it produced the *correct*
answer anyway. The wider half is that the same mistake is available anywhere the
harness touches an element whose box is mid-transition — `picks_check` clicks
`#settings-btn` in a menu that has just been opened and intermittently reports
`#settings-btn has no clickable box` (roadmap `340/190` (a)).

**Roadmap `340/200`** — a `untilPresent` wait starved by machine load throws a
`MissingElementError` and exits 1 with a named `FAIL MISSING ELEMENT` line,
byte-identical to a real regression. Measured on the day [ADR 0093] landed:
`cook_check` exit 1 inside a 15-check sweep at load 18–27, then **85 passed, 0
failed** on the same commit once quiet.

## Decision

**1. `driver.click` waits for the target's box to stop moving before it
dispatches** (`210/070` option 1, ruled). The wait runs *inside the page*, in
the one `Runtime.evaluate` the click already made: read the rect, wait a frame,
read it again, and dispatch when two consecutive frames agree within 0.5 px and
the box is at least 1 × 1. So it costs one animation frame, not a CDP
round-trip.

**2. The wait is bounded and loud.** A box that has not come to rest inside
`FAVES_CLICK_SETTLE_MS` (default 2000) raises an `UnstableElementError` —
**exit 1, a named `FAIL UNSTABLE ELEMENT` line**, carrying the elapsed time, the
frame count, the last observed movement and the names of any animations still
running. The owner's condition was explicit: *a box that never settles is a
FAILED ASSERTION about the site, not a silent hang and not a harness error.*
This also settles the question [ADR 0093] left open in its Consequences and
`340/190` (a) filed — a geometry throw is a **site** claim.

**3. Every click's settle time is reported, because a generous wait hides
jank.** The summary carries a third line: how many clicks stabilised on the
first frame, how many needed more, the worst one and its selector. A wait that
patiently absorbs a 400 ms janky animation would otherwise turn a user-visible
defect into a green run.

**4. A `untilPresent` timeout re-runs the WHOLE check once, from scratch**
(`340/200`, ruled). One mechanism in `exitFromError` — the single place
[ADR 0093] made every ending path pass through — re-executes `process.argv[1]`
with `spawnSync`, having first reaped this run's Chrome and closed its server,
and marks the child with `FAVES_CHECK_IS_RETRY=1` so it can never recurse. It
prints `↻ RETRY` before the second run and either `↻ THE RETRY PASSED` or
`↻ BOTH RUNS FAILED` after it; a retry nobody can see is [ADR 0072]'s decorative
guard pointed the other way.

**5. The retry fires ONLY on a `untilPresent` timeout — never on the stable-click
timeout, never on `need()`, never on a `HarnessError`.** Reasoning, in the order
it matters:

- **The stable-click timeout must not be retried.** `210/070` says it in as many
  words: *a retry that papers over an animation race makes the race permanent
  and invisible.* An unsettling box **is** an animation race, so retrying it is
  precisely the papering-over the owner's part-A condition exists to prevent.
- **`need()` is excluded because it does not wait.** The starvation shape the
  ruling addresses is *a budget expiring*; `need()` has no budget — it is one
  instantaneous read. Retrying it doubles the time a genuine regression takes to
  report and buys nothing.
- **`HarnessError` is unchanged at exit 2.** `340/200` records why: a transport
  death is already *legible*. The problem was never that checks fail under load,
  it is that one failure shape lies about what it means.

**6. A sweep refuses to report unless the page reached where it was sent.**
`to_top_check`'s in-page sweeps count every position where `scrollY` did not
arrive within 2 px and raise rather than report; `driver.scrollTo(y)` does the
same for the out-of-page call sites. This is the three-line assertion `210/070`
asked for — the one that would have turned an undetectable wrong answer into a
two-minute fix.

## Rejected

- **Fix the two known call sites only** (`210/070` option 2) — declined by the
  owner. It leaves the next call site to rediscover the trap.
- **Document it in CLAUDE.md and stop** (`210/070` option 3, `340/200` option 1)
  — declined. Both are disciplines, and this repo's record is that a discipline
  is the option that quietly fails.
- **Poll the box over repeated CDP round-trips.** Correct, and it makes the tax
  a network cost on every click in sixteen tools. Doing the comparison inside
  the page keeps the round-trip count exactly what it was.
- **Use `document.getAnimations()` as the oracle** — dispatch immediately when
  nothing is animating. Cheaper still, and wrong: a box can move for reasons the
  Web Animations API never sees (a layout triggered by a late image, JS writing
  styles). It is used for the failure *message* instead, where being incomplete
  costs nothing.
- **Retry per CDP call.** Forbidden by the ruling and by [ADR 0078]: CDP calls
  are not idempotent — re-issuing `Input.dispatchMouseEvent` taps twice and
  `Page.navigate` reloads — so a per-call retry silently changes what the next
  assertion measures. A whole-check restart on a fresh profile has no such
  coupling. A reviewer should treat any per-call retry as a misreading.
- **Raise the `untilPresent` timeout** (`340/200` option 4). It only moves the
  threshold, and every real failure then takes proportionally longer to report.
- **Retry from `Report.summary` as well**, to catch a tool that *catches* a
  `untilPresent` timeout and files it as an ordinary failed assertion. No tool
  in the corpus does this today — every `untilPresent` call site either escapes
  or sits in a `try/finally` — so the branch could not be shown to fire, and an
  unfireable branch is [ADR 0072]'s own pattern. **Stated as a known residual
  instead:** if a future tool swallows a wait timeout into `report.check`, the
  retry will not see it.

## Consequences

- 🚩 **A genuinely broken check now takes about twice as long to say so.** The
  owner was given that cost before he chose, and took it against false alarms.
- The blanket sentence *"there is deliberately no retry"* in CLAUDE.md is now
  half true and has been amended rather than deleted: there is still **no
  per-call retry**, which is the claim the reasoning actually supports.
- `FAVES_CLICK_SETTLE_MS` joins `FAVES_CDP_TIMEOUT_MS` as a machine-shaped
  knob. Neither should be lowered to make a run finish.
- ⚠️ **The retry cannot distinguish "the machine was busy" from "the site is
  intermittently broken".** It reports which one it saw — a pass on the second
  run is printed as a **flake recorded**, not as a clean green — and leaves the
  judgement to the reader. That is weaker than a diagnosis and stronger than
  the byte-identical output it replaces.

## Evidence

Break-probed in both directions; outputs in the session record and in the two
roadmap items' delivery notes. Wall-clock before/after for all sixteen checks
was measured on the same machine with no peer sessions and no orphan Chromes,
and is recorded in `docs/roadmap/210-…/070-…md`.

[ADR 0072]: 0072-a-guard-is-decorative-when-its-verdict-does-not-depend-on-the-thing-it-guards.md
[ADR 0078]: 0078-a-harness-owns-its-own-lifecycle-and-a-transport-failure-is-not-a-test-failure.md
[ADR 0093]: 0093-one-place-decides-what-a-thrown-error-means.md
