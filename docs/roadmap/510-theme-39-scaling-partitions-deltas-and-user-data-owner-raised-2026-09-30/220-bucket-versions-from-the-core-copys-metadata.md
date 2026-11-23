- [ ] **Serve bucket versions from the core copy's KV metadata** `[L]
      [worker]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **I**.

  A recipe user's pull: 9 reads and about 227 KB through the Worker, down to 1
  read and about 3 KB.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal I.

  **Design ruling needed:** reading the real buckets is what detects a
  bucket written without its core update (ADR 0146 §2). This trades that
  detection for cost. Comes after `140`.

  🔎 **Premise moved 2026-10-02 (`faves-4f`):** since `340` deployed, the
  bucket report is answered inside the user's Durable Object from its own rows
  (one row read per bucket); bucket bodies no longer travel through the Worker
  as KV reads did. The survey's 9 reads / 227 KB figures were KV-era. Re-measure
  with `chatty_check` before anyone rules on this.

  - 🔀 Tidied 2026-11-16 (C0746, verified high; Mike approved 2026-11-16):
    the design ruling above is not Mike's yet. Its premise moved on
    2026-10-02 (lines 15-19 above), so a session first re-measures with
    `chatty_check`, and only then is the trade put to him with current
    figures. Nothing above was changed; the original text is as it was. To
    revert: delete this line (its commit is listed in
    docs/sessions/2026-11-16-0545-asks-tidy-applied.md).
  - 🔀 2026-11-16 (C0746): removed the 🎯 marker from the line above, because
    this ask is closed / not Mike's (tidy line above). Original: the
    "**Design ruling needed:**" line began with 🎯. To revert: git revert
    this repo's marker commit (listed in
    docs/sessions/2026-11-16-0638-asks-markers-removed.md).

  🔎 **Re-measured 2026-11-23 (queue run f9ee6733), `chatty_check` on `main`
  `dadd7d89`.** What the tool CAN say, for a user with no recipes (its stated
  population): a pull 10 minutes stale is **1 request, 0 KV reads, 1 Durable
  Object storage read**; one heart then flush is 3 requests, 0 KV reads, 1 KV
  write (the mirror), 3 storage reads. What it CANNOT say: a recipe user's
  pull, because no scenario holds recipe buckets. The code answers the shape
  instead: since `340`, a bucket question costs the object **one storage read
  per bucket asked about, and KV nothing** (`tools/chatty_check.mjs`, the
  bucket break-probe; `sync.js` asks only about buckets it holds since `140`).
  **So proposal I's headline is gone:** its 9 KV reads and 227 KB through the
  Worker were the KV era. What is left to save is N storage reads to 1 for a
  user holding N buckets, inside the user's own object, against a detection
  the object's strong consistency may already make cheap.
  **Recommendation for the owner:** close it unbuilt. It is `[L]` for a saving
  of a few storage reads per pull, and it trades away a check. 🎯 Put to him
  at the close of run f9ee6733.

