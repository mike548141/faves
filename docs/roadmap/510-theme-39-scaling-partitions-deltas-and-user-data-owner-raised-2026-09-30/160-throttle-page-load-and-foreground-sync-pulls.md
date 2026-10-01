- [ ] **Throttle page-load and foreground sync pulls** `[S] [sync]` — from the
      `130` survey
      (session `faves-55`, 2026-10-01), its proposal **C**.

  Today every page load and resume pulls (`site/js/sync.js:858`). Skipping a
  pull inside a window saves a request and 9 KV reads each time.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal C.

  🎯 **Owner ruling needed:** the window (60–120 s proposed) is a freshness
  trade, because a change on another device can arrive that much later.
