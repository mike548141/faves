- [x] 🛑 **`untilPresent` can manufacture a FALSE REGRESSION under load, and it
      was measured within minutes of shipping** `[M][tools]` — found 2026-09-07
      (session faves-24) while verifying `160` on merged `main`. This is the
      residual half of the very risk option 1 was declined to avoid.

  ✅ **DELIVERED 2026-09-08 (session faves-o1)** — retry-once-then-report built,
  in `tools/lib/browser.mjs`; ADR 0100. **One mechanism for all sixteen checks,
  at the entry-point layer the ruling pointed at.** A `MissingElementError`
  raised by a `untilPresent` timeout reaches `exitFromError` — the single place
  ADR 0093 made every ending path pass through, whether the tool has its own
  top-level `catch` (8 of 16) or leaves it to the `uncaughtException` handler
  (the other 8) — and that function re-executes `process.argv[1]` with
  `spawnSync`, `stdio: "inherit"`, marking the child `FAVES_CHECK_IS_RETRY=1`
  so it can never recurse. It **reaps this run's Chrome and closes its server
  first**, because a retry measured on a machine the first run is still loading
  would defeat the point.

  🎯 **WHAT TRIGGERS IT — decided, and the reasoning matters more than the
  answer.** Only a `untilPresent` timeout, flagged at the raise site
  (`err.fromWait`). Three deliberate exclusions:
  - **The stable-click timeout from `210/070` is NOT retried.** That item says
    it in as many words — *"a retry that papers over an animation race makes
    the race permanent and invisible"* — and an unsettling box **is** an
    animation race. Retrying it would undo the guard that landed with it.
  - **`need()` is NOT retried**, though it raises the same class. It does not
    wait, so there is no budget for load to starve; retrying only doubles the
    time a genuine regression takes to report.
  - **`HarnessError` is unchanged at exit 2.** This item's own third
    measurement records why: a transport death is already *legible*. The
    problem was never that checks fail under load, it is that one failure shape
    lies about what it means.

  🔎 **It prints, every time, in both directions** — a silent retry would be
  ADR 0072's decorative guard pointed the other way, converting a reproducible
  failure into a quiet one. The first run's verdict stays on screen, `↻ RETRY`
  announces the second before it starts, and the last line is either
  `↻ THE RETRY PASSED` (exit 0, worded as **a pass with a flake recorded**, not
  a clean green) or `↻ BOTH RUNS FAILED` (exit 1).

  ✅ **Break-probed three ways, verbatim.** A forced first-run-only timeout —
  note the two runs use **different profile directories**, which is the proof
  the restart is genuinely from scratch:

      FAIL  MISSING ELEMENT — this check waited 15s for cook-at-home rendered,
      and the page never got there
      …
      ↻ RETRY — that failure came from a WAIT, and a loaded machine can starve a
         wait past its budget with nothing about the site having changed.
      …
      OK — 20 passed, 0 failed
      ↻ THE RETRY PASSED (9.5s) — run 1 FAILED and run 2 PASSED on the same tree.

  Exit **0**. Forced on both runs:

      ↻ BOTH RUNS FAILED (retry took 3.2s, exit 1) — run 1 and run 2 agree,
         on two independent browsers and two fresh profiles. Load did not
         manufacture this one.

  Exit **1**. And the discrimination, probed with a **real** `need()` failure
  rather than a synthetic one (`#filters-btn` renamed in `filter_row_check`):
  `FAIL MISSING ELEMENT … nothing on the page matches it`, exit 1, **no `↻`
  line** — not retried, as ruled.

  🚩 **One residual, stated rather than papered over.** The retry fires on an
  error that ESCAPES. A tool that *caught* a `untilPresent` timeout and filed it
  through `report.check` would not be seen. No tool does that today — every one
  of the 69 `untilPresent` call sites either escapes or sits in `try/finally` —
  so a second trigger in `Report.summary` was written and then **removed**: it
  could not be shown to fire, and an unfireable branch is ADR 0072's own
  pattern. If a future tool swallows a wait timeout, this is where to look.

  📊 **Cost, as accepted:** a genuinely broken check takes about twice as long
  to say so. Measured on `picks_check`: 9.5 s for the second run against a
  ~10 s first. All sixteen checks pass on the delivered tree.

  📝 **CLAUDE.md amended, minimally, where it became false.** *"There is
  deliberately no retry"* now reads *"no PER-CALL retry"* with the reason
  intact and a dated note saying which half changed; the ADR 0093 paragraph's
  *"not evidence until it reproduces on a quiet one"* now records that the
  harness reproduces it for you, and that a `FAIL` with no `↻` above it was
  never retried.

  ✅ **OWNER RULED 2026-09-07 (session faves-b1) — RETRY ONCE, THEN REPORT.**
  Put to him as four options with their costs. He took the recommendation: a
  wait that times out causes the check to be **re-run from scratch once**, and a
  failure is only reported if it fails **twice**.
  🛑 **The retry must restart the WHOLE check, never re-issue the individual
  CDP call.** CLAUDE.md already states why, and it is the reason this repo
  shipped *"deliberately no retry"* in the first place: *"CDP calls are not
  idempotent, so re-issuing one silently changes what the next assertion
  measures."* A whole-check restart on a fresh profile has no such coupling. A
  reviewer should treat any per-call retry as a misreading of this ruling.
  🚩 **The accepted cost, stated to him before he chose:** a genuinely broken
  check now takes about twice as long to say so. He took that trade against
  false alarms.
  🔎 **What the retry must print** so it can never become a silent flake-hider:
  the fact that a retry happened, and that BOTH runs failed when it reports a
  failure. A retry nobody can see is a decorative guard ([ADR 0072]) pointed the
  other way — it would convert a reproducible failure into a quiet one.

  📊 **A THIRD MEASUREMENT, 2026-09-07 (session faves-b1) — AND THIS TIME THE
  LOAD NUMBER WAS CAPTURED.** Running all fifteen browser checks on merged
  `main@92d567b` to close the session, `to_top_check` died. The load average at
  that instant was **107.28** (1-minute; 127.22 over 5), with **zero** orphan
  Chromes — so the cause was genuine machine load from five parallel sessions,
  not leaked processes. Re-run with `FAVES_CDP_TIMEOUT_MS=60000`: **64 passed,
  0 failed** on the same commit. Every other one of the fifteen passed.
  🔑 **It failed in the RIGHT shape, which is the part worth recording.** It
  exited **2** as a `HARNESS ERROR`, and its own message said *"nothing here
  says anything about the site"* and told the reader to check load and orphan
  Chromes. That is the classifier working exactly as designed, and it is the
  contrast this item is about: `to_top_check`'s transport death is *legible*,
  while a starved `untilPresent` is byte-identical to a regression. **The
  problem was never that checks fail under load — it is that one failure shape
  lies about what it means.**
  📌 So the ruled fix (retry the whole check once) has a measured budget to
  respect: at load ~107 a 15 s wait starves but a 60 s one does not, on this
  machine. That is one data point, not a threshold — but it is the first one
  that pairs a load figure with a verdict.

  **The measurement, same commit, same code, twice.**

  | run | conditions | result |
  |---|---|---|
  | inside a 15-check sweep | two extra Chrome instances running concurrently, load average **18–27** | `cook_check` **exit 1**, `FAILED — the run stopped here` (the `MissingElementError` path) |
  | isolated re-run, minutes later | quiet | `cook_check` **OK — 85 passed, 0 failed**, exit 0, `main@338b1ad` |

  🔑 **Nothing about the site changed between those two runs.** The only variable
  was machine load. So a load-induced timeout inside an `untilPresent` now
  presents as **exit 1 with a named missing element** — which CLAUDE.md instructs
  the reader to treat as a statement about the site.

  🛑 **This is the option-1 failure mode, arriving through the option-2 door.**
  `160`'s ruling declined option 1 (*classify all `until` timeouts as assertion
  failures*) on exactly this ground: *"a genuinely slow machine then reads as a
  regression, which is the loaded-laptop problem inverted."* The split **reduces**
  the exposure — the 7 genuine timing waits keep exit 2 — but for the 48 sites
  correctly classified as site claims, a slow enough machine still manufactures
  a regression. The ruling is not wrong; its benefit is just narrower than
  "solved", and saying so now is cheaper than a future session bisecting a
  phantom.

  🚩 **The delivering agent predicted one instance of this and named it**
  (`sync_check:600`, *"the one `untilPresent` whose timeout could in principle be
  manufactured by load rather than by markup"*). The measurement shows the shape
  is **not confined to that one site** — it belongs to every `untilPresent` whose
  predicate depends on work the machine has to finish.

  🎯 **Options, none taken. This is a real design question, not a tidy-up.**
  1. **Leave it and document it.** Add a line to CLAUDE.md's exit-code guidance:
     *an exit 1 from a `untilPresent` timeout on a loaded machine is not
     necessarily a regression — re-run quiet before believing it.* Cheapest;
     puts the burden back on the reader, which is what mechanisms are supposed to
     remove.
  2. **Give `untilPresent` a load-aware second chance**: on timeout, check a
     cheap liveness signal (does the page still answer a trivial CDP eval?). If
     the browser is plainly struggling, raise a `HarnessError` (exit 2) instead.
     Distinguishes the two causes at the only moment the information exists.
     🚩 Costs a second failure path to reason about, and a *wrong* liveness
     answer restores the original bug silently.
  3. **Report BOTH facts and let the exit code carry the conservative one** —
     print the named missing element (so the message is useful) but exit 2 when
     load exceeded a threshold at the moment of the timeout. Keeps the diagnostic
     win of `160` while refusing to assert a site claim it cannot support.
  4. **Raise the `untilPresent` timeout** well above 15 s. Trivial, and it only
     moves the threshold — a busy enough machine still crosses it, and every real
     failure now takes proportionally longer to report.

  📌 **Until this is decided, the practical rule is (1) by default:** a lone
  `FAIL MISSING ELEMENT` on a loaded machine is **not** evidence of a regression
  until it reproduces on a quiet one. That is exactly the discipline-not-mechanism
  state this repo keeps trying to get out of, which is why it is filed rather
  than absorbed.
