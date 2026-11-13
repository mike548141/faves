## 2026-09-30 — sync timings, and the design for scaling data (session `faves-ad`)

- **Asked and answered (read from the code, no change):** a local change
  syncs 20 s after the last edit (`DEBOUNCE_MS`), or at once when the app is
  hidden. Another device picks it up only on load or on returning to the
  foreground; nothing pushes and nothing polls. A heart added offline on each
  of two devices merges to both hearts: simulated against `mergePersonal`, and
  `node --test` on the sync suites gave 61 passed, 0 failed.
- **Found in the sync engine (not yet fixed):** a refused write (412) returns
  `retry: true` and nothing retries it; nothing syncs when the device comes
  back online; and older code can delete newer user data
  (`sync-merge.js:423`), now filed as 🔥 `510/010`.
- **Designed and recorded, not built:** ADR 0145 and roadmap section `510`
  (Theme 39). The owner ruled three forks: offline scope becomes "your
  partitions", all user data moves to IndexedDB, and the design is recorded
  before it is built. `240/030` is closed into `510/030`.
- **Measured:** the venue card fields for all 57 venues come to 12,274 bytes
  compressed; the full files come to 164,716.
- Pin bumped `c600f62` → `86da02c`. The only new atelier commit filed board
  items and changed nothing under `docs/method/`; the floor hand check came
  back clean against `origin/main`.
- **Addendum (same session):** the owner added that the whole design balances
  processing, storage and network against performance and extensibility.
  Recorded as ADR 0145's addendum, with the server's KV budget as a fourth
  cost, the trades already in the design, and a rule that every `510` item
  measures all four before and after.
- **Cold review of ADR 0145 (same session):** a Fable sub-agent, given paths
  only, found 2 blockers and 6 majors
  (`docs/reviews/2026-09-30-0639-adr-0145-cold-review.md`). Key rows were
  re-opened at source and hold. The premise of the IndexedDB ruling was wrong
  (recipes fit, about 1,650 B each), so the owner was re-briefed and ruled
  "Defer the move". He also ruled "Core copy + recipe buckets" for sync and
  "Carry unknown data through" for older code. Recorded as ADR 0146; items
  `010`–`060` revised; `070` (sync retry and reconnect) and `080` (the deferred
  IndexedDB move) filed.

