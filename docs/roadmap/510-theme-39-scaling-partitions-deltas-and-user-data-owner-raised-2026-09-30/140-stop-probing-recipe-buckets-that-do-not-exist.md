- [x] **Stop probing recipe buckets that do not exist** `[M] [sync][worker]` —
      from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **A**.

  Measured: a no-change pull costs 9 KV reads and a heart 26 reads + 1 write,
  even for someone with no recipes. Target: 1 read and 2 reads + 1 write. The
  Worker change is built and held, and deploys with `050`'s import, like the
  rest of the Worker.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal A.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ✅ 2026-10-01 (`faves-55` worker, branch `510-sync`): built; Worker NOT
  deployed (it goes with `050`'s import). The client asks `?buckets=8` only
  when it holds a recipe or last agreed on buckets, and re-reads once,
  asking, when a core copy records buckets it did not ask about; every PUT
  carries `?family=<n>` and the Worker re-arms only those copies (absent:
  all 16, as before). `mine` is now collected before the read; a tap during
  the read is carried by the follow-up cycle. Real client + real Worker
  over a counting KV, before → after: no recipes, pull 9 R → 1 R, heart
  26 R + 1 W → 2 R + 1 W, first sync 26 R → 2 R; 200 recipes, pull 9 R →
  9 R, heart 26 R → 18 R, first sync 162 R → 90 R, a joining device +1
  request. New client on the deployed Worker: pull 1 R, heart 18 R. Old
  client on the new Worker: unchanged. Tests: three in `tests/sync.test.js`
  fail on the pre-140 client, two in `worker/sync-worker.test.js` fail with
  `family` ignored; without the re-read, nine fail.

  ✅ **Closed 2026-10-01 (`faves-55`):** merged (PR #65). `chatty_check`
  budgets tightened to the merged values, 33 of 33 on two runs.
  The Worker half is deployed with `050`'s import.
