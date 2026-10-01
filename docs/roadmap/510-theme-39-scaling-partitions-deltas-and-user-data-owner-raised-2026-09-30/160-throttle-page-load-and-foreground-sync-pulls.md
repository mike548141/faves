- [~] **Throttle page-load and foreground sync pulls** `[S] [sync]` — from the
      `130` survey
      (session `faves-55`, 2026-10-01), its proposal **C**.

  Today every page load and resume pulls (`site/js/sync.js:858`). Skipping a
  pull inside a window saves a request and 9 KV reads each time.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal C.

  🎯 **Owner ruling needed:** the window (60–120 s proposed) is a freshness
  trade, because a change on another device can arrive that much later.

  ⚖️ **Owner-ruled 2026-10-01 (`faves-55`): yes, about 90 s.** He asked
  whether the window should scale with time since the last sync ("if
  synced today then 90 sec, if it's been a week or more then immediate").
  The answer recorded with the ruling: a throttle on `lastSyncedAt` already
  does that, because it skips a pull only when the last sync was under 90 s
  ago, so a stale device always pulls at once. His second point, that user
  data changes more often than menus, is the split between this 90 s window
  and `180`'s 3 minutes. A pending local write always pushes at once.
  📌 **Claimed 2026-10-01 (`faves-55`).**
