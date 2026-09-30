- [~] **An old tab stops writing once storage is upgraded** `[S] [data]` —
      owner-ruled 2026-10-01 "Old tab stops writing" (session `faves-0b`),
      on `040`'s fork 2. Must land before the first real upgrade step.

  A tab still running an older build, open while a newer one upgrades
  storage, could write old-shape data into storage stamped as new. **Rule:**
  a tab that sees the stored `USER_SCHEMA` is ahead of its own stops saving
  and asks the person to reload. Nothing is corrupted; a change made in
  that tab is not saved until the reload.

  **Rejected by the owner:** the old tab reloading itself, which could
  happen mid-note.

  📌 **Claimed 2026-10-01 (`faves-0b`)** — then `120`, same worktree.
