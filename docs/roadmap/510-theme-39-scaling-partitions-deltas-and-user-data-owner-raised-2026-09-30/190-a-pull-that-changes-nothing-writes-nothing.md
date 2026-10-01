- [ ] **A sync pull that changes nothing writes nothing** `[S] [sync]` — from
      the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **F**.

  Measured: 9.1 KB of `localStorage` rewritten per no-op pull at 200 recipes.
  Risk: the second snapshot is what catches an edit made mid-sync (`100`), and
  the change marker must not weaken it.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal F.
