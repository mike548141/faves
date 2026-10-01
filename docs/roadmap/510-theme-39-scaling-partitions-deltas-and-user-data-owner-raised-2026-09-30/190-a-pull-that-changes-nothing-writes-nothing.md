- [~] **A sync pull that changes nothing writes nothing** `[S] [sync]` — from
      the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **F**.

  Measured: 9.1 KB of `localStorage` rewritten per no-op pull at 200 recipes.
  Risk: the second snapshot is what catches an edit made mid-sync (`100`), and
  the change marker must not weaken it.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal F.

  📌 **Claimed 2026-10-01 (`faves-55`).**

  ✅ 2026-10-01 (`faves-55` worker, branch `510-sync`): built. The base is
  written only when its bytes change; the second snapshot is skipped when the
  raw strings of the registry and every person's stores still match the ones
  the first was built from (`sync.js` `recordingStorage`). Storage is still
  read for that check, never a marker bumped by events: another tab's write
  is in storage before its event arrives. Tests: "a pull that changed
  nothing rewrites no base…" fails on main (the base write, and the second
  collect, each fail it alone); forcing the check to "unchanged" fails six
  mid-sync tests (510/100 and the in-flight test). Node, real client + real
  Worker, 200 recipes and 300 hearts, no-op pull: storage written 2×
  24.6 KB → 1× 0.07 KB (30 hearts: 2× 2.0 KB → 1× 0.07 KB); median time
  12.1–12.6 ms → 8.6–8.9 ms. Not what the survey forecast: reads went UP,
  348 → 373 KB, because the base is re-read to compare. The `lastSyncedAt`
  stamp is still written — the status row shows it and `160` throttles on it.
