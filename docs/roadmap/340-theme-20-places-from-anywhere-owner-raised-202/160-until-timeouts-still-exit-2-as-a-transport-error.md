- [x] 🚩 **`until()` timeouts still exit 2, so a deleted element a check WAITS
      for still reads as a transport flake** `[S][tools]` — the half `070` did
      not close, filed separately 2026-08-19 rather than left inside a closed
      item.

  `need()` fixed **dereferences**: a check that reaches for a missing element
  now fails by name at exit 1. A check that **waits** for one is untouched —
  `boot_check`'s `until(… "#about-btn" …)` throws `timed out waiting for
  <label>`, which becomes an unhandled rejection and **exit 2**. Exit 2 is this
  repo's code for *"the browser stopped answering; nothing here says anything
  about the site"*, and CLAUDE.md tells readers to believe the exit code over
  the message. So deleting an element a check waits on still produces a site
  regression wearing a transport flake's clothes.

  🎯 **The judgement is real and was deliberately not taken by the finder.**
  Options, with what each costs:
  1. **Classify `until` timeouts as assertion failures (exit 1).** Simplest —
     but a genuinely slow machine then reads as a regression, which is the
     loaded-laptop problem inverted. This repo has measured that problem: 2 of
     4 and 4 of 8 runs failing on a five-session laptop.
  2. **Split `until` into `untilPresent` (a claim about the SITE, exit 1) and
     `untilSettled` (a claim about TIMING, exit 2).** Says what each wait is
     for, at the cost of touching every call site once.
  3. **Leave it and document it**, on the grounds that exit 2 is conservative.

  🔑 **Why option 2 looks right and is still not a decision:** every `until`
  already knows which kind it is — the author knew when they wrote it — and the
  present encoding throws that knowledge away. But it is a rename across 13
  tools during a period when several sessions run in parallel, so the cost is
  coordination, not code.

  ✅ **RULED 2026-08-22 — OPTION 2: SPLIT THE WAIT IN TWO.** `untilPresent`
  becomes a claim about the **site** and fails at exit 1; `untilSettled` stays a
  claim about **timing** and keeps exit 2. Options 1 and 3 were both declined —
  so a busy laptop must still never be able to manufacture a regression, and
  "leave it documented" was not accepted as good enough.

  🔑 **The reasoning the ruling rests on:** every `until` call site already
  knows which kind it is, because its author knew when they wrote it. The
  present encoding throws that knowledge away and then asks the reader to guess
  from an exit code. This does not add information; it stops discarding it.

  🚩 **A NAME COLLISION THE RULING COULD NOT HAVE KNOWN ABOUT — raised
  2026-09-06 (session faves-24) before executing, not after.** `browser.mjs`
  **already exports `settleUntil`** (line ~320): it polls until a predicate
  holds and, on timeout, **returns the last value instead of throwing** —
  deliberately, so a state that never arrives reads as a failed assertion
  rather than a harness error. Adding the ruled `untilSettled` beside it puts
  two exports in one module whose names differ only by word order and whose
  behaviour differs completely (one returns, one throws). That is a trap for
  every future reader, and this repo has already paid for one pair of
  near-identical rules that read correct in every diff.

  🔑 **The ruling's SUBSTANCE is untouched by this** — splitting the wait by
  what it *claims* is right, and the reasoning that the call site already knows
  its kind still holds. Only the label is in question. Options, none taken:
  1. **`untilPresent` / `untilStable`** — keeps `settleUntil` as it is and
     avoids the near-miss entirely. Cheapest, and departs from the ruled word.
  2. **`untilPresent` / `untilSettled`, and rename `settleUntil`** to something
     unambiguous in the same commit. Honours the ruled names; touches a third
     API nobody asked to change.
  3. **Ship the ruled names as given** and rely on the doc comments. Cheapest
     to decide, and it is the option that creates the trap.

  📋 **Also measured while scoping: the migration is 54 `until(` call sites
  across 15 tools.** It was 49 when first counted this session and became 54
  within the hour, because ADR 0091 landed `distance_check.mjs` (4 sites) in a
  parallel worktree. ⚠️ **That is the point, not a footnote** — this population
  grows every time a check is added, so a count taken before the migration runs
  is stale by the time it lands. Re-run
  `grep -c "until(" tools/*.mjs` immediately before starting rather than
  trusting this figure.

  ✅ **DELIVERED 2026-09-07 (session faves-24, merged `85880ee`, ADR 0093).**
  `untilPresent` throws a `MissingElementError` and exits **1**; `untilStable`
  keeps exit **2**. `settleUntil` untouched, its 13 call sites unchanged.

  🛑 **AND THE ITEM'S PREMISE WAS INCOMPLETE IN A WAY THAT WOULD HAVE MADE THIS
  DECORATIVE.** The split alone would have worked in seven of fifteen tools.
  **Eight tools — `addon`, `branch`, `cook`, `device`, `note`, `recipe`,
  `served`, `sync` — ended with their own `catch { console.error(…);
  process.exit(2) }` around `run()`.** A local catch sits *upstream* of the
  `uncaughtException` handler that does the classifying, so nothing ever reached
  it. **`need()`'s exit-1 promise from `070` had therefore been void in over
  half the corpus since the day it shipped**, with all eight green throughout —
  [ADR 0072]'s decorative-guard pattern applied to ADR 0072's own remedy. The
  fix is one exported `exitFromError()` called by the handler *and* by every
  tool's catch: a tool may still catch, it may not classify. Recorded as
  **ADR 0093** because a future author wrapping `run()` in a `try/catch` is an
  obvious, locally-correct move that would silently switch it off again.

  🔎 **Population re-counted at execution, and the earlier figures were both
  wrong.** **56 lowercase `until(` occurrences — 1 definition + 55 call sites**
  (54 across the fifteen check tools, 1 inside `launchChrome`). Not the 49 first
  measured, nor the 54 corrected to. `settleUntil` never matches, being
  capital-U.

  📋 **Classification: 7 → `untilStable`, 48 → `untilPresent`.** The seven
  timing claims: Chrome writing `DevToolsActivePort`; a scroll coming to rest; the
  engine leaving "Syncing…"; a tab taking and losing the foreground (two); a
  service worker registering; and `localStorage` reachable after a navigation.
  🚩 **Four sites were deliberated rather than pattern-matched, and are named
  here because "unclear is a finding, not a coin toss":**
  `boot_check` "the version stamps answered" (a MessageChannel round trip; taken
  as `untilPresent`, and safe because an enclosing local `try/catch` already
  turns any throw into a failed `report.check`); `distance_check` "the location
  has landed" (an either/or predicate, so only a site fault leaves it
  unsatisfied); `sync_check` "the join to be accepted" (**the one `untilPresent`
  whose timeout could in principle be manufactured by load rather than by
  markup** — flagged, not hidden); and `cook_check`'s service-worker
  registration, taken as `untilStable` conservatively though a broken `sw.js` is
  arguably a site fault.

  ✅ **Proven by breaking, which is the only evidence that counts here** — the
  whole ruling is about which exit code a missing element produces. Same tool,
  same kind of break, only the wrapper differing: renaming `app-ready` under an
  `untilPresent` gives `FAIL MISSING ELEMENT …` at **exit 1**; renaming
  `localStorage` under an `untilStable` gives `harness error: timed out …` at
  **exit 2** with no `FAIL` line. And before/after on one break in `note_check`:
  **exit 2 at the base commit, a named `FAIL` at exit 1 after.**

  ✅ **RULED 2026-09-06 ON THE NAMING FORK — `untilPresent` / `untilStable`.**
  Put to the owner with the collision stated and all three options costed; he
  took the one that keeps the ruling's substance and sidesteps the near-miss.
  `settleUntil` is **left exactly as it is** — no third API is touched, so the
  blast radius stays inside the two new names. The 2026-08-22 ruling is
  otherwise unchanged: `untilPresent` is a claim about the **site** and fails at
  exit 1; the timing wait keeps exit 2.

  📋 **Doing it.** Rename at all `until` call sites across the 13 check tools,
  one at a time, choosing per site rather than by pattern — **a site whose kind
  is unclear is a finding, not a coin toss.** The cost here is coordination, not
  code: it touches every browser check, so take it in a **quiet window with no
  parallel faves session live**, and land it in one commit so no tool is left
  half-migrated. `boot_check`'s `until(… "#about-btn" …)` is the worked example
  in this item's own text.
