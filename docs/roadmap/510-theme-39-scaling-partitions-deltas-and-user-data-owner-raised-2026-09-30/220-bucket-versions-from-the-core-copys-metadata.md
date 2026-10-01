- [ ] **Serve bucket versions from the core copy's KV metadata** `[L]
      [worker]` — from the `130` survey
      (session `faves-55`, 2026-10-01), its proposal **I**.

  A recipe user's pull: 9 reads and about 227 KB through the Worker, down to 1
  read and about 3 KB.

  The four costs, before → after, and the risks are in
  [the survey](../../reviews/2026-10-01-0418-chatty-app-survey.md) under proposal I.

  🎯 **Design ruling needed:** reading the real buckets is what detects a
  bucket written without its core update (ADR 0146 §2). This trades that
  detection for cost. Comes after `140`.

  🔎 **Premise moved 2026-10-02 (`faves-4f`):** since `340` deployed, the
  bucket report is answered inside the user's Durable Object from its own rows
  (one row read per bucket); bucket bodies no longer travel through the Worker
  as KV reads did. The survey's 9 reads / 227 KB figures were KV-era. Re-measure
  with `chatty_check` before anyone rules on this.
