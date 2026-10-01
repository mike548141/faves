- [x] **Stop every dish re-rendering on every heart and rating** `[M]
      [perf][menu]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **B**.

  Measured: on a 264-dish menu, one heart causes 795 DOM changes, and one
  rating step 2,430 (about 600 ms of main thread at 4x CPU throttle).

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal B.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ✅ **Done 2026-10-01 (`510-150`, PR pending).** Each heart and rating
  control now repaints only when its own state moved (a force flag keeps the
  hover-preview restore working), and the home list rebuilds only when a heart
  changes the hearted-venue set AND the ranked order. Measured the survey's way
  (regal-chinese-restaurant, 264 dishes, headless Chrome 390 px, MutationObserver
  count, `Performance.getMetrics` script and layout+style ms, 5 runs, 4x CPU):
  heart 795 → 3 changes (script 6 → 1 ms, layout+style 33 → 7 ms); rating step
  2,386 → 10 (script 20 → 1 ms, layout+style 90 → 9 ms); home heart 352 → 13
  changes, CPU unchanged (the ranking, not the cards, dominates there). Guard:
  `tools/device_check.mjs` § 7 and § 8, break-probed.

  ✅ **Closed 2026-10-01 (`faves-55`):** merged (PR #64). `chatty_check`
  budgets tightened to the merged values, 33 of 33 on two runs.
