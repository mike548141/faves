- [x] **Persist the service worker's data-check throttle** `[S] [pwa][sw]` —
      from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **E**.

  Today the throttle lives in service-worker memory, so a restarted worker
  fetches the catalogue on every navigation more than 10 s apart.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal E.

  🎯 **Owner ruling needed:** a 2–5 minute window means a menu edit reaches an
  online phone that much later. That sits beside ADR 0147's freshness trade.

  ⚖️ **Owner-ruled 2026-10-01 (`faves-55`): yes, about 3 minutes**,
  persisted so it survives the worker sleeping. A resume and a forced
  `SYNC_DATA` still check at once.
  📌 **Claimed 2026-10-01 (`faves-55`).**
  ✅ **Built 2026-10-01 (`faves-55` worker, branch `510-sw`), ADR 0148.**
  `site/sw.js`: a data read does not check the catalogue within
  `DATA_CHECK_WINDOW_MS` (3 min) of the last check that succeeded; the time
  is a `__data_checked__` record in `faves-data` that the sweep keeps. Failed
  or incomplete checks record nothing; the 10 s in-memory gap stays as the
  coalescer. A resume (`SYNC_DATA`) and a forced one ignore the window.
  Measured (`chatty_check`, 3 runs): warm home load 2 requests → 1 (the
  `sw.js` update check alone), warm menu open 1 → 0; budgets tightened to
  2 and 1 (`warmBytes` went up to 41,039: the row is now `sw.js` alone,
  37,308 B, and that file grew). `fetch_check`'s natural path no longer
  sleeps past the gap: it stops the worker through CDP (asserted), proves a
  read inside the window asks for nothing, then winds the record back and
  proves the unprompted path still delivers. Break-probed: window 0 ⇒ that
  assertion fails. 7 unit tests in `tests/sw-data-store.test.js`, each of
  three mutations caught.

  ✅ **Closed 2026-10-01 (`faves-55`):** merged (PR #67), ADR 0148. A warm
  home load is 2 → 1 requests, and a warm menu open 1 → 0.
