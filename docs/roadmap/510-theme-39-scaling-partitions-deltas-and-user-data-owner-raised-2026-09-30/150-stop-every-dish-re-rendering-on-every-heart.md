- [ ] **Stop every dish re-rendering on every heart and rating** `[M]
      [perf][menu]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **B**.

  Measured: on a 264-dish menu, one heart causes 795 DOM changes, and one
  rating step 2,430 (about 600 ms of main thread at 4x CPU throttle).

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal B.
