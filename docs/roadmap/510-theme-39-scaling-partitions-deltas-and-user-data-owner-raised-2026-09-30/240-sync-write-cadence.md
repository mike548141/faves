- [ ] **Sync write cadence** `[S] [sync]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **K**.

  Writes are one per burst, and a burst ends after 20 s idle. Writes are the
  ceiling left after `140` and `160` (the survey's model: about 500 daily
  users on the free tier).

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal K.

  🎯 **Owner ruling needed, and offered, not recommended:** a longer idle
  window, or flush only on hidden. There is no usage evidence to size it, and
  the ceiling is not close.

  🔎 **Premise moving 2026-10-02 (`faves-4f`):** with `340` deployed, the
  Durable Object allows 100,000 rows written a day on the free tier against
  KV's 1,000; while the KV mirror is on (`410`), KV's limit still binds. Once
  the mirror is off, the write ceiling this item sizes against is about 100×
  higher.
