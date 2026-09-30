- [x] 🔥 **Sync can delete another device's change if you edit mid-sync**
      `[S] [sync][data]` — found 2026-09-30 by the `050` worker (session
      `faves-0b`), from reading the code; not yet reproduced.

  **The suspected fault.** In `sync.js`'s cycle, when a local change lands
  while a sync is in flight (`localMoved`), the merged copy is written to the
  server but **not** to this device, and yet `writeBase(merged)` still records
  it as the common ancestor. The next cycle then sees the other device's
  additions in the base, absent from this device, and reads them as deletions
  made here, which it writes to the server. A heart added on one phone could
  vanish because the other phone was edited during a sync.

  **Build:** reproduce it first as a failing test in `tests/sync.test.js`. If
  it reproduces, fix it (the base must only ever be a state both sides hold),
  break-probe the fix, and run `sync_check`. If it does not, record why the
  reading was wrong and close this item.

  📌 **Claimed 2026-09-30 (`faves-0b`)** — built in a worktree.

  ✅ 2026-10-01: reproduced (4 tests red on main); fixed in `sync.js`.
