- [x] **Sync retries a refused write, and syncs when the device comes back
      online** `[S] [sync]` — found 2026-09-30 (session `faves-ad`) while
      answering how long sync takes; filed by [ADR 0146](../../decisions/0146-the-scaling-design-revised-after-its-cold-review.md).

  1. **A refused write is never retried.** When the other device wrote first,
     the Worker answers 412 and `syncNow` returns `retry: true`
     (`site/js/sync.js:358`), which nothing reads. The change stays local
     until the next edit, foreground or reload. Fix: go round again, a bounded
     number of times.
  2. **Nothing syncs on reconnect.** An offline change fails, sets the error
     state, and waits for the next foreground. Fix: listen for `online` and
     sync if a change is waiting.

  Both are small, and both matter more once `050` adds recipe buckets.

  📌 **Claimed 2026-09-30 (`faves-0b`)** — after `010`, same worktree (both touch `sync.js`).

  ✅ **Shipped 2026-09-30 (`faves-0b` worker, branch
  `510-010-sync-carry-through`).** `syncNow` runs one `cycle` and goes round
  again on a 412, at most `MAX_ATTEMPTS` (3) times. A race lost every time
  stays retryable and idle, and the base does not advance. `start()` listens
  for `online`: it sends a pending debounce at once, re-sends a change that
  failed, and spends no request when nothing is waiting. Five tests.
  Break-probed three ways: one attempt only, no listener, and a listener that
  syncs without checking.

  **Where the code differed from this item:** `sync.js:358` held the 412
  return as cited. Nothing else read `retry`.

  **Four costs, before → after:**
  - *Processing:* up to two extra merge cycles when a write loses a race.
  - *Storage:* none.
  - *Network:* per lost race, up to two more GETs and conditional PUTs. A
    reconnect costs one cycle only when a change is waiting, otherwise none.
  - *Server:* a refused PUT is one KV read and no write
    (`worker/sync-worker.js` `handlePut`). A retry that lands is the write
    the change was always going to cost, made now instead of at the next
    foreground.
