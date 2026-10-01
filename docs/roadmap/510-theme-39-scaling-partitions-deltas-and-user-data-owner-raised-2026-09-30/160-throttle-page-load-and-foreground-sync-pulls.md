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

  ✅ **Done 2026-10-01 (`510-160`, PR pending).** `sync.start()`'s two
  opportunistic pulls (page load, return to the foreground) now go through
  `pullIfStale`, which skips the pull only when the last sync succeeded under
  `PULL_WINDOW_MS` (90 s) ago AND nothing is waiting, debounced or in flight AND
  storage matches the last agreement. The last test is what keeps "a pending
  write always pushes" true across the site's three pages: the in-memory flags
  die on navigation and a flush cut off by it must still go on the next load,
  so the device compares storage with the base (no network). Not throttled, by
  construction (they call `syncNow` directly): Sync now, enable, join, the
  diet answer, the retry after a lost race, and a reconnect with a change
  waiting. An absent, unreadable or future `lastSyncedAt` counts as stale.
  Measured with `tools/chatty_check.mjs` (headless Chrome, real Worker, counting
  KV): a repeat page load 3 s after a sync **1 request, 1 KV read, 1 setItem →
  0, 0, 0**; the same load with the last sync 10 min old is unchanged at 1
  request, 1 read (the scenario now measures both, so the window is shown to be
  a throttle and not a switch). Budgets 2/2/0/2 → 0/0/0/0, plus two new
  stale-pull rows at 2/2; the bucket-ask break-probe now aims at the stale
  load, and a third probe (window removed → the repeat-load budget fails) is
  new. Tests: 12 in `tests/sync.test.js`, break-probed four ways (see the PR).
  ⚠️ Cost: a change made on another device can take up to 90 s longer to
  appear on a device that opened a page inside the window (owner-ruled).
