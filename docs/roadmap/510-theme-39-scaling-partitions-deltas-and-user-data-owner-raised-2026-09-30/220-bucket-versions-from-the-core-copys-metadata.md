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
