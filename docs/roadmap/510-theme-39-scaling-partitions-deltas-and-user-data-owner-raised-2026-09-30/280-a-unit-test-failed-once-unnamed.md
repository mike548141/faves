- [ ] 🔎 **One unit test failed once in five runs, and its name was not
      captured** `[XS] [tests]` — seen 2026-10-01 (session `faves-55`)
      on the merged `510-sw` tree.

  `node --test` reported 1,673 passed, 1 failed; four re-runs on the same
  tree passed 1,674 of 1,674. The run's output was piped to a count, so the
  failing test is unknown. Next time a run fails, keep the whole output.
  If it recurs, the likely suspects are tests with real timers among this
  session's sync throttle (`160`) and data-check window (`180`) tests
  (inferred, not shown).
