- [~] **Stop probing recipe buckets that do not exist** `[M] [sync][worker]` —
      from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **A**.

  Measured: a no-change pull costs 9 KV reads and a heart 26 reads + 1 write,
  even for someone with no recipes. Target: 1 read and 2 reads + 1 write. The
  Worker change is built and held, and deploys with `050`'s import, like the
  rest of the Worker.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal A.

  📌 **Claimed 2026-10-01 (`faves-55`).**
