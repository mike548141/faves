- [ ] 🛑 **`untilPresent` can manufacture a FALSE REGRESSION under load, and it
      was measured within minutes of shipping** `[M][tools]` — found 2026-09-07
      (session faves-24) while verifying `160` on merged `main`. This is the
      residual half of the very risk option 1 was declined to avoid.

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
