- [x] **An old tab stops writing once storage is upgraded** `[S] [data]` —
      owner-ruled 2026-10-01 "Old tab stops writing" (session `faves-0b`),
      on `040`'s fork 2. Must land before the first real upgrade step.
      ✅ 2026-10-01: store.js refuses a stale tab's writes; Reload notice.

  A tab still running an older build, open while a newer one upgrades
  storage, could write old-shape data into storage stamped as new. **Rule:**
  a tab that sees the stored `USER_SCHEMA` is ahead of its own stops saving
  and asks the person to reload. Nothing is corrupted; a change made in
  that tab is not saved until the reload.

  **Rejected by the owner:** the old tab reloading itself, which could
  happen mid-note.

  📌 **Claimed 2026-10-01 (`faves-0b`)** — then `120`, same worktree.

  ✅ **Shipped 2026-10-01 (`faves-0b` worker, branch `510-110`).**
  1. **One refusal, at the storage.** `safeStorage()` (store.js) now wraps
     localStorage in `guardStorage`: before every `setItem`/`removeItem` it
     reads `faves.schema.v1`, and when that is ahead of this build it throws
     `StaleTabError`. Every store already catches a failed write and carries
     on from memory, so nothing breaks and nothing lands. The number moved to
     a new leaf, `schema-stamp.js`, so store.js can read it without a cycle
     (user-schema.js re-exports it; the upgrade's import graph is now four
     files, all reading nothing at load).
  2. **Every writer goes through it.** `geo-consent.js` reached localStorage
     itself; it now uses store.js. A new test fails if any module but
     store.js names localStorage, IndexedDB or cookies (geo.js's
     sessionStorage is this tab's own and is exempt by construction).
  3. **Sync and import refuse whole.** A stale tab's sync reads and sends
     nothing (`RELOAD_NEEDED`, the paused view, "Paused — reload Faves"); an
     import is refused before its first write rather than reporting counts
     it never kept.
  4. **Detection, twice.** The `storage` event on the schema key (another
     tab's upgrade), plus the write-time check, plus a check at load for an
     old build opened after the upgrade. `stale-tab-ui.js` then shows one
     banner, role alert, one Reload button, no dismiss; Reload first asks a
     waiting service worker to take over, so it cannot fetch the old build
     again.

  **Tests.** `tests/storage-writers.test.js` drives all 14 writers in a tab
  whose storage is one schema ahead and asserts storage is byte-identical
  and sync never fetched, with a control that a current tab writes. The
  list is tied to `WRITERS`, so a new writer must be added.
  `tests/stale-tab.test.js` covers the event and the write-time check.
  `boot_check` uses two real tabs: B stamps storage ahead, A shows the
  notice, and a heart tapped in A is not saved.

  🚩 **Break-probes, each caught:** guard check disabled (2 unit tests and
  boot_check's heart); favourites bypassing store.js (the static test and
  the behavioural one); sync's pre-check removed; import's pre-check
  removed; the storage-event listener removed.

  🚩 **Only builds from this one on refuse.** A tab still running a build
  from before this ships has no guard, so the first real upgrade step should
  ship after this has had time to reach every open tab.

  **Four costs, before → after:**
  - *Processing:* one extra `getItem` and a number compare per storage
    write; a listener that ignores every key but one.
  - *Storage:* none.
  - *Network:* two new shell files, about 5 KB raw, precached once.
  - *Server:* none; a stale tab's sync makes no request at all.
