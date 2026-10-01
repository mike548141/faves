- [x] **A cross-tab reload does not schedule a sync** `[XS] [sync]` — from the
      `130` survey
      (session `faves-55`, 2026-10-01), its proposal **H**.

  Measured: a heart in one tab makes every other open tab pull too (a GET and
  9 KV reads each).

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal H.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ✅ 2026-10-01 (`faves-55` worker, branch `510-sync`): built. A store
  notification raised inside a `storage` event's dispatch (`window.event`)
  no longer schedules a sync; a tap, an import or a rename still does
  (`sync.js` `start()`). Test: `tests/sync.test.js` "a store reloaded by
  ANOTHER tab's write…" — fails with the check removed. Measured in real
  Chrome, two tabs of one profile, real Worker behind a counting KV, one
  heart in the menu tab: before, the home tab sent a GET + PUT and the menu
  tab a GET (+35 R, +1 W); after, the home tab sent nothing and the menu tab
  a GET + PUT (+26 R, +1 W). Where `window.event` is missing, behaviour is
  as before.

  ✅ **Closed 2026-10-01 (`faves-55`):** merged (PR #65). `chatty_check`
  budgets tightened to the merged values, 33 of 33 on two runs.
