- [~] **Sync retries a refused write, and syncs when the device comes back
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
