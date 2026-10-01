- [x] 🔎 **One unit test failed once in five runs, and its name was not
      captured** `[XS] [tests]` — seen 2026-10-01 (session `faves-55`)
      on the merged `510-sw` tree.

  `node --test` reported 1,673 passed, 1 failed; four re-runs on the same
  tree passed 1,674 of 1,674. The run's output was piped to a count, so the
  failing test is unknown. Next time a run fails, keep the whole output.
  If it recurs, the likely suspects are tests with real timers among this
  session's sync throttle (`160`) and data-check window (`180`) tests
  (inferred, not shown).

  **Seen again 2026-10-02 (`faves-4f`, the `350`–`370` worker):** 1 of 1,717
  failed once at the start of a browser sweep, name again not captured; nine
  re-runs passed.

  📌 **Claimed 2026-10-02 (`faves-4f`).**

  ✅ **Named and fixed 2026-10-02 (`faves-4f`).** Forty saved runs of
  `node --test` on `main` (while two workers loaded the machine) failed once,
  run 32: `tests/sync.test.js` "a change made while a cycle is in flight is
  kept, not overwritten by the pull", at its last assertion (the second device
  did not see the flag). The test waited a fixed 30 ms for the follow-up sync
  to land; under load it had not. The file already had `settle(s)` (wait until
  the engine stops syncing) for this class; two waits never adopted it, this
  one and the "three changes cost one write" test. Both now use it, and no
  fixed-timer wait remains in `tests/`. Probe: with later PUTs slowed 50 ms,
  the old wait fails and `settle` passes. A test fault, not a sync fault.
